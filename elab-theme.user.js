// ==UserScript==
// @name         eLabFTW Theme
// @namespace    https://github.com/ShogoTakasuka/elabftw-theme
// @version      2.8.0
// @description  Restyle any eLabFTW instance — themes, accent color, font, density & code syntax highlighting. Per-user, no server changes, version-resilient.
// @description:ja eLabFTW を本体無改造で着せ替え（テーマ/アクセント/フォント/余白/コード視認性）。設定は各自のブラウザにのみ保存。
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
 *   - Sets data-* attributes / CSS custom properties on <html>; the actual
 *     colors come from overriding Bootstrap 5 CSS variables (--bs-*), so it
 *     keeps working even when eLabFTW changes class names (= upgrade resilient).
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
  function isElabFTW() {
    try {
      // 1) assets referencing elabftw
      if (
        document.querySelector('link[href*="elabftw" i], script[src*="elabftw" i]')
      )
        return true;
      // 2) <meta name="generator" content="eLabFTW ...">
      var m = document.querySelector('meta[name="generator" i]');
      if (m && /elabftw/i.test(m.content || "")) return true;
      // 3) footer string "Powered by eLabFTW"
      if (document.body && /powered by elabftw/i.test(document.body.textContent))
        return true;
      // 4) navbar brand
      var b = document.querySelector('.navbar-brand, a[href*="dashboard.php"]');
      if (b && /elabftw/i.test(b.textContent || "")) return true;
    } catch (e) {}
    return false;
  }

  // --- theme definitions (edit freely) --------------------------------------
  // Each theme is a set of Bootstrap 5 CSS variables to override.
  var THEMES = {
    light: { label: "Light (default)", vars: {} },
    dark: {
      label: "Dark",
      scheme: "dark",
      vars: {
        "--bs-body-bg": "#1b1e24",
        "--bs-body-color": "#e6e9ef",
        "--bs-secondary-bg": "#252a33",
        "--bs-tertiary-bg": "#2d333d",
        "--bs-secondary-color": "#b9c2d0",
        "--bs-emphasis-color": "#ffffff",
        "--bs-border-color": "#3a414d",
        "--bs-link-color": "#7db1ff",
        "--bs-link-hover-color": "#a7caff",
        "--bs-heading-color": "#f1f4f9"
      }
    },
    midnight: {
      label: "Midnight (OLED black)",
      scheme: "dark",
      vars: {
        "--bs-body-bg": "#000000",
        "--bs-body-color": "#e4e7ec",
        "--bs-secondary-bg": "#0d0f12",
        "--bs-tertiary-bg": "#16191e",
        "--bs-secondary-color": "#aeb6c2",
        "--bs-emphasis-color": "#ffffff",
        "--bs-border-color": "#2a2e35",
        "--bs-link-color": "#79b8ff",
        "--bs-link-hover-color": "#a7caff",
        "--bs-heading-color": "#ffffff"
      }
    },
    nord: {
      label: "Nord",
      scheme: "dark",
      vars: {
        "--bs-body-bg": "#2e3440",
        "--bs-body-color": "#e5e9f0",
        "--bs-secondary-bg": "#3b4252",
        "--bs-tertiary-bg": "#434c5e",
        "--bs-secondary-color": "#c0c8d8",
        "--bs-emphasis-color": "#eceff4",
        "--bs-border-color": "#4c566a",
        "--bs-link-color": "#88c0d0",
        "--bs-link-hover-color": "#8fbcbb",
        "--bs-heading-color": "#eceff4"
      }
    },
    dracula: {
      label: "Dracula",
      scheme: "dark",
      vars: {
        "--bs-body-bg": "#282a36",
        "--bs-body-color": "#f8f8f2",
        "--bs-secondary-bg": "#343746",
        "--bs-tertiary-bg": "#3c3f52",
        "--bs-secondary-color": "#c8cad8",
        "--bs-emphasis-color": "#ffffff",
        "--bs-border-color": "#44475a",
        "--bs-link-color": "#bd93f9",
        "--bs-link-hover-color": "#ff79c6",
        "--bs-heading-color": "#f8f8f2"
      }
    },
    "solarized-dark": {
      label: "Solarized Dark",
      scheme: "dark",
      vars: {
        "--bs-body-bg": "#002b36",
        "--bs-body-color": "#cfdadb",
        "--bs-secondary-bg": "#073642",
        "--bs-tertiary-bg": "#0a4250",
        "--bs-secondary-color": "#93a1a1",
        "--bs-emphasis-color": "#fdf6e3",
        "--bs-border-color": "#0a4a5a",
        "--bs-link-color": "#268bd2",
        "--bs-link-hover-color": "#2aa198",
        "--bs-heading-color": "#eee8d5"
      }
    },
    sepia: {
      label: "Sepia",
      vars: {
        "--bs-body-bg": "#f4ecd8",
        "--bs-body-color": "#4a3f2f",
        "--bs-secondary-bg": "#ebe0c6",
        "--bs-tertiary-bg": "#e3d6b8",
        "--bs-border-color": "#d8c8a0",
        "--bs-link-color": "#8a5a2b",
        "--bs-heading-color": "#3a3122"
      }
    },
    "solarized-light": {
      label: "Solarized Light",
      vars: {
        "--bs-body-bg": "#fdf6e3",
        "--bs-body-color": "#586e75",
        "--bs-secondary-bg": "#eee8d5",
        "--bs-tertiary-bg": "#e4ddc8",
        "--bs-border-color": "#d8cfb0",
        "--bs-link-color": "#268bd2",
        "--bs-heading-color": "#073642"
      }
    },
    "gruvbox-dark": {
      label: "Gruvbox Dark",
      scheme: "dark",
      vars: {
        "--bs-body-bg": "#282828",
        "--bs-body-color": "#ebdbb2",
        "--bs-secondary-bg": "#32302f",
        "--bs-tertiary-bg": "#3c3836",
        "--bs-secondary-color": "#bdae93",
        "--bs-emphasis-color": "#fbf1c7",
        "--bs-border-color": "#504945",
        "--bs-link-color": "#83a598",
        "--bs-link-hover-color": "#8ec07c",
        "--bs-heading-color": "#fbf1c7"
      }
    },
    "gruvbox-light": {
      label: "Gruvbox Light",
      vars: {
        "--bs-body-bg": "#fbf1c7",
        "--bs-body-color": "#3c3836",
        "--bs-secondary-bg": "#f2e5bc",
        "--bs-tertiary-bg": "#ebdbb2",
        "--bs-border-color": "#d5c4a1",
        "--bs-link-color": "#076678",
        "--bs-heading-color": "#282828"
      }
    },
    "tokyo-night": {
      label: "Tokyo Night",
      scheme: "dark",
      vars: {
        "--bs-body-bg": "#1a1b26",
        "--bs-body-color": "#c0caf5",
        "--bs-secondary-bg": "#24283b",
        "--bs-tertiary-bg": "#2f334d",
        "--bs-secondary-color": "#9aa5ce",
        "--bs-emphasis-color": "#ffffff",
        "--bs-border-color": "#3b4261",
        "--bs-link-color": "#7aa2f7",
        "--bs-link-hover-color": "#7dcfff",
        "--bs-heading-color": "#c0caf5"
      }
    },
    "one-dark": {
      label: "One Dark",
      scheme: "dark",
      vars: {
        "--bs-body-bg": "#282c34",
        "--bs-body-color": "#abb2bf",
        "--bs-secondary-bg": "#21252b",
        "--bs-tertiary-bg": "#2c313a",
        "--bs-secondary-color": "#9199a5",
        "--bs-emphasis-color": "#ffffff",
        "--bs-border-color": "#3e4451",
        "--bs-link-color": "#61afef",
        "--bs-link-hover-color": "#56b6c2",
        "--bs-heading-color": "#e6e6e6"
      }
    },
    "catppuccin-mocha": {
      label: "Catppuccin Mocha",
      scheme: "dark",
      vars: {
        "--bs-body-bg": "#1e1e2e",
        "--bs-body-color": "#cdd6f4",
        "--bs-secondary-bg": "#181825",
        "--bs-tertiary-bg": "#313244",
        "--bs-secondary-color": "#a6adc8",
        "--bs-emphasis-color": "#ffffff",
        "--bs-border-color": "#45475a",
        "--bs-link-color": "#89b4fa",
        "--bs-link-hover-color": "#b4befe",
        "--bs-heading-color": "#cdd6f4"
      }
    },
    contrast: {
      label: "High contrast",
      vars: {
        "--bs-body-bg": "#ffffff",
        "--bs-body-color": "#000000",
        "--bs-secondary-bg": "#f0f0f0",
        "--bs-border-color": "#000000",
        "--bs-link-color": "#0033cc",
        "--bs-heading-color": "#000000"
      }
    },
    custom: { label: "Custom…", vars: {}, custom: true }
  };

  // Accent color is chosen with a native color picker (color wheel / RGB hex),
  // so no preset list is needed. "" = use the theme's default accent.
  var ACCENT_DEFAULT = "#29aeb9";

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
    theme: get("theme", "light"),
    accent: get("accent", "#29aeb9"),
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

  // Extra coverage for dark themes: many eLabFTW/Bootstrap components carry
  // their own colors that the --bs-* overrides don't reach (tables, cards,
  // form fields, dropdowns...). Re-point those to the theme variables so text
  // stays readable on a dark background. (User-authored note content with its
  // own inline colors is intentionally left untouched.)
  function darkContrastCss(sel) {
    return (
      sel + " .text-muted," + sel + " .text-secondary{color:var(--bs-secondary-color)!important;}\n" +
      sel + " table," + sel + " td," + sel + " th{color:var(--bs-body-color);}\n" +
      sel + " .table{--bs-table-bg:transparent;--bs-table-color:var(--bs-body-color);" +
        "--bs-table-striped-color:var(--bs-body-color);--bs-table-border-color:var(--bs-border-color);}\n" +
      sel + " .card," + sel + " .list-group-item{background-color:var(--bs-secondary-bg);" +
        "color:var(--bs-body-color);border-color:var(--bs-border-color);}\n" +
      sel + " .bg-white," + sel + " .bg-light{background-color:var(--bs-secondary-bg)!important;" +
        "color:var(--bs-body-color);}\n" +
      sel + " .form-control," + sel + " .form-select," + sel + " .form-control:focus{" +
        "background-color:var(--bs-tertiary-bg);color:var(--bs-body-color);border-color:var(--bs-border-color);}\n" +
      sel + " .form-control::placeholder{color:var(--bs-secondary-color);}\n" +
      sel + " .input-group-text{background-color:var(--bs-tertiary-bg);color:var(--bs-body-color);" +
        "border-color:var(--bs-border-color);}\n" +
      sel + " .dropdown-menu{background-color:var(--bs-secondary-bg);color:var(--bs-body-color);" +
        "border-color:var(--bs-border-color);}\n" +
      sel + " .dropdown-item{color:var(--bs-body-color);}\n" +
      sel + " .dropdown-item:hover," + sel + " .dropdown-item:focus{" +
        "background-color:var(--bs-tertiary-bg);color:var(--bs-emphasis-color);}\n" +
      sel + " .modal-content," + sel + " .offcanvas{background-color:var(--bs-body-bg);color:var(--bs-body-color);}\n" +
      sel + " .border," + sel + " .border-top," + sel + " .border-bottom," + sel + " .border-start," +
        sel + " .border-end{border-color:var(--bs-border-color)!important;}\n" +
      sel + " blockquote{color:var(--bs-body-color);}\n"
    );
  }

  // eLabFTW renders the note body into #body_view. Injected content (e.g. PAM
  // snapshot tables) hard-codes light backgrounds, #ddd borders and sometimes
  // dark text via INLINE styles, which a dark page can't fix through --bs-*
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
      expand(txtEls, "color:var(--bs-body-color);") +
      bv + "table," + bv + "th," + bv + "td{border-color:var(--bs-border-color)!important;}\n"
    );
  }

  // --- stylesheet generation ------------------------------------------------
  function buildThemeCss() {
    var css = "";
    Object.keys(THEMES).forEach(function (key) {
      var t = THEMES[key];
      var sel = 'html[data-elab-theme="' + key + '"]';
      var body = "";
      Object.keys(t.vars).forEach(function (v) {
        body += v + ":" + t.vars[v] + ";";
      });
      if (t.scheme) body += "color-scheme:" + t.scheme + ";";
      if (body) css += sel + "{" + body + "}\n";
      css +=
        sel +
        " body{background-color:var(--bs-body-bg);color:var(--bs-body-color);}\n";
      // dark themes + the custom theme get the component-coverage rules so
      // tables/cards/#body_view adapt to whatever background is in use
      if (t.scheme === "dark" || t.custom) css += darkContrastCss(sel) + darkBodyCss(sel);
    });

    // accent color (only when --elab-accent is set)
    css +=
      "html[style*='--elab-accent']{--bs-primary:var(--elab-accent);" +
      "--bs-link-color:var(--elab-accent);--bs-link-hover-color:var(--elab-accent);}\n";
    css +=
      "html[style*='--elab-accent'] .btn-primary{" +
      "background-color:var(--elab-accent);border-color:var(--elab-accent);}\n";
    css += "html[style*='--elab-accent'] a:not(.btn){color:var(--elab-accent);}\n";

    // font — apply across the whole body, but never to icon fonts (Font Awesome /
    // Material) or to code/monospace, or eLabFTW's glyphs turn into plain letters.
    css +=
      "html[style*='--elab-font'] body," +
      "html[style*='--elab-font'] body :not(i):not(svg):not(.fa):not(.fas):not(.far)" +
      ":not(.fab):not(.fal):not(.fad):not([class*='fa-']):not(.material-icons)" +
      ":not(code):not(pre):not(kbd):not(samp):not(.elab-copy)" +
      "{font-family:var(--elab-font)!important;}\n";

    // compact density
    css +=
      'html[data-elab-density="compact"] .card-body{padding:.5rem .75rem;}\n' +
      'html[data-elab-density="compact"] .table>:not(caption)>*>*{padding:.25rem .4rem;}\n' +
      'html[data-elab-density="compact"] .form-control,html[data-elab-density="compact"] .form-select{padding:.2rem .5rem;}\n' +
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
    "background:#2c6fbb;color:#fff;font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,.3);}\n" +
    "#elab-theme-panel{position:fixed;left:16px;bottom:70px;z-index:99999;width:260px;" +
    "max-width:90vw;background:var(--bs-body-bg,#fff);color:var(--bs-body-color,#222);" +
    "border:1px solid var(--bs-border-color,#ccc);border-radius:10px;padding:14px;" +
    "box-shadow:0 4px 20px rgba(0,0,0,.25);font-size:13px;display:none;}\n" +
    "#elab-theme-panel.open{display:block;}\n" +
    "#elab-theme-panel h6{margin:0 0 8px;font-size:13px;font-weight:700;}\n" +
    "#elab-theme-panel label{display:block;margin:10px 0 3px;font-size:12px;opacity:.8;}\n" +
    "#elab-theme-panel select{width:100%;padding:4px;border-radius:6px;" +
    "border:1px solid var(--bs-border-color,#ccc);background:var(--bs-body-bg,#fff);color:inherit;}\n" +
    "#elab-theme-panel .elab-accent-row{display:flex;gap:6px;align-items:center;}\n" +
    "#elab-theme-panel input[type=color]{flex:1;height:30px;padding:0;cursor:pointer;" +
    "border:1px solid var(--bs-border-color,#ccc);border-radius:6px;background:transparent;}\n" +
    "#elab-accent-clear{padding:4px 8px;border-radius:6px;cursor:pointer;font-size:12px;" +
    "border:1px solid var(--bs-border-color,#ccc);background:transparent;color:inherit;}\n" +
    "#elab-theme-panel .elab-custom{display:none;margin:6px 0 2px;padding:8px;border-radius:8px;" +
    "border:1px solid var(--bs-border-color,#ccc);}\n" +
    "#elab-theme-panel .elab-crow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0;}\n" +
    "#elab-theme-panel .elab-crow span{font-size:12px;opacity:.85;}\n" +
    "#elab-theme-panel .elab-crow input[type=color]{flex:0 0 44px;height:24px;}\n" +
    "#elab-theme-reset{margin-top:12px;width:100%;padding:6px;border-radius:6px;cursor:pointer;" +
    "border:1px solid var(--bs-border-color,#ccc);background:transparent;color:inherit;}\n";

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
  function apply() {
    root.setAttribute("data-elab-theme", state.theme);
    root.setAttribute("data-elab-density", state.density);
    root.setAttribute("data-elab-code", state.code);
    root.setAttribute("data-elab-code-wrap", state.codewrap);
    root.setAttribute("data-elab-codetheme", state.codetheme);
    root.style.setProperty(
      "--elab-code-font",
      (CODE_FONTS[state.codefont] || CODE_FONTS[CODE_FONT_DEFAULT]).stack
    );
    if (state.accent) root.style.setProperty("--elab-accent", state.accent);
    else root.style.removeProperty("--elab-accent");

    // Custom page theme: drive Bootstrap vars inline; clear them for presets
    // (presets set the same vars via CSS, so leftover inline values must go).
    var BS_MAP = {
      "--bs-body-bg": "bg", "--bs-body-color": "text",
      "--bs-secondary-bg": "surface", "--bs-tertiary-bg": "surface",
      "--bs-secondary-color": "text", "--bs-emphasis-color": "text",
      "--bs-border-color": "border", "--bs-link-color": "link",
      "--bs-link-hover-color": "link", "--bs-heading-color": "heading"
    };
    Object.keys(BS_MAP).forEach(function (v) {
      if (state.theme === "custom") root.style.setProperty(v, state.customTheme[BS_MAP[v]]);
      else root.style.removeProperty(v);
    });

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
      state = {
        theme: "light", accent: "#29aeb9", fontLatin: "system", fontJa: "system",
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
