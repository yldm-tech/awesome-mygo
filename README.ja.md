# Awesome MyGo

[![Website](https://img.shields.io/badge/website-awesomemygo.dev-3fd3f5)](https://awesomemygo.dev)
[![CI](https://github.com/yldm-tech/awesome-mygo/actions/workflows/ci.yml/badge.svg)](https://github.com/yldm-tech/awesome-mygo/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/yldm-tech/awesome-mygo)](LICENSE)
[![X](https://img.shields.io/badge/X-%40suzukaze__haduki-000000?logo=x&logoColor=white)](https://x.com/suzukaze_haduki)
[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/houko)

[MyGo](https://github.com/egoist/mygo) まわりのアプリ、プラグイン、コンポーネント、ドキュメントをひとつのサイトに集めました：**[awesomemygo.dev](https://awesomemygo.dev)**。MyGo は Go でデスクトップアプリを作るツールキットで、UI はネイティブ UI でも Web フロントエンドでも作れます。

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · 日本語 · [한국어](README.ko.md)

[![Awesome MyGo](.github/assets/banner.png)](https://awesomemygo.dev)

## サイトの内容

- **ショーケース**：MyGo で作られたデスクトップアプリ。名前順、新着順、人気順で並べ替えられます。それぞれに専用のページがあり、詳しい説明、スクリーンショット（プロジェクトが用意している場合）、UI の種類（ネイティブ UI か Web フロントエンド）、カテゴリ、掲載日、同じ作者のほかのアプリを載せています。
- **プラグイン**：公式プラグイン。Web ページ・ネイティブ UI・その両方のどれに使えるかを示し、`mygo-cli` ツールチェーンも紹介します。
- **UI コンポーネント**：MyGo アプリ向けのコンポーネントライブラリ、テーマ、アイコン。
- **状態管理**：MyGo アプリの状態管理と、MyGo 標準のバインドサービス・チャネル・型付きイベント。
- **テンプレート**：フロントエンド、テスト、CI、パッケージングを設定済みの、MyGo アプリの出発点。
- **AI ツール**：AI コーディングエージェントが MyGo アプリを作るためのスキル、MCP サーバー、ルール。
- **ドキュメント**：公式ガイド、コミュニティ記事、公式リソース。
- <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> ですべてを**検索**できます。掲載してほしいプロジェクトがあれば、投稿フォームが項目を書いてくれます。

サイトは簡体字中国語、繁体字中国語、英語、日本語、韓国語に対応しています。どのページも言語ごとに固有のアドレス（`?lang=en`）を持ち、サーバーでレンダリングされ、hreflang リンクと sitemap を備えています。絞り込み、並び順、タブもアドレスに残るので（`/showcase?cat=dev&sort=newest`）、共有したリンクは同じ表示で開きます。

## 構成

pnpm のモノレポで、[TanStack Start](https://tanstack.com/start) が [Cloudflare Workers](https://workers.cloudflare.com) 上で配信します：

| パス | 内容 |
|---|---|
| `apps/web` | サイト本体：React 19、TanStack Start（サーバーレンダリング）、`@cloudflare/vite-plugin` 付きの Vite。`wrangler.jsonc` で `awesomemygo.dev` にデプロイします。 |
| `packages/catalog` | データ：`data/*.json`（アプリ、UI コンポーネント、状態管理、テンプレート、AI ツール、プラグイン、記事、ガイド）とその JSON Schema、5 言語の UI 文言、検索、投稿フォームの項目。テストで全項目を検証します。 |
| `packages/enrich` | 投稿 bot が開いたプルリクエストを補完します：プロジェクトのリポジトリからアプリのアイコンを、フォームでアップロードされた画像か指定されたリンク（なければリポジトリ）からスクリーンショットを取り込み、5 言語の文言を Claude で書きます。`.github/workflows/enrich-submission.yml` が実行します。また `.github/workflows/verify.yml` が週に一度、掲載中のすべてのプロジェクトのリポジトリを確認し、リポジトリが変わったエントリごとにプルリクエストを開きます：リポジトリが削除・非公開化・無効化されたらエントリを外し、名前変更や移管なら更新し、ない homepage を補い、プロジェクト自身の画像ができたら仮の画像を差し替えます。アーカイブされたリポジトリや MyGo を使わなくなったものは、実行のサマリーに挙げるだけです。`.github/workflows/prune.yml` は週に一度、サイトの基準に届かないエントリを外す提案を 1 つのプルリクエストにまとめます：掲載から 30 日たってもスコアが 20 未満、180 日を超えてコミットがない、リポジトリがアーカイブされた、または MyGo を使わなくなったもの。メンテナーがマージして初めて外れ、残したエントリは再び提案されません。 |

アプリのアイコンは [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo) の CDN から配信しています。ai-logo に収録されていない一部のアプリは、`apps/web/public/icons/` にある公式アイコンを使います。

各アプリのページには共有カードがあります。アプリのアイコン、名前、作者、スクリーンショットを載せた 1200×630 の PNG で、リンクプレビューに表示されます。`vite build` がカードを `/og/` に生成する（コードは `apps/web/og`）ので、bot が追加したアプリにもデプロイ時にカードが付きます。カードの生成にはネットワークが必要です：ビルド時に ai-logo のアイコンを取得し、名前にラテン文字以外が含まれるときは Google Fonts からグリフも取得します。

## 開発

Node.js 24 以降と pnpm が必要です。

```sh
pnpm install
pnpm dev          # ローカルのサイト（Workers ランタイムでレンダリング）
pnpm test         # catalog のテスト
pnpm typecheck
pnpm build
pnpm preview      # 本番ビルドを Workers ランタイムで実行
```

`pnpm deploy` は Wrangler でビルドとデプロイを行います。`apps/web/wrangler.jsonc` のドメインのゾーンを持つ Cloudflare アカウントが必要です。

フォームからの直接投稿は、このリポジトリにインストールした GitHub App が行い、その前段に Cloudflare Turnstile と IP ごとのレート制限があります。App には *Contents* と *Pull requests* の読み書き権限を与え、秘密鍵を PKCS#8 に変換し（`openssl pkcs8 -topk8 -nocrypt -in key.pem -out key-pkcs8.pem`）、`apps/web` で `wrangler secret put` を使って 4 つのシークレットを設定します：`GITHUB_APP_ID`、`GITHUB_APP_PRIVATE_KEY`（PKCS#8 のファイル）、`TURNSTILE_SITE_KEY`、`TURNSTILE_SECRET_KEY`。4 つすべてがそろうまで、フォームは GitHub へのリンクだけを表示します。ローカルで試すときは、Turnstile の[テスト用キー](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)を `apps/web/.dev.vars` に書きます。

安定版の Chrome がサイトの訪問者に WebMCP と投稿フォームのツールを有効にするのは、origin trial を通してのみです。[developer.chrome.com/origintrials](https://developer.chrome.com/origintrials/) で本番のオリジン（`https://awesomemygo.dev`）を WebMCP のトライアルに登録し、`apps/web` で `wrangler secret put WEBMCP_ORIGIN_TRIAL` を使ってトークンを設定します。すると各ページが `<meta http-equiv="origin-trial">` タグでそれを持ち、設定しなければ持ちません。トークンはトライアルの終了とともに失効するので、そのときは登録し直すか、シークレットを削除します。

アプリ、UI コンポーネント、状態管理、テンプレート、AI ツールにはスクリーンショットが必要です。訪問者がリポジトリのリンクを入力すると、フォームは Worker（`/api/shot`）に、submission workflow 自身の規則（`packages/enrich/src/source.ts`）でリポジトリに採用できるスクリーンショットがあるかを確かめます。ない場合やアプリにリポジトリがない場合は、フォームが 1 枚求め、Worker もスクリーンショットのない投稿を受け付けません。訪問者は画像（PNG、JPEG、WebP、5 MB まで、横長で幅 600 ピクセル以上）をアップロードするか、画像のリンクを入力します。アップロードされた画像は `submissions/<slug>.<ext>` としてプルリクエストのブランチに置かれてプルリクエストに表示され、workflow がサイト用の WebP に変換して削除します。この確認は IP ごとに 1 分 20 回までです。

bot がプルリクエストを開くと、*Complete submission* ワークフローがフォームでは聞けない部分を補います：MyGo と同じ探し方で見つけたアプリのアイコン（`mygo.json` の `icon`、なければ `resources/icon.png`。`mygo init` が置く MyGo の既定アイコンなら追加しません）、README でアイコンやほかの正方形のロゴではない最初のスクリーンショット、5 言語の概要と説明です。UI コンポーネントと状態管理にも同じ方法でスクリーンショットを付け、リポジトリ設定の homepage を補います。フォームが既定値で埋める項目（アプリのショーケースでのグループ `group`。カテゴリを書かなければグループから決まります。UI ライブラリの `tag` と `surface`、プラグインの `surface`、状態管理とプラグインの `tags`）は、モデルが文面と一緒に選びます。catalog のチェックを実行し、bot として同じブランチにプッシュし、何をしたかをコメントします。マージ前のレビューは引き続きメンテナーが行います。リポジトリの Actions 設定で、シークレット `SUBMIT_APP_PRIVATE_KEY`（App の PKCS#8 秘密鍵。Worker と同じもの）、`LLM_API_KEY`（Anthropic Messages API のキー）、ゲートウェイを使う場合は `LLM_BASE_URL` を、変数 `SUBMIT_APP_CLIENT_ID`（App の Client ID）を設定します。変数 `LLM_MODEL` でモデルを変えられます（既定は `claude-opus-5-5`）。`LLM_API_KEY` がなければ文言は投稿されたままです。

## プロジェクトを追加する

項目はそれぞれ [`packages/catalog/data`](packages/catalog/data) の下の 1 つの JSON ファイルで、カテゴリのディレクトリに置き、`slug` をファイル名にします：

| ファイル | 内容 |
|---|---|
| `apps/<slug>.json` | MyGo で作られたアプリ |
| `ui/<slug>.json` | UI コンポーネントライブラリ |
| `state/<slug>.json` | 状態管理 |
| `templates/<slug>.json` | テンプレート |
| `ai/<slug>.json` | AI ツール |
| `plugins/<slug>.json` | プラグイン |
| `articles/<slug>.json` | 記事 |
| `docs/<slug>.json` | MyGo 公式ガイド |

追加の方法は 2 つあります：

- **サイトから：** 「投稿」を押してフォームに入力するか、項目を JSON のまま貼り付けて、そのまま投稿します。GitHub アカウントは不要で、サイトの bot がプルリクエストを作ります。GitHub アカウントがあれば、作られた項目を Issue として送ったり、GitHub のエディタで項目の新しいファイルを開いて自分で追加したりもできます。[WebMCP](https://webmachinelearning.github.io/webmcp/) に対応したブラウザーでは、AI エージェントが項目を確認してフォームに入力し、あなたが確かめてから投稿できます。
- **リポジトリで：** カテゴリのディレクトリにファイルを 1 つ追加し、プルリクエストを送ります。

アプリのファイル `apps/my-app.json` は次のとおりです：

```json
{
  "$schema": "../schema/app.schema.json",
  "slug": "my-app",
  "name": "My App",
  "author": "your-github-login",
  "kind": "native",
  "platforms": ["win", "linux", "mac"],
  "url": "https://my-app.dev",
  "repo": "you/my-app",
  "summary": { "en": "One line about the app.", "ja": "アプリの一行説明。" },
  "description": { "en": "A few sentences for the app's page." },
  "added": "2026-11-04T12:00:00Z"
}
```

- ファイル名は `slug` と同じです。`added` は項目がサイトに加わった日時（UTC）で、サイトの bot が書き入れます。手で追加するときは現在時刻を書きます。公式ガイド以外のカテゴリにはすべてあり、ショーケースはこれで新しいアプリから並べられ、UI コンポーネントライブラリ、状態管理、テンプレート、AI ツール、記事、コミュニティのプラグインは古い順に並びます。公式プラグインと公式ガイドは名前順です。項目ごとにファイルが分かれているので、同時に項目を追加するプルリクエストどうしが衝突しません。
- ほかのカテゴリのファイルも同じように `$schema`、`slug`、`added` を持ちます（公式ガイドには `added` がありません）。フィールドは `data/schema/` のそれぞれのスキーマにあります。
- `platforms` にはアプリが動く OS を `win`・`linux`・`mac` から一つ以上書きます。この項目がないと CI でエラーになります。
- `url` はアプリのホームページです。公式サイト、なければリポジトリの URL で、GitHub でなくてもかまいません。オープンソースのアプリは `repo` に GitHub リポジトリ（`owner/name`）を書き、クローズドソースなら省きます。
- テキストの欄は言語ごとに 1 つずつ書きます。`en` は必須で、`zh-CN`、`zh-TW`、`ja`、`ko` は任意です。欠けている言語では英語が表示されます。
- 各ファイルは `$schema` で自分の JSON Schema（`data/schema/`）を指しているので、VS Code などのエディタが入力中に補完とチェックをします。
- リンクは https のみです。スクリーンショットは幅 1200px 程度の WebP を `apps/web/public/shots/` に置き、`"screenshot": "my-app.webp"` と書きます。アプリのアイコンは [ai-logo](https://github.com/yldm-tech/ai-logo) の id で `"icon": { "ailogo": "<id>" }` と書きます。アプリ自身のアイコンを使うときは 128px の WebP を `apps/web/public/icons/` に置き、`"icon": { "file": "my-app.webp" }` と書きます。省略すると文字のタイルになります。
- `pnpm test` は全項目を検証し、誤りのあるファイル、項目、欄を示します。CI はすべてのプルリクエストで実行します。

UI の文言は `packages/catalog/locales/` にあり、言語ごとに同じキーを持つ JSON ファイルが 1 つずつあります。基準は `zh-CN.json` です。キーを追加するときは残り 4 ファイルにも加えてください。キーの抜けや `{x}`/`{n}` プレースホルダーの不一致は `pnpm typecheck` と `pnpm test` が検出します。

## クレジット

- [MyGo](https://github.com/egoist/mygo) は [egoist](https://github.com/egoist) が作っています（MIT）。ショーケース、プラグイン、ガイドのデータはそのリポジトリとサイトに沿っています。
- アプリのアイコンは [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo)（MIT、LobeHub の [lobe-icons](https://github.com/lobehub/lobe-icons) のフォーク）またはアプリ自身のアイコン、スクリーンショットは egoist/mygo のショーケースと各プロジェクトの README からのものです。いずれも各アプリの作者に帰属し、名称とロゴは各社の商標で、識別のためにのみ表示しています。

## ライセンス

コードは [MIT ライセンス](LICENSE)で公開しています。
