# Awesome MyGo

[![Website](https://img.shields.io/badge/website-awesomemygo.dev-3fd3f5)](https://awesomemygo.dev)
[![CI](https://github.com/yldm-tech/awesome-mygo/actions/workflows/ci.yml/badge.svg)](https://github.com/yldm-tech/awesome-mygo/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/yldm-tech/awesome-mygo)](LICENSE)
[![X](https://img.shields.io/badge/X-%40suzukaze__haduki-000000?logo=x&logoColor=white)](https://x.com/suzukaze_haduki)
[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/houko)

[MyGo](https://github.com/egoist/mygo) 관련 앱, 플러그인, 컴포넌트, 문서를 한 사이트에 모았습니다: **[awesomemygo.dev](https://awesomemygo.dev)**. MyGo는 Go로 데스크톱 앱을 만드는 도구로, 화면을 네이티브 UI로도 웹 프런트엔드로도 만들 수 있습니다.

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · 한국어

[![Awesome MyGo](.github/assets/banner.png)](https://awesomemygo.dev)

## 사이트 내용

- **쇼케이스**: MyGo로 만든 데스크톱 앱. 이름순, 최신순, 인기순으로 정렬할 수 있습니다. 앱마다 전용 페이지가 있어 자세한 설명, 스크린샷(프로젝트가 제공한 경우), 인터페이스 종류(네이티브 UI 또는 웹 프런트엔드), 카테고리, 등록일, 같은 작성자의 다른 앱을 보여줍니다.
- **플러그인**: 공식 플러그인. 웹 페이지, 네이티브 UI, 또는 둘 다 중 어디에 쓰는지 표시하며, `mygo-cli` 툴체인도 소개합니다.
- **UI 컴포넌트**: MyGo 앱을 위한 컴포넌트 라이브러리, 테마, 아이콘.
- **상태 관리**: MyGo 앱의 상태 관리 솔루션과 MyGo에 내장된 바인딩 서비스, 채널, 타입 이벤트.
- **템플릿**: 프런트엔드 스택, 테스트, CI, 패키징이 갖춰진 MyGo 앱의 출발점.
- **AI 도구**: AI 코딩 에이전트가 MyGo 앱을 만들도록 돕는 스킬, MCP 서버, 규칙.
- **문서**: 공식 가이드, 커뮤니티 글, 공식 자료.
- <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd>로 모든 내용을 **검색**할 수 있고, 수록하고 싶은 프로젝트가 있으면 제출 양식이 항목을 대신 작성해 줍니다.

사이트는 중국어 간체, 중국어 번체, 영어, 일본어, 한국어를 지원합니다. 모든 페이지는 언어마다 고유한 주소(`?lang=en`)를 가지며, 서버에서 렌더링되고 hreflang 링크와 sitemap을 갖추고 있습니다. 필터, 정렬, 탭도 주소에 남아(`/showcase?cat=dev&sort=newest`) 공유한 링크가 같은 화면으로 열립니다.

## 구성

pnpm 모노레포이며, [TanStack Start](https://tanstack.com/start)가 [Cloudflare Workers](https://workers.cloudflare.com)에서 제공합니다:

| 경로 | 내용 |
|---|---|
| `apps/web` | 사이트: React 19, TanStack Start(서버 렌더링), `@cloudflare/vite-plugin`을 쓰는 Vite. `wrangler.jsonc`로 `awesomemygo.dev`에 배포합니다. |
| `packages/catalog` | 데이터: `data/*.json`(앱, UI 컴포넌트, 상태 관리 솔루션, 템플릿, AI 도구, 플러그인, 글, 가이드)과 그 JSON Schema, 5개 언어의 UI 문구, 검색, 제출 양식의 항목. 테스트로 모든 항목을 검증합니다. |
| `packages/enrich` | 제출 bot이 연 풀 리퀘스트를 완성합니다: 프로젝트 저장소에서 앱 아이콘을, 양식에서 업로드한 이미지나 적은 링크(없으면 저장소)에서 스크린샷을 가져오고, 5개 언어 문구를 Claude로 씁니다. `.github/workflows/enrich-submission.yml`이 실행합니다. 또한 `.github/workflows/verify.yml`이 매주 등재된 모든 프로젝트의 저장소를 확인하고, 저장소가 바뀐 항목마다 풀 리퀘스트를 엽니다: 저장소가 삭제·비공개·비활성화되면 항목을 내리고, 이름이 바뀌거나 이전되면 항목을 고치고, 없는 homepage를 채우고, 프로젝트 자체 이미지가 생기면 임시 이미지를 바꿉니다. 보관된 저장소나 더 이상 MyGo로 만들지 않는 저장소는 실행 요약에만 적습니다. `.github/workflows/prune.yml`은 매주 사이트 기준에 못 미치는 항목을 내리자는 제안을 풀 리퀘스트 하나로 엽니다: 등재 30일 뒤에도 점수가 20 미만이거나, 180일 넘게 커밋이 없거나, 저장소가 보관되었거나, 더 이상 MyGo로 만들지 않는 항목입니다. 관리자가 병합해야 내려가며, 남겨 둔 항목은 다시 제안되지 않습니다. |

앱 아이콘은 [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo)의 CDN에서 가져옵니다. ai-logo에 없는 일부 앱은 `apps/web/public/icons/`의 공식 아이콘을 씁니다.

앱 페이지마다 공유 카드가 있습니다. 앱의 아이콘, 이름, 작성자, 스크린샷을 담은 1200×630 PNG로, 링크 미리보기에 표시됩니다. `vite build`가 카드를 `/og/`에 생성하므로(코드는 `apps/web/og`) bot이 추가한 앱도 배포될 때 카드가 생깁니다. 카드를 만들려면 네트워크가 필요합니다: 빌드할 때 ai-logo 아이콘을 받아 오고, 이름에 라틴 문자가 아닌 글자가 있으면 Google Fonts에서 글리프도 가져옵니다.

## 개발

Node.js 24 이상과 pnpm이 필요합니다.

```sh
pnpm install
pnpm dev          # 로컬 사이트(Workers 런타임에서 렌더링)
pnpm test         # catalog 테스트
pnpm typecheck
pnpm build
pnpm preview      # 프로덕션 빌드를 Workers 런타임에서 실행
```

`pnpm deploy`는 Wrangler로 빌드하고 배포합니다. `apps/web/wrangler.jsonc`에 있는 도메인의 영역(zone)을 가진 Cloudflare 계정이 필요합니다.

양식의 바로 제출은 이 저장소에 설치한 GitHub App이 처리하며, 그 앞에 Cloudflare Turnstile과 IP별 요청 제한이 있습니다. App에 *Contents*와 *Pull requests* 읽기·쓰기 권한을 주고, 개인 키를 PKCS#8로 변환한 뒤(`openssl pkcs8 -topk8 -nocrypt -in key.pem -out key-pkcs8.pem`), `apps/web`에서 `wrangler secret put`으로 시크릿 4개를 설정합니다: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`(PKCS#8 파일), `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. 4개가 모두 설정되기 전까지 양식은 GitHub 링크만 보여 줍니다. 로컬에서 시험할 때는 Turnstile의 [테스트 키](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)를 `apps/web/.dev.vars`에 적습니다.

안정 버전 Chrome은 origin trial을 통해서만 사이트 방문자에게 WebMCP와 그에 따른 제출 양식의 도구를 켭니다. [developer.chrome.com/origintrials](https://developer.chrome.com/origintrials/)에서 실제 사이트의 오리진(`https://awesomemygo.dev`)을 WebMCP 트라이얼에 등록하고, `apps/web`에서 `wrangler secret put WEBMCP_ORIGIN_TRIAL`로 토큰을 설정합니다. 그러면 모든 페이지가 `<meta http-equiv="origin-trial">` 태그로 토큰을 담고, 설정하지 않으면 담지 않습니다. 토큰은 트라이얼이 끝나면 만료되므로, 그때 다시 등록하거나 시크릿을 삭제합니다.

앱, UI 컴포넌트, 상태 관리, 템플릿, AI 도구에는 스크린샷이 필요합니다. 방문자가 저장소 링크를 입력하면 양식이 Worker(`/api/shot`)에 submission workflow 자체의 규칙(`packages/enrich/src/source.ts`)으로 저장소에 쓸 수 있는 스크린샷이 있는지 확인합니다. 없거나 앱에 저장소가 없으면 양식이 한 장을 요구하고, Worker도 스크린샷 없는 제출을 받지 않습니다. 방문자는 이미지(PNG, JPEG, WebP, 5MB 이하, 가로이며 너비 600픽셀 이상)를 업로드하거나 이미지 링크를 입력합니다. 업로드한 이미지는 `submissions/<slug>.<ext>`로 풀 리퀘스트 브랜치에 올라가 풀 리퀘스트에 표시되고, workflow가 사이트용 WebP로 바꾼 뒤 지웁니다. 이 확인은 IP마다 분당 20회로 제한됩니다.

bot이 풀 리퀘스트를 열면 *Complete submission* 워크플로가 양식으로는 물을 수 없는 부분을 채웁니다: MyGo와 같은 방식으로 찾은 앱 아이콘(`mygo.json`의 `icon`, 없으면 `resources/icon.png`. `mygo init`이 넣은 MyGo 기본 아이콘이면 넣지 않습니다), README에서 아이콘이나 다른 정사각형 로고가 아닌 첫 스크린샷, 5개 언어의 요약과 설명입니다. UI 컴포넌트와 상태 관리에도 같은 방식으로 스크린샷을 붙이고 저장소 설정의 homepage를 채웁니다. 양식이 기본값으로 채우는 항목(앱의 쇼케이스 그룹 `group`. 카테고리를 따로 쓰지 않으면 그룹에서 정해집니다. UI 라이브러리의 `tag`와 `surface`, 플러그인의 `surface`, 상태 관리와 플러그인의 `tags`)은 모델이 문구와 함께 고릅니다. catalog 검사를 실행하고, bot으로 같은 브랜치에 푸시하고, 무엇을 했는지 댓글로 남깁니다. 병합 전 검토는 여전히 관리자가 합니다. 저장소의 Actions 설정에 시크릿 `SUBMIT_APP_PRIVATE_KEY`(App의 PKCS#8 개인 키, Worker와 같은 것), `LLM_API_KEY`(Anthropic Messages API 키), 게이트웨이를 쓴다면 `LLM_BASE_URL`을, 변수 `SUBMIT_APP_CLIENT_ID`(App의 Client ID)를 설정합니다. 변수 `LLM_MODEL`로 모델을 바꿀 수 있습니다(기본값 `claude-opus-5-5`). `LLM_API_KEY`가 없으면 문구는 제출된 그대로입니다.

## 프로젝트 추가

항목마다 [`packages/catalog/data`](packages/catalog/data) 아래의 JSON 파일 하나이며, 카테고리 디렉터리에 두고 `slug`를 파일 이름으로 씁니다:

| 파일 | 내용 |
|---|---|
| `apps/<slug>.json` | MyGo로 만든 앱 |
| `ui/<slug>.json` | UI 컴포넌트 라이브러리 |
| `state/<slug>.json` | 상태 관리 |
| `templates/<slug>.json` | 템플릿 |
| `ai/<slug>.json` | AI 도구 |
| `plugins/<slug>.json` | 플러그인 |
| `articles/<slug>.json` | 글 |
| `docs/<slug>.json` | MyGo 공식 가이드 |

추가하는 방법은 두 가지입니다:

- **사이트에서:** "제출"을 눌러 양식을 채우거나 항목을 JSON 그대로 붙여넣은 뒤 바로 제출합니다. GitHub 계정이 필요 없으며, 사이트의 bot이 풀 리퀘스트를 만들어 줍니다. GitHub 계정이 있다면 생성된 항목을 이슈로 보내거나, GitHub 편집기에서 항목의 새 파일을 열어 직접 추가할 수도 있습니다. [WebMCP](https://webmachinelearning.github.io/webmcp/)를 지원하는 브라우저에서는 AI 에이전트가 항목을 확인하고 양식을 채워 주며, 확인하고 제출하는 것은 직접 합니다.
- **저장소에서:** 카테고리 디렉터리에 파일을 하나 추가한 뒤 풀 리퀘스트를 보냅니다.

앱 파일 `apps/my-app.json`은 다음과 같습니다:

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

- 파일 이름은 `slug`와 같습니다. `added`는 항목이 사이트에 들어온 시각(UTC)으로, 사이트 bot이 채우며 직접 추가할 때는 현재 시각을 씁니다. 공식 가이드를 뺀 모든 카테고리에 있으며, 쇼케이스는 이것으로 최신 앱부터 보여 줄 수 있고 UI 컴포넌트 라이브러리, 상태 관리, 템플릿, AI 도구, 글, 커뮤니티 플러그인은 오래된 순으로 나열됩니다. 공식 플러그인과 공식 가이드는 이름순입니다. 항목마다 파일이 따로 있어서 동시에 항목을 추가하는 풀 리퀘스트끼리 충돌하지 않습니다.
- 다른 카테고리의 파일도 같은 `$schema`, `slug`, `added`를 가지며(공식 가이드에는 `added`가 없습니다), 필드는 `data/schema/`의 각 스키마에 있습니다.
- `platforms`에는 앱이 실행되는 운영체제를 `win`, `linux`, `mac` 중 하나 이상 적습니다. 이 항목이 없으면 CI에서 오류가 납니다.
- `url`은 앱의 홈페이지입니다. 공식 웹사이트, 없으면 저장소 주소이며 GitHub가 아니어도 됩니다. 오픈 소스 앱은 `repo`에 GitHub 저장소(`owner/name`)를 적고, 비공개 소스 앱은 생략합니다.
- 텍스트 필드는 언어별로 하나씩 씁니다. `en`은 필수이고 `zh-CN`, `zh-TW`, `ja`, `ko`는 선택이며, 빠진 언어에서는 영어가 표시됩니다.
- 각 파일은 `$schema`로 자신의 JSON Schema(`data/schema/`)를 가리키므로 VS Code 등의 편집기가 입력하는 동안 필드를 자동 완성하고 검사합니다.
- 링크는 https여야 합니다. 스크린샷은 너비 약 1200px의 WebP를 `apps/web/public/shots/`에 두고 `"screenshot": "my-app.webp"`로 씁니다. 앱 아이콘은 [ai-logo](https://github.com/yldm-tech/ai-logo) id로 `"icon": { "ailogo": "<id>" }`를 씁니다. 앱 자체 아이콘을 쓰려면 128px WebP를 `apps/web/public/icons/`에 두고 `"icon": { "file": "my-app.webp" }`로 씁니다. 생략하면 글자 타일이 표시됩니다.
- `pnpm test`는 모든 항목을 검증하고 오류가 있는 파일, 항목, 필드를 알려 줍니다. CI가 모든 풀 리퀘스트에서 실행합니다.

UI 문구는 `packages/catalog/locales/`에 있으며, 언어마다 키가 같은 JSON 파일이 하나씩 있습니다. 기준은 `zh-CN.json`입니다. 키를 추가할 때는 나머지 네 파일에도 넣어야 하며, 빠진 키나 `{x}`/`{n}` 자리표시자 불일치는 `pnpm typecheck`와 `pnpm test`가 잡아냅니다.

## 크레딧

- [MyGo](https://github.com/egoist/mygo)는 [egoist](https://github.com/egoist)가 만들었습니다(MIT). 쇼케이스, 플러그인, 가이드 데이터는 그 저장소와 사이트를 따릅니다.
- 앱 아이콘은 [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo)(MIT, LobeHub [lobe-icons](https://github.com/lobehub/lobe-icons)의 포크) 또는 앱 자체의 아이콘이며, 스크린샷은 egoist/mygo 쇼케이스와 각 프로젝트의 README에서 가져왔습니다. 모두 각 앱의 작성자에게 속하며, 이름과 로고는 해당 상표로 식별 목적으로만 표시합니다.

## 라이선스

코드는 [MIT 라이선스](LICENSE)로 공개합니다.
