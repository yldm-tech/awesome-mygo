// How an app is shipped, as the scheduled Update distribution workflow records it in data/distribution.json (packages/enrich/src/distribution.ts): for each operating system, the formats its latest GitHub release offers, how it updates itself, and whether the installer passes the system's own signature checks, run by the workflow on a macOS and a Windows runner. It records what the release holds and what the tools said, never what a README claims.
//
// This module must keep zero imports: the workflow loads it from Node by its path (packages/enrich imports '../../catalog/src/dist.ts'), where the rest of the catalog, built on Vite's import.meta.glob, cannot load.

// The systems a record has a part for, named as an app's platforms are (APP_PLATFORMS in catalog.ts).
export const DIST_OSES = ['mac', 'win', 'linux'] as const;
export type DistOs = (typeof DIST_OSES)[number];

// The formats a release can offer a system, told by their file names (classifyAsset in packages/enrich/src/dist-assets.ts). A system's formats are listed in this order.
// mac: dmg a disk image; pkg an installer package; zip a zipped app bundle; tar.gz an app in a tarball, such as MyGo's update archive; binary an executable without an extension; install.sh the install script.
// win: setup an executable whose name says it installs (NSIS, Inno Setup, electron-builder); msi; msix (also .appx); exe any other executable, which may be a portable build or an installer its name does not call one; zip; tar.gz; install.ps1 the install script.
// linux: deb; rpm; AppImage; flatpak; snap; arch an Arch Linux package (.pkg.tar.zst, .pkg.tar.xz); apk an Alpine package; tar.gz (also .tar.xz, .tgz); binary; install.sh.
export const DIST_FORMATS = {
	mac: ['dmg', 'pkg', 'zip', 'tar.gz', 'binary', 'install.sh'],
	win: ['setup', 'msi', 'msix', 'exe', 'zip', 'tar.gz', 'install.ps1'],
	linux: ['deb', 'rpm', 'AppImage', 'flatpak', 'snap', 'arch', 'apk', 'tar.gz', 'binary', 'install.sh'],
} as const satisfies Record<DistOs, readonly string[]>;
export type DistFormat<O extends DistOs = DistOs> = (typeof DIST_FORMATS)[O][number];

// How the app updates itself on a system, told by files of the release: mygo, MyGo's updater (an update-<os>-<arch>.json manifest naming a signed archive); sparkle (an appcast*.xml in the release); tauri (a latest.json in the release that reads as Tauri's, a version and platforms whose entries have a url and a signature made by Tauri's signer, and names the system among its platforms); electron (electron-updater's latest.yml, latest-mac.yml or latest-linux.yml). A system with none of them leaves updates out: the release shows no updater, which is not proof that the app has none.
export const DIST_UPDATERS = ['mygo', 'sparkle', 'tauri', 'electron'] as const;
export type DistUpdater = (typeof DIST_UPDATERS)[number];

// What the macOS checks said of the app in the checked file, from codesign, spctl and stapler on the workflow's macOS runner:
// notarized: signed with a Developer ID and notarized by Apple, so Gatekeeper opens it (spctl: accepted, source=Notarized Developer ID);
// developer-id: signed with a Developer ID but not notarized, which Gatekeeper refuses on current macOS;
// untrusted: signed with another certificate, such as Apple Development or a self-signed one, with a signature that verifies, or an installer package whose certificate pkgutil does not trust (expired, self-signed); note quotes pkgutil;
// invalid: signed, but the app no longer matches its signature (codesign --verify --deep --strict fails), which Gatekeeper refuses whatever the certificate; note says why;
// adhoc: signed ad hoc only, as builds are by default, which Gatekeeper refuses on another Mac;
// unsigned: no signature at all;
// unknown: the file could not be checked, such as an archive without an app bundle; note says why.
export const MAC_SIGN = ['notarized', 'developer-id', 'untrusted', 'invalid', 'adhoc', 'unsigned', 'unknown'] as const;
export type MacSign = (typeof MAC_SIGN)[number];

// What Windows said of the checked file's Authenticode signature, from Get-AuthenticodeSignature on the workflow's Windows runner:
// trusted: signed, and the certificate chains to a root Windows trusts (Status Valid);
// untrusted: signed, but with a certificate Windows does not trust, such as a self-signed one;
// invalid: signed, but the file no longer matches its signature (HashMismatch) or the signature is broken;
// unsigned: no signature (NotSigned), which SmartScreen warns about;
// unknown: the file could not be checked, such as a zip without an executable; note says why.
export const WIN_SIGN = ['trusted', 'untrusted', 'invalid', 'unsigned', 'unknown'] as const;
export type WinSign = (typeof WIN_SIGN)[number];

// The formats whose files the workflow's runners check, in the order a file of one is preferred: a bare binary or an install script is never checked, so a system that offers only those has no check, and the page says there is nothing to check rather than that it is not checked yet.
export const DIST_CHECK_FORMATS = {
	mac: ['dmg', 'pkg', 'zip', 'tar.gz'],
	win: ['setup', 'msi', 'msix', 'exe', 'zip', 'tar.gz'],
} as const satisfies { mac: readonly DistFormat<'mac'>[]; win: readonly DistFormat<'win'>[] };

// The check of one file of the release, the one that stands for the system: on macOS a disk image before an installer package before a zipped app before an app in a tarball, on Windows an installer before an MSI before an MSIX before a portable executable before a zip before a tarball (DIST_CHECK_FORMATS), preferring arm64 or universal on macOS and amd64 on Windows (pickCheckAsset). asset is the release asset's GitHub id, so a later run checks the file again only once the release has another.
export interface DistCheck<S extends string = string> {
	file: string;
	asset: number;
	status: S;
	// Who signed it: the certificate's common name, such as "Developer ID Application: Jane Doe (TEAMID)" on macOS or "SignPath Foundation" on Windows. Left out when unsigned or signed ad hoc.
	signer?: string;
	// macOS only: whether the notarization ticket is stapled to the checked file or its app, so that the app opens offline the first time.
	stapled?: boolean;
	// macOS only: set when the status is an installer package's own signature (pkgutil), not an app bundle's: the checked file is a package, or a disk image holding one instead of an app. macOS installs an unsigned package after the user overrides Gatekeeper, where an unsigned app for Apple silicon does not open at all.
	pkg?: true;
	// The UTC day of the check, YYYY-MM-DD.
	checked: string;
	// Why a check is unknown, untrusted or invalid, or which executable of an archive was checked when its name is not exactly the app's, in a short English sentence for the run's report and the page.
	note?: string;
}

// One system's part of a record. formats is never empty: a system the release offers nothing for has no part. check is left out on Linux, where packages are not signed in a way a user's system checks at install, and until the workflow's runner of that system has checked the file; deltas is set only with a MyGo updater whose release holds delta updates for the system.
export interface DistPlatform<O extends DistOs = DistOs> {
	formats: DistFormat<O>[];
	updates?: DistUpdater;
	deltas?: true;
	check?: DistCheck<O extends 'mac' ? MacSign : O extends 'win' ? WinSign : never>;
}

// What the workflow records of one app, by its key app:<slug>. repo is the repository the release was read from, so a record of a repository the entry no longer names is not shown. tag and published (the UTC day) are the release's: the latest, unless it offers only builds of a command-line tool, server or other variant of the app (or nothing) and one of the repository's newest releases offers the app itself; prerelease is set when the repository has only prereleases, whose newest that offers an installer, else the newest that offers anything, is then the one read. Only the systems the catalog lists in the app's platforms get a part.
export interface DistRecord {
	repo: string;
	tag: string;
	published: string;
	prerelease?: true;
	mac?: DistPlatform<'mac'>;
	win?: DistPlatform<'win'>;
	linux?: DistPlatform<'linux'>;
}

// The file the workflow writes: the UTC day of its last run, null until it first runs, and a record for each app whose repository has a release offering at least one system something. An app without a repository, without a release or whose release offers nothing for any system has no record.
export interface DistributionFile {
	asOf: string | null;
	entries: Record<string, DistRecord>;
}

// The fields of a record, of a system's part and of a check, in the order the file lists them; data/schema/distribution.schema.json describes the same.
export const DIST_RECORD_FIELDS = ['repo', 'tag', 'published', 'prerelease', 'mac', 'win', 'linux'] as const satisfies readonly (keyof DistRecord)[];
export const DIST_PLATFORM_FIELDS = ['formats', 'updates', 'deltas', 'check'] as const satisfies readonly (keyof DistPlatform)[];
export const DIST_CHECK_FIELDS = ['file', 'asset', 'status', 'signer', 'stapled', 'pkg', 'checked', 'note'] as const satisfies readonly (keyof DistCheck)[];
