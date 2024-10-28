import * as fs from "fs";
import * as tls from "tls";

export default class CameraUtility {
	private hostname: string;
	private port: number;
	private username: string = "bblp";
	private authPacket: Buffer;

	constructor(hostname: string, accessCode: string, port: number = 6000) {
		this.hostname = hostname;
		this.port = port;
		this.authPacket = CameraUtility.createAuthPacket(this.username, accessCode);
	}

	/**
	 * Create an authentication packet
	 * @param username - Username
	 * @param accessCode - Access code
	 * @returns
	 */
	private static createAuthPacket(
		username: string,
		accessCode: string,
	): Buffer {
		const authData = Buffer.alloc(80);
		authData.writeUInt32LE(0x40, 0); // '@' character
		authData.writeUInt32LE(0x3000, 4); // Arbitrary constant

		// Write username and pad to 32 bytes
		for (let i = 0; i < username.length; i++) {
			authData.writeUInt8(username.charCodeAt(i), 16 + i);
		}

		// Write access code and pad to 32 bytes
		for (let i = 0; i < accessCode.length; i++) {
			authData.writeUInt8(accessCode.charCodeAt(i), 48 + i);
		}

		return authData;
	}

	/**
	 * Find a JPEG image in a buffer
	 * @param buf - Buffer to search
	 * @param startMarker - Start marker
	 * @param endMarker - End marker
	 * @returns Tuple containing the image and the remaining buffer
	 */
	private static findJpeg(
		buf: Buffer,
		startMarker: Buffer,
		endMarker: Buffer,
	): [Buffer | null, Buffer] {
		const start = buf.indexOf(startMarker);
		const end = buf.indexOf(endMarker, start + startMarker.length);

		if (start !== -1 && end !== -1) {
			return [
				buf.subarray(start, end + endMarker.length),
				buf.subarray(end + endMarker.length),
			];
		}
		return [null, buf];
	}

	/**
	 * Capture a frame from the camera
	 * @param timeout - Timeout in milliseconds
	 * @returns Promise that resolves with the frame buffer
	 */
	public captureFrame(timeout: number = 5000): Promise<Buffer | null> {
		return new Promise((resolve, reject) => {
			const jpegStart = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
			const jpegEnd = Buffer.from([0xff, 0xd9]);

			const options = {
				host: this.hostname,
				port: this.port,
				rejectUnauthorized: false,
				checkServerIdentity: () => undefined,
			};

			const socket = tls.connect(options, () => {
				socket.write(this.authPacket);

				let buffer = Buffer.alloc(0);

				socket.on("data", (data) => {
					buffer = Buffer.concat([buffer, data]);
					const [img, remaining] = CameraUtility.findJpeg(
						buffer,
						jpegStart,
						jpegEnd,
					);
					buffer = remaining;

					if (img) {
						clearTimeout(timeoutId);
						socket.destroy();
						resolve(img);
					}
				});

				socket.on("error", (err) => {
					clearTimeout(timeoutId);
					reject(err);
				});
				socket.on("end", () => {
					clearTimeout(timeoutId);
					resolve(null);
				});
			});

			const timeoutId = setTimeout(() => {
				socket.destroy();
				reject(new Error("Timeout"));
			}, timeout);
		});
	}
}
