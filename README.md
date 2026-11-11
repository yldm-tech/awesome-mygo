# Awesome MyGo

[![Website](https://img.shields.io/badge/website-awesomemygo.dev-3fd3f5)](https://awesomemygo.dev)
[![CI](https://github.com/yldm-tech/awesome-mygo/actions/workflows/ci.yml/badge.svg)](https://github.com/yldm-tech/awesome-mygo/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/yldm-tech/awesome-mygo)](LICENSE)
[![X](https://img.shields.io/badge/X-%40suzukaze__haduki-000000?logo=x&logoColor=white)](https://x.com/suzukaze_haduki)
[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/houko)

The apps, plugins, components and guides around [MyGo](https://github.com/egoist/mygo), the Go toolkit for desktop apps with native UI or a web frontend, collected on one site: **[awesomemygo.dev](https://awesomemygo.dev)**.

English · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

[![Awesome MyGo](.github/assets/banner.png)](https://awesomemygo.dev)

## What is on the site

- **Showcase**: desktop apps built with MyGo, sorted by name, newest or most liked. Each has its own page with the full description, a screenshot where the project has one, its interface (native UI or web frontend), its category, when it was added and its other apps by the same author.
- **Plugins**: the official plugins, marked by the kind of window they serve (web pages, native UI or both), plus the `mygo-cli` toolchain.
- **UI components**: component libraries, themes and icons made for MyGo apps.
- **State**: state management for MyGo apps, beside MyGo's own bound services, channels and typed events.
- **Templates**: projects to start a MyGo app from, with a frontend stack, tests, CI or packaging set up.
- **AI tools**: agent skills, MCP servers and rules that help AI coding agents build MyGo apps.
- **Learn**: the official guides, community articles and the official resources.
- **Search** across everything with <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd>, and a form that writes the entry for a project you want listed.

The site speaks Simplified Chinese, Traditional Chinese, English, Japanese and Korean. Every page has its own address per language (`?lang=en`), is rendered on the server, and has hreflang links and a sitemap. Filters, sort orders and tabs are kept in the address too (`/showcase?cat=dev&sort=newest`), so a shared link opens the same view.

## How it is built

A pnpm monorepo, served by [TanStack Start](https://tanstack.com/start) on [Cloudflare Workers](https://workers.cloudflare.com):

| Path | What it holds |
|---|---|
| `apps/web` | The site: React 19, TanStack Start (server rendering) and Vite with `@cloudflare/vite-plugin`. `wrangler.jsonc` deploys it to `awesomemygo.dev`. |
| `packages/catalog` | The data: `data/*.json` (apps, UI components, state solutions, templates, AI tools, plugins, articles, guides) and their JSON Schemas, the UI copy in five languages, search and the submit form's entries. Its tests validate every entry. |
| `packages/enrich` | Completes a pull request the submission bot opens: the app's icon from its repository, its screenshot from the image uploaded or the link given in the form, or else from the repository, and its copy in all five languages (written with Claude). Run by `.github/workflows/enrich-submission.yml`. Once a week `.github/workflows/verify.yml` also checks every listed project's repository and opens a pull request per entry for what the repository says has changed: a deleted, private or disabled repository removes the entry, a renamed or transferred one updates it, a missing homepage is added and a stand-in image is replaced once the project has its own; an archived repository, or one no longer built with MyGo, is only listed in the run's summary. Once a week `.github/workflows/prune.yml` proposes, in one pull request a maintainer merges, taking off the entries below the site's bar: a score under 20 after 30 days on the site, no commit for more than 180 days, an archived repository, or one no longer built with MyGo; an entry a maintainer keeps is not proposed again. |

App icons come from [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo), served by its CDN; the few apps it does not list use their official icon from `apps/web/public/icons/`.

Each app's page has a share card, a 1200×630 PNG with the app's icon, name, author and screenshot, which link previews show. `vite build` draws the cards into `/og/` (`apps/web/og`), so an app the bot adds gets its card on the deploy that adds it. The build needs the network for them: it fetches the ai-logo icons and, for names outside the Latin script, glyphs from Google Fonts.

## Development

Requires Node.js 24 or later and pnpm.

```sh
pnpm install
pnpm dev          # local site, rendered by the Workers runtime
pnpm test         # catalog tests
pnpm typecheck
pnpm build
pnpm preview      # the production build in the Workers runtime
```

`pnpm deploy` builds and deploys with Wrangler. It needs a Cloudflare account that holds the zone of the domain in `apps/web/wrangler.jsonc`.

Direct submissions from the form go through a GitHub App installed on this repository, with Cloudflare Turnstile and a per-IP rate limit in front of it. Give the app *Contents* and *Pull requests* read and write access, convert its private key to PKCS#8 (`openssl pkcs8 -topk8 -nocrypt -in key.pem -out key-pkcs8.pem`), and set four secrets with `wrangler secret put` in `apps/web`: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (the PKCS#8 file), `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. Until all four are set, the form offers only the GitHub links. For local testing, put Turnstile's [test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) in `apps/web/.dev.vars`.

Stable Chrome turns WebMCP on, and with it the submit form's tools, for the site's visitors only through an origin trial. Register the production origin (`https://awesomemygo.dev`) for the WebMCP trial at [developer.chrome.com/origintrials](https://developer.chrome.com/origintrials/) and set the token with `wrangler secret put WEBMCP_ORIGIN_TRIAL` in `apps/web`: every page then carries it in a `<meta http-equiv="origin-trial">` tag, and without it none does. The token expires with the trial; register again then, or remove the secret.

An app, UI components, state management, a template or an AI tool needs a screenshot. Once the visitor has typed the repository's link, the form asks the Worker (`/api/shot`) whether the repository has one the submission workflow would take, judged by the workflow's own rules (`packages/enrich/src/source.ts`); when it has none, or an app has no repository, the form asks for one, and the Worker refuses the submission without it. The visitor uploads an image (PNG, JPEG or WebP, at most 5 MB, landscape and at least 600 pixels wide) or gives a link to one. An uploaded image goes on the pull request's branch as `submissions/<slug>.<ext>` and shows in the pull request; the workflow turns it into the site's WebP and removes it. The check is limited to 20 a minute per IP.

When the bot opens a pull request, the *Complete submission* workflow fills in what the form cannot ask for: the app's icon where MyGo looks for it (`icon` in `mygo.json`, else `resources/icon.png`; none when that is MyGo's default icon, as `mygo init` leaves it), the first screenshot in its README that is not the icon or another square logo, and the summary and description in all five languages. For UI components and state management it adds the screenshot in the same way and the homepage from the repository's settings, and for what the form fills in with a default (an app's showcase `group`, from which its category follows unless it names one, a UI library's `tag` and `surface`, a plugin's `surface`, the `tags` of state management and plugins) the model picks a value along with the copy. It runs the catalog checks, pushes to the same branch as the bot and comments what it did; a maintainer still reviews the result before merging. It needs, in the repository's Actions settings, the secrets `SUBMIT_APP_PRIVATE_KEY` (the app's PKCS#8 key, as for the Worker), `LLM_API_KEY` (an Anthropic Messages API key) and, for a gateway, `LLM_BASE_URL`, and the variable `SUBMIT_APP_CLIENT_ID` (the app's client ID); the variable `LLM_MODEL` overrides the model (`claude-opus-5-5`). Without `LLM_API_KEY` the copy stays as submitted.

An issue sent through the form's issue link gets the same pull request from the *Submission issue* workflow (`.github/workflows/issue-submission.yml`): it checks the entry as the Worker checks a pasted one, including the screenshot it needs and a 16 KB limit, has the bot open the pull request, on which *Complete submission* runs, with the entry dated when the issue was opened, then comments the pull request on the issue and closes it. An entry that cannot go in gets a comment saying what to fix instead, and editing the issue checks it again; the bot keeps one comment per issue. Issues without the form's path line and the json code block under it are left alone. An issue takes only a GitHub account, not the captcha, so besides the shared limit of 20 open submissions the bot keeps at most 2 open from one person's issues. It uses the same `SUBMIT_APP_PRIVATE_KEY` and `SUBMIT_APP_CLIENT_ID`; the issue is read, commented on and closed with the workflow's own token, so the app needs no access to issues. To check an issue again by hand, run the workflow with its number.

## Adding a project

Every entry is a JSON file of its own under [`packages/catalog/data`](packages/catalog/data), in its category's directory and named after its `slug`:

| File | Lists |
|---|---|
| `apps/<slug>.json` | Apps built with MyGo |
| `ui/<slug>.json` | UI component libraries |
| `state/<slug>.json` | State management |
| `templates/<slug>.json` | Templates |
| `ai/<slug>.json` | AI tools |
| `plugins/<slug>.json` | Plugins |
| `articles/<slug>.json` | Articles |
| `docs/<slug>.json` | MyGo's guides |

There are two ways to add one:

- **On the site:** click "Submit" and fill in the form, or paste a whole entry as JSON, then submit it directly: no GitHub account needed, the site's bot opens the pull request for you. With a GitHub account you can also send the generated entry as an issue, which the site's bot turns into the same pull request, or open the entry's new file in GitHub's editor and add it yourself. An AI agent in a browser with [WebMCP](https://webmachinelearning.github.io/webmcp/) can check the entry and fill in the form for you to check and send.
- **In the repository:** add a file to the category's directory and open a pull request.

An app's file, `apps/my-app.json`, looks like this:

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

- The file is named after `slug`. `added` is when the entry joined the site, in UTC; the site bot sets it, and by hand you write the current time. Every category but the guides has it: the showcase can list apps newest first by it, and UI libraries, state management, templates, AI tools, articles and community plugins are listed oldest first. Official plugins and the guides are listed by name. Keeping each entry in its own file means pull requests that add entries at the same time never conflict.
- The other categories' files have the same `$schema`, `slug` and (but for the guides) `added` around their fields; their schemas in `data/schema/` list the fields.
- `platforms` lists the operating systems the app runs on, at least one of `win`, `linux` and `mac`. CI rejects an app without it.
- `url` is the app's homepage: its website, or its repository if it has none; it need not be on GitHub. An open-source app adds its GitHub repository as `repo` (`owner/name`); a closed-source one leaves it out.
- Text fields hold one string per language. `en` is required; `zh-CN`, `zh-TW`, `ja` and `ko` are optional, and a missing language shows the English text.
- Each file names its JSON Schema (in `data/schema/`) in `$schema`, so VS Code and other editors complete and check the fields as you type.
- Links must be https. For a screenshot, add a WebP about 1200px wide to `apps/web/public/shots/` and set `"screenshot": "my-app.webp"`. For an app icon, set `"icon": { "ailogo": "<id>" }` with an [ai-logo](https://github.com/yldm-tech/ai-logo) id; for the app's own icon, add a 128px WebP to `apps/web/public/icons/` and set `"icon": { "file": "my-app.webp" }`. Leave it out for a letter tile.
- `pnpm test` checks every entry and names the file, entry and field of each mistake. CI runs it on every pull request.

The UI copy is in `packages/catalog/locales/`, one JSON file per language with the same keys. `zh-CN.json` is the reference: add a new key there and to the other four files; `pnpm typecheck` and `pnpm test` report a missing key or a mismatched `{x}`/`{n}` placeholder.

## Credits

- [MyGo](https://github.com/egoist/mygo) is made by [egoist](https://github.com/egoist) (MIT). The showcase, plugin and guide data follows its repository and site.
- App icons are from [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo) (MIT, a fork of LobeHub's [lobe-icons](https://github.com/lobehub/lobe-icons)) or the apps' own icons. Screenshots come from egoist/mygo's showcase and the projects' READMEs. Both belong to the apps' authors; names and logos are their trademarks and are shown to identify them.

## License

The code is released under the [MIT License](LICENSE).
