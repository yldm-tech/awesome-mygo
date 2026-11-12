import { describe, expect, it } from 'vitest';
import { DIST_CHECK_FIELDS } from '../../catalog/src/dist.ts';
import { checkOf, macAppVerdict, macKind, macPkgVerdict, parseAuthenticode, parseCodesign, parsePkgutil, parseSpctl, parseStapler, pickMainExe, safeFileName, subjectName, toolMessage, winKind, winVerdict } from './dist-check-parse.ts';

// The macOS fixtures are the tools' real output on macOS 27, on release assets of apps the site lists (mygo-music-0.1.24-arm64.dmg of egoist/mygo-music, Motrix-0.0.10-macos-arm64.dmg of missuo/motrix-mygo, Vitals.0.3.2.dmg of xbenduan/vitals, GoRss-1.2.1-arm64.zip of RSK21X/GoRss, Nudge_Logger-1.0.1.pkg of macadmins/nudge) and on small app bundles signed for the purpose (unsigned, with a Developer ID and not notarized, with an Apple Development certificate, and with a Developer ID and then changed). The folders of the runner's temporary paths are shortened, the hashes of codesign's output are left out where nothing reads them, and the signers of the bundles signed for the purpose are replaced by made-up ones; everything else is as the tools printed it.

const MNT = '/Users/runner/work/_temp/distribution-work/distribution-check-Ab12Cd/item-Ef34Gh/mnt';

const MYGO_MUSIC_CODESIGN = `Executable=/private${MNT}/MyGo Music.app/Contents/MacOS/MyGo Music
Identifier=dev.egoist.music
Format=app bundle with Mach-O thin (arm64)
CodeDirectory v=20500 size=51740 flags=0x10000(runtime) hashes=1610+3 location=embedded
VersionPlatform=1
VersionMin=851968
VersionSDK=1704448
Hash type=sha256 size=32
CandidateCDHash sha256=f7bba975fb1472fcb2931a9e176ce741aa68c04f
Hash choices=sha256
CMSDigestType=2
Executable Segment base=0
Executable Segment limit=21905408
Executable Segment flags=0x1
Page size=16384
CDHash=f7bba975fb1472fcb2931a9e176ce741aa68c04f
Signature size=8971
Authority=Developer ID Application: xinyu zeng (GJE9R5VE87)
Authority=Developer ID Certification Authority
Authority=Apple Root CA
Timestamp=Nov 12, 2026 at 0:48:14
Info.plist entries=15
TeamIdentifier=GJE9R5VE87
Runtime Version=26.2.0
Sealed Resources version=2 rules=13 files=3
Internal requirements count=1 size=176
Total signatures=1
Chosen signature=1
`;

const MYGO_MUSIC_SPCTL = `${MNT}/MyGo Music.app: accepted
source=Notarized Developer ID
origin=Developer ID Application: xinyu zeng (GJE9R5VE87)
`;

const MOTRIX_CODESIGN = `Executable=/private${MNT}/Motrix.app/Contents/MacOS/Motrix
Identifier=app.motrix.mygo
Format=app bundle with Mach-O thin (arm64)
CodeDirectory v=20500 size=109147 flags=0x10000(runtime) hashes=3404+3 location=embedded
VersionPlatform=1
VersionMin=851968
VersionSDK=1704448
Hash type=sha256 size=32
CandidateCDHash sha256=f79b488639e60adc793ee448a8074d9c1369c8d7
Hash choices=sha256
CMSDigestType=2
Page size=4096
CDHash=f79b488639e60adc793ee448a8074d9c1369c8d7
Signature size=8971
Authority=Developer ID Application: MOE AI LLC (NCFNX3LJ83)
Authority=Developer ID Certification Authority
Authority=Apple Root CA
Timestamp=Oct 15, 2026 at 14:31:09
Info.plist entries=13
TeamIdentifier=NCFNX3LJ83
Runtime Version=26.2.0
Sealed Resources version=2 rules=13 files=4
Internal requirements count=1 size=176
Total signatures=1
Chosen signature=1
`;

const MOTRIX_SPCTL = `${MNT}/Motrix.app: accepted
source=Notarized Developer ID
origin=Developer ID Application: MOE AI LLC (NCFNX3LJ83)
`;

const VITALS_CODESIGN = `Executable=/private${MNT}/Vitals.app/Contents/MacOS/Vitals
Identifier=dev.vitals.mac
Format=app bundle with Mach-O thin (arm64)
CodeDirectory v=20400 size=22823 flags=0x2(adhoc) hashes=707+3 location=embedded
VersionPlatform=1
VersionMin=851968
VersionSDK=1704448
Hash type=sha256 size=32
CandidateCDHash sha256=f57c1f2a388132455f166759256cd973d9616371
Hash choices=sha256
CMSDigestType=2
Page size=16384
CDHash=f57c1f2a388132455f166759256cd973d9616371
Signature=adhoc
Info.plist entries=15
TeamIdentifier=not set
Sealed Resources version=2 rules=13 files=7
Internal requirements count=0 size=12
Total signatures=1
Chosen signature=1
`;

const VITALS_SPCTL = `${MNT}/Vitals.app: rejected
`;

const GORSS_CODESIGN = `Executable=/private/Users/runner/work/_temp/distribution-work/distribution-check-Ab12Cd/item-Ef34Gh/x/GoRss.app/Contents/MacOS/GoRss
Identifier=dev.gorss.reader
Format=app bundle with Mach-O thin (arm64)
CodeDirectory v=20400 size=34537 flags=0x2(adhoc) hashes=1073+3 location=embedded
VersionPlatform=1
Hash type=sha256 size=32
CDHash=41479146e002b0be57a382b5b42c6b2aeb39f7d0
Signature=adhoc
Info.plist entries=13
TeamIdentifier=not set
Sealed Resources version=2 rules=13 files=2
Internal requirements count=0 size=12
Total signatures=1
Chosen signature=1
`;

const UNSIGNED_CODESIGN = `${MNT}/Unsigned.app: code object is not signed at all
`;

const UNSIGNED_SPCTL = `${MNT}/Unsigned.app: rejected
source=no usable signature
`;

const DEVID_CODESIGN = `Executable=${MNT}/DevId.app/Contents/MacOS/Dummy
Identifier=dev.example.dummy
Format=app bundle with generic
CodeDirectory v=20200 size=209 flags=0x10000(runtime) hashes=1+3 location=embedded
Hash type=sha256 size=32
CDHash=5ba13d6e3fdf759e1f66ed21f00b93866c4d0e5e
Signature size=4670
Authority=Developer ID Application: Example Co., Ltd. (ABCDE12345)
Authority=Developer ID Certification Authority
Authority=Apple Root CA
Signed Time=Nov 12, 2026 at 17:04:41
Info.plist entries=3
TeamIdentifier=ABCDE12345
Sealed Resources version=2 rules=13 files=0
Internal requirements count=2 size=228
Total signatures=1
Chosen signature=1
`;

const DEVID_SPCTL = `${MNT}/DevId.app: rejected
source=Unnotarized Developer ID
origin=Developer ID Application: Example Co., Ltd. (ABCDE12345)
`;

const APPLE_DEV_CODESIGN = `Executable=${MNT}/AppleDev.app/Contents/MacOS/Dummy
Identifier=dev.example.dummy
Format=app bundle with generic
CodeDirectory v=20200 size=209 flags=0x0(none) hashes=1+3 location=embedded
Hash type=sha256 size=32
CDHash=628eeb7e8d9942c79ee2a20f73ad946eab73488a
Signature size=4778
Authority=Apple Development: Jane Doe (A1B2C3D4E5)
Authority=Apple Worldwide Developer Relations Certification Authority
Authority=Apple Root CA
Signed Time=Nov 12, 2026 at 17:04:41
Info.plist entries=3
TeamIdentifier=ABCDE12345
Sealed Resources version=2 rules=13 files=0
Internal requirements count=2 size=224
Total signatures=1
Chosen signature=1
`;

const APPLE_DEV_SPCTL = `${MNT}/AppleDev.app: rejected
origin=Apple Development: Jane Doe (A1B2C3D4E5)
`;

// A Developer ID app whose executable was changed after it was signed: codesign -dv still reads the signature, --verify refuses it, and spctl gives no verdict.
const BROKEN_CODESIGN = DEVID_CODESIGN.replaceAll('DevId.app', 'Broken.app').replace('flags=0x10000(runtime)', 'flags=0x0(none)');
const BROKEN_VERIFY = `${MNT}/Broken.app: invalid or unsupported format for signature
`;
const BROKEN_SPCTL = `${MNT}/Broken.app: invalid or unsupported format for signature
`;

const STAPLED = `Processing: /Users/runner/work/_temp/distribution-work/distribution-check-Ab12Cd/item-Ef34Gh/mygo-music-0.1.24-arm64.dmg
The validate action worked!
`;
const NOT_STAPLED = `Processing: ${MNT}/MyGo Music.app
MyGo Music.app does not have a ticket stapled to it.
`;

const NUDGE_PKGUTIL = `Package "Nudge_Logger-1.0.1.pkg":
   Status: signed by a developer certificate issued by Apple for distribution
   Notarization: trusted by the Apple notary service
   Signed with a trusted timestamp on: 2026-09-08 16:21:29 +0000
   Certificate Chain:
    1. Developer ID Installer: Mac Admins Open Source (T4SK8ZXCXG)
       Expires: 2028-02-09 02:34:05 +0000
       SHA256 Fingerprint:
           B1 06 B6 26 DA 3B A8 48 34 F3 DF D2 CC 5E AC 03 91 31 05 3F A9 A2
           B7 BA 2A 5E 33 3C 3B 05 53 7A
       ------------------------------------------------------------------------
    2. Developer ID Certification Authority
       Expires: 2031-09-17 00:00:00 +0000
       SHA256 Fingerprint:
           F1 6C D3 C5 4C 7F 83 CE A4 BF 1A 3E 6A 08 19 C8 AA A8 E4 A1 52 8F
           D1 44 71 5F 35 06 43 D2 DF 3A
       ------------------------------------------------------------------------
    3. Apple Root CA
       Expires: 2035-02-09 21:40:36 +0000
       SHA256 Fingerprint:
           B0 B1 73 0E CB C7 FF 45 05 14 2C 49 F1 29 5E 6E DA 6B CA ED 7E 2C
           68 C5 BE 91 B5 A1 10 01 F0 24

`;

const NUDGE_SPCTL = `/Users/runner/work/_temp/distribution-work/distribution-check-Ab12Cd/item-Ef34Gh/Nudge_Logger-1.0.1.pkg: accepted
source=Notarized Developer ID
origin=Developer ID Installer: Mac Admins Open Source (T4SK8ZXCXG)
`;

const UNSIGNED_PKGUTIL = `Package "Unsigned.pkg":
   Status: no signature
`;

const UNSIGNED_PKG_SPCTL = `/Users/runner/work/_temp/distribution-work/distribution-check-Ab12Cd/item-Ef34Gh/Unsigned.pkg: rejected
source=no usable signature
`;

const HDIUTIL_ATTACH_STDERR = `hdiutil: WARNING: 'hdiutil attach -nobrowse -readonly -mountpoint ...' is deprecated. Please use 'diskutil image attach --mountOptions nobrowse --readOnly --mountPoint ...' instead.
hdiutil: attach failed - image not recognized
`;

const app = (codesign: string, verify: { code: number; stderr: string }, spctl: string, codesignCode = 0) => macAppVerdict(parseCodesign(codesign, codesignCode), { code: verify.code, message: toolMessage(verify.stderr) }, parseSpctl(spctl));
const verified = { code: 0, stderr: '' };

describe('codesign -dv', () => {
	it('reads the signer, the rest of the chain and the team of a Developer ID app', () => {
		expect(parseCodesign(MYGO_MUSIC_CODESIGN, 0)).toEqual({
			signed: true,
			adhoc: false,
			authorities: ['Developer ID Application: xinyu zeng (GJE9R5VE87)', 'Developer ID Certification Authority', 'Apple Root CA'],
			team: 'GJE9R5VE87',
		});
	});

	it('tells an ad hoc signature by its flag and its Signature line, with no team', () => {
		expect(parseCodesign(VITALS_CODESIGN, 0)).toEqual({ signed: true, adhoc: true, authorities: [] });
		expect(parseCodesign(VITALS_CODESIGN.replace('Signature=adhoc\n', ''), 0).adhoc).toBe(true);
		expect(parseCodesign(VITALS_CODESIGN.replace('flags=0x2(adhoc)', 'flags=0x0(none)'), 0).adhoc).toBe(true);
	});

	it('does not take the runtime flag for an ad hoc one', () => {
		expect(parseCodesign(DEVID_CODESIGN, 0).adhoc).toBe(false);
	});

	it('tells an app that is not signed at all, which codesign reports with exit code 1', () => {
		expect(parseCodesign(UNSIGNED_CODESIGN, 1)).toEqual({ signed: false, adhoc: false, authorities: [] });
	});

	it('keeps any other failure as an error without the path of the app', () => {
		expect(parseCodesign(`${MNT}/Odd.app: bundle format unrecognized, invalid, or unsuitable\n`, 1)).toEqual({ signed: true, adhoc: false, authorities: [], error: 'bundle format unrecognized, invalid, or unsuitable' });
	});
});

describe('spctl -a -vv', () => {
	it('reads an accepted, notarized app with its origin', () => {
		expect(parseSpctl(MYGO_MUSIC_SPCTL)).toEqual({ verdict: 'accepted', source: 'Notarized Developer ID', origin: 'Developer ID Application: xinyu zeng (GJE9R5VE87)' });
	});

	it('reads a rejected app with and without a source', () => {
		expect(parseSpctl(DEVID_SPCTL)).toEqual({ verdict: 'rejected', source: 'Unnotarized Developer ID', origin: 'Developer ID Application: Example Co., Ltd. (ABCDE12345)' });
		expect(parseSpctl(VITALS_SPCTL)).toEqual({ verdict: 'rejected' });
		expect(parseSpctl(UNSIGNED_SPCTL)).toEqual({ verdict: 'rejected', source: 'no usable signature' });
	});

	it('gives no verdict, and the message, when it cannot read the signature', () => {
		expect(parseSpctl(BROKEN_SPCTL)).toEqual({ message: 'invalid or unsupported format for signature' });
	});
});

describe('stapler validate', () => {
	it('finds a ticket only when it says the validate action worked and exits 0', () => {
		expect(parseStapler(STAPLED, 0)).toBe(true);
		expect(parseStapler(NOT_STAPLED, 65)).toBe(false);
		expect(parseStapler(STAPLED, 65)).toBe(false);
	});
});

describe('the signing state of a macOS app', () => {
	it('is notarized for a Developer ID app Gatekeeper accepts as notarized', () => {
		expect(app(MYGO_MUSIC_CODESIGN, verified, MYGO_MUSIC_SPCTL)).toEqual({ status: 'notarized', signer: 'Developer ID Application: xinyu zeng (GJE9R5VE87)' });
		expect(app(MOTRIX_CODESIGN, verified, MOTRIX_SPCTL)).toEqual({ status: 'notarized', signer: 'Developer ID Application: MOE AI LLC (NCFNX3LJ83)' });
	});

	it('is Developer ID for a Developer ID app Gatekeeper rejects as not notarized', () => {
		expect(app(DEVID_CODESIGN, verified, DEVID_SPCTL)).toEqual({ status: 'developer-id', signer: 'Developer ID Application: Example Co., Ltd. (ABCDE12345)' });
	});

	it('is ad hoc for an app signed ad hoc, in a disk image or a zip, with no signer', () => {
		expect(app(VITALS_CODESIGN, verified, VITALS_SPCTL)).toEqual({ status: 'adhoc' });
		expect(app(GORSS_CODESIGN, verified, VITALS_SPCTL)).toEqual({ status: 'adhoc' });
	});

	it('is unsigned for an app with no signature', () => {
		expect(app(UNSIGNED_CODESIGN, { code: 1, stderr: UNSIGNED_CODESIGN }, UNSIGNED_SPCTL, 1)).toEqual({ status: 'unsigned' });
	});

	it('is untrusted for an app signed with an Apple Development certificate', () => {
		expect(app(APPLE_DEV_CODESIGN, verified, APPLE_DEV_SPCTL)).toEqual({ status: 'untrusted', signer: 'Apple Development: Jane Doe (A1B2C3D4E5)' });
	});

	it('is invalid, saying why, for an app whose signature does not verify, whatever its certificate', () => {
		expect(app(APPLE_DEV_CODESIGN, { code: 1, stderr: BROKEN_VERIFY }, APPLE_DEV_SPCTL)).toEqual({ status: 'invalid', signer: 'Apple Development: Jane Doe (A1B2C3D4E5)', note: 'the signature does not verify: invalid or unsupported format for signature' });
		expect(app(BROKEN_CODESIGN, { code: 1, stderr: BROKEN_VERIFY }, BROKEN_SPCTL)).toEqual({
			status: 'invalid',
			signer: 'Developer ID Application: Example Co., Ltd. (ABCDE12345)',
			note: 'the signature does not verify: invalid or unsupported format for signature',
		});
	});

	it('is not notarized when Gatekeeper accepts a Developer ID app from another source', () => {
		expect(app(DEVID_CODESIGN, verified, DEVID_SPCTL.replace('rejected', 'accepted').replace('Unnotarized Developer ID', 'Developer ID')).status).toBe('developer-id');
	});

	it('is unknown when codesign cannot read the signature', () => {
		expect(app(`${MNT}/Odd.app: bundle format unrecognized, invalid, or unsuitable\n`, verified, '', 1)).toEqual({ status: 'unknown', note: 'codesign could not read the signature: bundle format unrecognized, invalid, or unsuitable' });
	});

	it('throws when spctl gives no verdict on an intact Developer ID app, as only it tells whether the app is notarized', () => {
		expect(() => app(DEVID_CODESIGN, verified, 'spctl: internal error\n')).toThrow(/spctl gave no verdict/);
	});
});

describe('the signing state of a macOS installer package', () => {
	it('reads the status, the notarization and the signer from pkgutil', () => {
		expect(parsePkgutil(NUDGE_PKGUTIL)).toEqual({ status: 'signed by a developer certificate issued by Apple for distribution', notarized: true, signer: 'Developer ID Installer: Mac Admins Open Source (T4SK8ZXCXG)' });
		expect(parsePkgutil(UNSIGNED_PKGUTIL)).toEqual({ status: 'no signature', notarized: false });
	});

	it('is notarized for a package Gatekeeper accepts as notarized', () => {
		expect(macPkgVerdict(parsePkgutil(NUDGE_PKGUTIL), parseSpctl(NUDGE_SPCTL))).toEqual({ status: 'notarized', signer: 'Developer ID Installer: Mac Admins Open Source (T4SK8ZXCXG)', pkg: true });
	});

	it('is Developer ID for a Developer ID Installer package that is not notarized', () => {
		const pkgutil = parsePkgutil(NUDGE_PKGUTIL.replace(/^\s*Notarization:.*\n/m, ''));
		expect(macPkgVerdict(pkgutil, parseSpctl(NUDGE_SPCTL.replace('accepted', 'rejected').replace('Notarized', 'Unnotarized')))).toEqual({ status: 'developer-id', signer: 'Developer ID Installer: Mac Admins Open Source (T4SK8ZXCXG)', pkg: true });
	});

	it('is unsigned for a package with no signature, marked as a package’s', () => {
		expect(macPkgVerdict(parsePkgutil(UNSIGNED_PKGUTIL), parseSpctl(UNSIGNED_PKG_SPCTL))).toEqual({ status: 'unsigned', pkg: true });
	});

	it('is untrusted, quoting pkgutil, for a package signed with another certificate', () => {
		const pkgutil = parsePkgutil('Package "x.pkg":\n   Status: signed by untrusted certificate\n   Certificate Chain:\n    1. Self Signed Installer\n');
		expect(macPkgVerdict(pkgutil, parseSpctl('/x.pkg: rejected\n'))).toEqual({ status: 'untrusted', signer: 'Self Signed Installer', pkg: true, note: 'pkgutil: signed by untrusted certificate' });
	});
});

describe('tool messages', () => {
	it('drop the path of the file and pass over warnings', () => {
		expect(toolMessage(BROKEN_VERIFY)).toBe('invalid or unsupported format for signature');
		expect(toolMessage(HDIUTIL_ATTACH_STDERR)).toBe('hdiutil: attach failed - image not recognized');
		expect(toolMessage('')).toBe('');
	});

	it('name an entry relative to the folder it was extracted to, never by the runner’s path', () => {
		// ditto on a zip whose entry lnk is a link and lnk/pwned.txt a file under it; macOS reports the real path, under /private.
		const out = '/Users/runner/work/_temp/distribution-work/distribution-check-Ab12/item-Cd34/x';
		const dir = '/Users/runner/work/_temp/distribution-work/distribution-check-Ab12/item-Cd34';
		expect(toolMessage(`ditto: /private${out}/lnk/pwned.txt: Not a directory\n`, [out, `/private${out}`, dir, `/private${dir}`])).toBe('ditto: lnk/pwned.txt: Not a directory');
		expect(toolMessage(`tar: Error opening archive: Failed to open '${dir}/a.tar.gz'\n`, [out, dir])).toBe("tar: Error opening archive: Failed to open 'a.tar.gz'");
		expect(toolMessage('tar: Error opening archive: Failed to open \'D:\\t\\item-1\\a.zip\'\n', ['D:\\t\\item-1\\x', 'D:\\t\\item-1'])).toBe("tar: Error opening archive: Failed to open 'a.zip'");
		expect(toolMessage('ditto: Couldn\'t read pkzip local header\n', [out])).toBe("ditto: Couldn't read pkzip local header");
	});
});

// Get-AuthenticodeSignature's output as the check step's script prints it, built from Microsoft's documentation of the cmdlet: Status is the name of a SignatureStatus value (Valid, UnknownError, NotSigned, HashMismatch, NotTrusted, NotSupportedFileFormat, Incompatible), StatusMessage the message PowerShell gives for it, and Subject the signer certificate's distinguished name, null when the file is unsigned.
const WIN_PATH = 'D:\\\\a\\\\_temp\\\\distribution-work\\\\distribution-check-Ab12Cd\\\\item-Ef34Gh';
const WIN_VALID = '{"Status":"Valid","StatusMessage":"Signature verified.","Subject":"CN=SignPath Foundation, O=SignPath Foundation, L=Lewes, S=Delaware, C=US"}';
const WIN_NOT_SIGNED = `{"Status":"NotSigned","StatusMessage":"The file ${WIN_PATH}\\\\Foo-Setup-1.0.0.exe is not digitally signed. You cannot run this script on the current system. For more information about running scripts and bypassing execution policy, see about_Execution_Policies at https://go.microsoft.com/fwlink/?LinkID=135170.","Subject":null}`;
const WIN_HASH_MISMATCH = `{"Status":"HashMismatch","StatusMessage":"The contents of file ${WIN_PATH}\\\\Foo-Setup-1.0.0.exe might have been changed by an unauthorized user or process, because the hash of the file does not match the hash stored in the digital signature. The script cannot run on the specified system. For more information, run Get-Help about_Signing.","Subject":"CN=Example Corp, O=Example Corp, L=Redmond, S=Washington, C=US"}`;
const WIN_SELF_SIGNED = '{"Status":"UnknownError","StatusMessage":"A certificate chain processed, but terminated in a root certificate which is not trusted by the trust provider.","Subject":"CN=Jane Doe"}';
const WIN_NOT_TRUSTED = '{"Status":"NotTrusted","StatusMessage":"A certificate was explicitly revoked by its issuer.","Subject":"CN=\\"Example, Inc.\\", O=\\"Example, Inc.\\", C=US"}';
const WIN_UNSUPPORTED = '{"Status":"NotSupportedFileFormat","StatusMessage":"The form specified for the subject is not one supported or known by the specified trust provider.","Subject":null}';

describe('Get-AuthenticodeSignature', () => {
	it('reads the status by name, the message and the subject, leaving out a null subject', () => {
		expect(parseAuthenticode(WIN_VALID)).toEqual({ status: 'Valid', statusMessage: 'Signature verified.', subject: 'CN=SignPath Foundation, O=SignPath Foundation, L=Lewes, S=Delaware, C=US' });
		expect(parseAuthenticode(WIN_NOT_SIGNED)).not.toHaveProperty('subject');
	});

	it('reads a status written as the number of the enum value', () => {
		expect(parseAuthenticode('{"Status":2,"StatusMessage":"","Subject":null}')).toEqual({ status: 'NotSigned' });
		expect(parseAuthenticode('{"Status":0,"StatusMessage":"Signature verified.","Subject":"CN=A"}').status).toBe('Valid');
	});

	it('reads the last line of JSON past a byte order mark and blank lines', () => {
		expect(parseAuthenticode(`\uFEFF\r\n${WIN_VALID}\r\n`).status).toBe('Valid');
	});

	it('throws on output without JSON or with a status it does not know', () => {
		expect(() => parseAuthenticode('Get-AuthenticodeSignature : Cannot find path\r\n')).toThrow(/printed no JSON/);
		expect(() => parseAuthenticode('{"Status":"Odd"}')).toThrow(/unknown status/);
	});

	it('names the signer by the common name of the subject, else by its organization, quoted or not', () => {
		expect(subjectName('CN=SignPath Foundation, O=SignPath Foundation, L=Lewes, S=Delaware, C=US')).toBe('SignPath Foundation');
		expect(subjectName('CN="Example, Inc.", O="Example, Inc.", C=US')).toBe('Example, Inc.');
		expect(subjectName('O=Only Org, C=US')).toBe('Only Org');
		expect(subjectName('CN="Say ""Hi"" Ltd"')).toBe('Say "Hi" Ltd');
		expect(subjectName(undefined)).toBeUndefined();
	});
});

describe('the signing state of a Windows file', () => {
	it('is trusted for a valid signature, with the signer', () => {
		expect(winVerdict(parseAuthenticode(WIN_VALID))).toEqual({ status: 'trusted', signer: 'SignPath Foundation' });
	});

	it('is unsigned for a file that is not signed', () => {
		expect(winVerdict(parseAuthenticode(WIN_NOT_SIGNED))).toEqual({ status: 'unsigned' });
	});

	it('is invalid for a file that does not match its signature, without the runner path Windows names', () => {
		expect(winVerdict(parseAuthenticode(WIN_HASH_MISMATCH))).toEqual({ status: 'invalid', signer: 'Example Corp', note: 'the file does not match the hash in its signature' });
	});

	it('is untrusted for a self-signed certificate and for one Windows does not trust, saying why', () => {
		expect(winVerdict(parseAuthenticode(WIN_SELF_SIGNED))).toEqual({ status: 'untrusted', signer: 'Jane Doe', note: 'A certificate chain processed, but terminated in a root certificate which is not trusted by the trust provider.' });
		expect(winVerdict(parseAuthenticode(WIN_NOT_TRUSTED))).toEqual({ status: 'untrusted', signer: 'Example, Inc.', note: 'A certificate was explicitly revoked by its issuer.' });
	});

	it('leaves out a message that names a path of the runner', () => {
		expect(winVerdict({ status: 'UnknownError', statusMessage: 'The file D:\\a\\x.exe could not be read.', subject: 'CN=A' })).toEqual({ status: 'untrusted', signer: 'A' });
	});

	it('is unknown for a format Windows cannot read a signature of, and invalid when such a file is signed nonetheless', () => {
		expect(winVerdict(parseAuthenticode(WIN_UNSUPPORTED))).toEqual({ status: 'unknown', note: 'Windows cannot read a signature of a file of this format' });
		expect(winVerdict({ status: 'NotSupportedFileFormat', subject: 'CN=A' }).status).toBe('invalid');
		expect(winVerdict({ status: 'Incompatible', subject: 'CN=A' }).status).toBe('invalid');
	});
});

describe('the files the checks open', () => {
	it('are opened on macOS by their extension, whatever its case', () => {
		expect(macKind('mygo-music-0.1.24-arm64.dmg')).toBe('dmg');
		expect(macKind('Nudge_Logger-1.0.1.pkg')).toBe('pkg');
		expect(macKind('GoRss-1.2.1-arm64.ZIP')).toBe('zip');
		expect(macKind('motrix-0.0.10-darwin-arm64.tar.gz')).toBe('tar.gz');
		expect(macKind('app.tgz')).toBe('tar.gz');
		expect(macKind('app-darwin-arm64.tar.xz')).toBe('tar.gz');
		expect(macKind('app-darwin-arm64')).toBeUndefined();
	});

	it('are opened on Windows directly, or as an archive to look into', () => {
		for (const f of ['Althea.Setup.1.0.0.amd64.exe', 'x.msi', 'x.msix', 'x.appx', 'x.msixbundle']) expect(winKind(f)).toBe('file');
		expect(winKind('ytmgo-0.0.65-windows-amd64.zip')).toBe('archive');
		expect(winKind('ytmgo-0.0.65-windows-amd64.tar.gz')).toBe('archive');
		expect(winKind('install.ps1')).toBeUndefined();
	});

	it('are saved under a name that stays in its folder and reads as no option, keeping the extension', () => {
		expect(safeFileName('Althea.Setup.1.0.0.amd64.exe')).toBe('Althea.Setup.1.0.0.amd64.exe');
		expect(safeFileName('../../etc/passwd')).toBe('__.._etc_passwd');
		expect(safeFileName('-rf.dmg')).toBe('_rf.dmg');
		expect(safeFileName("My App 'v1'.dmg")).toBe('My_App__v1_.dmg');
		expect(safeFileName('应用.msix')).toBe('__.msix');
		expect(safeFileName('..')).toBe('download');
	});
});

describe('the executable that stands for a Windows app in a zip', () => {
	const files = [
		{ path: 'ytmgo/ytmgo.exe', size: 30_000_000 },
		{ path: 'ytmgo/ffmpeg.exe', size: 80_000_000 },
		{ path: 'ytmgo/Uninstall ytmgo.exe', size: 200_000 },
		{ path: 'ytmgo/README.txt', size: 1_000 },
	];

	it('is the one named after the app, before a larger one', () => {
		expect(pickMainExe(files, 'ytmgo')).toEqual({ path: 'ytmgo/ytmgo.exe', exact: true });
	});

	it('is one whose name and the slug contain one another, before a larger one, and says it is not exactly the app’s', () => {
		expect(pickMainExe([{ path: 'Motrix.exe', size: 10 }, { path: 'aria2c.exe', size: 99 }], 'motrix-mygo')).toEqual({ path: 'Motrix.exe', exact: false });
	});

	it('is, when none is named after the app, its only executable or its only one at the top, and never an uninstaller', () => {
		expect(pickMainExe([{ path: 'a/b.exe', size: 50 }, { path: 'c.EXE', size: 9 }, { path: 'unins000.exe', size: 99 }], 'zzz')).toEqual({ path: 'c.EXE', exact: false });
		expect(pickMainExe([{ path: 'gojoplin/gojoplin-desktop.exe', size: 9 }, { path: 'unins000.exe', size: 99 }], 'joplin-lite')).toEqual({ path: 'gojoplin/gojoplin-desktop.exe', exact: false });
	});

	it('is none when several are not named after the app and none is alone at the top, as the largest may be a bundled runtime’s', () => {
		// youfun/Handbean v0.3.6: an Erlang release, whose app is deeper than the check looks.
		const handbean = [{ path: 'erts-17.0.6/bin/erlsrv.exe', size: 483_000 }, { path: 'erts-17.0.6/bin/erl.exe', size: 120_000 }, { path: 'erts-17.0.6/bin/epmd.exe', size: 150_000 }, { path: 'bin/handbean.bat', size: 2_000 }];
		expect(pickMainExe(handbean, 'handbean')).toBeUndefined();
		expect(pickMainExe([{ path: 'a.exe', size: 5 }, { path: 'b.exe', size: 9 }], 'zzz')).toBeUndefined();
	});

	it('is none deeper than two folders, nor in a zip without one', () => {
		expect(pickMainExe([{ path: 'a/b/c/app.exe', size: 5 }], 'app')).toBeUndefined();
		expect(pickMainExe([{ path: 'app.dll', size: 5 }], 'app')).toBeUndefined();
	});
});

describe('a check', () => {
	it('lists its fields in the order of the file and leaves out those the verdict has not', () => {
		const check = checkOf({ file: 'x.dmg', asset: 7 }, { status: 'notarized', signer: 'S', stapled: true }, '2026-11-12');
		expect(Object.keys(check)).toEqual(['file', 'asset', 'status', 'signer', 'stapled', 'checked']);
		expect(DIST_CHECK_FIELDS.filter((f) => f in check)).toEqual(Object.keys(check));
		const pkg = checkOf({ file: 'x.pkg', asset: 9 }, { status: 'unsigned', pkg: true }, '2026-11-12');
		expect(Object.keys(pkg)).toEqual(['file', 'asset', 'status', 'pkg', 'checked']);
		expect(DIST_CHECK_FIELDS.filter((f) => f in pkg)).toEqual(Object.keys(pkg));
		expect(checkOf({ file: 'x.zip', asset: 8 }, { status: 'unknown', note: 'no app bundle in the archive' }, '2026-11-12')).toEqual({ file: 'x.zip', asset: 8, status: 'unknown', checked: '2026-11-12', note: 'no app bundle in the archive' });
	});
});
