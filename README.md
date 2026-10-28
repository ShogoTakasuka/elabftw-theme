# eLabFTW Theme

A per-user **skin for [eLabFTW](https://www.elabftw.net/)** — extra color themes on
top of eLabFTW's own Light / Dark / Midnight, any accent color, separate fonts for
text and code, and code blocks with a proper editor look and syntax highlighting.

**[eLabFTW](https://www.elabftw.net/) を各自のブラウザで着せ替えする userscript** です。eLabFTW 自身の Light / Dark / Midnight に追加テーマを重ね、アクセントカラー・本文/コード別フォント・コードのシンタックスハイライトができます。

It runs as a [userscript](https://en.wikipedia.org/wiki/Userscript) in your own
browser, so it:

- **never changes eLabFTW or its server** — your admin's installation is untouched,
- **applies to you only** — settings are stored in your own browser (`localStorage`),
- **cooperates with eLabFTW's own theming** — colors are applied by overriding the
  CSS variables eLabFTW itself paints with (`--mainbackground`, `--white`,
  `--primary`, `--link`, …), so eLabFTW keeps styling every component and the two
  never fight; the default **"eLabFTW setting"** changes nothing at all,
- **works on any eLabFTW instance** — it auto-detects eLabFTW and does nothing on
  other sites.

ブラウザ内で動く userscript なので:

- **eLabFTW 本体・サーバーを一切変更しません**（管理者の環境はそのまま）
- **あなたにだけ適用**されます（設定はご自身のブラウザ `localStorage` に保存）
- **eLabFTW 自身のテーマ機構と協調**（eLabFTW が画面を塗るのに使っている CSS 変数 `--mainbackground` `--white` `--primary` `--link` などを上書きするだけなので、各部品の配色は eLabFTW 側が引き続き担当し、2 系統の色が混ざりません。既定の **「eLabFTW setting」** は何も変更しません）
- **どの eLabFTW でも動作**（自動判定し、eLabFTW 以外のサイトでは何もしません）

<!-- Add a screenshot once published, e.g. / 公開後にスクショを追加:
![screenshot](docs/screenshot.png)
-->

## Features / 機能

| | |
|---|---|
| 🎨 **Themes / テーマ** | **eLabFTW setting** (its own Light / Dark / Midnight, default) · Dark · Midnight (OLED) · Nord · Dracula · Solarized Dark/Light · Sepia · Gruvbox Dark/Light · Tokyo Night · One Dark · Catppuccin Mocha · High contrast · **Custom…** |
| 🌈 **Accent / アクセント色** | Any color for buttons, active items and links via a native color picker; unset by default so a primary color chosen in eLabFTW's user control panel shows through / ボタン・選択中項目・リンクの色をカラーピッカーで任意指定。既定は未設定で、eLabFTW のユーザー設定で選んだ primary 色がそのまま使われます |
| 🔤 **Text font / 本文フォント** | Separate picks for **Latin** and **Japanese** / **欧文**と**和文**を個別指定（例：英字は Times New Roman、日本語は明朝） |
| `</>` **Code / コード** | VS Code–style highlighting, 17 palettes + **Custom…** / VS Code 風の配色17種＋任意色。VS Code, GitHub, Monokai, Dracula, Nord, One Dark, Shades of Purple, Gruvbox, Tokyo Night, … |
| ⌨️ **Code font / コードフォント** | Monospace font just for code / コード専用の等幅（Courier New, Consolas, JetBrains Mono, …） |
| ↕️ **Density / 余白** | Comfortable · Compact |
| 🌓 **Dark readability / ダーク可読性** | Dark presets switch eLabFTW into its own dark palette (alerts, modals, status colors) and clear hard-coded light backgrounds inside note bodies / ダーク系プリセットは eLabFTW 自身のダークパレット（警告・モーダル・状態色）に切り替え、ノート本文内の固定の明色背景も透過させます |

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

## How it relates to eLabFTW's own themes / eLabFTW 自身のテーマとの関係

- eLabFTW 6.0 lets you pick **Light / Dark / Midnight** and a **primary color** in
  the user control panel. With the default **"eLabFTW setting"** this script leaves
  all of that untouched.
  / eLabFTW 6.0 はユーザー設定で **Light / Dark / Midnight** と **primary 色**を選べます。既定の **「eLabFTW setting」** ではそれらに一切手を触れません。
- A preset here (Nord, Dracula, …) replaces eLabFTW's palette for the page and its
  components. A dark preset also switches eLabFTW into its own dark mode so alerts,
  modals and status colors match.
  / ここでプリセット（Nord, Dracula など）を選ぶと、ページと各部品の配色が置き換わります。ダーク系プリセットは eLabFTW 自身もダークモードに切り替えるので、警告・モーダル・状態色も揃います。
- A primary color set in eLabFTW's user control panel **wins over a preset's**;
  only the accent picker here overrides it, and clearing the accent restores it.
  / eLabFTW のユーザー設定で選んだ primary 色は**プリセットより優先**されます。ここでアクセントを指定した間だけ上書きされ、解除すると戻ります。
- Switching theme in eLabFTW's own control panel while a preset is active takes
  effect on the next page load.
  / プリセット使用中に eLabFTW 側でテーマを切り替えた場合は、次のページ読み込みから反映されます。

## Compatibility / 対応

- Works on **eLabFTW 5.5.x and 6.0.x** (both ship Bootstrap 4 and the same CSS
  variable names; `--link` and `--primary-fg` are 6.0-only and ignored on 5.5).
  / **eLabFTW 5.5.x と 6.0.x** で動作（どちらも Bootstrap 4 で CSS 変数名も共通。`--link` と `--primary-fg` は 6.0 のみで、5.5 では無視されます）。
- **v4.0.0** rebuilt theming on eLabFTW's own variables (earlier versions drove
  Bootstrap variables that eLabFTW never read and overrode components by class).
  Saved settings carry over: the old "Light" preset becomes "eLabFTW setting" and
  the old always-on default accent becomes unset.
  / **v4.0.0** で eLabFTW 自身の変数に乗り換えました（旧版は eLabFTW が参照しない Bootstrap 変数を定義し、部品をクラス名で上書きしていました）。保存済み設定は引き継がれ、旧「Light」は「eLabFTW setting」に、旧既定のアクセント色は未設定になります。
- **v3.0.0** fixed detection for 6.0, whose pages no longer load an asset named
  `elabftw.*` (the script exited silently).
  / **v3.0.0** で 6.0 の自動判定を修正（アセット名が変わり無言で終了していました）。
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

## Disclaimer / 免責事項

This software is provided **“as is”, without warranty of any kind**, and you use
it **at your own risk**. The author accepts **no liability** for any damage, data
loss, or other problems arising from its use. It is an unofficial add-on and is
not endorsed or supported by eLabFTW / Deltablot.

本ソフトウェアは **現状有姿（as is）で提供され、いかなる保証もありません**。
ご利用は **すべて自己責任**でお願いします。利用に起因する損害・データ損失・
その他の不具合について、**作者は一切の責任を負いません**。本ツールは非公式の
アドオンであり、eLabFTW / Deltablot による承認・サポートを受けたものではありません。

## License / ライセンス

- This project: **MIT** — see [LICENSE](./LICENSE). / 本体は **MIT**。
- [highlight.js](https://highlightjs.org/) (loaded from CDN): **BSD-3-Clause**.

> Not affiliated with eLabFTW or Deltablot. “eLabFTW” is the property of its
> respective owners. This is an independent, unofficial, client-side add-on.
>
> eLabFTW / Deltablot とは無関係です。「eLabFTW」は各権利者に帰属します。本ツールは独立・非公式のクライアント側アドオンです。
