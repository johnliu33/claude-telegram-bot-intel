/**
 * Bun API Polyfill for Node.js compatibility
 * Provides Node.js implementations of commonly used Bun APIs
 */

import { execSync, spawn } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	statSync,
	writeFileSync,
	readdirSync,
} from "node:fs";
import { readFile, writeFile, stat, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { Readable } from "node:stream";

// Bun.sleep polyfill
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Bun.file polyfill
export function file(path: string) {
	return {
		async text(): Promise<string> {
			return readFile(path, "utf-8");
		},
		async json(): Promise<unknown> {
			const text = await readFile(path, "utf-8");
			return JSON.parse(text);
		},
		async arrayBuffer(): Promise<ArrayBuffer> {
			const buffer = await readFile(path);
			return buffer.buffer.slice(
				buffer.byteOffset,
				buffer.byteOffset + buffer.byteLength
			);
		},
		async exists(): Promise<boolean> {
			return existsSync(path);
		},
		get size(): number {
			try {
				return statSync(path).size;
			} catch {
				return 0;
			}
		},
		get name(): string {
			return path;
		},
		stream(): ReadableStream {
			const nodeStream = Readable.toWeb(
				Readable.from(readFileSync(path))
			) as ReadableStream;
			return nodeStream;
		},
	};
}

// Bun.write polyfill
export async function write(
	path: string,
	data: string | Buffer | ArrayBuffer | Uint8Array
): Promise<number> {
	const dir = path.substring(0, path.lastIndexOf("/"));
	if (dir && !existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	if (data instanceof ArrayBuffer) {
		data = Buffer.from(data);
	}
	await writeFile(path, data);
	return typeof data === "string" ? data.length : data.byteLength;
}

// Bun.which polyfill
export function which(command: string): string | null {
	try {
		return execSync(`which ${command}`, { encoding: "utf-8" }).trim() || null;
	} catch {
		return null;
	}
}

// Bun.Glob polyfill
export class Glob {
	private pattern: string;

	constructor(pattern: string) {
		this.pattern = pattern;
	}

	async *scan(options: {
		cwd: string;
		dot?: boolean;
	}): AsyncGenerator<string> {
		const { cwd, dot = false } = options;

		async function* walkDir(dir: string, base: string): AsyncGenerator<string> {
			const entries = await readdir(dir, { withFileTypes: true });
			for (const entry of entries) {
				if (!dot && entry.name.startsWith(".")) continue;

				const fullPath = join(dir, entry.name);
				const relativePath = join(base, entry.name);

				if (entry.isDirectory()) {
					yield* walkDir(fullPath, relativePath);
				} else {
					yield relativePath;
				}
			}
		}

		yield* walkDir(cwd, "");
	}

	scanSync(options: { cwd: string; dot?: boolean }): string[] {
		const { cwd, dot = false } = options;
		const results: string[] = [];

		function walkDirSync(dir: string, base: string): void {
			const entries = readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				if (!dot && entry.name.startsWith(".")) continue;

				const fullPath = join(dir, entry.name);
				const relativePath = join(base, entry.name);

				if (entry.isDirectory()) {
					walkDirSync(fullPath, relativePath);
				} else {
					results.push(relativePath);
				}
			}
		}

		walkDirSync(cwd, "");
		return results;
	}
}

// Bun.spawnSync polyfill
export function spawnSync(
	command: string[]
): { exitCode: number; stdout: Buffer; stderr: Buffer } {
	const result = require("node:child_process").spawnSync(command[0], command.slice(1));
	return {
		exitCode: result.status ?? 1,
		stdout: result.stdout || Buffer.from(""),
		stderr: result.stderr || Buffer.from(""),
	};
}

// Bun.$ shell template tag polyfill
interface ShellResult {
	exitCode: number;
	stdout: Buffer;
	stderr: Buffer;
	text(): string;
	quiet(): ShellResult & Promise<ShellResult>;
}

function createShellResult(
	exitCode: number,
	stdout: Buffer,
	stderr: Buffer
): ShellResult {
	const result: ShellResult = {
		exitCode,
		stdout,
		stderr,
		text() {
			return stdout.toString("utf-8");
		},
		quiet() {
			return Object.assign(Promise.resolve(result), result);
		},
	};
	return result;
}

export function $(
	strings: TemplateStringsArray,
	...values: unknown[]
): ShellResult & Promise<ShellResult> {
	let command = strings[0];
	for (let i = 0; i < values.length; i++) {
		command += String(values[i]) + strings[i + 1];
	}

	const promise = new Promise<ShellResult>((resolve, reject) => {
		const child = spawn("sh", ["-c", command], {
			stdio: ["pipe", "pipe", "pipe"],
		});

		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];

		child.stdout?.on("data", (data) => stdout.push(data));
		child.stderr?.on("data", (data) => stderr.push(data));

		child.on("close", (code) => {
			const result = createShellResult(
				code ?? 0,
				Buffer.concat(stdout),
				Buffer.concat(stderr)
			);
			resolve(result);
		});

		child.on("error", (err) => {
			reject(err);
		});
	});

	// Create a synchronous placeholder that will be replaced by the promise result
	const syncResult = createShellResult(0, Buffer.from(""), Buffer.from(""));

	return Object.assign(promise, syncResult);
}

// Global Bun object polyfill
const BunPolyfill = {
	sleep,
	file,
	write,
	which,
	Glob,
	spawnSync,
	$,
};

// Install global Bun object if not present
if (typeof globalThis.Bun === "undefined") {
	(globalThis as unknown as { Bun: typeof BunPolyfill }).Bun = BunPolyfill;
}

export default BunPolyfill;
