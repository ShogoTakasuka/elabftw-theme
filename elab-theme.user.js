// ==UserScript==
// @name         eLabFTW Theme
// @namespace    https://github.com/ShogoTakasuka/elabftw-theme
// @version      4.0.0
// @description  Restyle any eLabFTW instance — extra themes on top of eLabFTW's own Light/Dark/Midnight, accent color, fonts, density & code syntax highlighting. Per-user, no server changes.
// @description:ja eLabFTW を本体無改造で着せ替え。eLabFTW 自身の Light/Dark/Midnight に追加テーマ・アクセント・フォント・余白・コード配色を重ねる。設定は各自のブラウザにのみ保存。
// @author       Shogo Takasuka
// @license      MIT
// @match        *://*/*
// @run-at       document-start
// @require      https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js
// @grant        GM_addStyle
// @homepageURL  https://github.com/ShogoTakasuka/elabftw-theme
// @supportURL   https://github.com/ShogoTakasuka/elabftw-theme/issues
// @downloadURL  https://raw.githubusercontent.com/ShogoTakasuka/elabftw-theme/main/elab-theme.user.js
// @updateURL    https://raw.githubusercontent.com/ShogoTakasuka/elabftw-theme/main/elab-theme.user.js
// ==/UserScript==

/* =============================================================================
 * eLabFTW Theme — a per-user skin for eLabFTW.
 * -----------------------------------------------------------------------------
 * HOW IT WORKS
 *   - eLabFTW paints its whole UI through its own CSS custom properties
 *     (--mainbackground, --white, --primary, --link, ...) defined on :root and
 *     switched by the html classes .dark-mode / .midnight (its built-in
 *     Light / Dark / Midnight themes). This script only sets data-* attributes
 *     on <html> and overrides THOSE properties, so eLabFTW keeps painting every
 *     component itself and the two never fight over colors.
 *   - Default is "eLabFTW setting": nothing is overridden and the theme chosen
 *     in eLabFTW's user control panel is used as-is. A primary color set in the
 *     user control panel (6.0+) also wins over a theme's primary; only the
 *     accent picker here overrides it, and only while it is set.
 *   - Underneath, eLabFTW 5.5 and 6.0 ship Bootstrap 4; no --bs-* variable is
 *     involved.
 *   - Each user's choices are saved in their own browser (localStorage) and
 *     apply to them only. The eLabFTW server and other users are never touched.
 *   - Styles are injected with GM_addStyle (a standard userscript API) so they
 *     work under eLabFTW's strict Content-Security-Policy without weakening it.
 *
 * SCOPE / PRIVACY
 *   - @match is set to all sites so it works on any eLabFTW instance with no
 *     editing. A fast auto-detector bails out immediately on non-eLabFTW pages.
 *   - Prefer it to run ONLY on your instance? Replace the @match line with your
 *     URL, e.g.  // @match https://elab.example.org/*
 *
 * LICENSE
 *   - This script: MIT (see LICENSE).
 *   - Bundled highlight.js: BSD-3-Clause (https://highlightjs.org/).
 * ===========================================================================*/
(function () {
  "use strict";

  if (window.__elabThemeLoaded) return; // guard against double injection
  window.__elabThemeLoaded = true;

  var NS = "elabTheme:"; // localStorage key prefix
  var root = document.documentElement;

  // --- persistence ----------------------------------------------------------
  function get(key, fallback) {
    try {
      var v = localStorage.getItem(NS + key);
      return v === null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }
  function set(key, val) {
    try {
      localStorage.setItem(NS + key, val);
    } catch (e) {}
  }
  // JSON-valued settings (custom color maps). Always merged onto the defaults so
  // a stored map that predates a new field still has every key.
  function getJSON(key, fallback) {
    try {
      var v = localStorage.getItem(NS + key);
      return v === null
        ? Object.assign({}, fallback)
        : Object.assign({}, fallback, JSON.parse(v));
    } catch (e) {
      return Object.assign({}, fallback);
    }
  }
  function setJSON(key, val) {
    try { localStorage.setItem(NS + key, JSON.stringify(val)); } catch (e) {}
  }

  // Default custom palettes + the fields exposed as color pickers ("mobile-app"
  // style). Editing a picker writes into state.customTheme / state.customCode.
  var DEFAULT_CUSTOM_THEME = {
    bg: "#1b1e24", text: "#e6e9ef", surface: "#252a33",
    border: "#3a414d", link: "#7db1ff", heading: "#f1f4f9"
  };
  var CUSTOM_THEME_FIELDS = [
    ["bg", "Background"], ["text", "Text"], ["surface", "Surface"],
    ["border", "Border"], ["link", "Link / accent"], ["heading", "Heading"]
  ];
  var DEFAULT_CUSTOM_CODE = {
    bg: "#1e1e1e", fg: "#d4d4d4", comment: "#6a9955", kw: "#569cd6",
    str: "#ce9178", num: "#b5cea8", fn: "#dcdcaa", title: "#4ec9b0",
    attr: "#9cdcfe", meta: "#569cd6"
  };
  var CUSTOM_CODE_FIELDS = [
    ["bg", "Background"], ["fg", "Text"], ["comment", "Comment"], ["kw", "Keyword"],
    ["str", "String"], ["num", "Number"], ["fn", "Function"], ["title", "Class / type"],
    ["attr", "Attribute"], ["meta", "Meta"]
  ];

  // --- eLabFTW detection (cheap checks first, short-circuit) -----------------
  // Markers verified against eLabFTW 5.5.x and 6.0.x page templates
  // (src/templates/{footer,base,head}.html). 6.0 renamed the assets from
  // /assets/elabftw.min.css to /assets/main.min.css, so the asset-name check
  // alone (the only one that matched on 5.5) no longer fires; the markers below
  // exist on every page of both versions, including the login page.
  function isElabFTW() {
    try {
      // 1) <script type="application/json" id="core"> holding the user state
      //    ({"isAnon":..,"isAuth":..,"currentTeam":..}) — emitted by footer.html
      var core = document.querySelector('script#core[type="application/json" i]');
      if (core && /"isAuth"/.test(core.textContent || "")) return true;
      // 2) the "About eLabFTW" modal included by base.html on every page
      if (document.getElementById("aboutElabftwModal")) return true;
      // 3) 6.0+: logo / favicon served by the branding API
      if (
        document.querySelector(
          'img[src*="/api/v2/instance/branding/"], link[href*="/api/v2/instance/branding/"]'
        )
      )
        return true;
      // 4) <=5.5: assets referencing elabftw (/assets/elabftw.min.css)
      if (
        document.querySelector('link[href*="elabftw" i], script[src*="elabftw" i]')
      )
        return true;
      // 5) <meta name="generator"|"description" content="... eLabFTW">
      var m = document.querySelector('meta[name="generator" i], meta[name="description" i]');
      if (m && /elabftw/i.test(m.content || "")) return true;
      // 6) footer string "Powered by eLabFTW" (the two words are separated by a
      //    newline + indentation in the rendered HTML, hence \s+)
      if (document.body && /powered\s+by\s+elabftw/i.test(document.body.textContent))
        return true;
      // 7) navbar logo (<img alt="eLabFTW"> on 6.0, text/svg before)
      var b = document.querySelector('.navbar-brand, a[href*="dashboard.php"]');
      if (b && /elabftw/i.test((b.textContent || "") + " " + (b.querySelector("img") ? b.querySelector("img").alt : "")))
        return true;
    } catch (e) {}
    return false;
  }

  // --- theme definitions (edit freely) --------------------------------------
  // eLabFTW's own CSS custom properties (src/scss/_variables.scss). Names are
  // identical in 5.5.x and 6.0.x unless noted; :root holds the light values and
  // html.dark-mode / html.midnight override them.
  //   --mainbackground  page background (body)
  //   --white           raised surfaces: .box, inputs, tables, dropdowns, lists
  //   --highlighted     highlighted rows          --superlight   blockquote, hover
  //   --firstlevel      borders                   --secondlevel  muted text, hr
  //   --thirdlevel      input borders             --medium       secondary text
  //   --mediumstrong    body text                 --strongest    input text, emphasis
  //   --primary         buttons, active items     --primary-fg   text on primary (6.0+)
  //   --link / --link-hover  links (6.0+; on 5.5 links use --primary)
  //   --nav-bg          navbar background (6.0+)
  // A theme is a palette for those properties, written compactly with pal().
  // "native" sets nothing: eLabFTW's own Light / Dark / Midnight stay in charge.
  function isDark(hex) {
    var c = String(hex || "").replace("#", "");
    if (c.length === 3) c = c.replace(/./g, "$&$&");
    if (!/^[0-9a-f]{6}$/i.test(c)) return false;
    var n = parseInt(c, 16);
    return 0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255) < 140;
  }
  function fgFor(hex) { return isDark(hex) ? "#ffffff" : "#131313"; }

  // bg: page · surface: boxes/inputs · raised: hover/highlight · border ·
  // muted: secondary text · text: body · strong: emphasis · link · linkHover ·
  // primary (defaults to link) · nav (optional navbar background)
  function pal(o) {
    var primary = o.primary || o.link;
    var v = {
      "--mainbackground": o.bg,
      "--white": o.surface,
      "--highlighted": o.raised,
      "--superlight": o.raised,
      "--firstlevel": o.border,
      "--secondlevel": o.muted,
      "--thirdlevel": o.muted,
      "--medium": o.muted,
      "--mediumstrong": o.text,
      "--strongest": o.strong,
      "--link": o.link,
      "--link-hover": o.linkHover || o.link,
      "--primary": primary,
      "--primary-fg": fgFor(primary)
    };
    if (o.nav) v["--nav-bg"] = o.nav;
    return v;
  }

  var THEMES = {
    native: { label: "eLabFTW setting (Light / Dark / Midnight)", scheme: null, vars: {} },
    dark: { label: "Dark", scheme: "dark", vars: pal({
      bg: "#1b1e24", surface: "#252a33", raised: "#2d333d", border: "#3a414d",
      muted: "#b9c2d0", text: "#e6e9ef", strong: "#ffffff", link: "#7db1ff", linkHover: "#a7caff" }) },
    midnight: { label: "Midnight (OLED black)", scheme: "dark", vars: pal({
      bg: "#000000", surface: "#0d0f12", raised: "#16191e", border: "#2a2e35",
      muted: "#aeb6c2", text: "#e4e7ec", strong: "#ffffff", link: "#79b8ff", linkHover: "#a7caff", nav: "#000000" }) },
    nord: { label: "Nord", scheme: "dark", vars: pal({
      bg: "#2e3440", surface: "#3b4252", raised: "#434c5e", border: "#4c566a",
      muted: "#c0c8d8", text: "#e5e9f0", strong: "#eceff4", link: "#88c0d0", linkHover: "#8fbcbb" }) },
    dracula: { label: "Dracula", scheme: "dark", vars: pal({
      bg: "#282a36", surface: "#343746", raised: "#3c3f52", border: "#44475a",
      muted: "#c8cad8", text: "#f8f8f2", strong: "#ffffff", link: "#bd93f9", linkHover: "#ff79c6" }) },
    "solarized-dark": { label: "Solarized Dark", scheme: "dark", vars: pal({
      bg: "#002b36", surface: "#073642", raised: "#0a4250", border: "#0a4a5a",
      muted: "#93a1a1", text: "#cfdadb", strong: "#fdf6e3", link: "#268bd2", linkHover: "#2aa198" }) },
    sepia: { label: "Sepia", scheme: "light", vars: pal({
      bg: "#efe6d0", surface: "#faf4e4", raised: "#ebe0c6", border: "#d8c8a0",
      muted: "#7a6a52", text: "#4a3f2f", strong: "#3a3122", link: "#8a5a2b", linkHover: "#6b4420" }) },
    "solarized-light": { label: "Solarized Light", scheme: "light", vars: pal({
      bg: "#eee8d5", surface: "#fdf6e3", raised: "#e4ddc8", border: "#d8cfb0",
      muted: "#839496", text: "#586e75", strong: "#073642", link: "#268bd2", linkHover: "#2aa198" }) },
    "gruvbox-dark": { label: "Gruvbox Dark", scheme: "dark", vars: pal({
      bg: "#282828", surface: "#32302f", raised: "#3c3836", border: "#504945",
      muted: "#bdae93", text: "#ebdbb2", strong: "#fbf1c7", link: "#83a598", linkHover: "#8ec07c" }) },
    "gruvbox-light": { label: "Gruvbox Light", scheme: "light", vars: pal({
      bg: "#f2e5bc", surface: "#fbf1c7", raised: "#ebdbb2", border: "#d5c4a1",
      muted: "#7c6f64", text: "#3c3836", strong: "#282828", link: "#076678", linkHover: "#427b58" }) },
    "tokyo-night": { label: "Tokyo Night", scheme: "dark", vars: pal({
      bg: "#1a1b26", surface: "#24283b", raised: "#2f334d", border: "#3b4261",
      muted: "#9aa5ce", text: "#c0caf5", strong: "#ffffff", link: "#7aa2f7", linkHover: "#7dcfff" }) },
    "one-dark": { label: "One Dark", scheme: "dark", vars: pal({
      bg: "#282c34", surface: "#21252b", raised: "#2c313a", border: "#3e4451",
      muted: "#9199a5", text: "#abb2bf", strong: "#ffffff", link: "#61afef", linkHover: "#56b6c2" }) },
    catppuccin: { label: "Catppuccin Mocha", scheme: "dark", vars: pal({
      bg: "#1e1e2e", surface: "#181825", raised: "#313244", border: "#45475a",
      muted: "#a6adc8", text: "#cdd6f4", strong: "#ffffff", link: "#89b4fa", linkHover: "#b4befe" }) },
    "high-contrast": { label: "High contrast", scheme: "light", vars: pal({
      bg: "#ffffff", surface: "#ffffff", raised: "#f0f0f0", border: "#000000",
      muted: "#000000", text: "#000000", strong: "#000000", link: "#0033cc", linkHover: "#0033cc" }) },
    // "custom": the six pickers below are written inline by apply(); its
    // light/dark scheme follows the chosen background.
    custom: { label: "Custom…", scheme: "custom", vars: {} }
  };
  // Custom theme → palette (primary is left to the accent picker / eLabFTW).
  function customVars(c) {
    var v = pal({ bg: c.bg, surface: c.surface, raised: c.surface, border: c.border,
      muted: c.text, text: c.text, strong: c.heading, link: c.link, linkHover: c.link });
    delete v["--primary"]; delete v["--primary-fg"];
    return v;
  }
  var CUSTOM_INLINE = Object.keys(customVars(DEFAULT_CUSTOM_THEME));
  var ACCENT_INLINE = ["--primary", "--primary-fg", "--link", "--link-hover"];

  // Accent color is chosen with a native color picker (color wheel / RGB hex).
  // "" = unset: eLabFTW's own primary (user control panel in 6.0+) is used.
  var ACCENT_DEFAULT = "#29aeb9"; // only the picker's initial swatch
  // Fonts are picked separately for Latin and Japanese text, then merged into a
  // single font-family stack: "<Latin families>, <Japanese families>, <generic>".
  // The browser uses the Latin font for ASCII and falls through to the Japanese
  // font for CJK glyphs. `stack` lists ONLY specific families (no generic
  // keyword) so the Japanese fonts stay reachable; one generic is appended last.
  var LATIN_FONTS = {
    system:  { label: "System (default)",   stack: '-apple-system,BlinkMacSystemFont,"Segoe UI"', generic: "sans-serif" },
    times:   { label: "Times New Roman",    stack: '"Times New Roman",Times', generic: "serif" },
    georgia: { label: "Georgia",            stack: "Georgia", generic: "serif" },
    serif:   { label: "Serif (generic)",    stack: "", generic: "serif" },
    arial:   { label: "Arial / Helvetica",  stack: "Arial,Helvetica", generic: "sans-serif" },
    courier: { label: "Courier New",        stack: '"Courier New",Courier', generic: "monospace" },
    mono:    { label: "Monospace",          stack: '"SFMono-Regular",Menlo,Consolas', generic: "monospace" }
  };

  var JP_FONTS = {
    system:     { label: "システム既定",      stack: '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic UI",Meiryo' },
    gothic:     { label: "ゴシック (角ゴ)",    stack: '"Hiragino Kaku Gothic ProN","Yu Gothic","YuGothic","Noto Sans JP",Meiryo' },
    mincho:     { label: "明朝",              stack: '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP"' },
    maru:       { label: "丸ゴシック",         stack: '"Hiragino Maru Gothic ProN","Rounded Mplus 1c"' },
    noto_sans:  { label: "Noto Sans JP",      stack: '"Noto Sans JP","Noto Sans CJK JP"' },
    noto_serif: { label: "Noto Serif JP",     stack: '"Noto Serif JP","Noto Serif CJK JP"' }
  };

  // Monospace fonts for code blocks (independent of the body font). Each ends
  // with a CJK-mono + generic fallback so Japanese in code still renders. Only
  // fonts actually installed on the reader's system take effect.
  var CJK_MONO = '"Noto Sans Mono CJK JP",monospace';
  var CODE_FONTS = {
    "system-mono":     { label: "System mono",     stack: '"SFMono-Regular",Menlo,Consolas,' + CJK_MONO },
    courier:           { label: "Courier New",     stack: '"Courier New",Courier,' + CJK_MONO },
    consolas:          { label: "Consolas",        stack: 'Consolas,"SFMono-Regular",Menlo,' + CJK_MONO },
    menlo:             { label: "Menlo / Monaco",  stack: 'Menlo,Monaco,' + CJK_MONO },
    "jetbrains-mono":  { label: "JetBrains Mono",  stack: '"JetBrains Mono","SFMono-Regular",' + CJK_MONO },
    "fira-code":       { label: "Fira Code",       stack: '"Fira Code","SFMono-Regular",' + CJK_MONO },
    "source-code-pro": { label: "Source Code Pro", stack: '"Source Code Pro","SFMono-Regular",' + CJK_MONO },
    "roboto-mono":     { label: "Roboto Mono",     stack: '"Roboto Mono","SFMono-Regular",' + CJK_MONO },
    "ibm-plex-mono":   { label: "IBM Plex Mono",   stack: '"IBM Plex Mono","SFMono-Regular",' + CJK_MONO },
    "cascadia-code":   { label: "Cascadia Code",   stack: '"Cascadia Code","Cascadia Mono","SFMono-Regular",' + CJK_MONO }
  };
  var CODE_FONT_DEFAULT = "system-mono";

  var DENSITIES = { comfortable: "Comfortable", compact: "Compact" };

  var state = {
    theme: get("theme", "native"),
    accent: get("accent", ""),
    fontLatin: get("fontLatin", "system"),
    fontJa: get("fontJa", "system"),
    density: get("density", "comfortable"),
    code: get("code", "on"),
    codewrap: get("codewrap", "off"),
    codetheme: get("codetheme", "vscode-dark"),
    codefont: get("codefont", "system-mono"),
    customTheme: getJSON("customTheme", DEFAULT_CUSTOM_THEME),
    customCode: getJSON("customCode", DEFAULT_CUSTOM_CODE)
  };
  // Migration from v2/v3 (which drove --bs-* variables): the old "light" preset
  // is now "follow eLabFTW", and the old always-on default accent becomes unset
  // so eLabFTW's own primary color shows through.
  if (get("schema", "") !== "4") {
    if (state.theme === "light") { state.theme = "native"; set("theme", "native"); }
    if (state.accent === ACCENT_DEFAULT) { state.accent = ""; set("accent", ""); }
    set("schema", "4");
  }

  // Extra coverage for dark schemes. eLabFTW recolors inputs, tables,
  // dropdowns, lists, alerts and blockquotes through its variables already;
  // these Bootstrap utility/component classes are the ones it leaves at their
  // hard-coded light colors.
  function darkExtrasCss(sel) {
    return (
      sel + " .card," + sel + " .bg-white," + sel + " .bg-light," + sel + " .custom-select," +
      sel + " .popover{background-color:var(--white)!important;color:var(--mediumstrong);" +
        "border-color:var(--firstlevel);}\n" +
      sel + " .popover-body{color:var(--mediumstrong);}\n"
    );
  }

  // eLabFTW renders the note body into #body_view. Injected content (e.g. PAM
  // snapshot tables) hard-codes light backgrounds, #ddd borders and sometimes
  // dark text via INLINE styles, which a dark page can't fix through variables
  // alone. Scope an override to #body_view: clear opaque light backgrounds so
  // the dark page shows through, lighten text that doesn't set its own color,
  // and re-tint hard-coded borders. Links and code blocks are left untouched
  // (links keep their color; <pre>/<code> keep the code-block styling).
  function darkBodyCss(sel) {
    var bv = sel + " #body_view ";
    var bgEls =
      "div,p,span,section,article,ul,ol,li,table,thead,tbody,tr,th,td,h1,h2,h3,h4,h5,h6,blockquote,dl,dt,dd";
    var txtEls = "div,p,span,li,th,td,h1,h2,h3,h4,h5,h6,blockquote,dt,dd";
    function expand(list, decl) {
      return (
        list.split(",").map(function (t) { return bv + t; }).join(",") +
        "{" + decl + "}\n"
      );
    }
    return (
      sel + " #body_view{background-color:transparent!important;}\n" +
      expand(bgEls, "background-color:transparent!important;") +
      // non-important: inline-colored elements (e.g. a red callout) keep their color
      expand(txtEls, "color:var(--mediumstrong);") +
      bv + "table," + bv + "th," + bv + "td{border-color:var(--firstlevel)!important;}\n"
    );
  }

  // --- stylesheet generation ------------------------------------------------
  function buildThemeCss() {
    var css = "";
    // one block of eLabFTW variables per preset (native and custom set none here)
    Object.keys(THEMES).forEach(function (key) {
      var t = THEMES[key];
      var body = "";
      Object.keys(t.vars).forEach(function (v) { body += v + ":" + t.vars[v] + ";"; });
      if (body) css += 'html[data-elab-theme="' + key + '"]{' + body + "}\n";
    });
    // scheme-level rules (apply() sets data-elab-scheme from the theme, or from
    // the custom background's luminance)
    var dark = 'html[data-elab-scheme="dark"]';
    css += dark + "{color-scheme:dark;}\n";
    css += 'html[data-elab-scheme="light"]{color-scheme:light;}\n';
    css += darkExtrasCss(dark) + darkBodyCss(dark);

    // font — apply across the whole body, but never to icon fonts (Font Awesome /
    // Material) or to code/monospace, or eLabFTW's glyphs turn into plain letters.
    css +=
      "html[style*='--elab-font'] body," +
      "html[style*='--elab-font'] body :not(i):not(svg):not(.fa):not(.fas):not(.far)" +
      ":not(.fab):not(.fal):not(.fad):not([class*='fa-']):not(.material-icons)" +
      ":not(code):not(pre):not(kbd):not(samp):not(.elab-copy)" +
      "{font-family:var(--elab-font)!important;}\n";

    // compact density (Bootstrap 4 class names)
    css +=
      'html[data-elab-density="compact"] .card-body,html[data-elab-density="compact"] .box{padding:.5rem .75rem;}\n' +
      'html[data-elab-density="compact"] .table td,html[data-elab-density="compact"] .table th{padding:.25rem .4rem;}\n' +
      'html[data-elab-density="compact"] .form-control,html[data-elab-density="compact"] .custom-select{padding:.2rem .5rem;}\n' +
      'html[data-elab-density="compact"] .nav-link{padding:.25rem .5rem;}\n' +
      'html[data-elab-density="compact"] .mb-3{margin-bottom:.5rem!important;}\n' +
      'html[data-elab-density="compact"] p{margin-bottom:.4rem;}\n';

    css += buildCodeCss();
    return css;
  }

  // --- code block color schemes (pick freely) -------------------------------
  // Each palette is exposed as --ec-* vars and reused by BOTH highlight.js
  // (.hljs-*) and eLabFTW's own Prism (.token.*), so a real <pre> block gets
  // full multi-color highlighting whichever engine tokenized it.
  var CODE_THEMES = {
    "vscode-dark": { label: "VS Code Dark+", p: {
      bg: "#1e1e1e", fg: "#d4d4d4", comment: "#6a9955", kw: "#569cd6",
      str: "#ce9178", num: "#b5cea8", fn: "#dcdcaa", title: "#4ec9b0",
      attr: "#9cdcfe", meta: "#569cd6", punc: "#d4d4d4" } },
    "vscode-light": { label: "VS Code Light", p: {
      bg: "#ffffff", fg: "#1e1e1e", comment: "#008000", kw: "#0000ff",
      str: "#a31515", num: "#098658", fn: "#795e26", title: "#267f99",
      attr: "#e50000", meta: "#0000ff", punc: "#1e1e1e" } },
    "github-dark": { label: "GitHub Dark", p: {
      bg: "#0d1117", fg: "#c9d1d9", comment: "#8b949e", kw: "#ff7b72",
      str: "#a5d6ff", num: "#79c0ff", fn: "#d2a8ff", title: "#d2a8ff",
      attr: "#7ee787", meta: "#ffa657", punc: "#c9d1d9" } },
    "github-light": { label: "GitHub Light", p: {
      bg: "#f6f8fa", fg: "#24292e", comment: "#6a737d", kw: "#d73a49",
      str: "#032f62", num: "#005cc5", fn: "#6f42c1", title: "#6f42c1",
      attr: "#22863a", meta: "#e36209", punc: "#24292e" } },
    monokai: { label: "Monokai", p: {
      bg: "#272822", fg: "#f8f8f2", comment: "#75715e", kw: "#f92672",
      str: "#e6db74", num: "#ae81ff", fn: "#a6e22e", title: "#a6e22e",
      attr: "#66d9ef", meta: "#f92672", punc: "#f8f8f2" } },
    dracula: { label: "Dracula", p: {
      bg: "#282a36", fg: "#f8f8f2", comment: "#6272a4", kw: "#ff79c6",
      str: "#f1fa8c", num: "#bd93f9", fn: "#50fa7b", title: "#8be9fd",
      attr: "#50fa7b", meta: "#ff79c6", punc: "#f8f8f2" } },
    nord: { label: "Nord", p: {
      bg: "#2e3440", fg: "#d8dee9", comment: "#616e88", kw: "#81a1c1",
      str: "#a3be8c", num: "#b48ead", fn: "#88c0d0", title: "#8fbcbb",
      attr: "#8fbcbb", meta: "#81a1c1", punc: "#d8dee9" } },
    "one-dark": { label: "One Dark", p: {
      bg: "#282c34", fg: "#abb2bf", comment: "#5c6370", kw: "#c678dd",
      str: "#98c379", num: "#d19a66", fn: "#61afef", title: "#e5c07b",
      attr: "#56b6c2", meta: "#c678dd", punc: "#abb2bf" } },
    "shades-of-purple": { label: "Shades of Purple", p: {
      bg: "#2d2b55", fg: "#ffffff", comment: "#b362ff", kw: "#ff9d00",
      str: "#a5ff90", num: "#ff628c", fn: "#fad000", title: "#fb94ff",
      attr: "#fad000", meta: "#ff9d00", punc: "#ffffff" } },
    "solarized-dark": { label: "Solarized Dark", p: {
      bg: "#002b36", fg: "#839496", comment: "#586e75", kw: "#859900",
      str: "#2aa198", num: "#d33682", fn: "#268bd2", title: "#b58900",
      attr: "#268bd2", meta: "#cb4b16", punc: "#839496" } },
    "gruvbox-dark": { label: "Gruvbox Dark", p: {
      bg: "#282828", fg: "#ebdbb2", comment: "#928374", kw: "#fb4934",
      str: "#b8bb26", num: "#d3869b", fn: "#fabd2f", title: "#8ec07c",
      attr: "#83a598", meta: "#fe8019", punc: "#ebdbb2" } },
    "tokyo-night": { label: "Tokyo Night", p: {
      bg: "#1a1b26", fg: "#a9b1d6", comment: "#565f89", kw: "#bb9af7",
      str: "#9ece6a", num: "#ff9e64", fn: "#7aa2f7", title: "#2ac3de",
      attr: "#73daca", meta: "#bb9af7", punc: "#a9b1d6" } },
    "night-owl": { label: "Night Owl", p: {
      bg: "#011627", fg: "#d6deeb", comment: "#637777", kw: "#c792ea",
      str: "#ecc48d", num: "#f78c6c", fn: "#82aaff", title: "#ffcb8b",
      attr: "#addb67", meta: "#c792ea", punc: "#d6deeb" } },
    "ayu-dark": { label: "Ayu Dark", p: {
      bg: "#0a0e14", fg: "#b3b1ad", comment: "#626a73", kw: "#ff8f40",
      str: "#c2d94c", num: "#e6b450", fn: "#ffb454", title: "#59c2ff",
      attr: "#95e6cb", meta: "#ff8f40", punc: "#b3b1ad" } },
    "material-ocean": { label: "Material Ocean", p: {
      bg: "#0f111a", fg: "#a6accd", comment: "#464b5d", kw: "#c792ea",
      str: "#c3e88d", num: "#f78c6c", fn: "#82aaff", title: "#ffcb6b",
      attr: "#89ddff", meta: "#c792ea", punc: "#a6accd" } },
    cobalt2: { label: "Cobalt2", p: {
      bg: "#193549", fg: "#ffffff", comment: "#0088ff", kw: "#ff9d00",
      str: "#3ad900", num: "#ff628c", fn: "#ffdd00", title: "#80ffbb",
      attr: "#9effff", meta: "#ff9d00", punc: "#ffffff" } },
    custom: { label: "Custom…", p: {
      bg: "#1e1e1e", fg: "#d4d4d4", comment: "#6a9955", kw: "#569cd6",
      str: "#ce9178", num: "#b5cea8", fn: "#dcdcaa", title: "#4ec9b0",
      attr: "#9cdcfe", meta: "#569cd6", punc: "#d4d4d4" } }
  };
  var CODE_THEME_DEFAULT = "vscode-dark";

  function ecVars(p) {
    return (
      "--ec-bg:" + p.bg + ";--ec-fg:" + p.fg + ";--ec-comment:" + p.comment +
      ";--ec-kw:" + p.kw + ";--ec-str:" + p.str + ";--ec-num:" + p.num +
      ";--ec-fn:" + p.fn + ";--ec-title:" + p.title + ";--ec-attr:" + p.attr +
      ";--ec-meta:" + p.meta + ";--ec-punc:" + p.punc + ";"
    );
  }

  function buildCodeCss() {
    // font-family comes from --elab-code-font (set by the Code font picker),
    // falling back to the system monospace stack if unset.
    var mono =
      'font-family:var(--elab-code-font,"SFMono-Regular",Menlo,Consolas,"Noto Sans Mono CJK JP",monospace);';
    var on = 'html[data-elab-code="on"] ';
    // default palette on <html>, plus one rule per selectable code theme
    var c = "html{" + ecVars(CODE_THEMES[CODE_THEME_DEFAULT].p) + "}\n";
    Object.keys(CODE_THEMES).forEach(function (k) {
      c += 'html[data-elab-codetheme="' + k + '"]{' + ecVars(CODE_THEMES[k].p) + "}\n";
    });

    // real <pre> code blocks — force the dark editor background over any Prism theme
    c +=
      on + "pre{background:var(--ec-bg)!important;color:var(--ec-fg)!important;" +
      "padding:.85rem 1rem;border-radius:8px;overflow:auto;position:relative;" +
      mono + "font-size:.85em;line-height:1.5;}\n";
    c += on + "pre code{background:transparent!important;color:inherit!important;padding:0;font-size:inherit;}\n";
    // Prism themes add a text-shadow "glow" that reads as blur on a dark bg — kill it
    c += on + "pre," + on + "pre *{text-shadow:none!important;}\n";
    // ...and a semi-transparent bg box on operators (=, +, …) — clear all token bgs
    c += on + "pre .token{background:transparent!important;}\n";
    c +=
      'html[data-elab-code-wrap="on"] pre,html[data-elab-code-wrap="on"] pre code' +
      "{white-space:pre-wrap;word-break:break-word;}\n";

    // highlight.js tokens
    var h = on + ".hljs ";
    c += on + ".hljs{background:transparent;color:var(--ec-fg);}\n";
    c += h + ".hljs-comment," + h + ".hljs-quote{color:var(--ec-comment);font-style:italic;}\n";
    c += h + ".hljs-keyword," + h + ".hljs-selector-tag," + h + ".hljs-literal," + h + ".hljs-built_in{color:var(--ec-kw);}\n";
    c += h + ".hljs-string," + h + ".hljs-regexp," + h + ".hljs-symbol{color:var(--ec-str);}\n";
    c += h + ".hljs-number," + h + ".hljs-bullet{color:var(--ec-num);}\n";
    c += h + ".hljs-function .hljs-title," + h + ".hljs-title.function_{color:var(--ec-fn);}\n";
    c += h + ".hljs-title," + h + ".hljs-class .hljs-title," + h + ".hljs-type{color:var(--ec-title);}\n";
    c += h + ".hljs-attr," + h + ".hljs-attribute," + h + ".hljs-name," + h + ".hljs-tag{color:var(--ec-attr);}\n";
    c += h + ".hljs-meta," + h + ".hljs-meta .hljs-keyword{color:var(--ec-meta);}\n";

    // eLabFTW / Prism tokens (.token.*) — same palette so a code sample block colors correctly
    var t = on + "pre .token.", tc = "{color:var(--ec-";
    c += t + "comment," + t + "prolog," + t + "doctype," + t + "cdata" + tc + "comment);font-style:italic;}\n";
    c += t + "keyword," + t + "boolean," + t + "atrule," + t + "selector" + tc + "kw);}\n";
    c += t + "string," + t + "char," + t + "attr-value," + t + "regex" + tc + "str);}\n";
    c += t + "number," + t + "constant" + tc + "num);}\n";
    c += t + "function," + t + "class-name" + tc + "fn);}\n";
    c += t + "builtin," + t + "tag" + tc + "title);}\n";
    c += t + "property," + t + "attr-name," + t + "variable" + tc + "attr);}\n";
    c += t + "operator," + t + "punctuation" + tc + "punc);}\n";
    c += t + "important" + tc + "meta);}\n";

    // copy button
    c +=
      on + "pre .elab-copy{position:absolute;top:6px;right:6px;padding:2px 8px;" +
      "font-size:11px;border-radius:5px;cursor:pointer;opacity:.55;" +
      "border:1px solid var(--ec-comment);background:var(--ec-bg);color:var(--ec-fg);}\n";
    c += on + "pre .elab-copy:hover{opacity:1;}\n";
    return c;
  }

  // launcher + panel chrome (bottom-LEFT to avoid eLabFTW's own bottom-right widget)
  var PANEL_CSS =
    "#elab-theme-btn{position:fixed;left:16px;bottom:16px;z-index:99999;" +
    "width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;" +
    "background:var(--primary,#2c6fbb);color:var(--primary-fg,#fff);font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,.3);}\n" +
    "#elab-theme-panel{position:fixed;left:16px;bottom:70px;z-index:99999;width:260px;" +
    "max-width:90vw;background:var(--white,#fff);color:var(--mediumstrong,#222);" +
    "border:1px solid var(--firstlevel,#ccc);border-radius:10px;padding:14px;" +
    "box-shadow:0 4px 20px rgba(0,0,0,.25);font-size:13px;display:none;}\n" +
    "#elab-theme-panel.open{display:block;}\n" +
    "#elab-theme-panel h6{margin:0 0 8px;font-size:13px;font-weight:700;}\n" +
    "#elab-theme-panel label{display:block;margin:10px 0 3px;font-size:12px;opacity:.8;}\n" +
    "#elab-theme-panel select{width:100%;padding:4px;border-radius:6px;" +
    "border:1px solid var(--firstlevel,#ccc);background:var(--white,#fff);color:inherit;}\n" +
    "#elab-theme-panel .elab-accent-row{display:flex;gap:6px;align-items:center;}\n" +
    "#elab-theme-panel input[type=color]{flex:1;height:30px;padding:0;cursor:pointer;" +
    "border:1px solid var(--firstlevel,#ccc);border-radius:6px;background:transparent;}\n" +
    "#elab-accent-clear{padding:4px 8px;border-radius:6px;cursor:pointer;font-size:12px;" +
    "border:1px solid var(--firstlevel,#ccc);background:transparent;color:inherit;}\n" +
    "#elab-theme-panel .elab-custom{display:none;margin:6px 0 2px;padding:8px;border-radius:8px;" +
    "border:1px solid var(--firstlevel,#ccc);}\n" +
    "#elab-theme-panel .elab-crow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0;}\n" +
    "#elab-theme-panel .elab-crow span{font-size:12px;opacity:.85;}\n" +
    "#elab-theme-panel .elab-crow input[type=color]{flex:0 0 44px;height:24px;}\n" +
    "#elab-theme-reset{margin-top:12px;width:100%;padding:6px;border-radius:6px;cursor:pointer;" +
    "border:1px solid var(--firstlevel,#ccc);background:transparent;color:inherit;}\n";

  function injectBaseCss() {
    var css = buildThemeCss() + PANEL_CSS;
    // GM_addStyle injects via the userscript sandbox, so it works under a strict CSP.
    if (typeof GM_addStyle === "function") {
      if (!window.__elabCssInjected) {
        GM_addStyle(css);
        window.__elabCssInjected = true;
      }
      return;
    }
    var el = document.getElementById("elab-theme-style");
    if (!el) {
      el = document.createElement("style");
      el.id = "elab-theme-style";
      (document.head || root).appendChild(el);
    }
    el.textContent = css;
  }

  // --- apply state to <html> ------------------------------------------------
  // What the server rendered before we touched anything: eLabFTW's own theme
  // classes and the per-user primary color it may have put inline on <html>.
  // Restored whenever the user goes back to "eLabFTW setting" / clears accent.
  var NATIVE = { classes: [], inline: {}, taken: false };
  function snapshotNative() {
    if (NATIVE.taken) return;
    NATIVE.taken = true;
    NATIVE.classes = ["dark-mode", "midnight"].filter(function (c) { return root.classList.contains(c); });
    ["--primary", "--primary-fg"].forEach(function (v) { NATIVE.inline[v] = root.style.getPropertyValue(v); });
  }
  function restoreInline(v) {
    if (NATIVE.inline[v]) root.style.setProperty(v, NATIVE.inline[v]);
    else root.style.removeProperty(v);
  }
  function currentScheme() {
    if (state.theme === "custom") return isDark(state.customTheme.bg) ? "dark" : "light";
    var t = THEMES[state.theme] || THEMES.native;
    return t.scheme; // "dark" | "light" | null (native)
  }
  var lastScheme = null;

  function apply() {
    snapshotNative();
    var scheme = currentScheme();
    root.setAttribute("data-elab-theme", state.theme);
    if (scheme) root.setAttribute("data-elab-scheme", scheme);
    else root.removeAttribute("data-elab-scheme");
    // eLabFTW's secondary palette (alerts, modals, close buttons, status colors)
    // keys off html.dark-mode / html.midnight, so a dark preset borrows
    // .dark-mode and a light preset drops both. "native" leaves the classes
    // alone except when coming back from a preset, when the server's are restored.
    if (scheme) {
      root.classList.remove("midnight");
      root.classList.toggle("dark-mode", scheme === "dark");
    } else if (lastScheme) {
      root.classList.remove("dark-mode", "midnight");
      NATIVE.classes.forEach(function (c) { root.classList.add(c); });
    }
    lastScheme = scheme;

    root.setAttribute("data-elab-density", state.density);
    root.setAttribute("data-elab-code", state.code);
    root.setAttribute("data-elab-code-wrap", state.codewrap);
    root.setAttribute("data-elab-codetheme", state.codetheme);
    root.style.setProperty(
      "--elab-code-font",
      (CODE_FONTS[state.codefont] || CODE_FONTS[CODE_FONT_DEFAULT]).stack
    );

    // Custom page theme: write eLabFTW's variables inline; clear them for presets
    // (presets set them via CSS, so leftover inline values must go).
    var cv = customVars(state.customTheme);
    CUSTOM_INLINE.forEach(function (v) {
      if (state.theme === "custom") root.style.setProperty(v, cv[v]);
      else root.style.removeProperty(v);
    });

    // Accent: eLabFTW's primary + links. Inline beats the preset's CSS value and
    // the primary color from the user control panel; clearing it puts the
    // server's inline value back (or removes ours).
    if (state.accent) {
      root.style.setProperty("--primary", state.accent);
      root.style.setProperty("--primary-fg", fgFor(state.accent));
      root.style.setProperty("--link", state.accent);
      root.style.setProperty("--link-hover", state.accent);
    } else {
      restoreInline("--primary");
      restoreInline("--primary-fg");
      if (state.theme !== "custom") {
        root.style.removeProperty("--link");
        root.style.removeProperty("--link-hover");
      }
    }

    // Custom code theme: drive --ec-* inline; clear them for preset code themes.
    var EC_MAP = {
      "--ec-bg": "bg", "--ec-fg": "fg", "--ec-comment": "comment", "--ec-kw": "kw",
      "--ec-str": "str", "--ec-num": "num", "--ec-fn": "fn", "--ec-title": "title",
      "--ec-attr": "attr", "--ec-meta": "meta", "--ec-punc": "fg"
    };
    Object.keys(EC_MAP).forEach(function (v) {
      if (state.codetheme === "custom") root.style.setProperty(v, state.customCode[EC_MAP[v]]);
      else root.style.removeProperty(v);
    });

    var lat = LATIN_FONTS[state.fontLatin] || LATIN_FONTS.system;
    var jp = JP_FONTS[state.fontJa] || JP_FONTS.system;
    if (state.fontLatin === "system" && state.fontJa === "system") {
      root.style.removeProperty("--elab-font"); // both default → leave eLabFTW's own font
    } else {
      var parts = [];
      if (lat.stack) parts.push(lat.stack); // Latin families first (handle ASCII)
      if (jp.stack) parts.push(jp.stack); //  then Japanese families (handle CJK)
      parts.push(lat.generic || "sans-serif"); // single generic fallback at the end
      root.style.setProperty("--elab-font", parts.join(","));
    }
  }

  // --- UI -------------------------------------------------------------------
  function opt(value, label, selected) {
    return (
      '<option value="' + value + '"' + (selected ? " selected" : "") + ">" +
      label + "</option>"
    );
  }

  function buildPanel() {
    var btn = document.createElement("button");
    btn.id = "elab-theme-btn";
    btn.title = "Customize appearance";
    btn.textContent = "🎨";

    var panel = document.createElement("div");
    panel.id = "elab-theme-panel";

    var themeOpts = Object.keys(THEMES)
      .map(function (k) { return opt(k, THEMES[k].label, state.theme === k); })
      .join("");
    var latinOpts = Object.keys(LATIN_FONTS)
      .map(function (k) { return opt(k, LATIN_FONTS[k].label, state.fontLatin === k); })
      .join("");
    var jaOpts = Object.keys(JP_FONTS)
      .map(function (k) { return opt(k, JP_FONTS[k].label, state.fontJa === k); })
      .join("");
    var densOpts = Object.keys(DENSITIES)
      .map(function (k) { return opt(k, DENSITIES[k], state.density === k); })
      .join("");
    var codeThemeOpts = Object.keys(CODE_THEMES)
      .map(function (k) { return opt(k, CODE_THEMES[k].label, state.codetheme === k); })
      .join("");
    var codeFontOpts = Object.keys(CODE_FONTS)
      .map(function (k) { return opt(k, CODE_FONTS[k].label, state.codefont === k); })
      .join("");
    var onoff = function (cur) {
      return opt("on", "On", cur === "on") + opt("off", "Off", cur === "off");
    };
    var colorRows = function (prefix, fields, map) {
      return fields.map(function (f) {
        return '<div class="elab-crow"><span>' + f[1] + "</span>" +
          '<input type="color" id="' + prefix + f[0] + '" value="' + (map[f[0]] || "#000000") + '"></div>';
      }).join("");
    };

    panel.innerHTML =
      "<h6>🎨 Appearance</h6>" +
      '<label>Theme</label><select id="elab-sel-theme">' + themeOpts + "</select>" +
      '<div id="elab-custom-theme" class="elab-custom">' +
      colorRows("elab-ct-", CUSTOM_THEME_FIELDS, state.customTheme) + "</div>" +
      "<label>Accent color</label>" +
      '<div class="elab-accent-row">' +
      '<input type="color" id="elab-sel-accent" value="' + (state.accent || ACCENT_DEFAULT) + '">' +
      '<button type="button" id="elab-accent-clear">Default</button>' +
      "</div>" +
      '<label>Font · English / Latin</label><select id="elab-sel-font-latin">' + latinOpts + "</select>" +
      '<label>Font · 日本語</label><select id="elab-sel-font-ja">' + jaOpts + "</select>" +
      '<label>Density</label><select id="elab-sel-density">' + densOpts + "</select>" +
      '<label>Code highlight</label><select id="elab-sel-code">' + onoff(state.code) + "</select>" +
      '<label>Code theme</label><select id="elab-sel-codetheme">' + codeThemeOpts + "</select>" +
      '<div id="elab-custom-code" class="elab-custom">' +
      colorRows("elab-cc-", CUSTOM_CODE_FIELDS, state.customCode) + "</div>" +
      '<label>Code font</label><select id="elab-sel-codefont">' + codeFontOpts + "</select>" +
      '<label>Code wrap</label><select id="elab-sel-codewrap">' + onoff(state.codewrap) + "</select>" +
      '<button id="elab-theme-reset">Reset to default</button>';

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    btn.addEventListener("click", function () { panel.classList.toggle("open"); });

    function bind(id, key, after) {
      panel.querySelector(id).addEventListener("change", function (e) {
        state[key] = e.target.value;
        set(key, e.target.value);
        apply();
        if (after) after();
      });
    }
    // show the matching custom color pickers only when "Custom…" is selected
    function toggleCustom() {
      panel.querySelector("#elab-custom-theme").style.display =
        state.theme === "custom" ? "block" : "none";
      panel.querySelector("#elab-custom-code").style.display =
        state.codetheme === "custom" ? "block" : "none";
    }

    bind("#elab-sel-theme", "theme", toggleCustom);
    bind("#elab-sel-font-latin", "fontLatin");
    bind("#elab-sel-font-ja", "fontJa");
    bind("#elab-sel-density", "density");
    bind("#elab-sel-code", "code", enhanceAll);
    bind("#elab-sel-codetheme", "codetheme", toggleCustom);
    bind("#elab-sel-codefont", "codefont");
    bind("#elab-sel-codewrap", "codewrap");
    toggleCustom();

    // custom color pickers → write into the JSON maps and re-apply live
    function wireCustom(prefix, fields, stateKey, storeKey) {
      fields.forEach(function (f) {
        panel.querySelector("#" + prefix + f[0]).addEventListener("input", function (e) {
          state[stateKey][f[0]] = e.target.value;
          setJSON(storeKey, state[stateKey]);
          apply();
        });
      });
    }
    wireCustom("elab-ct-", CUSTOM_THEME_FIELDS, "customTheme", "customTheme");
    wireCustom("elab-cc-", CUSTOM_CODE_FIELDS, "customCode", "customCode");

    // accent: native color picker (color wheel / RGB) + Default to clear
    var accentInput = panel.querySelector("#elab-sel-accent");
    accentInput.addEventListener("input", function (e) {
      state.accent = e.target.value;
      set("accent", e.target.value);
      apply();
    });
    panel.querySelector("#elab-accent-clear").addEventListener("click", function () {
      state.accent = "";
      set("accent", "");
      accentInput.value = ACCENT_DEFAULT;
      apply();
    });

    panel.querySelector("#elab-theme-reset").addEventListener("click", function () {
      ["theme", "accent", "fontLatin", "fontJa", "density", "code", "codewrap",
        "codetheme", "codefont", "customTheme", "customCode"].forEach(function (k) {
        try { localStorage.removeItem(NS + k); } catch (e) {}
      });
      set("schema", "4");
      state = {
        theme: "native", accent: "", fontLatin: "system", fontJa: "system",
        density: "comfortable", code: "on", codewrap: "off", codetheme: "vscode-dark",
        codefont: "system-mono",
        customTheme: Object.assign({}, DEFAULT_CUSTOM_THEME),
        customCode: Object.assign({}, DEFAULT_CUSTOM_CODE)
      };
      apply();
      btn.remove();
      panel.remove();
      buildPanel();
    });
  }

  // --- code blocks ----------------------------------------------------------
  function getHljs() {
    try { if (typeof hljs !== "undefined") return hljs; } catch (e) {}
    return window.hljs || null;
  }

  function addCopyButton(pre, code) {
    if (state.code !== "on" || pre.querySelector(".elab-copy")) return;
    var btn = document.createElement("button");
    btn.className = "elab-copy";
    btn.type = "button";
    btn.textContent = "Copy";
    btn.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code.innerText).then(function () {
          btn.textContent = "✓";
          setTimeout(function () { btn.textContent = "Copy"; }, 1200);
        }, function () {});
      }
    });
    pre.appendChild(btn);
  }

  function enhanceBlock(pre) {
    if (!pre || pre.dataset.elabDone) return;
    var code = pre.querySelector("code") || pre;
    // skip blocks already highlighted by eLabFTW/Prism (.token) or hljs (.hljs)
    if (
      code.classList.contains("hljs") ||
      code.querySelector(".token") ||
      pre.querySelector(".token")
    ) {
      pre.dataset.elabDone = "1";
    } else if (state.code === "on" && getHljs()) {
      try { getHljs().highlightElement(code); } catch (e) {}
      pre.dataset.elabDone = "1";
    }
    addCopyButton(pre, code);
  }

  function enhanceAll() {
    if (state.code !== "on") return;
    document.querySelectorAll("pre").forEach(enhanceBlock);
  }

  // Are we on a page where the rich-text editor is active? If so, NEVER rewrite
  function watchCode() {
    if (!window.MutationObserver) return;
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === "PRE") enhanceBlock(n);
          else if (n.querySelectorAll) n.querySelectorAll("pre").forEach(enhanceBlock);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // --- boot -----------------------------------------------------------------
  function init() {
    if (!isElabFTW()) return; // not an eLabFTW page → do nothing
    snapshotNative();
    injectBaseCss();
    apply();
    buildPanel();
    enhanceAll();
    watchCode();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
