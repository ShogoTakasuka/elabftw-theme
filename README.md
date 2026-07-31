# eLabFTW Theme

A per-user **skin for [eLabFTW](https://www.elabftw.net/)** — switch themes, pick
any accent color, choose separate fonts for text and code, and give code blocks a
proper editor look with syntax highlighting.

**[eLabFTW](https://www.elabftw.net/) を各自のブラウザで着せ替えする userscript** です。テーマ切替・アクセントカラー・本文/コード別フォント・コードのシンタックスハイライトができます。

It runs as a [userscript](https://en.wikipedia.org/wiki/Userscript) in your own
browser, so it:

- **never changes eLabFTW or its server** — your admin's installation is untouched,
- **applies to you only** — settings are stored in your own browser (`localStorage`),
- **survives eLabFTW upgrades** — colors are applied by overriding Bootstrap 5 CSS
  variables (`--bs-*`), not fragile class names,
- **works on any eLabFTW instance** — it auto-detects eLabFTW and does nothing on
  other sites.

ブラウザ内で動く userscript なので:

- **eLabFTW 本体・サーバーを一切変更しません**（管理者の環境はそのまま）
- **あなたにだけ適用**されます（設定はご自身のブラウザ `localStorage` に保存）
- **アップグレードに強い**（Bootstrap 5 の CSS 変数 `--bs-*` を上書きするだけで、壊れやすいクラス名に依存しません）
- **どの eLabFTW でも動作**（自動判定し、eLabFTW 以外のサイトでは何もしません）

<!-- Add a screenshot once published, e.g. / 公開後にスクショを追加:
![screenshot](docs/screenshot.png)
-->

## Features / 機能

| | |
|---|---|
| 🎨 **Themes / テーマ** | Light · Dark · Midnight (OLED) · Nord · Dracula · Solarized Dark/Light · Gruvbox Dark/Light · Tokyo Night · One Dark · Catppuccin Mocha · High contrast · **Custom…** |
| 🌈 **Accent / アクセント色** | Any color via a native color picker / カラーピッカーで任意の色（色相環・RGB） |
| 🔤 **Text font / 本文フォント** | Separate picks for **Latin** and **Japanese** / **欧文**と**和文**を個別指定（例：英字は Times New Roman、日本語は明朝） |
| `</>` **Code / コード** | VS Code–style highlighting, 17 palettes + **Custom…** / VS Code 風の配色17種＋任意色。VS Code, GitHub, Monokai, Dracula, Nord, One Dark, Shades of Purple, Gruvbox, Tokyo Night, … |
| ⌨️ **Code font / コードフォント** | Monospace font just for code / コード専用の等幅（Courier New, Consolas, JetBrains Mono, …） |
| ↕️ **Density / 余白** | Comfortable · Compact |
| 🌓 **Dark readability / ダーク可読性** | Dark themes also re-color tables, cards, forms / ダークでは表・カード・フォームも読みやすく再着色 |

Everything lives in a small **🎨 panel** at the bottom-left. Changes apply instantly
and are remembered per browser. Pick **Custom…** to set every color yourself.

すべて左下の **🎨 パネル**で設定できます。変更は即反映され、ブラウザに保存されます。**Custom…** を選べば全色を自分で指定できます。

## Install / インストール

1. Install a userscript manager: **[Tampermonkey](https://www.tampermonkey.net/)**
   or **[Violentmonkey](https://violentmonkey.github.io/)**.
   / userscript マネージャ（**Tampermonkey** または **Violentmonkey**）を入れる。
2. **Chrome / Edge / Brave:** open `chrome://extensions`, open the manager's
   **Details**, and turn on **“Allow user scripts.”** (Recent Chromium versions
   require this, otherwise userscripts silently don't run.)
   / **Chrome系**は `chrome://extensions` → マネージャの**詳細** → **「ユーザースクリプトを許可 (Allow user scripts)」をON**。（最近のChromiumはこれが無いと無言で動きません。）
3. Click **[`elab-theme.user.js`](https://raw.githubusercontent.com/ShogoTakasuka/elabftw-theme/main/elab-theme.user.js)**
   — your userscript manager will offer to install it.
   / **[`elab-theme.user.js`](https://raw.githubusercontent.com/ShogoTakasuka/elabftw-theme/main/elab-theme.user.js)** を開くとインストールを促されます。
4. Open your eLabFTW. The **🎨** button appears at the bottom-left.
   / eLabFTW を開くと左下に **🎨** ボタンが出ます。

That's it — no configuration needed; it detects eLabFTW automatically.
設定不要。eLabFTW を自動判定します。

## Using it / 使い方

Click the **🎨** button to open the panel and adjust theme, accent, fonts, density
and code appearance. Everything updates live.

**🎨** を押してパネルを開き、テーマ・アクセント・フォント・余白・コード表示を調整します（即反映）。

**Tip for code / コードのコツ:** for full multi-color highlighting, insert code with
eLabFTW's **code block / “code sample” (`</>`)** button rather than inline code —
that produces a real `<pre>` block, which this theme highlights and styles.
/ 多色ハイライトにするには、インラインコードではなく eLabFTW の **`</>`（コードサンプル/コードブロック）**で入れてください。`<pre>` になり、本ツールが色付け・整形します。

## Privacy / プライバシー

- Settings are stored only in your browser's `localStorage` for the eLabFTW origin.
  / 設定は eLabFTW オリジンの `localStorage` にのみ保存されます。
- Nothing about your data is sent anywhere. The only external request is loading
  [highlight.js](https://highlightjs.org/) from a CDN, which your userscript
  manager caches.
  / データは外部に送信されません。唯一の外部通信は CDN からの [highlight.js](https://highlightjs.org/) 読込のみ（マネージャがキャッシュ）。

### Optional: restrict it to your instance / 自分のインスタンスに限定する（任意）

By default the script is allowed on all sites (`// @match *://*/*`) and exits
instantly on non-eLabFTW pages. To run it only on your server, edit the header:

既定は全サイト許可（`// @match *://*/*`）で、eLabFTW 以外では即終了します。自分のサーバー限定にするにはヘッダを編集:

```js
// @match https://elab.example.org/*
```

## Compatibility / 対応

- Tested against **eLabFTW 5.5.x** (Bootstrap 5). / **eLabFTW 5.5.x**（Bootstrap 5）で確認。
- Code highlighting reuses eLabFTW's own Prism tokens when present and falls back
  to highlight.js, so there's no double-processing.
  / コードは既存の Prism トークンを活かし、無ければ highlight.js で補完（二重処理なし）。

## Auto-updates / 自動更新

The header includes `@updateURL` / `@downloadURL`, so Tampermonkey / Violentmonkey
pick up new versions automatically.
ヘッダに `@updateURL` / `@downloadURL` があるため、新版は自動で反映されます。

## Acknowledgements / 謝辞

Developed with [Claude Code](https://claude.com/claude-code) (Anthropic).
[Claude Code](https://claude.com/claude-code)（Anthropic）を用いて開発しました。

## License / ライセンス

- This project: **MIT** — see [LICENSE](./LICENSE). / 本体は **MIT**。
- [highlight.js](https://highlightjs.org/) (loaded from CDN): **BSD-3-Clause**.

> Not affiliated with eLabFTW or Deltablot. “eLabFTW” is the property of its
> respective owners. This is an independent, unofficial, client-side add-on.
>
> eLabFTW / Deltablot とは無関係です。「eLabFTW」は各権利者に帰属します。本ツールは独立・非公式のクライアント側アドオンです。
