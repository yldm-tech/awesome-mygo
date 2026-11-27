# Awesome MyGo

[![Website](https://img.shields.io/badge/website-awesomemygo.dev-3fd3f5)](https://awesomemygo.dev)
[![CI](https://github.com/yldm-tech/awesome-mygo/actions/workflows/ci.yml/badge.svg)](https://github.com/yldm-tech/awesome-mygo/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/yldm-tech/awesome-mygo)](LICENSE)
[![X](https://img.shields.io/badge/X-%40suzukaze__haduki-000000?logo=x&logoColor=white)](https://x.com/suzukaze_haduki)
[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/houko)

Yerel UI veya web ön yüzü ile masaüstü uygulamaları için Go araç takımı [MyGo](https://github.com/egoist/mygo) etrafındaki uygulamalar, eklentiler, bileşenler ve rehberler tek bir sitede toplandı: **[awesomemygo.dev](https://awesomemygo.dev)**.

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · Türkçe

[![Awesome MyGo](.github/assets/banner.png)](https://awesomemygo.dev)

## Sitede neler var

- **Showcase**: MyGo ile geliştirilmiş masaüstü uygulamaları; ada, en yeniye veya en beğenilene göre sıralanır. Her birinin tam açıklaması, projenin varsa ekran görüntüsü, arayüzü (yerel UI veya web ön yüzü), kategorisi, ne zaman eklendiği ve aynı yazarın diğer uygulamalarını gösteren kendi sayfası vardır.
- **Plugins**: Hizmet verdikleri pencere türüne göre işaretlenmiş (web sayfaları, yerel UI veya her ikisi) resmî eklentiler ve `mygo-cli` araç zinciri.
- **UI components**: MyGo uygulamaları için yapılmış bileşen kütüphaneleri, temalar ve simgeler.
- **State**: MyGo'nun kendi bağlı servisleri, kanalları ve tipli olaylarının yanında MyGo uygulamaları için durum yönetimi.
- **Templates**: Ön yüz yığını, testleri, CI veya paketlemesi hazır, bir MyGo uygulamasına başlangıç projeleri.
- **AI tools**: Yapay zekâ kodlama ajanlarının MyGo uygulamaları oluşturmasına yardımcı olan ajan becerileri (skills), MCP sunucuları ve kurallar.
- **Learn**: Resmî rehberler, topluluk makaleleri ve resmî kaynaklar.
- Her şeyde <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> ile **arama** ve listelenmesini istediğiniz bir proje için girdiyi oluşturan bir form.

Site Basitleştirilmiş Çince, Geleneksel Çince, İngilizce, Japonca ve Korece dillerini konuşur. Her sayfanın dile göre kendi adresi vardır (`?lang=en`), sunucuda işlenir ve hreflang bağlantıları ile bir site haritasına sahiptir. Filtreler, sıralama düzenleri ve sekmeler de adreste tutulur (`/showcase?cat=dev&sort=newest`), böylece paylaşılan bir bağlantı aynı görünümü açar.

## Nasıl geliştirildi

[Cloudflare Workers](https://workers.cloudflare.com) üzerinde [TanStack Start](https://tanstack.com/start) ile sunulan bir pnpm monorepo'su:

| Yol | Ne barındırır |
|---|---|
| `apps/web` | Site: React 19, TanStack Start (sunucu tarafı işleme) ve `@cloudflare/vite-plugin` ile Vite. `wrangler.jsonc` bunu `awesomemygo.dev` adresine dağıtır. |
| `packages/catalog` | Veri: `data/*.json` (uygulamalar, UI bileşenleri, durum çözümleri, şablonlar, yapay zekâ araçları, eklentiler, makaleler, rehberler) ve bunların JSON Şemaları, beş dilde UI metinleri, arama ve gönderim formunun girdileri. Testleri her girdiyi doğrular. |
| `packages/enrich` | Gönderim botunun açtığı bir pull request'i tamamlar: deposundan uygulamanın simgesi, yüklenen görselden veya formda verilen bağlantıdan ya da depodan ekran görüntüsü ve beş dilin tamamında metni (Claude ile yazılır). `.github/workflows/enrich-submission.yml` tarafından çalıştırılır. Haftada bir kez `.github/workflows/verify.yml` ayrıca listelenen her projenin deposunu kontrol eder ve deponun değiştiğini bildirdiği şeyler için girdi başına bir pull request açar: silinmiş, gizli veya devre dışı bırakılmış bir depo girdiyi kaldırır, yeniden adlandırılmış veya aktarılmış bir depo günceller, eksik ana sayfa eklenir ve projenin kendi görseli olduğunda geçici görsel değiştirilir; arşivlenmiş veya artık MyGo ile geliştirilmeyen bir depo yalnızca çalıştırma özetinde listelenir. Haftada bir kez `.github/workflows/prune.yml`, bir bakımcının birleştireceği tek bir pull request içinde sitenin standardının altında kalan girdileri çıkarmayı önerir: sitede 30 günden sonra 20'nin altında puan, 180 günden uzun süredir commit olmaması, arşivlenmiş depo veya artık MyGo ile geliştirilmemesi; bir bakımcının tuttuğu bir girdi bir daha önerilmez. |

Uygulama simgeleri, CDN'i tarafından sunulan [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo) deposundan gelir; orada listelenmeyen birkaç uygulama `apps/web/public/icons/` içindeki resmî simgesini kullanır.

Her uygulamanın sayfasında, bağlantı önizlemelerinin gösterdiği, uygulamanın simgesi, adı, yazarı ve ekran görüntüsünü içeren 1200×630 PNG boyutunda bir paylaşım kartı bulunur. `vite build` kartları `/og/` (`apps/web/og`) içine çizer, böylece botun eklediği bir uygulama onu ekleyen dağıtımda kartını alır. Derleme bunlar için ağa ihtiyaç duyar: ai-logo simgelerini ve Latin alfabesi dışındaki adlar için Google Fonts'tan glifleri çeker.

## Geliştirme

Node.js 24 veya üzeri ve pnpm gerektirir.

```sh
pnpm install
pnpm dev          # Workers çalışma zamanı tarafından sunulan yerel site
pnpm test         # katalog testleri
pnpm typecheck
pnpm build
pnpm preview      # Workers çalışma zamanında üretim derlemesi
```

`pnpm deploy`, Wrangler ile derler ve dağıtır. `apps/web/wrangler.jsonc` içindeki alan adının bölgesine sahip bir Cloudflare hesabı gerektirir.

Formdan gelen doğrudan gönderimler, önünde Cloudflare Turnstile ve IP başına hız sınırı bulunan bu depoda yüklü bir GitHub App üzerinden geçer. Uygulamaya *Contents* ve *Pull requests* okuma ve yazma erişimi verin, özel anahtarını PKCS#8 biçimine dönüştürün (`openssl pkcs8 -topk8 -nocrypt -in key.pem -out key-pkcs8.pem`) ve `apps/web` içinde `wrangler secret put` ile dört gizli anahtar ayarlayın: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (PKCS#8 dosyası), `TURNSTILE_SITE_KEY` ve `TURNSTILE_SECRET_KEY`. Dördü de ayarlanana kadar form yalnızca GitHub bağlantılarını sunar. Yerel test için Turnstile'ın [test anahtarlarını](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) `apps/web/.dev.vars` içine koyun.

Kararlı Chrome, sitenin ziyaretçileri için WebMCP'yi ve bununla birlikte gönderim formunun araçlarını yalnızca bir origin trial aracılığıyla açar. Üretim kökenini (`https://awesomemygo.dev`) [developer.chrome.com/origintrials](https://developer.chrome.com/origintrials/) adresinde WebMCP denemesi için kaydedin ve `apps/web` içinde `wrangler secret put WEBMCP_ORIGIN_TRIAL` ile belirteci ayarlayın: böylece her sayfa bunu bir `<meta http-equiv="origin-trial">` etiketinde taşır, aksi hâlde hiçbiri taşımaz. Belirteç deneme ile birlikte sona erer; o zaman tekrar kaydedin veya gizli anahtarı kaldırın.

Bir uygulama, UI bileşenleri, durum yönetimi, bir şablon veya bir yapay zekâ aracı bir ekran görüntüsü gerektirir. Ziyaretçi deponun bağlantısını yazdıktan sonra form, Worker'a (`/api/shot`) deponun gönderim iş akışının kendi kurallarına (`packages/enrich/src/source.ts`) göre kabul edeceği bir görsele sahip olup olmadığını sorar; sahip değilse veya bir uygulamanın deposu yoksa form bir görsel ister ve Worker onsuz gönderimi reddeder. Ziyaretçi bir görsel yükler (PNG, JPEG veya WebP, en fazla 5 MB, yatay ve en az 600 piksel genişliğinde) ya da bir bağlantı verir. Yüklenen görsel pull request'in dalına `submissions/<slug>.<ext>` olarak gider ve pull request içinde görünür; iş akışı bunu sitenin WebP biçimine dönüştürür ve kaldırır. Kontrol IP başına dakikada 20 ile sınırlıdır.

Bot bir pull request açtığında, *Complete submission* iş akışı formun isteyemediği alanları doldurur: MyGo'nun aradığı yerde uygulamanın simgesi (`mygo.json` içinde `icon`, yoksa `resources/icon.png`; `mygo init` ile bırakılan MyGo'nun varsayılan simgesi olduğunda hiçbiri), README'sindeki simge veya başka bir kare logo olmayan ilk ekran görüntüsü ve beş dilin tamamında özet ile açıklama. UI bileşenleri ve durum yönetimi için ekran görüntüsünü aynı şekilde ve depo ayarlarından ana sayfayı ekler; formun varsayılanla doldurduğu alanlar içinse (bir uygulamanın vitrin `group` değeri — bir tane belirtilmedikçe kategorisi buradan gelir —, bir UI kütüphanesinin `tag` ve `surface` değerleri, bir eklentinin `surface` değeri, durum yönetimi ve eklentilerin `tags` değerleri) model metinle birlikte bir değer seçer. Katalog kontrollerini çalıştırır, botla aynı dala push yapar ve ne yaptığını yorum olarak yazar; birleştirme öncesinde bir bakımcı yine de sonucu inceler. Deponun Actions ayarlarında `SUBMIT_APP_PRIVATE_KEY` (Worker için olduğu gibi uygulamanın PKCS#8 anahtarı), `LLM_API_KEY` (bir Anthropic Messages API anahtarı) ve bir ağ geçidi için `LLM_BASE_URL` gizli anahtarları ile `SUBMIT_APP_CLIENT_ID` (uygulamanın istemci kimliği) değişkeni gerekir; `LLM_MODEL` değişkeni modeli geçersiz kılar (`claude-opus-5-5`). `LLM_API_KEY` olmadan metin gönderildiği gibi kalır.

Formun issue bağlantısı üzerinden gönderilen bir issue, *Submission issue* iş akışından (`.github/workflows/issue-submission.yml`) aynı pull request'i alır: girdiyi Worker'ın yapıştırılan bir girdiyi kontrol ettiği gibi (gereken ekran görüntüsü ve 16 KB sınırı dâhil) kontrol eder, botun issue'nun açıldığı tarihe sahip girdiyle üzerinde *Complete submission*'ın çalışacağı pull request'i açmasını sağlar, ardından issue üzerine pull request'i yorum olarak bırakır ve issue'yu kapatır. İçeri alınamayan bir girdi bunun yerine neyin düzeltileceğini söyleyen bir yorum alır ve issue'yu düzenlemek onu yeniden kontrol eder; bot issue başına tek bir yorum tutar. Formun yol satırı ve altındaki json kod bloğu olmayan issue'lara dokunulmaz. Bir issue yalnızca bir GitHub hesabı gerektirir, captcha gerektirmez; bu nedenle paylaşılan 20 açık gönderim sınırının yanı sıra bot bir kişinin issue'larından en fazla 2 tanesini açık tutar. Aynı `SUBMIT_APP_PRIVATE_KEY` ve `SUBMIT_APP_CLIENT_ID` değerlerini kullanır; issue iş akışının kendi belirteciyle okunur, yorumlanır ve kapatılır, bu nedenle uygulamanın issue'lara erişmesine gerek yoktur. Bir issue'yu elle yeniden kontrol etmek için iş akışını issue numarasıyla çalıştırın.

## Proje ekleme

Her girdi [`packages/catalog/data`](packages/catalog/data) altında, kendi kategorisinin dizininde ve `slug` değerine göre adlandırılmış ayrı bir JSON dosyasıdır:

| Dosya | Listeler |
|---|---|
| `apps/<slug>.json` | MyGo ile geliştirilmiş uygulamalar |
| `ui/<slug>.json` | UI bileşen kütüphaneleri |
| `state/<slug>.json` | Durum yönetimi |
| `templates/<slug>.json` | Şablonlar |
| `ai/<slug>.json` | Yapay zekâ araçları |
| `plugins/<slug>.json` | Eklentiler |
| `articles/<slug>.json` | Makaleler |
| `docs/<slug>.json` | MyGo rehberleri |

Eklemenin iki yolu vardır:

- **Siteden:** "Submit"e tıklayıp formu doldurun veya tüm girdiyi JSON olarak yapıştırıp doğrudan gönderin: GitHub hesabı gerekmez, sitenin botu sizin için pull request'i açar. Bir GitHub hesabıyla oluşturulan girdiyi issue olarak da gönderebilirsiniz; sitenin botu bunu aynı pull request'e dönüştürür veya girdinin yeni dosyasını GitHub düzenleyicisinde açıp kendiniz ekleyebilirsiniz. [WebMCP](https://webmachinelearning.github.io/webmcp/) özellikli bir tarayıcıdaki yapay zekâ ajanı girdiyi kontrol edebilir ve sizin kontrol edip göndermeniz için formu doldurabilir.
- **Depoda:** Kategorinin dizinine bir dosya ekleyin ve bir pull request açın.

Bir uygulamanın dosyası (`apps/my-app.json`) şöyle görünür:

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

- Dosya `slug` değerine göre adlandırılır. `added`, girdinin siteye UTC olarak ne zaman katıldığını belirtir; site botu bunu ayarlar, elle eklerken geçerli zamanı yazarsınız. Rehberler dışındaki her kategoride bulunur: vitrin uygulamaları buna göre en yeniden eskiye sıralayabilir; UI kütüphaneleri, durum yönetimi, şablonlar, yapay zekâ araçları, makaleler ve topluluk eklentileri en eskiden yeniye sıralanır. Resmî eklentiler ve rehberler ada göre sıralanır. Her girdiyi kendi dosyasında tutmak, aynı anda girdi ekleyen pull request'lerin asla çakışmaması anlamına gelir.
- Diğer kategorilerin dosyaları alanlarının etrafında aynı `$schema`, `slug` ve (rehberler hariç) `added` alanlarına sahiptir; `data/schema/` içindeki şemaları alanları listeler.
- `platforms` uygulamanın çalıştığı işletim sistemlerini listeler; `win`, `linux` ve `mac` değerlerinden en az biri olmalıdır. CI bunu içermeyen bir uygulamayı reddeder.
- `url` uygulamanın ana sayfasıdır: web sitesi veya yoksa deposu; GitHub üzerinde olması gerekmez. Açık kaynaklı bir uygulama GitHub deposunu `repo` (`owner/name`) olarak ekler; kapalı kaynaklı bir uygulama bunu dışarıda bırakır.
- Metin alanları dil başına bir dize tutar. `en` zorunludur; `zh-CN`, `zh-TW`, `ja` ve `ko` isteğe bağlıdır ve eksik bir dil İngilizce metni gösterir.
- Her dosya `$schema` içinde kendi JSON Şemasını (`data/schema/` içinde) belirtir; böylece VS Code ve diğer düzenleyiciler siz yazarken alanları tamamlar ve kontrol eder.
- Bağlantılar https olmalıdır. Ekran görüntüsü için `apps/web/public/shots/` dizinine yaklaşık 1200px genişliğinde bir WebP ekleyin ve `"screenshot": "my-app.webp"` ayarlayın. Uygulama simgesi için bir [ai-logo](https://github.com/yldm-tech/ai-logo) kimliğiyle `"icon": { "ailogo": "<id>" }` ayarlayın; uygulamanın kendi simgesi için `apps/web/public/icons/` dizinine 128px bir WebP ekleyin ve `"icon": { "file": "my-app.webp" }` ayarlayın. Harf kutucuğu için boş bırakın.
- `pnpm test` her girdiyi kontrol eder ve her hatanın dosyasını, girdisini ve alanını belirtir. CI bunu her pull request'te çalıştırır.

UI metinleri `packages/catalog/locales/` içinde, aynı anahtarlara sahip dil başına bir JSON dosyasındadır. `zh-CN.json` referanstır: yeni bir anahtarı oraya ve diğer dört dosyaya ekleyin; `pnpm typecheck` ve `pnpm test` eksik bir anahtarı veya uyumsuz `{x}`/`{n}` yer tutucusunu bildirir.

## Katkıda bulunanlar ve kaynaklar

- [MyGo](https://github.com/egoist/mygo), [egoist](https://github.com/egoist) tarafından yapılmıştır (MIT). Vitrin, eklenti ve rehber verileri onun deposunu ve sitesini takip eder.
- Uygulama simgeleri [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo) (MIT, LobeHub'ın [lobe-icons](https://github.com/lobehub/lobe-icons) projesinin bir çatalı) deposundan veya uygulamaların kendi simgelerinden gelir. Ekran görüntüleri egoist/mygo vitrininden ve projelerin README dosyalarından alınmıştır. Her ikisi de uygulamaların yazarlarına aittir; adlar ve logolar onların ticari markalarıdır ve onları tanıtmak için gösterilmektedir.

## Lisans

Kod [MIT Lisansı](LICENSE) altında yayınlanmıştır.
