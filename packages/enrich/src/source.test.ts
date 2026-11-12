import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoIcons, repoLikelyScreenshots, repoShotSources, shotProblem, stagedShot, stagedShotOf, addedFiles, appNameFrom, knownFiles, cleanPlatforms, cleanTags, formDefaults, homepageOf, hasAllLanguages, markProvisional, iconCut, iconOf, isArtwork, isBanner, isPortrait, isSquarish, lengthCaps, overCaps, displayWidth, overSnippet, snippetOf, summaryRoom, joinRepoPath, scriptConfig, parseMygoConfig, pickMygoConfig, readmeImages, repoOfEntry, repoScreenshots, resolveImage, schemaEnum, platformsAtDefault, setCategory, setGroup, setPlatforms, sniffImage, submittedScreenshot } from './source.ts';

describe('app names', () => {
	it('takes mygo.json’s spelling of the same name only', () => {
		expect(appNameFrom('myskills', { name: 'MySkills' })).toBe('MySkills');
		expect(appNameFrom('MySkills', { name: 'MySkills' })).toBeUndefined();
		expect(appNameFrom('Skill Shelf', { name: 'MySkills' })).toBeUndefined();
		expect(appNameFrom('myskills', {})).toBeUndefined();
		expect(appNameFrom('Collate', { name: 'collate' })).toBeUndefined();
	});

	it('limits copy to the longest example in each language', () => {
		const examples = [{ description: { en: 'x'.repeat(371), ja: 'あ'.repeat(248) } }, { description: { en: 'x'.repeat(405), ja: 'あ'.repeat(236) } }, { summary: { en: 'short' } }];
		const caps = lengthCaps(examples, 'description');
		expect(caps).toEqual({ en: 405, ja: 248 });
		expect(overCaps({ en: 'x'.repeat(445), ja: 'あ'.repeat(300) }, caps)).toEqual(['ja 300/248']);
		expect(overCaps({ en: 'x'.repeat(446) }, caps)).toEqual(['en 446/405']);
		expect(overCaps({ en: 'x', 'zh-CN': '很长'.repeat(500) }, caps)).toEqual([]);
	});

	it('leaves an app summary the columns its author\'s sentence does not take in the search snippet', () => {
		const tails = { en: 'A desktop app by UncertaintyDeterminesYou4ndMe, built with Go and MyGo.', 'zh-CN': '由 UncertaintyDeterminesYou4ndMe 用 Go 与 MyGo 开发的桌面应用。' };
		expect(displayWidth('Go 与 MyGo。')).toBe(12);
		expect(snippetOf('Runs act.', 'By x.')).toBe('Runs act. By x.');
		expect(snippetOf('本地运行。', '由 x 开发。')).toBe('本地运行。由 x 开发。');
		// 160 columns less the 71 of the English sentence and the space before it.
		expect(summaryRoom(tails)).toEqual({ en: 88, 'zh-CN': 160 - displayWidth(` ${tails['zh-CN']}`) });
		const en = 'A macOS menu bar view of the flintrade paper-trading agent: P&L, positions, fills and loops.';
		expect(overSnippet({ en, 'zh-CN': '查看 flintrade 模拟交易代理的 macOS 菜单栏应用。' }, tails)).toEqual(['en 164/160']);
		expect(overSnippet({ en: en.slice(0, 88) }, tails)).toEqual([]);
		expect(overSnippet({ en: en.slice(0, 89) }, tails)).toEqual(['en 161/160']);
		expect(overSnippet({ en }, {})).toEqual([]);
	});

	it('keeps copy already in every site language', () => {
		expect(hasAllLanguages({ en: 'a', 'zh-CN': 'b', 'zh-TW': 'c', ja: 'd', ko: 'e' })).toBe(true);
		expect(hasAllLanguages({ en: 'a', 'zh-CN': 'b', 'zh-TW': 'c', ja: 'd', ko: ' ' })).toBe(false);
		expect(hasAllLanguages({ en: '本地 agent skills 库管理工具' })).toBe(false);
		expect(hasAllLanguages(undefined)).toBe(false);
	});
});

describe('stand-in images', () => {
	it('records each stand-in once, in a fixed order', () => {
		const entry: Record<string, unknown> = { slug: 'kit' };
		markProvisional(entry, 'screenshot');
		expect(entry.provisional).toEqual(['screenshot']);
		markProvisional(entry, 'icon');
		markProvisional(entry, 'screenshot');
		expect(entry.provisional).toEqual(['icon', 'screenshot']);
	});
});

describe('submitted entries', () => {
	it('finds the entry files a branch adds', () => {
		expect(addedFiles(['2048.json', 'nova.json', ''], ['nova.json', 'saundo.json', '2048.json', 'pinup.json', '.DS_Store'])).toEqual(['pinup.json', 'saundo.json']);
		expect(addedFiles(['nova.json'], ['nova.json'])).toEqual([]);
		// The examples of a new category's first entry: its directory holds only a .gitkeep, which is empty and must not be read as an entry.
		expect(knownFiles(['.gitkeep', ''], ['.gitkeep', 'first.json'])).toEqual([]);
		expect(knownFiles(['.gitkeep', 'a.json', 'gone.json'], ['.gitkeep', 'a.json', 'b.json'])).toEqual(['a.json']);
		expect(addedFiles([], ['onevra.json'])).toEqual(['onevra.json']);
	});

	it('takes the repository from repo, or from a GitHub link', () => {
		expect(repoOfEntry({ repo: 'you/app', url: 'https://app.dev' })).toBe('you/app');
		expect(repoOfEntry({ url: 'https://github.com/legibet/myskills' })).toBe('legibet/myskills');
		expect(repoOfEntry({ url: 'https://github.com/you/app.git' })).toBe('you/app');
		expect(repoOfEntry({ url: 'https://github.com/you/app/tree/main/app' })).toBe('you/app');
		expect(repoOfEntry({ docs: 'https://github.com/you/plugin#readme' })).toBe('you/plugin');
		expect(repoOfEntry({ url: 'https://app.dev' })).toBeUndefined();
	});
});

describe('the repository', () => {
	it('picks the app’s own MyGo configuration, not a vendored example', () => {
		expect(pickMygoConfig(['README.md', 'app/mygo.json', 'go.mod'])).toBe('app/mygo.json');
		expect(pickMygoConfig(['examples/demo/mygo.json', 'mygo.json'])).toBe('mygo.json');
		expect(pickMygoConfig(['node_modules/x/mygo.json', 'examples/a/mygo.json'])).toBeUndefined();
		expect(pickMygoConfig(['b/mygo.json', 'a/mygo.json'])).toBe('a/mygo.json');
		expect(pickMygoConfig(['apps/desktop/mygo.config.ts', 'apps/desktop/go.mod', 'package.json'])).toBe('apps/desktop/mygo.config.ts');
		expect(pickMygoConfig(['mygo.config.ts', 'mygo.json'])).toBe('mygo.json');
		expect(pickMygoConfig(['desktop/app/mygo.config.mjs', 'website/mygo.config.ts.bak'])).toBe('desktop/app/mygo.config.mjs');
		expect(pickMygoConfig(['src/mygo.ts', 'mygo-config.ts'])).toBeUndefined();
	});

	it('takes a strip far wider than a window for a banner', () => {
		expect(isBanner(720, 240)).toBe(true);
		expect(isBanner(1932, 1218)).toBe(false);
		expect(isBanner(2400, 1000)).toBe(false);
		expect(isBanner(0, 0)).toBe(false);
	});

	it('tells artwork from screenshots by path and file name', () => {
		expect(isArtwork('https://raw.githubusercontent.com/Saramanda9988/LunaBox/main/screenshot/hero.png')).toBe(true);
		expect(isArtwork('https://example.com/img/banner-dark.webp?v=2')).toBe(true);
		expect(isArtwork('https://example.com/assets/app_logo.png')).toBe(true);
		expect(isArtwork('https://example.com/docs/og-image.png')).toBe(true);
		expect(isArtwork('https://raw.githubusercontent.com/ConteMan/cubbix/main/brand/dist/dark-1024.png')).toBe(true);
		expect(isArtwork('https://raw.githubusercontent.com/zeokeel/ZeoKeel-Super-Agent/main/design/dsh-reference/dsh-home.png')).toBe(true);
		expect(isArtwork('https://raw.githubusercontent.com/Saramanda9988/LunaBox/main/screenshot/home-img.png')).toBe(false);
		expect(isArtwork('https://example.com/docs/preview/home_en.png')).toBe(false);
		expect(isArtwork('https://example.com/covered-calls.png')).toBe(false);
		expect(isArtwork('https://example.com/heroku-deploy.png')).toBe(false);
		expect(isArtwork('https://raw.githubusercontent.com/Saramanda9988/LunaBox/main/screenshot/qq-community.png')).toBe(true);
		expect(isArtwork('https://example.com/img/Telegram_Group.PNG')).toBe(true);
		expect(isArtwork('https://example.com/wechat-qrcode.jpg')).toBe(true);
		expect(isArtwork('https://example.com/screens/editor-dark.png')).toBe(false);
	});

	it('reads the name and icon a mygo.config.ts writes as plain strings', () => {
		// As nexmoe/DayBee writes it: the name from package.json, the icon a PNG.
		const daybee = `import { defineConfig } from "mygo-cli";\nimport pkg from "./package.json";\n\nexport default defineConfig({\n  name: pkg.productName,\n  identifier: "co.daybee.app",\n  icon: "resources/icon.png",\n  devUrl: "http://localhost:5173",\n  fileAssociations: [{ ext: ["wav"], name: "Recording" }],\n});\n`;
		expect(scriptConfig(daybee)).toEqual({ icon: 'resources/icon.png' });
		// As bitxeno/atvloadly writes it: only an Icon Composer icon for macOS, so resources/icon.png beside it is the one to take.
		const atvloadly = `export default defineConfig({\n  name: "atvloadly",\n  macos: {\n    // Icon Composer icon; mygo build compiles it with actool\n    icon: 'AppIcon.icon',\n  },\n});\n`;
		expect(scriptConfig(atvloadly)).toEqual({ name: 'atvloadly', macos: { icon: 'AppIcon.icon' } });
		expect(iconOf('desktop/app/mygo.config.ts', scriptConfig(atvloadly), ['desktop/app/resources/icon.png'])).toEqual({ path: 'desktop/app/resources/icon.png' });
		expect(iconOf('apps/desktop/mygo.config.ts', scriptConfig(daybee), [])).toEqual({ path: 'apps/desktop/resources/icon.png' });
		// Commented-out fields and links in strings are not fields.
		expect(scriptConfig(`/* icon: "old.png" */\n// name: "Old"\nexport default { devUrl: "http://localhost:5173", name: \`Pail\` }`)).toEqual({ name: 'Pail' });
		expect(parseMygoConfig('mygo.json', '{"name":"Kero"}')).toEqual({ name: 'Kero' });
		expect(parseMygoConfig('mygo.config.ts', 'export default { name: "Kero" }')).toEqual({ name: 'Kero' });
		expect(() => parseMygoConfig('mygo.json', 'export default {}')).toThrow();
	});

	it('resolves paths inside the repository only', () => {
		expect(joinRepoPath('app/mygo.json', 'icon/icon.png')).toBe('app/icon/icon.png');
		expect(joinRepoPath('app/mygo.json', './../assets/icon.png')).toBe('assets/icon.png');
		expect(joinRepoPath('mygo.json', '../../etc/passwd')).toBeUndefined();
	});

	it('finds the icon where MyGo does: icon, else resources/icon.png beside mygo.json', () => {
		expect(iconOf('app/mygo.json', { name: 'MySkills', icon: 'icon/icon.png', macos: { icon: 'icon/AppIcon.icon' } }, [])).toEqual({ path: 'app/icon/icon.png' });
		// 2048 and Uma: mygo init's default icon in resources/, which the caller recognises by its pixels.
		expect(iconOf('mygo.json', { name: '2048' }, ['mygo.json', 'resources/icon.png'])).toEqual({ path: 'resources/icon.png' });
		expect(iconOf('desktop/mygo.json', {}, ['desktop/resources/icon.png'])).toEqual({ path: 'desktop/resources/icon.png' });
		// AudioSmith: its own icon, but only as an Icon Composer bundle for macOS.
		expect(iconOf('mygo.json', { macos: { icon: 'assets/AudioSmith.icon' } }, ['mygo.json'])).toEqual({ macOnly: 'assets/AudioSmith.icon' });
		expect(iconOf('mygo.json', { name: 'x' }, ['mygo.json'])).toBeUndefined();
		expect(iconOf('mygo.json', null, [])).toBeUndefined();
	});

	it('cuts an icon to its plate, and keeps one with no transparent margin whole', () => {
		expect(iconCut('824x824+100+100', 1024, 1024)).toEqual({ crop: '824x824+100+100', side: 824 });
		expect(iconCut('600x640+212+192\n', 1024, 1024)).toEqual({ crop: '600x640+212+192', side: 640 });
		// CatView: fully opaque, so ImageMagick finds no box.
		expect(iconCut('0x0+1024+1024', 1024, 1024)).toEqual({ side: 1024 });
		expect(iconCut('', 512, 512)).toEqual({ side: 512 });
	});

	it('takes a square image for a logo, not a screenshot', () => {
		expect(isSquarish(1024, 1024)).toBe(true);
		expect(isSquarish(1000, 900)).toBe(true);
		expect(isSquarish(1200, 810)).toBe(false);
		expect(isSquarish(800, 1200)).toBe(false);
	});

	it('takes an image taller than wide for a panel, not a window', () => {
		// Quosparr's README opens with its tray panel.
		expect(isPortrait(762, 1786)).toBe(true);
		expect(isPortrait(1600, 886)).toBe(false);
		expect(isPortrait(1000, 1000)).toBe(false);
		expect(isPortrait(0, 0)).toBe(false);
	});
});

describe('submitted screenshot', () => {
	it("reads the form's screenshot link from the bot's pull request", () => {
		const url = 'https://my-kit.dev/img/window.png';
		expect(submittedScreenshot(`Category: app\n\nScreenshot from the form: \`${url}\`\n<!-- submitted-screenshot: ${url} -->\n\nThe entry passed`)).toBe(url);
		expect(submittedScreenshot('Submitted through the form, no screenshot')).toBeUndefined();
		expect(submittedScreenshot(null)).toBeUndefined();
		// The form's rule again, as the body can be edited after the bot wrote it.
		for (const bad of ['http://my-kit.dev/a.png', 'https://x.dev/"a".png', 'https://x.dev/`a`.png', `https://x.dev/${'a'.repeat(300)}.png`]) expect(submittedScreenshot(`<!-- submitted-screenshot: ${bad} -->`), bad).toBeUndefined();
	});

	it("ignores a marker inside the entry's JSON, which comes first in the body", () => {
		const entry = JSON.stringify({ slug: 'kit', summary: { en: '<!-- submitted-screenshot: https://evil.dev/a.png -->', ja: '\u2028<!-- submitted-screenshot: https://evil.dev/b.png -->\u2028' } }, null, 2);
		const body = `Category: app\n\n\`\`\`json\n${entry}\n\`\`\``;
		expect(submittedScreenshot(body)).toBeUndefined();
		const url = 'https://my-kit.dev/img/window.png';
		expect(submittedScreenshot(`${body}\n\nScreenshot from the form: \`${url}\`\n<!-- submitted-screenshot: ${url} -->\n\nThe entry passed`)).toBe(url);
	});
});

describe('repository screenshots', () => {
	it("lists the images in a repository's screenshot folders, English ones first", () => {
		// popMind's README has no image; its website's screenshots are in the repository.
		const paths = ['README.md', 'internal/assets/tray.png', 'website/public/og.png', 'website/public/shots/zh/clipboard.png', 'website/public/shots/en/translate.png', 'website/public/shots/en/clipboard.png', 'website/public/shots/en/notes.txt', 'docs/screenshots/demo.gif', 'docs/screenshots/main.webp', 'node_modules/x/screenshots/a.png', 'Screens/Main.JPG'];
		expect(repoScreenshots(paths)).toEqual(['website/public/shots/en/clipboard.png', 'website/public/shots/en/translate.png', 'docs/screenshots/demo.gif', 'docs/screenshots/main.webp', 'Screens/Main.JPG', 'website/public/shots/zh/clipboard.png']);
		expect(repoScreenshots(['README.md', 'assets/logo.png', 'myshots/a.png'])).toEqual([]);
	});

	it('finds likely screenshots outside specially named folders without taking branding assets', () => {
		const paths = ['docs/ui-baselines/windows/dashboard-empty.png', 'docs/design-mockup/pages.png', 'assets/demo-tools.png', 'website/public/main.webp', 'docs/demo.gif', 'assets/icon-preview.png', 'assets/banner-demo.jpg', 'assets/backdrop.jpg', 'frontend/public/wails.png', 'dist/screenshots/app.png', 'node_modules/x/docs/overview.png'];
		expect(repoLikelyScreenshots(paths)).toEqual(['docs/ui-baselines/windows/dashboard-empty.png', 'website/public/main.webp', 'assets/demo-tools.png', 'docs/demo.gif', 'docs/design-mockup/pages.png']);
	});
});

describe('categories', () => {
	it("reads the categories the catalog's schema allows", async () => {
		const schema = JSON.parse(await readFile(join(import.meta.dirname, '../../catalog/data/schema/app.schema.json'), 'utf8'));
		const values = schemaEnum(schema, 'category');
		expect(values).toContain('DeveloperApplication');
		expect(values).toContain('UtilitiesApplication');
		expect(schemaEnum({}, 'category')).toEqual([]);
		expect(schemaEnum(null, 'category')).toEqual([]);
		const ui = JSON.parse(await readFile(join(import.meta.dirname, '../../catalog/data/schema/ui.schema.json'), 'utf8'));
		expect(schemaEnum(ui, 'tag')).toEqual(['theme', 'retro', 'icons']);
		expect(schemaEnum(ui, 'surface')).toEqual(['web', 'native', 'both']);
		const plugin = JSON.parse(await readFile(join(import.meta.dirname, '../../catalog/data/schema/plugin.schema.json'), 'utf8'));
		expect(schemaEnum(plugin, 'surface')).toEqual(['web', 'native', 'both']);
	});

	it('sets the category right after kind, in place', () => {
		const entry = { slug: 'cpa-bar', name: 'CPA-Bar', kind: 'native', url: 'https://x', added: 't' };
		setCategory(entry, 'DeveloperApplication');
		expect(Object.keys(entry)).toEqual(['slug', 'name', 'kind', 'category', 'url', 'added']);
		expect(entry).toMatchObject({ category: 'DeveloperApplication' });
		setCategory(entry, 'UtilitiesApplication');
		expect(Object.keys(entry)).toEqual(['slug', 'name', 'kind', 'category', 'url', 'added']);
		const kindless: Record<string, unknown> = { slug: 'x' };
		setCategory(kindless, 'GameApplication');
		expect(kindless).toEqual({ slug: 'x', category: 'GameApplication' });
	});
});

describe('README images', () => {
	it('lists Markdown and HTML images in order', () => {
		const md = '[![CI](https://github.com/a/b/actions/workflows/ci.yml/badge.svg)](x)\n<img src="docs/logo.png" width="64">\n\n![The app](docs/screenshot.png "Main window")\n![](<docs/two words.png>)';
		expect(readmeImages(md)).toEqual(['https://github.com/a/b/actions/workflows/ci.yml/badge.svg', 'docs/logo.png', 'docs/screenshot.png', 'docs/two words.png']);
	});

	it('downloads repository images raw, and skips badges and SVGs', () => {
		expect(resolveImage('docs/screenshot.png', 'legibet/myskills', 'main', 'README.md')).toBe('https://raw.githubusercontent.com/legibet/myskills/main/docs/screenshot.png');
		expect(resolveImage('../shot.png', 'a/b', 'dev', 'docs/README.md')).toBe('https://raw.githubusercontent.com/a/b/dev/shot.png');
		expect(resolveImage('/shot.png?raw=true', 'a/b', 'main', 'docs/README.md')).toBe('https://raw.githubusercontent.com/a/b/main/shot.png');
		expect(resolveImage('https://github.com/a/b/blob/main/docs/s.png', 'a/b', 'main', 'README.md')).toBe('https://raw.githubusercontent.com/a/b/main/docs/s.png');
		expect(resolveImage('https://github.com/user-attachments/assets/1234', 'a/b', 'main', 'README.md')).toBe('https://github.com/user-attachments/assets/1234');
		expect(resolveImage('https://img.shields.io/badge/go-1.27-blue', 'a/b', 'main', 'README.md')).toBeUndefined();
		expect(resolveImage('https://github.com/a/b/actions/workflows/ci.yml/badge.svg', 'a/b', 'main', 'README.md')).toBeUndefined();
		expect(resolveImage('docs/diagram.svg', 'a/b', 'main', 'README.md')).toBeUndefined();
		expect(resolveImage('http://example.com/s.png', 'a/b', 'main', 'README.md')).toBeUndefined();
		expect(resolveImage('data:image/png;base64,AAAA', 'a/b', 'main', 'README.md')).toBeUndefined();
	});

	it('knows an image by its bytes', () => {
		expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png');
		expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
		expect(sniffImage(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('webp');
		expect(sniffImage(new TextEncoder().encode('GIF89a'))).toBe('gif');
		expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeUndefined();
	});
});

describe("the form's defaults", () => {
	it("puts an app's group after its category, or else its kind", () => {
		const withCategory: Record<string, unknown> = { slug: 'a', kind: 'native', category: 'GameApplication', url: 'https://a.dev' };
		setGroup(withCategory, 'game');
		expect(Object.keys(withCategory)).toEqual(['slug', 'kind', 'category', 'group', 'url']);
		const bare: Record<string, unknown> = { slug: 'b', kind: 'web', url: 'https://b.dev' };
		setGroup(bare, 'notes');
		expect(Object.keys(bare)).toEqual(['slug', 'kind', 'group', 'url']);
		setGroup(bare, 'system');
		expect(bare.group).toBe('system');
		expect(Object.keys(bare)).toEqual(['slug', 'kind', 'group', 'url']);
	});

	it('asks the model for what the form fills in without asking, while it holds the default', () => {
		expect(formDefaults('app', { kind: 'native' })).toEqual({ choices: ['group'], tags: false, platforms: true });
		expect(formDefaults('app', { kind: 'native', category: 'GameApplication' })).toEqual({ choices: ['group'], tags: false, platforms: true });
		expect(formDefaults('app', { kind: 'native', group: 'game' })).toEqual({ choices: [], tags: false, platforms: true });
		// flagicons, submitted through the form: an icon set left at theme.
		expect(formDefaults('ui', { tag: 'theme', surface: 'native' })).toEqual({ choices: ['tag', 'surface'], tags: false, platforms: false });
		expect(formDefaults('ui', { tag: 'icons', surface: 'native' })).toEqual({ choices: ['surface'], tags: false, platforms: false });
		expect(formDefaults('ui', { tag: 'icons', surface: 'both' })).toEqual({ choices: [], tags: false, platforms: false });
		expect(formDefaults('state', { tags: ['state'] })).toEqual({ choices: [], tags: true, platforms: false });
		expect(formDefaults('state', { tags: ['store', 'reactive'] })).toEqual({ choices: [], tags: false, platforms: false });
		expect(formDefaults('template', { surface: 'native', tags: ['template'] })).toEqual({ choices: ['surface'], tags: true, platforms: false });
		expect(formDefaults('template', { surface: 'web', tags: ['react'] })).toEqual({ choices: [], tags: false, platforms: false });
		expect(formDefaults('ai', { type: 'skill', tags: ['ai'] })).toEqual({ choices: ['type'], tags: true, platforms: false });
		expect(formDefaults('ai', { type: 'mcp', tags: ['testing'] })).toEqual({ choices: [], tags: false, platforms: false });
		expect(formDefaults('plugin', { surface: 'web', tags: [] })).toEqual({ choices: ['surface'], tags: true, platforms: false });
		expect(formDefaults('plugin', { surface: 'native', tags: ['shaders'] })).toEqual({ choices: [], tags: false, platforms: false });
	});

	it("asks for an app's platforms while they are missing or the form's all three", () => {
		expect(formDefaults('app', { kind: 'native', group: 'game', platforms: ['win', 'linux', 'mac'] }).platforms).toBe(true);
		expect(formDefaults('app', { kind: 'native', group: 'game', platforms: ['mac', 'win', 'linux'] }).platforms).toBe(true);
		expect(formDefaults('app', { kind: 'native', group: 'game', platforms: ['win'] }).platforms).toBe(false);
		expect(formDefaults('app', { kind: 'native', group: 'game', platforms: ['win', 'mac'] }).platforms).toBe(false);
		expect(platformsAtDefault({})).toBe(true);
		expect(platformsAtDefault({ platforms: ['linux'] })).toBe(false);
	});

	it('keeps only known platforms, each once, in the catalog order', () => {
		expect(cleanPlatforms(['Mac', 'win', 'mac', 'android', ' linux '])).toEqual(['win', 'linux', 'mac']);
		expect(cleanPlatforms(['macos', 'ios'])).toEqual([]);
	});

	it("puts an app's platforms right after its kind", () => {
		const bare: Record<string, unknown> = { slug: 'a', kind: 'native', group: 'dev', url: 'https://a.dev' };
		setPlatforms(bare, ['mac']);
		expect(Object.keys(bare)).toEqual(['slug', 'kind', 'platforms', 'group', 'url']);
		setPlatforms(bare, ['win', 'mac']);
		expect(bare.platforms).toEqual(['win', 'mac']);
		expect(Object.keys(bare)).toEqual(['slug', 'kind', 'platforms', 'group', 'url']);
	});

	it('keeps up to four lowercase tags, each once', () => {
		expect(cleanTags([' Store', 'store', 'Reactive', '', 'devtools', 'sync', 'extra'])).toEqual(['store', 'reactive', 'devtools', 'sync']);
	});
});

describe('homepages', () => {
	it("takes the repository's homepage when it is an https link elsewhere", () => {
		expect(homepageOf('https://nodra.yldm.ai', 'yldm-tech/nodra')).toBe('https://nodra.yldm.ai');
		expect(homepageOf(' https://x.dev/docs ', 'a/b')).toBe('https://x.dev/docs');
		expect(homepageOf('https://github.com/yldm-tech/Nodra/', 'yldm-tech/nodra')).toBeUndefined();
		expect(homepageOf('http://x.dev', 'a/b')).toBeUndefined();
		expect(homepageOf('', 'a/b')).toBeUndefined();
		expect(homepageOf(null, 'a/b')).toBeUndefined();
	});
});

describe('icons without a MyGo configuration', () => {
	it('finds the icon file a project keeps in a usual place, largest first', () => {
		// BunnyBox keeps MyGo as a submodule and has no mygo.json.
		const bunnybox = ['README.md', 'assets/icon-256.png', 'assets/icon-64.png', 'assets/icon-source.png', 'assets/installer.ico', 'assets/tray-32.png', 'third_party/mygo/resources/icon.png'];
		expect(repoIcons(bunnybox)).toEqual(['assets/icon-256.png', 'assets/icon-64.png']);
		expect(repoIcons(['icon.png', 'build/appicon.png', 'build/icon_512x512.png'])).toEqual(['icon.png', 'build/appicon.png', 'build/icon_512x512.png']);
		expect(repoIcons(['examples/demo/resources/icon.png', 'node_modules/x/icon.png', 'docs/icon.png', 'internal/ui/icon.png'])).toEqual([]);
		expect(repoIcons(['desktop/assets/icon.png'])).toEqual(['desktop/assets/icon.png']);
		expect(repoIcons(['mygo/assets/icon.png'])).toEqual(['mygo/assets/icon.png']);
	});
});

describe('screenshots as the form, its Worker and the workflow judge them', () => {
	it('says why an image is not a screenshot of a window', () => {
		expect(shotProblem(1280, 800)).toBeUndefined();
		// BunnyBox's README image is its icon.
		expect(shotProblem(256, 256)).toBe('narrow');
		expect(shotProblem(1024, 1024)).toBe('square');
		expect(shotProblem(800, 1200)).toBe('portrait');
		expect(shotProblem(1500, 400)).toBe('banner');
	});

	it('puts an uploaded image under submissions/, named after the entry', () => {
		expect(stagedShot('bunnybox', 'jpeg')).toBe('submissions/bunnybox.jpg');
		expect(stagedShot('bunnybox', 'png')).toBe('submissions/bunnybox.png');
		expect(stagedShotOf(['other.png', 'bunnybox.webp'], 'bunnybox')).toBe('submissions/bunnybox.webp');
		expect(stagedShotOf(['bunnybox-2.png', 'bunnybox.gif'], 'bunnybox')).toBeUndefined();
		expect(stagedShotOf([], 'bunnybox')).toBeUndefined();
	});

	it("lists a repository's README images, screenshot folders and other likely screenshots, each once", () => {
		const sources = repoShotSources({
			repo: 'o/app',
			branch: 'main',
			paths: ['docs/screenshots/main.png', 'assets/hero.png'],
			readme: { path: 'README.md', text: '![](docs/screenshots/main.png)\n![hero](assets/hero.png)\n<img src="https://example.com/b.png">' },
		});
		expect(sources).toEqual([
			{ from: 'the README', urls: ['https://raw.githubusercontent.com/o/app/main/docs/screenshots/main.png', 'https://raw.githubusercontent.com/o/app/main/assets/hero.png', 'https://example.com/b.png'], tries: 8 },
			{ from: 'a screenshot folder in the repository', urls: [], tries: 6 },
			{ from: 'another likely screenshot file in the repository', urls: [], tries: 12 },
		]);
		expect(repoShotSources({ repo: 'o/app', branch: 'main', paths: [] })).toEqual([
			{ from: 'the README', urls: [], tries: 8 },
			{ from: 'a screenshot folder in the repository', urls: [], tries: 6 },
			{ from: 'another likely screenshot file in the repository', urls: [], tries: 12 },
		]);
	});
});
