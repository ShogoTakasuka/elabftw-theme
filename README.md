# eLabFTW Theme

A per-user **skin for [eLabFTW](https://www.elabftw.net/)** — switch themes, pick
any accent color, choose separate fonts for text and code, and give code blocks a
proper editor look with syntax highlighting.

It runs as a [userscript](https://en.wikipedia.org/wiki/Userscript) in your own
browser, so it:

- **never changes eLabFTW or its server** — your admin's installation is untouched,
- **applies to you only** — settings are stored in your own browser (`localStorage`),
- **survives eLabFTW upgrades** — colors are applied by overriding Bootstrap 5 CSS
  variables (`--bs-*`), not fragile class names,
- **works on any eLabFTW instance** — it auto-detects eLabFTW and does nothing on
  other sites.

<!-- Add a screenshot once published, e.g.:
![screenshot](docs/screenshot.png)
-->

## Features

| | |
|---|---|
| 🎨 **Themes** | Light · Dark · Midnight (OLED) · Nord · Dracula · Solarized Dark/Light · Gruvbox Dark/Light · Tokyo Night · One Dark · Catppuccin Mocha · High contrast · **Custom…** |
| 🌈 **Accent color** | Any color via a native color picker (color wheel / RGB hex) |
| 🔤 **Text font** | Separate picks for **Latin** and **Japanese** (e.g. Times New Roman for English, 明朝 for 日本語) |
| `</>` **Code blocks** | VS Code–style dark editor look with syntax highlighting — 17 palettes (VS Code, GitHub, Monokai, Dracula, Nord, One Dark, Shades of Purple, Gruvbox, Tokyo Night, Night Owl, Ayu, Material, Cobalt2, …) plus **Custom…** |
| ⌨️ **Code font** | Monospace font just for code (Courier New, Consolas, JetBrains Mono, Fira Code, …) |
| ↕️ **Density** | Comfortable · Compact |
| 🌓 **Dark readability** | Dark themes also re-color tables, cards, forms and dropdowns so nothing gets lost |

Everything lives in a small **🎨 panel** at the bottom-left. Changes apply instantly
and are remembered per browser. Pick **Custom…** under Theme or Code theme to set
every color yourself.

## Install

1. Install a userscript manager: **[Tampermonkey](https://www.tampermonkey.net/)**
   or **[Violentmonkey](https://violentmonkey.github.io/)**.
2. **Chrome / Edge / Brave:** open `chrome://extensions`, open the manager's
   **Details**, and turn on **“Allow user scripts.”** (Recent Chromium versions
   require this, otherwise userscripts silently don't run.)
3. Click **[`elab-theme.user.js`](https://raw.githubusercontent.com/ShogoTakasuka/elabftw-theme/main/elab-theme.user.js)**
   — your userscript manager will offer to install it.
4. Open your eLabFTW. The **🎨** button appears at the bottom-left.

That's it — no configuration needed; it detects eLabFTW automatically.

## Using it

Click the **🎨** button to open the panel and adjust theme, accent, fonts, density
and code appearance. Everything updates live.

**Tip for code:** for full multi-color highlighting, insert code with eLabFTW's
**code block / “code sample” (`</>`)** button rather than inline code — that
produces a real `<pre>` block, which this theme highlights and styles.

## Privacy

- Settings are stored only in your browser's `localStorage` for the eLabFTW origin.
- Nothing about your data is sent anywhere. The only external request is loading
  [highlight.js](https://highlightjs.org/) from a CDN, which your userscript
  manager caches.

### Optional: restrict it to your instance

By default the script is allowed on all sites (`// @match *://*/*`) and exits
instantly on non-eLabFTW pages. If you'd rather it only ever run on your server,
edit the header:

```js
// @match https://elab.example.org/*
```

## Compatibility

- Tested against **eLabFTW 5.5.x** (Bootstrap 5).
- Code highlighting reuses eLabFTW's own Prism tokens when present and falls back
  to highlight.js, so there's no double-processing.

## Auto-updates

The header includes `@updateURL` / `@downloadURL` pointing at the raw file in this
repo, so Tampermonkey / Violentmonkey pick up new versions automatically.

## Acknowledgements

Developed with [Claude Code](https://claude.com/claude-code) (Anthropic).

## License

- This project: **MIT** — see [LICENSE](./LICENSE).
- [highlight.js](https://highlightjs.org/) (loaded from CDN): **BSD-3-Clause**.

> Not affiliated with eLabFTW or Deltablot. “eLabFTW” is the property of its
> respective owners. This is an independent, unofficial, client-side add-on.
