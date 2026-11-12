import { describe, expect, it } from 'vitest';
import type { DistCheck, DistRecord, DistributionFile } from '../../catalog/src/dist.ts';
import { CHECK_SIZE_LIMIT, type ClassifiedAsset, type GraphqlAnswer, RECHECK_DAYS, type Release, type ReleaseAnswer, type ReleaseAsset, assetIdOf, buildReleaseQuery, checkStands, classifyAsset, classifyRelease, isVariant, nameTokens, parseReleases, pickCheckAsset, planDistribution, readRelease, releaseUpdaters, tauriOses } from './dist-assets.ts';

let nextId = 1;
const asset = (name: string, size = 10_000_000): ReleaseAsset => ({ id: nextId++, name, size, url: `https://github.com/o/r/releases/download/v1/${name}` });
const assets = (...names: string[]) => names.map((n) => asset(n));
const release = (names: string[], extra: Partial<Release> = {}): Release => {
	const files = assets(...names);
	return { tag: 'v1.0.0', publishedAt: '2026-11-10T08:00:00Z', prerelease: false, assets: files, totalAssets: files.length, ...extra };
};
const ALL = new Set(['mac', 'win', 'linux'] as const);
const kinds = (list: readonly ClassifiedAsset[]) => list.map((c) => `${c.os} ${c.format}${c.arch ? ` ${c.arch}` : ''} ${c.asset.name}`).sort();

// egoist/mygo-music v0.1.24, the release MyGo's tooling makes, as GitHub lists it.
const MYGO_MUSIC = ['mygo-music-0.1.24-1.x86_64.rpm', 'mygo-music-0.1.24-linux-amd64.tar.gz', 'mygo-music-0.1.23-to-0.1.24-linux-amd64.delta', 'mygo-music-0.1.22-to-0.1.24-linux-amd64.delta', 'mygo-music_0.1.24_amd64.deb', 'mygo-music-0.1.21-to-0.1.24-linux-amd64.delta', 'mygo-music_0.1.24_arm64.deb', 'mygo-music-0.1.24-1.aarch64.rpm', 'mygo-music-0.1.24-linux-arm64.tar.gz', 'mygo-music-0.1.23-to-0.1.24-linux-arm64.delta', 'mygo-music-0.1.22-to-0.1.24-linux-arm64.delta', 'mygo-music-0.1.21-to-0.1.24-linux-arm64.delta', 'update-linux-arm64.json', 'update-linux-amd64.json', 'mygo-music-0.1.23-to-0.1.24-darwin-arm64.delta', 'mygo-music-0.1.21-to-0.1.24-darwin-arm64.delta', 'mygo-music-0.1.22-to-0.1.24-darwin-arm64.delta', 'mygo-music-0.1.24-darwin-arm64.tar.gz', 'mygo-music-0.1.24-arm64.dmg', 'mygo-music-0.1.24-amd64.dmg', 'mygo-music-0.1.24-darwin-amd64.tar.gz', 'install.sh', 'mygo-music-0.1.23-to-0.1.24-darwin-amd64.delta', 'mygo-music-0.1.22-to-0.1.24-darwin-amd64.delta', 'mygo-music-0.1.21-to-0.1.24-darwin-amd64.delta', 'update-darwin-arm64.json', 'update-darwin-amd64.json', 'mygo-music-0.1.22-to-0.1.24-windows-amd64.delta', 'mygo-music-setup-0.1.24-amd64.exe', 'mygo-music-0.1.24-windows-amd64.tar.gz', 'mygo-music-0.1.23-to-0.1.24-windows-amd64.delta', 'mygo-music-0.1.21-to-0.1.24-windows-amd64.delta', 'install.ps1', 'mygo-music-0.1.24-windows-arm64.tar.gz', 'mygo-music-setup-0.1.24-arm64.exe', 'mygo-music-0.1.22-to-0.1.24-windows-arm64.delta', 'mygo-music-0.1.23-to-0.1.24-windows-arm64.delta', 'mygo-music-0.1.21-to-0.1.24-windows-arm64.delta', 'SHA256SUMS', 'update-windows-amd64.json', 'update-windows-arm64.json'];

describe('a file name', () => {
	it('is split into tokens, never searched for substrings', () => {
		expect(nameTokens('Althea.Setup.1.0.0.amd64.exe')).toEqual(['althea', 'setup', '1', '0', '0', 'amd64', 'exe']);
		expect(nameTokens('acton-0.2.1-1.x86_64.rpm')).toEqual(['acton', '0', '2', '1', '1', 'x8664', 'rpm']);
		expect(nameTokens('bili-FM-3.1.16-macos-apple-silicon.app.zip')).toContain('applesilicon');
		expect(classifyAsset('twinkle-1.0.0.zip')).toBeUndefined();
		expect(classifyAsset('darwinia-1.0.0.zip')).toBeUndefined();
		expect(classifyAsset('macaroni-1.0.0-linux-amd64.tar.gz')).toEqual({ os: 'linux', format: 'tar.gz', arch: 'amd64' });
	});

	it('of MyGo’s standard release is classified by system, format and processor', () => {
		expect(classifyAsset('mygo-music-0.1.24-arm64.dmg')).toEqual({ os: 'mac', format: 'dmg', arch: 'arm64' });
		expect(classifyAsset('mygo-music-0.1.24-amd64.dmg')).toEqual({ os: 'mac', format: 'dmg', arch: 'amd64' });
		expect(classifyAsset('mygo-music-0.1.24-darwin-arm64.tar.gz')).toEqual({ os: 'mac', format: 'tar.gz', arch: 'arm64' });
		expect(classifyAsset('mygo-music-0.1.24-linux-amd64.tar.gz')).toEqual({ os: 'linux', format: 'tar.gz', arch: 'amd64' });
		expect(classifyAsset('mygo-music-0.1.24-windows-arm64.tar.gz')).toEqual({ os: 'win', format: 'tar.gz', arch: 'arm64' });
		expect(classifyAsset('mygo-music-setup-0.1.24-amd64.exe')).toEqual({ os: 'win', format: 'setup', arch: 'amd64' });
		expect(classifyAsset('mygo-music_0.1.24_arm64.deb')).toEqual({ os: 'linux', format: 'deb', arch: 'arm64' });
		expect(classifyAsset('mygo-music-0.1.24-1.x86_64.rpm')).toEqual({ os: 'linux', format: 'rpm', arch: 'amd64' });
		expect(classifyAsset('mygo-music-0.1.24-1.aarch64.rpm')).toEqual({ os: 'linux', format: 'rpm', arch: 'arm64' });
		expect(classifyAsset('install.ps1')).toEqual({ os: 'win', format: 'install.ps1' });
	});

	it('of MyGo’s update metadata, deltas and checksums is no format', () => {
		for (const name of ['SHA256SUMS', 'update-darwin-arm64.json', 'update-windows-amd64.json', 'mygo-music-0.1.23-to-0.1.24-linux-amd64.delta', 'install.sh']) expect(classifyAsset(name), name).toBeUndefined();
	});

	it('of an electron-builder build whose spaces GitHub turned into dots is read by its tokens', () => {
		expect(classifyAsset('Althea.Setup.1.0.0.amd64.exe')).toEqual({ os: 'win', format: 'setup', arch: 'amd64' });
		expect(classifyAsset('Deckle.0.2.0.arm64.dmg')).toEqual({ os: 'mac', format: 'dmg', arch: 'arm64' });
		expect(classifyAsset('DayBee.Setup.1.1.0.exe')).toEqual({ os: 'win', format: 'setup' });
		expect(classifyAsset('BYR.Client.exe')).toEqual({ os: 'win', format: 'exe' });
	});

	it('of an installer says setup in any of the ways releases spell it', () => {
		expect(classifyAsset('aio-proxy-0.42.5-x64-setup.exe')?.format).toBe('setup');
		expect(classifyAsset('TailSplit_0.9.7_windows_amd64_setup.exe')?.format).toBe('setup');
		expect(classifyAsset('BootEaseSetup-3.0.0-x64.exe')?.format).toBe('setup');
		expect(classifyAsset('WinTray-Setup.exe')?.format).toBe('setup');
		expect(classifyAsset('Kanso-Installer-1.2.0-x64.exe')?.format).toBe('setup');
		expect(classifyAsset('Kanso-install-1.2.0.exe')?.format).toBe('setup');
		expect(classifyAsset('apigo-0.1.3-windows-amd64-portable.exe')?.format).toBe('exe');
		expect(classifyAsset('Upsetter-1.0.exe')?.format).toBe('exe');
	});

	it('names its system by darwin, macos, mac, osx, apple, windows, win, win32, win64 or linux', () => {
		expect(classifyAsset('axonhub_1.0.0-rc.3_darwin_arm64.zip')?.os).toBe('mac');
		expect(classifyAsset('Tolk-2.2.4-macos.zip')?.os).toBe('mac');
		expect(classifyAsset('Klip-1.0.12-mac-arm64.zip')?.os).toBe('mac');
		expect(classifyAsset('Foo-1.0-osx-x64.zip')?.os).toBe('mac');
		expect(classifyAsset('bili-FM-3.1.16-macos-apple-silicon.app.zip')).toEqual({ os: 'mac', format: 'zip', arch: 'arm64' });
		expect(classifyAsset('Klip-1.0.12-win-x64.zip')).toEqual({ os: 'win', format: 'zip', arch: 'amd64' });
		expect(classifyAsset('cli-win32-x64-0.42.5.tgz')).toEqual({ os: 'win', format: 'tar.gz', arch: 'amd64' });
		expect(classifyAsset('HD2-Font-Maker-2.2.4-Windows.zip')).toEqual({ os: 'win', format: 'zip' });
		expect(classifyAsset('Win-XinAi-De-Tools-win-x86.zip')).toEqual({ os: 'win', format: 'zip', arch: '386' });
	});

	it('names its processor by the usual aliases, the last one when the app’s own name has one', () => {
		expect(classifyAsset('acton_0.2.1_amd64.deb')?.arch).toBe('amd64');
		expect(classifyAsset('BaudScan-0.1.1-linux-x64')?.arch).toBe('amd64');
		expect(classifyAsset('Kyokai-0.7.3-x86_64.AppImage')?.arch).toBe('amd64');
		expect(classifyAsset('bili-FM-3.1.16-macos-intel.app.zip')?.arch).toBe('amd64');
		expect(classifyAsset('Kyokai-0.7.3-aarch64.AppImage')?.arch).toBe('arm64');
		expect(classifyAsset('AI-limit-0.1.8-universal.dmg')?.arch).toBe('universal');
		expect(classifyAsset('pitstop-1.3.1-windows-386.tar.gz')?.arch).toBe('386');
		expect(classifyAsset('Win-XinAi-De-Tools-Setup-x86.exe')?.arch).toBe('386');
		expect(classifyAsset('universal-s3-gui_0.13.2_arm64.deb')?.arch).toBe('arm64');
		expect(classifyAsset('Quaver-Astra-10-linux-loong64.deb')).toEqual({ os: 'linux', format: 'deb' });
	});

	it('is a format of its system by its extension', () => {
		expect(classifyAsset('popMind-0.10.2.pkg')).toEqual({ os: 'mac', format: 'pkg' });
		expect(classifyAsset('TextViewer-Setup-0.0.25-macos-universal.pkg')).toEqual({ os: 'mac', format: 'pkg', arch: 'universal' });
		expect(classifyAsset('sona-0.4.0-1-x86_64.pkg.tar.zst')).toEqual({ os: 'linux', format: 'arch', arch: 'amd64' });
		expect(classifyAsset('foo-1.0.0-1-x86_64.pkg.tar.xz')).toEqual({ os: 'linux', format: 'arch', arch: 'amd64' });
		expect(classifyAsset('translator233-windows-amd64.msi')).toEqual({ os: 'win', format: 'msi', arch: 'amd64' });
		expect(classifyAsset('Gantrol.YouRun_0.1.6.0_x64.msix')).toEqual({ os: 'win', format: 'msix', arch: 'amd64' });
		expect(classifyAsset('Foo_1.0.0_x64.appx')).toEqual({ os: 'win', format: 'msix', arch: 'amd64' });
		expect(classifyAsset('Foo_1.0.0.msixbundle')).toEqual({ os: 'win', format: 'msix' });
		expect(classifyAsset('LunaBox-2.0.0-linux-amd64.AppImage')).toEqual({ os: 'linux', format: 'AppImage', arch: 'amd64' });
		expect(classifyAsset('Meiro-0.6.2-linux-arm64.flatpak')).toEqual({ os: 'linux', format: 'flatpak', arch: 'arm64' });
		expect(classifyAsset('foo_1.0.0_amd64.snap')).toEqual({ os: 'linux', format: 'snap', arch: 'amd64' });
		expect(classifyAsset('bowerbird.deb')).toEqual({ os: 'linux', format: 'deb' });
		expect(classifyAsset('aio-proxy-0.42.5-x86_64.AppImage')).toEqual({ os: 'linux', format: 'AppImage', arch: 'amd64' });
		expect(classifyAsset('proton-drive-sync-0.6.3-linux-amd64.tar.xz')).toEqual({ os: 'linux', format: 'tar.gz', arch: 'amd64' });
		expect(classifyAsset('cli-linux-x64-0.42.5.tgz')).toEqual({ os: 'linux', format: 'tar.gz', arch: 'amd64' });
		expect(classifyAsset('foo-linux-amd64.tar.zst')).toEqual({ os: 'linux', format: 'tar.gz', arch: 'amd64' });
		expect(classifyAsset('axonhub_1.0.0-rc.3_linux_loong64.zip')).toEqual({ os: 'linux', format: 'tar.gz' });
	});

	it('of a zipped or tarred app bundle is macOS’s without a system token', () => {
		expect(classifyAsset('Clarity-0.1.4-macos-universal.app.zip')).toEqual({ os: 'mac', format: 'zip', arch: 'universal' });
		expect(classifyAsset('Nootify.app.tar.gz')).toEqual({ os: 'mac', format: 'tar.gz' });
		expect(classifyAsset('Nomo_aarch64.app.tar.gz')).toEqual({ os: 'mac', format: 'tar.gz', arch: 'arm64' });
	});

	it('of an archive without a system token is left out rather than guessed', () => {
		for (const name of ['Distill-0.2.0.zip', 'GoRss-1.2.1-arm64.zip', 'pitstop-x64.zip', 'proton-drive-sync-0.6.3-amd64.tar.xz', 'kite-0.17.0.tgz', 'inferyard-0.0.3.tar.gz']) expect(classifyAsset(name), name).toBeUndefined();
	});

	it('of an executable bundled beside the app or a migration helper is no format', () => {
		for (const name of ['ffmpeg.exe', 'ffprobe.exe', 'yt-dlp.exe', 'bili-FM-3.1.16-windows-amd64-migrate.exe']) expect(classifyAsset(name), name).toBeUndefined();
	});

	it('of an .apk is an Alpine package only when it looks like one', () => {
		expect(classifyAsset('frostyard-chairlift_0.17.0_x86_64.apk')).toEqual({ os: 'linux', format: 'apk', arch: 'amd64' });
		expect(classifyAsset('frostyard-firn_0.12.0_aarch64.apk')).toEqual({ os: 'linux', format: 'apk', arch: 'arm64' });
		expect(classifyAsset('foo-1.2.3-r0.apk')).toEqual({ os: 'linux', format: 'apk' });
		for (const name of ['adhd-todo-0.15.0.apk', 'app-x86_64-release.apk', 'app-arm64-v8a-release.apk', 'app-debug.apk', 'herdr-link-android-0.3.3-x86_64.apk', 'bowel-0.4.1-android-arm64.apk', 'imyemail-cloud-native-android-20261011-selfsigned.apk', 'Handbean-ios-sideload.ipa', 'Vibe-Cook-0.1.12-ios-unsigned.ipa']) expect(classifyAsset(name), name).toBeUndefined();
	});

	it('of a source archive, firmware, a mobile build or a browser extension is no format', () => {
		for (const name of ['HD2-Font-Maker-2.2.4-Source.zip', 'pomodoro-source-1.2.1.zip', 'ChisaCloudCode-0.1.11-source.tar.gz', 'orb_0.21.0_source.tar.gz', 'planet-windows-source-0.0.1-alpha.2-8831b0a1f4c8.zip', 'Aemeath-Firmware-0.0.4-esp32s3.zip', 'Aemeath-Firmware-0.0.4-esp32s3.bin', 'Vibe-Cook-0.1.12-ios-xcarchive.zip', 'TingSub-extension.zip', 'foo-src-1.0-linux-amd64.tar.gz']) expect(classifyAsset(name), name).toBeUndefined();
		// An app named after Android, built for Windows, is the Windows app.
		expect(classifyAsset('android-tools-windows-amd64.zip')).toEqual({ os: 'win', format: 'zip', arch: 'amd64' });
	});

	it('of a checksum, signature, update metadata, note or wheel is no format', () => {
		for (const name of ['Bamboo-0.2.2-macOS-arm64.dmg.sha256', 'foo-linux-amd64.tar.gz.sha512', 'foo.AppImage.sig', 'foo.dmg.asc', 'foo.tar.gz.minisig', 'checksums.txt', 'SHA256SUMS', 'SHA256SUMS.txt', 'SHA256SUMS-linux-amd64', 'Hergo-0.0.23-linux-amd64-SHA256SUMS', 'Foo-Setup-1.0.0.exe.blockmap', 'latest.yml', 'latest-mac.yml', 'latest-linux.yml', 'latest.json', 'appcast.xml', 'quosparr-appcast-arm64.xml', 'release_notes.md', 'LICENSE', 'runtime-constraints.txt', 'voxflow-0.10.1-py3-none-any.whl', 'sona-0.4.0-x86_64.AppImage.zsync', 'Tolk-update-windows_2.2.4.zip.sig.json']) expect(classifyAsset(name), name).toBeUndefined();
	});

	it('without an extension is a bare binary on macOS or Linux, and nothing on Windows', () => {
		expect(classifyAsset('aurora-darwin-arm64')).toEqual({ os: 'mac', format: 'binary', arch: 'arm64' });
		expect(classifyAsset('translator233-darwin-arm64')).toEqual({ os: 'mac', format: 'binary', arch: 'arm64' });
		expect(classifyAsset('bootie-linux')).toEqual({ os: 'linux', format: 'binary' });
		expect(classifyAsset('BaudScan-0.1.1-linux-x64')).toEqual({ os: 'linux', format: 'binary', arch: 'amd64' });
		expect(classifyAsset('sun-ray-nogui-linux-armv7')).toEqual({ os: 'linux', format: 'binary' });
		expect(classifyAsset('bootie-windows')).toBeUndefined();
		expect(classifyAsset('goshell')).toBeUndefined();
		expect(classifyAsset('droi-relay-linux-amd64.gz')).toBeUndefined();
	});

	it('that says unsigned, self-signed or notarized is classified like any other', () => {
		expect(classifyAsset('ytmgo-0.0.65-arm64-notarized.dmg')).toEqual({ os: 'mac', format: 'dmg', arch: 'arm64' });
		expect(classifyAsset('Foo-1.0-macos-unsigned.zip')).toEqual({ os: 'mac', format: 'zip' });
		expect(classifyAsset('Foo-1.0-windows-selfsigned-setup.exe')).toEqual({ os: 'win', format: 'setup' });
	});

	it('that names two systems after its version is a helper’s, left out rather than guessed', () => {
		// ChisaAlter/ChisaCloudCode v0.1.11: a sync helper built on Windows for Linux.
		expect(classifyAsset('mutagen-0.18.1-chisa.2-windows-amd64-linux-amd64.zip')).toBeUndefined();
		// A system named before the version is the app's own name, and one named twice is one system.
		expect(classifyAsset('mac-cleaner-1.0-windows-x64.zip')).toEqual({ os: 'win', format: 'zip', arch: 'amd64' });
		expect(classifyAsset('tool-1.0-x86_64-apple-darwin.tar.gz')).toEqual({ os: 'mac', format: 'tar.gz', arch: 'amd64' });
	});

	it('of a command-line tool, a server or a relay is a variant of the app, unless the repository is named so', () => {
		expect(isVariant('gotrust-cli_0.6.0_windows_amd64.zip')).toBe(true);
		expect(isVariant('kero-server-2.1.35-windows-amd64.zip')).toBe(true);
		expect(isVariant('gotrust_0.6.0_windows_amd64.zip')).toBe(false);
		expect(isVariant('rediscli-1.0-windows-amd64.zip')).toBe(false);
		expect(isVariant('lark-server-windows-amd64.zip', new Set(['lark', 'server']))).toBe(false);
	});

	it('of an install script that names its system is that system’s install.sh', () => {
		expect(classifyAsset('install-linux-amd64.sh')).toEqual({ os: 'linux', format: 'install.sh' });
		expect(classifyAsset('herdr-link-desktop-0.3.3-linux-amd64-install.sh')).toEqual({ os: 'linux', format: 'install.sh' });
		for (const name of ['install-server.sh', 'baggyd-install.sh', 'install-server.ps1']) expect(classifyAsset(name), name).toBeUndefined();
	});
});

describe('a whole release', () => {
	it('places install.sh on macOS and Linux when it has MyGo’s manifests or archives for both', () => {
		const list = classifyRelease(assets(...MYGO_MUSIC));
		expect(list.filter((c) => c.format === 'install.sh').map((c) => c.os)).toEqual(['mac', 'linux']);
	});

	it('places install.sh on Linux alone when only Linux has them', () => {
		const list = classifyRelease(assets('foo_1.0_amd64.deb', 'foo-1.0-linux-amd64.tar.gz', 'foo-1.0-arm64.dmg', 'install.sh'));
		expect(list.filter((c) => c.format === 'install.sh').map((c) => c.os)).toEqual(['linux']);
	});

	it('places install.sh on macOS alone when only macOS has them', () => {
		const list = classifyRelease(assets('foo-1.0-darwin-arm64.tar.gz', 'update-darwin-arm64.json', 'install.sh'));
		expect(list.filter((c) => c.format === 'install.sh').map((c) => c.os)).toEqual(['mac']);
	});

	it('places install.sh on Linux when the release has Linux files but no manifests or archives, and nowhere without them', () => {
		expect(classifyRelease(assets('foo_1.0_amd64.deb', 'install.sh')).filter((c) => c.format === 'install.sh').map((c) => c.os)).toEqual(['linux']);
		expect(classifyRelease(assets('foo-1.0-arm64.dmg', 'Foo-Setup-1.0.exe', 'install.sh')).filter((c) => c.format === 'install.sh')).toEqual([]);
	});

	it('gives a zip without a system token to Windows when the release is otherwise for Windows alone', () => {
		const list = classifyRelease(assets('pitstop-1.3.1-windows-amd64.tar.gz', 'pitstop-arm64.zip', 'pitstop-x64.zip', 'pitstop-x86.zip', 'update-windows-amd64.json'));
		expect(kinds(list)).toEqual(['win tar.gz amd64 pitstop-1.3.1-windows-amd64.tar.gz', 'win zip 386 pitstop-x86.zip', 'win zip amd64 pitstop-x64.zip', 'win zip arm64 pitstop-arm64.zip']);
	});

	it('leaves out a zip without a system token beside a disk image, and beside both a disk image and a Windows installer', () => {
		expect(kinds(classifyRelease(assets('Distill-0.2.0.zip', 'Distill-0.2.0.dmg')))).toEqual(['mac dmg Distill-0.2.0.dmg']);
		expect(kinds(classifyRelease(assets('Nomo_0.8.1_x64.zip', 'Nomo_0.8.1_x64-setup.exe', 'Nomo_0.8.1_aarch64.dmg')))).toEqual(['mac dmg arm64 Nomo_0.8.1_aarch64.dmg', 'win setup amd64 Nomo_0.8.1_x64-setup.exe']);
	});
});

describe('the updaters of a release', () => {
	const all = new Set(['mac', 'win', 'linux'] as const);

	const none = new Set<'mac' | 'win' | 'linux'>();

	it('are MyGo’s with delta updates per system that has manifests and deltas', () => {
		expect(releaseUpdaters(MYGO_MUSIC, all, none)).toEqual({ mac: { updates: 'mygo', deltas: true }, win: { updates: 'mygo', deltas: true }, linux: { updates: 'mygo', deltas: true } });
		// pteich/us3ui: manifests for every system, deltas for macOS only.
		const us3ui = ['update-windows-amd64.json', 'update-linux-amd64.json', 'update-darwin-arm64.json', 'universal-s3-gui-0.13.1-to-0.13.2-darwin-amd64.delta'];
		expect(releaseUpdaters(us3ui, all, none)).toEqual({ mac: { updates: 'mygo', deltas: true }, win: { updates: 'mygo' }, linux: { updates: 'mygo' } });
	});

	it('are Sparkle on macOS for an appcast, however it is prefixed, after MyGo’s', () => {
		expect(releaseUpdaters(['appcast.xml', 'Bamboo-0.2.2-macOS-arm64.dmg'], all, none)).toEqual({ mac: { updates: 'sparkle' } });
		expect(releaseUpdaters(['quosparr-appcast-arm64.xml'], all, none)).toEqual({ mac: { updates: 'sparkle' } });
		expect(releaseUpdaters(['appcast-arm64.xml', 'update-darwin-arm64.json'], all, none)).toEqual({ mac: { updates: 'mygo' } });
	});

	it('are electron-updater’s by latest.yml, latest-mac.yml and latest-linux.yml', () => {
		expect(releaseUpdaters(['latest.yml', 'latest-mac.yml', 'latest-linux.yml', 'latest-linux-arm64.yml'], all, none)).toEqual({ mac: { updates: 'electron' }, win: { updates: 'electron' }, linux: { updates: 'electron' } });
		expect(releaseUpdaters(['latest.yml'], all, none)).toEqual({ win: { updates: 'electron' } });
	});

	it('are Tauri’s on the systems its latest.json names, never by the file’s name alone', () => {
		expect(releaseUpdaters(['latest.json'], new Set(['mac', 'win'] as const), new Set(['mac'] as const))).toEqual({ mac: { updates: 'tauri' } });
		expect(releaseUpdaters(['latest.json'], all, none)).toEqual({});
	});

	it('are none on a system the release offers nothing', () => {
		// astrafoundry/kumoapp: a latest.yml beside macOS disk images alone.
		expect(releaseUpdaters(['Kumo-macos-0.0.15-arm64.dmg', 'latest.yml', 'latest-arm64.yml'], new Set(['mac'] as const), none)).toEqual({});
		expect(releaseUpdaters(['update-darwin-arm64.json'], new Set(), none)).toEqual({});
		expect(releaseUpdaters(['latest.json'], new Set(['mac'] as const), new Set(['win'] as const))).toEqual({});
	});
});

describe('a latest.json', () => {
	const sig = (comment: string) => Buffer.from(`untrusted comment: ${comment}\nRURB7fK42\ntrusted comment: timestamp:1794464499\n`).toString('base64');
	const tauri = sig('signature from tauri secret key');

	it('serves the systems its platforms name when Tauri signed them, by the system before the first dash', () => {
		// nextai-translator v0.6.55, built by Tauri.
		const manifest = { version: '0.6.55', notes: '', pub_date: '2026-10-01T00:00:00Z', platforms: { 'linux-x86_64': { signature: tauri, url: 'https://x/a.AppImage.tar.gz' }, 'linux-x86_64-deb': { signature: tauri, url: 'https://x/a.deb' }, 'darwin-aarch64': { signature: tauri, url: 'https://x/a.app.tar.gz' }, 'windows-x86_64-nsis': { signature: tauri, url: 'https://x/a-setup.exe' } } };
		expect([...tauriOses(JSON.stringify(manifest))].sort()).toEqual(['linux', 'mac', 'win']);
		expect([...tauriOses(JSON.stringify({ ...manifest, platforms: { 'darwin-aarch64': manifest.platforms['darwin-aarch64'] } }))]).toEqual(['mac']);
	});

	it('serves nothing when another signer signed a manifest of Tauri’s shape', () => {
		// idy/nootify v0.3.1: a Go updater reading Tauri's shape, signed with the app's own key.
		const own = sig('signature from nootify artifact signer');
		expect(tauriOses(JSON.stringify({ version: '0.3.1', platforms: { 'darwin-aarch64': { signature: own, url: 'https://x/Nootify.app.tar.gz' }, 'windows-x86_64': { signature: own, url: 'https://x/Nootify_0.3.1_x64-setup.exe' } } })).size).toBe(0);
	});

	it('serves nothing when it is another updater’s envelope, a list of assets, or not JSON', () => {
		// oshell-desktop v0.5.1 and Achordchan/tolk v2.2.4.
		expect(tauriOses(JSON.stringify({ format: 'OShellDesktop.signed-updates.v1', payload: 'eyJ2ZXJzaW9uIjoiMC41LjEifQ' })).size).toBe(0);
		expect(tauriOses(JSON.stringify({ assets: [{ name: 'Tolk-2.2.4-macos.dmg', url: 'https://x/Tolk-2.2.4-macos.dmg' }] })).size).toBe(0);
		expect(tauriOses(JSON.stringify({ version: '1', platforms: { 'darwin-aarch64': { url: 'https://x/a' } } })).size).toBe(0);
		expect(tauriOses('<html>').size).toBe(0);
		expect(tauriOses('null').size).toBe(0);
	});
});

describe('the file checked', () => {
	const list = (...names: string[]) => classifyRelease(assets(...names));

	it('on macOS is a disk image before an installer package before a zip before a tarball, never a binary', () => {
		expect(pickCheckAsset('mac', list('a-darwin-arm64.tar.gz', 'a-macos-arm64.zip', 'a.pkg', 'a-arm64.dmg'))?.asset.name).toBe('a-arm64.dmg');
		expect(pickCheckAsset('mac', list('a-darwin-arm64.tar.gz', 'a-macos-arm64.zip', 'a.pkg'))?.asset.name).toBe('a.pkg');
		expect(pickCheckAsset('mac', list('a-darwin-arm64.tar.gz', 'a-macos-arm64.zip'))?.asset.name).toBe('a-macos-arm64.zip');
		expect(pickCheckAsset('mac', list('a-darwin-arm64.tar.gz', 'a-darwin-arm64'))?.asset.name).toBe('a-darwin-arm64.tar.gz');
		expect(pickCheckAsset('mac', list('translator233-darwin-arm64', 'install.sh', 'update-darwin-arm64.json'))).toBeUndefined();
	});

	it('on macOS prefers universal, then arm64, then amd64', () => {
		expect(pickCheckAsset('mac', list('a-amd64.dmg', 'a-arm64.dmg', 'a-universal.dmg'))?.asset.name).toBe('a-universal.dmg');
		expect(pickCheckAsset('mac', list('mygo-music-0.1.24-amd64.dmg', 'mygo-music-0.1.24-arm64.dmg'))?.asset.name).toBe('mygo-music-0.1.24-arm64.dmg');
	});

	it('on Windows is an installer before an MSI before an MSIX before an executable before a zip before a tarball, never an install script', () => {
		expect(pickCheckAsset('win', list('a-windows-amd64.zip', 'a-windows-amd64.exe', 'a_x64.msix', 'a-windows-amd64.msi', 'a-setup-amd64.exe'))?.asset.name).toBe('a-setup-amd64.exe');
		expect(pickCheckAsset('win', list('translator233-gui-windows-amd64.exe', 'translator233-windows-amd64.msi', 'translator233-windows-amd64.exe'))?.asset.name).toBe('translator233-windows-amd64.msi');
		expect(pickCheckAsset('win', list('a-windows-amd64.zip', 'a-windows-amd64.exe', 'a_x64.msix'))?.asset.name).toBe('a_x64.msix');
		expect(pickCheckAsset('win', list('a-windows-amd64.zip', 'a-windows-amd64.exe'))?.asset.name).toBe('a-windows-amd64.exe');
		expect(pickCheckAsset('win', list('a-windows-amd64.zip', 'a-windows-amd64.tar.gz', 'install.ps1'))?.asset.name).toBe('a-windows-amd64.zip');
		expect(pickCheckAsset('win', list('a-windows-arm64.tar.gz', 'a-windows-amd64.tar.gz', 'install.ps1'))?.asset.name).toBe('a-windows-amd64.tar.gz');
		expect(pickCheckAsset('win', list('install.ps1'))).toBeUndefined();
	});

	it('among files of the same format and processor, prefers the app’s own build to a variant’s or a helper’s', () => {
		// YangtseSu/goTrust v0.6.0: the CLI's builds sort first by name.
		const gotrust = list('gotrust-cli_0.6.0_darwin_universal.tar.gz', 'gotrust-cli_0.6.0_windows_amd64.zip', 'gotrust_0.6.0_darwin_universal.tar.gz', 'gotrust_0.6.0_windows_amd64.zip');
		expect(pickCheckAsset('win', gotrust, 'YangtseSu/goTrust')?.asset.name).toBe('gotrust_0.6.0_windows_amd64.zip');
		expect(pickCheckAsset('mac', gotrust, 'YangtseSu/goTrust')?.asset.name).toBe('gotrust_0.6.0_darwin_universal.tar.gz');
		// atqamz/hand v0.14.0: an iroh build beside the app's.
		const hand = list('hand-darwin-amd64.tar.gz', 'hand-darwin-arm64.tar.gz', 'hand-iroh-darwin-amd64.tar.gz', 'hand-iroh-darwin-arm64.tar.gz', 'hand-iroh-windows-amd64.zip', 'hand-windows-amd64.zip');
		expect(pickCheckAsset('win', hand, 'atqamz/hand')?.asset.name).toBe('hand-windows-amd64.zip');
		expect(pickCheckAsset('mac', hand, 'atqamz/hand')?.asset.name).toBe('hand-darwin-arm64.tar.gz');
		expect(pickCheckAsset('mac', list('app-cli-darwin-arm64.tar.gz', 'app-darwin-arm64.tar.gz'))?.asset.name).toBe('app-darwin-arm64.tar.gz');
	});

	it('on Windows prefers amd64, then arm64, then none, then 386', () => {
		expect(pickCheckAsset('win', list('LunaBox-2.0.0-windows-arm64-setup.exe', 'LunaBox-2.0.0-windows-amd64-setup.exe'))?.asset.name).toBe('LunaBox-2.0.0-windows-amd64-setup.exe');
		expect(pickCheckAsset('win', list('a-setup-x86.exe', 'a-setup.exe', 'a-setup-arm64.exe'))?.asset.name).toBe('a-setup-arm64.exe');
		expect(pickCheckAsset('win', list('a-setup-x86.exe', 'a-setup.exe'))?.asset.name).toBe('a-setup.exe');
	});
});

describe('reading the releases', () => {
	it('asks each repository under an alias, its name quoted', () => {
		const q = buildReleaseQuery(['egoist/mygo-music', 'a/b"c']);
		expect(q).toContain('r0: repository(owner: "egoist", name: "mygo-music")');
		expect(q).toContain('r1: repository(owner: "a", name: "b\\"c")');
		expect(q).toContain('latestRelease { tagName publishedAt releaseAssets(first: 100)');
		expect(q).toContain('releases(first: 10, orderBy: { field: CREATED_AT, direction: DESC })');
	});

	it('reads an asset’s REST id from its GraphQL node id', () => {
		// The rpm of egoist/mygo-music v0.1.24, whose REST id is 736028187.
		expect(assetIdOf('RA_kwDOViuR6M4r3uYb')).toBe(736028187);
		expect(assetIdOf(Buffer.from('012:ReleaseAsset12345').toString('base64'))).toBe(12345);
		expect(() => assetIdOf('RA_bm9wZQ')).toThrow(/asset id/);
		expect(() => assetIdOf('MDQ6VXNlcjE=')).toThrow(/asset id/);
	});

	const node = (name: string) => ({ id: 'RA_kwDOViuR6M4r3uYb', name, size: 5, downloadUrl: `https://github.com/o/r/releases/download/v1/${name}` });

	it('takes the latest release, or the newest published prerelease when there is none', () => {
		const answer: GraphqlAnswer = {
			data: {
				r0: { nameWithOwner: 'Egoist/mygo-music', latestRelease: { tagName: 'v1', publishedAt: '2026-11-11T15:56:45Z', releaseAssets: { totalCount: 1, nodes: [node('a.dmg')] } }, releases: { nodes: [] } },
				r1: { nameWithOwner: 'o/pre', latestRelease: null, releases: { nodes: [{ tagName: 'v3', publishedAt: null, isPrerelease: true, isDraft: true, releaseAssets: { totalCount: 0, nodes: [] } }, { tagName: 'v2-beta', publishedAt: '2026-10-01T00:00:00Z', isPrerelease: true, isDraft: false, releaseAssets: { totalCount: 120, nodes: [node('b.exe')] } }] } },
				r2: { nameWithOwner: 'o/none', latestRelease: null, releases: { nodes: [] } },
			},
		};
		const out = parseReleases(['egoist/mygo-music', 'o/pre', 'o/none'], answer);
		expect(out.notFound).toEqual([]);
		expect(out.found.get('egoist/mygo-music')).toEqual({ nameWithOwner: 'Egoist/mygo-music', release: { tag: 'v1', publishedAt: '2026-11-11T15:56:45Z', prerelease: false, totalAssets: 1, assets: [{ id: 736028187, name: 'a.dmg', size: 5, url: 'https://github.com/o/r/releases/download/v1/a.dmg' }] } });
		expect(out.found.get('o/pre')?.release).toMatchObject({ tag: 'v2-beta', prerelease: true, totalAssets: 120 });
		expect(out.found.get('o/none')).toEqual({ nameWithOwner: 'o/none' });
	});

	it('passes over a newest prerelease that offers no system anything for the next one that does', () => {
		const pre = (tagName: string, names: string[]) => ({ tagName, publishedAt: '2026-10-27T06:37:06Z', isPrerelease: true, isDraft: false, releaseAssets: { totalCount: names.length, nodes: names.map(node) } });
		const answer: GraphqlAnswer = {
			data: {
				r1: { nameWithOwner: 'o/notes', latestRelease: null, releases: { nodes: [pre('v2', ['notes.md']), pre('v1', ['README.md'])] } },
				r2: { nameWithOwner: 'o/tar', latestRelease: null, releases: { nodes: [pre('v2', ['notes.md']), pre('v1', ['tool-1.0-linux-amd64.tar.gz'])] } },
			},
		};
		const out = parseReleases(['o/app', 'o/notes', 'o/tar'], { data: { ...answer.data, r0: { nameWithOwner: 'o/app', latestRelease: null, releases: { nodes: [] } } } });
		expect(out.found.get('o/notes')?.release).toMatchObject({ tag: 'v2', prerelease: true });
		expect(out.found.get('o/tar')?.release).toMatchObject({ tag: 'v1', prerelease: true });
	});

	it('takes the newest prerelease that offers an installer over one that offers only an archive, whichever GitHub lists first', () => {
		// denislov/dsh-mygo: a Node runtime for Windows and the app's installer, created the same second.
		const pre = (tagName: string, names: string[]) => ({ tagName, publishedAt: '2026-10-27T06:37:06Z', isPrerelease: true, isDraft: false, releaseAssets: { totalCount: names.length, nodes: names.map(node) } });
		const runtime = pre('runtime-v0.2.1-rc.2-node24.14.0-win32-x64', ['dsh-mygo-runtime-0.2.1-rc.2-node-24.14.0-host-0.1.2-win32-x64.tgz', 'SHA256SUMS.txt', 'RUNTIME_NOTES.md', 'runtime-catalog.json']);
		const app = pre('v0.1.2', ['START_HERE.zh-CN.md', 'RELEASE_NOTES.md', 'dsh-mygo-0.1.2-windows-x64-setup.exe', 'dsh-mygo-signing.cer', 'SHA256SUMS.txt']);
		expect(classifyRelease(runtime.releaseAssets.nodes.map((n, i) => ({ id: i + 1, name: n.name, size: 5, url: '' }))).map((c) => `${c.os} ${c.format}`)).toEqual(['win tar.gz']);
		for (const nodes of [[runtime, app], [app, runtime]]) {
			const out = parseReleases(['denislov/dsh-mygo'], { data: { r0: { nameWithOwner: 'denislov/dsh-mygo', latestRelease: null, releases: { nodes } } } });
			expect(out.found.get('denislov/dsh-mygo')?.release).toMatchObject({ tag: 'v0.1.2', prerelease: true });
		}
	});

	// egoist/lorca: GitHub's latest is the CLI's release, the desktop app's was published beside it.
	const LORCA_CLI = ['lorca-cli-linux-x86_64.tar.gz', 'lorca-cli-linux-aarch64.tar.gz', 'lorca-cli-macos-aarch64.tar.gz', 'lorca-cli-macos-aarch64.tar.gz.sha256', 'lorca-cli-windows-x86_64.zip', 'lorca-cli.json', 'lorca-cli.json.sig'];
	const LORCA_DESKTOP = ['lorca-0.1.20-to-0.1.21-windows-amd64.delta', 'lorca-0.1.21-windows-amd64.tar.gz', 'Lorca.Setup.0.1.21.amd64.exe', 'update-windows-amd64.json', 'lorca_0.1.21_arm64.deb', 'lorca-0.1.21-linux-arm64.tar.gz', 'update-linux-arm64.json', 'lorca-0.1.21-linux-amd64.tar.gz', 'lorca_0.1.21_amd64.deb', 'install.sh', 'update-linux-amd64.json', 'lorca-0.1.20-to-0.1.21-darwin-arm64.delta', 'lorca-0.1.21-darwin-arm64.tar.gz', 'Lorca.0.1.21.arm64.dmg', 'update-darwin-arm64.json'];
	const rel = (tagName: string, names: string[], isPrerelease = false) => ({ tagName, publishedAt: '2026-10-28T07:38:54Z', isPrerelease, isDraft: false, releaseAssets: { totalCount: names.length, nodes: names.map(node) } });

	it('passes over a latest release of a command-line tool alone for the newest release of the app', () => {
		const latest = { tagName: 'cli-v0.1.25', publishedAt: '2026-10-28T07:38:54Z', releaseAssets: { totalCount: LORCA_CLI.length, nodes: LORCA_CLI.map(node) } };
		const out = parseReleases(['egoist/lorca'], { data: { r0: { nameWithOwner: 'egoist/lorca', latestRelease: latest, releases: { nodes: [rel('cli-v0.1.25', LORCA_CLI), rel('desktop-v0.1.21', LORCA_DESKTOP), rel('mobile-v1.0.11', ['lorca-1.0.11-android.apk']), rel('cli-v0.1.24', LORCA_CLI)] } } } });
		const release = out.found.get('egoist/lorca')?.release as Release;
		expect(release).toMatchObject({ tag: 'desktop-v0.1.21', prerelease: false });
		const read = readRelease('egoist/lorca', release, ALL);
		expect(read?.record?.mac).toEqual({ formats: ['dmg', 'tar.gz', 'install.sh'], updates: 'mygo', deltas: true });
		expect(read?.record?.win?.formats).toEqual(['setup', 'tar.gz']);
	});

	it('keeps a latest release of a command-line tool when no release read offers the app itself, and a prerelease never stands in for it', () => {
		const latest = { tagName: 'cli-v0.1.25', publishedAt: '2026-10-28T07:38:54Z', releaseAssets: { totalCount: LORCA_CLI.length, nodes: LORCA_CLI.map(node) } };
		const out = parseReleases(['o/cli'], { data: { r0: { nameWithOwner: 'o/cli', latestRelease: latest, releases: { nodes: [rel('cli-v0.1.25', LORCA_CLI), rel('desktop-v0.2.0-beta', LORCA_DESKTOP, true), rel('cli-v0.1.24', LORCA_CLI)] } } } });
		expect(out.found.get('o/cli')?.release).toMatchObject({ tag: 'cli-v0.1.25', prerelease: false });
		expect(readRelease('o/cli', out.found.get('o/cli')?.release as Release, ALL)?.record?.win?.formats).toEqual(['zip']);
	});

	it('lists a repository GitHub does not find, and throws on any other error', () => {
		const out = parseReleases(['o/gone', 'o/here'], { data: { r0: null, r1: { nameWithOwner: 'o/here', latestRelease: null, releases: { nodes: [] } } }, errors: [{ type: 'NOT_FOUND', path: ['r0'], message: 'Could not resolve' }] });
		expect(out.notFound).toEqual(['o/gone']);
		expect(() => parseReleases(['o/a'], { data: { r0: null }, errors: [{ type: 'RATE_LIMITED', path: ['r0'], message: 'slow down' }] })).toThrow(/RATE_LIMITED/);
		expect(() => parseReleases(['o/a'], { data: null })).toThrow(/without data/);
	});
});

describe('a record of a release', () => {
	it('lists each system’s formats in the contract’s order, with its updater', () => {
		const read = readRelease('egoist/mygo-music', release(MYGO_MUSIC, { tag: 'v0.1.24', publishedAt: '2026-11-11T15:56:45Z' }), ALL);
		expect(read?.record).toEqual({
			repo: 'egoist/mygo-music',
			tag: 'v0.1.24',
			published: '2026-11-11',
			mac: { formats: ['dmg', 'tar.gz', 'install.sh'], updates: 'mygo', deltas: true },
			win: { formats: ['setup', 'tar.gz', 'install.ps1'], updates: 'mygo', deltas: true },
			linux: { formats: ['deb', 'rpm', 'tar.gz', 'install.sh'], updates: 'mygo', deltas: true },
		});
		expect(read?.picks.mac?.asset.name).toBe('mygo-music-0.1.24-arm64.dmg');
		expect(read?.picks.win?.asset.name).toBe('mygo-music-setup-0.1.24-amd64.exe');
		expect(Object.keys(read?.picks ?? {})).toEqual(['mac', 'win']);
	});

	it('marks a prerelease, and is none for a release that offers no system anything', () => {
		expect(readRelease('o/r', release(['Vitals.0.3.2.dmg'], { prerelease: true }), ALL)?.record).toEqual({ repo: 'o/r', tag: 'v1.0.0', published: '2026-11-10', prerelease: true, mac: { formats: ['dmg'] } });
		// hehehai/audiosmith: a manifest and nothing to install.
		expect(readRelease('o/r', release(['update-darwin-arm64.json']), ALL)).toBeUndefined();
		expect(readRelease('o/r', release(['inferyard-0.0.3.tar.gz', 'SHA256SUMS', 'inferyard-0.0.3-py3-none-any.whl']), ALL)).toBeUndefined();
	});

	it('gives a part only to the systems the catalog lists for the app, and names the others', () => {
		// sixban6/security-sentinel v2.7.5, a macOS app whose release also ships its sectl CLI for every system.
		const names = ['checksums.txt', 'sectl-darwin-amd64', 'sectl-darwin-arm64', 'sectl-linux-amd64', 'sectl-linux-arm64', 'sectl-openwrt-mipsle', 'sectl-windows-amd64.exe', 'Security-Sentinel-darwin-amd64.app.tar.gz', 'Security-Sentinel-darwin-amd64.dmg', 'Security-Sentinel-darwin-arm64.app.tar.gz', 'Security-Sentinel-darwin-arm64.dmg'];
		const read = readRelease('sixban6/security-sentinel', release(names), new Set(['mac'] as const));
		expect(Object.keys(read?.record ?? {})).toEqual(['repo', 'tag', 'published', 'mac']);
		expect(read?.picks.mac?.asset.name).toBe('Security-Sentinel-darwin-arm64.dmg');
		expect(Object.keys(read?.picks ?? {})).toEqual(['mac']);
		expect(read?.other).toEqual(['win', 'linux']);
		// A release that offers none of them gives no record, but still names what it offers.
		expect(readRelease('o/r', release(['tool-windows-amd64.exe']), new Set(['mac'] as const))).toEqual({ picks: {}, other: ['win'] });
	});

	it('leaves out a system’s builds of a variant of the app when it has the app’s own, and keeps them when they are all it has', () => {
		// egoist/kero v2.1.35: a server zip beside the installer and MyGo's archive.
		const kero = readRelease('egoist/kero', release(['kero-2.1.35-windows-amd64.tar.gz', 'kero-2.1.35-windows-arm64.tar.gz', 'kero-server-2.1.35-windows-amd64.zip', 'kero-server-2.1.35-windows-arm64.zip', 'kero-setup-2.1.35-amd64.exe', 'kero-setup-2.1.35-arm64.exe', 'update-windows-amd64.json']), ALL);
		expect(kero?.record?.win).toEqual({ formats: ['setup', 'tar.gz'], updates: 'mygo' });
		const gotrust = readRelease('YangtseSu/goTrust', release(['gotrust-cli_0.6.0_windows_amd64.zip', 'gotrust_0.6.0_windows_amd64.zip', 'gotrust-cli_0.6.0_linux_amd64.tar.gz']), ALL);
		expect(gotrust?.picks.win?.asset.name).toBe('gotrust_0.6.0_windows_amd64.zip');
		expect(gotrust?.record?.linux).toEqual({ formats: ['tar.gz'] });
	});
});

describe('the plan', () => {
	const ASOF = '2026-11-12';
	const answer = (names: string[], extra: Partial<Release> = {}, nameWithOwner = 'o/r'): ReleaseAnswer => ({ nameWithOwner, release: release(names, extra) });
	const empty: DistributionFile = { asOf: null, entries: {} };
	const plan = (releases: Record<string, ReleaseAnswer>, prev: DistributionFile = empty, opts: { full?: boolean; maxChecks?: number; keep?: Record<string, DistRecord>; tauri?: Map<string, Set<'mac' | 'win' | 'linux'>> } = {}) =>
		planDistribution({
			asOf: ASOF,
			apps: Object.keys(releases).map((repo) => ({ key: `app:${repo.split('/')[1]}`, repo, platforms: ['mac', 'win', 'linux'] as const })),
			releases: new Map(Object.entries(releases).map(([k, v]) => [k.toLowerCase(), v])),
			tauri: opts.tauri ?? new Map(),
			prev,
			keep: opts.keep ?? {},
			full: opts.full ?? false,
			maxChecks: opts.maxChecks ?? 0,
		});
	const check = (asset: number, checked: string, status = 'notarized'): DistCheck => ({ file: 'x', asset, status, checked });

	it('records Tauri’s updater on the systems the release’s latest.json names', () => {
		const out = plan({ 'o/t': answer(['t_1.0_aarch64.dmg', 't_1.0_x64-setup.exe', 'latest.json']) }, empty, { tauri: new Map([['o/t', new Set(['win'] as const)]]) });
		expect(out.plan.entries['app:t'].win?.updates).toBe('tauri');
		expect(out.plan.entries['app:t'].mac?.updates).toBeUndefined();
	});

	it('queues the macOS and Windows file of every record, never a Linux one', () => {
		const out = plan({ 'o/a': answer(['a-arm64.dmg', 'a-setup-amd64.exe', 'a_1.0_amd64.deb']) });
		expect(out.plan.checks.map((c) => `${c.key} ${c.os} ${c.file}`)).toEqual(['app:a mac a-arm64.dmg', 'app:a win a-setup-amd64.exe']);
		expect(out.plan.checks[0]).toMatchObject({ size: 10_000_000, url: 'https://github.com/o/r/releases/download/v1/a-arm64.dmg' });
		expect(out.plan.entries['app:a'].mac?.check).toBeUndefined();
	});

	it('carries a check of the same file younger than RECHECK_DAYS, and queues it again once it is that old', () => {
		const a = answer(['a-arm64.dmg']);
		const id = a.release?.assets[0].id as number;
		const fresh = { asOf: '2026-11-01', entries: { 'app:a': { repo: 'o/a', tag: 'v0', published: '2026-10-01', mac: { formats: ['dmg' as const], check: check(id, '2026-10-14') as DistCheck<'notarized'> } } } };
		const carried = plan({ 'o/a': a }, fresh);
		expect(carried.plan.checks).toEqual([]);
		expect(carried.plan.entries['app:a'].mac?.check).toEqual(check(id, '2026-10-14'));
		expect(carried.carried).toEqual([{ key: 'app:a', os: 'mac' }]);
		expect(checkStands(check(id, '2026-10-14'), id, ASOF, false)).toBe(true);
		expect(checkStands(check(id, '2026-10-13'), id, ASOF, false)).toBe(false);
		expect(RECHECK_DAYS).toBe(30);
		const old = { ...fresh, entries: { 'app:a': { ...fresh.entries['app:a'], mac: { formats: ['dmg' as const], check: check(id, '2026-10-13') as DistCheck<'notarized'> } } } };
		expect(plan({ 'o/a': a }, old).plan.checks.map((c) => c.asset)).toEqual([id]);
	});

	it('queues a file again when the release has another, or in a full run', () => {
		const a = answer(['a-arm64.dmg']);
		const id = a.release?.assets[0].id as number;
		const prev = { asOf: ASOF, entries: { 'app:a': { repo: 'o/a', tag: 'v0', published: '2026-10-01', mac: { formats: ['dmg' as const], check: check(id - 1000, ASOF) as DistCheck<'notarized'> } } } };
		expect(plan({ 'o/a': a }, prev).plan.checks.map((c) => c.asset)).toEqual([id]);
		const same = { asOf: ASOF, entries: { 'app:a': { ...prev.entries['app:a'], mac: { formats: ['dmg' as const], check: check(id, ASOF) as DistCheck<'notarized'> } } } };
		expect(plan({ 'o/a': a }, same).plan.checks).toEqual([]);
		expect(plan({ 'o/a': a }, same, { full: true }).plan.checks.map((c) => c.asset)).toEqual([id]);
	});

	it('leaves a file over the size limit unchecked and names it', () => {
		const big = { nameWithOwner: 'o/r', release: { tag: 'v1', publishedAt: '2026-11-10T00:00:00Z', prerelease: false, totalAssets: 1, assets: [{ id: 7, name: 'Pinion.0.1.2.arm64.dmg', size: CHECK_SIZE_LIMIT + 1, url: 'u' }] } };
		const out = plan({ 'o/pinion': big });
		expect(out.plan.checks).toEqual([]);
		expect(out.oversized.map((c) => c.file)).toEqual(['Pinion.0.1.2.arm64.dmg']);
		expect(out.plan.entries['app:pinion'].mac).toEqual({ formats: ['dmg'] });
	});

	it('bounds the queue by MAX_CHECKS, files never checked first, and a deferred re-check keeps its last check', () => {
		const a = answer(['a-arm64.dmg']);
		const b = answer(['b-arm64.dmg', 'b-setup.exe']);
		const aId = a.release?.assets[0].id as number;
		const prev = { asOf: '2026-10-01', entries: { 'app:a': { repo: 'o/a', tag: 'v0', published: '2026-09-01', mac: { formats: ['dmg' as const], check: check(aId, '2026-09-01') as DistCheck<'notarized'> } } } };
		const out = plan({ 'o/a': a, 'o/b': b }, prev, { maxChecks: 2 });
		expect(out.plan.checks.map((c) => `${c.key} ${c.os}`)).toEqual(['app:b mac', 'app:b win']);
		expect(out.deferred.map((c) => `${c.key} ${c.os}`)).toEqual(['app:a mac']);
		expect(out.plan.entries['app:a'].mac?.check).toEqual(check(aId, '2026-09-01'));
		expect(plan({ 'o/a': a, 'o/b': b }, prev).plan.checks).toHaveLength(3);
	});

	it('keeps the records it does not plan, and reports repositories not found, renamed, without a release, offering nothing or with more files than were read', () => {
		const kept: DistRecord = { repo: 'o/k', tag: 'v9', published: '2026-01-01', linux: { formats: ['deb'] } };
		const out = planDistribution({
			asOf: ASOF,
			apps: [
				{ key: 'app:gone', repo: 'o/gone', platforms: ['mac'] },
				{ key: 'app:moved', repo: 'o/moved', platforms: ['mac'] },
				{ key: 'app:bare', repo: 'o/bare', platforms: ['mac'] },
				{ key: 'app:wheel', repo: 'o/wheel', platforms: ['mac'] },
				{ key: 'app:many', repo: 'o/many', platforms: ['linux'] },
				{ key: 'app:elsewhere', repo: 'o/elsewhere', platforms: ['linux'] },
			],
			releases: new Map([
				['o/moved', answer(['m-arm64.dmg'], {}, 'o/renamed')],
				['o/bare', { nameWithOwner: 'o/bare' }],
				['o/wheel', answer(['w-1.0-py3-none-any.whl'], {}, 'o/wheel')],
				['o/many', answer(['n_1.0_amd64.deb', 'n-1.0-arm64.dmg'], { totalAssets: 140 }, 'O/Many')],
				['o/elsewhere', answer(['e-1.0-arm64.dmg'], {}, 'o/elsewhere')],
			]),
			tauri: new Map(),
			prev: { asOf: ASOF, entries: { 'app:kept': kept, 'app:gone': kept } },
			keep: { 'app:kept': kept },
			full: false,
			maxChecks: 0,
		});
		expect(Object.keys(out.plan.entries).sort()).toEqual(['app:kept', 'app:many', 'app:moved']);
		expect(out.plan.entries['app:kept']).toBe(kept);
		expect(out.plan.entries['app:moved'].repo).toBe('o/moved');
		expect(out.notFound).toEqual(['app:gone']);
		expect(out.renamed).toEqual([{ key: 'app:moved', repo: 'o/moved', now: 'o/renamed' }]);
		expect(out.noRelease).toEqual(['app:bare']);
		expect(out.noSystem).toEqual(['app:wheel']);
		expect(out.plan.noSystem).toEqual(['app:wheel']);
		expect(out.truncated).toEqual([{ key: 'app:many', tag: 'v1.0.0', total: 140 }]);
		expect(out.otherSystems).toEqual([{ key: 'app:elsewhere', oses: ['mac'] }, { key: 'app:many', oses: ['mac'] }]);
		expect(out.plan.entries['app:many'].mac).toBeUndefined();
		expect(out.plan.checks).toEqual([expect.objectContaining({ key: 'app:moved', os: 'mac' })]);
	});
});
