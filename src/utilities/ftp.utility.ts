import * as ftp from "basic-ftp";
import fse from "fs-extra";
import path from "node:path";

/**
 * Create a context for interacting with printers over FTP.
 * @param host
 * @param accessCode
 * @param callback
 */
export async function createFileContext(
	host: string,
	accessCode: string,
	callback: (context: Context) => Promise<void>,
) {
	const client = new ftp.Client();
	await client.access({
		host: host,
		port: 990,
		user: "bblp",
		password: accessCode,
		secureOptions: {
			rejectUnauthorized: false,
		},
		secure: "implicit",
	});

	await callback({
		async readDir(path: string) {
			await client.ensureDir(path);
			const files = await client.list(path);
			return files.map((file) => file.name);
		},
		async sendFile(
			sourcePath: string,
			destinationPath: string,
			progressCallback?: (progress: number) => void,
		) {
			const stats = fse.statSync(sourcePath);
			const fileSize = stats.size;
			if (progressCallback) {
				client.trackProgress((info) => {
					progressCallback(info.bytes / fileSize);
				});
			}
			await client.ensureDir(path.dirname(destinationPath));
			await client.uploadFrom(sourcePath, destinationPath);
			client.trackProgress();
		},
		async removeFile(path: string) {
			await client.remove(path);
		},
	});

	client.close();
}

interface Context {
	/**
	 * Read the contents of a directory.
	 * @param path - The path to the directory.
	 */
	readDir(path: string): Promise<string[]>;
	/**
	 * Send a file to the printer.
	 * @param sourcePath - The path to the file.
	 * @param destinationPath - The path to send the file to.
	 * @param progressCallback - A callback to report progress.
	 */
	sendFile(
		sourcePath: string,
		destinationPath: string,
		progressCallback?: (progress: number) => void,
	): Promise<void>;
	/**
	 * Remove a file from the printer.
	 * @param path - The path to the file.
	 */
	removeFile(path: string): Promise<void>;
}
