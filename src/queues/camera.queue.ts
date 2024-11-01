import * as PrinterService from "../services/printer.service";
import CameraUtility from "@/utilities/camera.utility";
import * as ErrorUtility from "@/utilities/error.utility";
import * as QueueUtility from "@/utilities/queue.utility";
import fse from "fs-extra";
import crypto from "node:crypto";
import path from "node:path";

const THUMBNAILS_DIR = path.resolve(
	process.cwd(),
	process.env.DATA_THUMBNAILS_DIR ?? "/data/thumbnails",
);

type CaptureData = {
	printerId: number;
};

export async function queueCaptureJob(printerId: number, i = 0, delay = 0) {
	if (i > 10) {
		console.error(`[OP][CAPTURE][${printerId}] Capture failed too many times`);
		return;
	}

	QueueUtility.enqueueDelayed(
		{
			jobId: `capture:${printerId}`,
			deviceId: printerId.toString(),
			data: {
				printerId,
			},
			worker,
			onSuccess: async () => {
				// Queue the next job
				queueCaptureJob(printerId, 0, 30000);
			},
			onFailure: async (error) => {
				if (
					error instanceof ErrorUtility.OceanPrintError &&
					error.name === "PrinterRemoved"
				) {
					console.error(
						`[OP][CAPTURE][${printerId}] Printer removed before capture completion`,
					);
				} else {
					console.log(`[OP][CAPTURE][${printerId}] Capture failed`);
					console.error(error);

					// Retry the job
					queueCaptureJob(printerId, i + 1, 1000);
				}
			},
		},
		delay,
	);
}

/**
 * Capture queue job worker.
 * @param job - The job to process
 */
async function worker({ printerId }: CaptureData) {
	let printer = await PrinterService.getPrinter(printerId);
	if (!printer) {
		throw ErrorUtility.printerNotFoundError(printerId);
	}

	// Capture image
	const utility = new CameraUtility(
		printer.options.host,
		printer.options.accessCode,
	);
	await utility
		.captureFrame(5000)
		.then(async (image) => {
			if (image) {
				// Get the hash of the new image
				const hash = crypto.createHash("md5");
				hash.update(image);
				const hashString = hash.digest("hex");
				// Save the new image
				const filename = `${hashString}.png`;
				await fse.writeFile(path.resolve(THUMBNAILS_DIR, filename), image);
				// Save image to printer
				await PrinterService.updatePrinter(printer.id, {
					camera: filename,
				});
				// Delete the old image
				if (printer.camera) {
					await fse.remove(
						path.resolve(THUMBNAILS_DIR, path.basename(printer.camera)),
					);
				}
			}
		})
		.catch((e) => {
			console.error(`[OP][CAPTURE][${printerId}] Capture failed`);
			console.error(e);
		});
}
