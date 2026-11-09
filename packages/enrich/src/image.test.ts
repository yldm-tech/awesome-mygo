import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type Downloaded, writeIcon, writeShotCollage, writeTextCard } from './image.ts';
import { sniffImage } from './source.ts';

const run = promisify(execFile);
const pixel: Downloaded = {
	bytes: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
	format: 'png',
};

async function dimensions(file: string): Promise<string> {
	try {
		return (await run('magick', [file, '-format', '%w %h', 'info:'])).stdout.trim();
	} catch {
		return (await run('identify', ['-format', '%w %h', file])).stdout.trim();
	}
}

describe('generated catalog images', () => {
	let dir: string;
	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'enrich-image-test-'));
	});
	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it('draws a project card even without an avatar', async () => {
		const out = join(dir, 'card.webp');
		await writeTextCard('gone/project', out);
		expect(sniffImage(await readFile(out))).toBe('webp');
		expect(await dimensions(out)).toBe('1200 630');
	});

	it('composes at most three project panels into a landscape screenshot', async () => {
		const out = join(dir, 'collage.webp');
		expect(await writeShotCollage([], out)).toBe(false);
		expect(existsSync(out)).toBe(false);
		expect(await writeShotCollage([pixel, pixel, pixel, pixel], out)).toBe(true);
		expect(sniffImage(await readFile(out))).toBe('webp');
		expect(await dimensions(out)).toBe('1200 750');
	});

	it('only upscales a tiny avatar when the caller opts into it', async () => {
		const out = join(dir, 'icon.webp');
		expect(await writeIcon(pixel, out)).toBe(false);
		expect(existsSync(out)).toBe(false);
		expect(await writeIcon(pixel, out, 1)).toBe(true);
		expect(sniffImage(await readFile(out))).toBe('webp');
		expect(await dimensions(out)).toBe('128 128');
	});
});
