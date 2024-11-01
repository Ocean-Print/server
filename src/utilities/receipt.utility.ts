import { JobDetail } from "@/schemas/job.schema";
import net from "net";

let isPrinting = false;

export async function printReceipt(job: JobDetail) {
	if (isPrinting) {
		throw new Error("Printer is busy");
	}
	isPrinting = true;

	try {
		const printerIp = process.env.RECEIPTS_HOST;
		const printerModel = process.env.RECEIPTS_MODEL;

		if (!printerIp || !printerModel) return;

		if (printerModel === "BROTHER QL-810W") {
			await BrotherQL8xxUtility.printReceipt(printerIp, job);
		} else {
			throw new Error(`Unsupported printer model: ${printerModel}`);
		}
	} finally {
		isPrinting = false;
	}
}

class BrotherQL8xxUtility {
	public static printReceipt(host: string, job: JobDetail) {
		return new Promise<void>((resolve, reject) => {
			const client = net.createConnection({ port: 9100, host }, () => {
				client.write(BrotherQL8xxUtility.selectEscpMode());
				client.write(BrotherQL8xxUtility.initialize());
				client.write(BrotherQL8xxUtility.specifyLeftMargin(2));
				client.write(BrotherQL8xxUtility.selectFont(11));
				client.write(BrotherQL8xxUtility.specifyCharacterSize(50));
				client.write(BrotherQL8xxUtility.applyBoldStyle());
				client.write(job.project.name);
				client.write(BrotherQL8xxUtility.lineFeed());
				client.write(BrotherQL8xxUtility.cancelBoldStyle());
				client.write(BrotherQL8xxUtility.selectFont(1));
				client.write(BrotherQL8xxUtility.specifyCharacterSize(32));
				client.write(BrotherQL8xxUtility.specifyMinimumLineFeed(1));
				client.write(`ID${job.id.toString(32).padStart(6, "0")}`);
				if (job.printer) {
					client.write(BrotherQL8xxUtility.lineFeed());
					client.write(job.printer.name);
				}
				client.write(BrotherQL8xxUtility.lineFeed());
				client.write(`Queued ${job.createdAt.toLocaleString()}`);
				if (job.startedAt) {
					client.write(BrotherQL8xxUtility.lineFeed());
					client.write(`Started ${job.startedAt.toLocaleString()}`);
				}
				if (job.endedAt) {
					client.write(BrotherQL8xxUtility.lineFeed());
					client.write(`Completed ${job.endedAt.toLocaleString()}`);
				}
				client.write(BrotherQL8xxUtility.lineFeed());
				client.write(BrotherQL8xxUtility.pageFeed());
				client.end(); // Close the connection after sending the message
			});
			client.on("end", () => {
				resolve();
			});
			client.on("error", (err) => {
				reject(err);
			});
		});
	}

	private static selectEscpMode() {
		return Buffer.from([0x1b, 0x69, 0x61, 0x00]);
	}

	private static selectFont(n: number) {
		if (n < 0 || (n > 4 && n < 9) || n > 11) {
			throw new Error("Invalid font: " + n);
		}
		return Buffer.from([0x1b, 0x6b, n]);
	}

	private static applyBoldStyle() {
		return Buffer.from([0x1b, 0x45]);
	}

	private static cancelBoldStyle() {
		return Buffer.from([0x1b, 0x46]);
	}

	private static specifyCharacterSize(n: number) {
		if (n < 0 || n > 65535) {
			throw new Error("Invalid character size: " + n);
		}
		return Buffer.from([0x1b, 0x58, 0x00, n % 256, n >> 8]);
	}

	private static specifyMinimumLineFeed(n: number) {
		if (n < 0 || n > 255) {
			throw new Error("Invalid minimum line feed: " + n);
		}
		return Buffer.from([0x1b, 0x33, n]);
	}

	private static specifyLeftMargin(n: number) {
		if (n < 0 || n > 255) {
			throw new Error("Invalid left margin: " + n);
		}
		return Buffer.from([0x1b, 0x6c, n]);
	}

	private static lineFeed() {
		return Buffer.from([0x0a]);
	}

	private static pageFeed() {
		return Buffer.from([0x0c]);
	}

	private static initialize() {
		return Buffer.from([0x1b, 0x40]);
	}
}
