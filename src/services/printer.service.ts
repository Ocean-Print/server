import * as errors from "../utilities/error.utility";
import prisma from "../utilities/prisma.utility";
import * as CameraQueue from "@/queues/camera.queue";
import * as UpdateQueue from "@/queues/update.queue";
import { jobDetailSelect } from "@/schemas/job.schema";
import {
	printerDetailSelect,
	PrinterDetailOutput,
	printerPreviewArgs,
	PrinterStatus,
	SystemStatus,
} from "@/schemas/printer.schema";
import * as WebhookUtility from "@/utilities/webhook.utility";
import type { Prisma } from "@prisma/client";

export const DEFAULT_PRINTER_STATUS: PrinterStatus = {
	state: "UNKNOWN",
	errors: [],
	currentJobName: "UNKNOWN",
	progress: 0,
	timeRemaining: 0,
};

export const DEFAULT_SYSTEM_STATUS: SystemStatus = {
	state: "UNKNOWN",
	errors: [],
	progress: 0,
	isClear: false,
};

/**
 * Gets a list of printers from the database.
 * @returns The list of printers.
 */
export async function getPrinters() {
	return prisma.printer.findMany({
		...printerPreviewArgs,
		orderBy: {
			id: "asc",
		},
	});
}

/**
 * Gets a printer by id from the database.
 * @param printerId - The id of the printer.
 * @returns The printer.
 */
export function getPrinter(printerId: number) {
	return prisma.printer.findUnique({
		where: {
			id: printerId,
		},
		select: printerDetailSelect,
	});
}

/**
 * Creates a new printer in the database. Also queues an update job for the printer.
 * @param printer - The printer to create.
 * @returns The created printer.
 */
export async function createPrinter(data: Prisma.PrinterCreateInput) {
	const result = await prisma.printer.create({
		data: {
			...data,
			systemStatus: DEFAULT_SYSTEM_STATUS,
			printerStatus: DEFAULT_PRINTER_STATUS,
		},
		select: printerDetailSelect,
	});

	// Queue an update job for the printer
	await UpdateQueue.queueUpdateJob(result.id);
	await CameraQueue.queueCaptureJob(result.id);

	return result;
}

/**
 * Updates a printer in the database. Also queues an update job for the printer.
 * @param printerId - The id of the printer.
 * @param printer - The updated printer.
 * @returns The updated printer.
 */
export async function updatePrinter(
	printerId: number,
	data: Prisma.PrinterUpdateInput,
) {
	const result = await prisma.printer.update({
		where: {
			id: printerId,
		},
		data,
		select: printerDetailSelect,
	});

	// Ensure an update job is queued (this is kinda unnecessary)
	await UpdateQueue.queueUpdateJob(printerId);
	await CameraQueue.queueCaptureJob(printerId);

	return result;
}

/**
 * Deletes a printer from the database.
 * @param printerId - The id of the printer.
 * @returns The deleted printer.
 */
export async function deletePrinter(printerId: number) {
	let result = await prisma.printer.delete({
		where: {
			id: printerId,
		},
		select: printerDetailSelect,
	});
	return result;
}

/**
 * Mark a printer as cleared, and the print job as a success.
 * @param printerId - The id of the printer.
 * @param isSuccessful - Whether the print job was successful.
 * @returns The printer.
 */
export async function setCleared(printerId: number, isSuccessful: boolean) {
	// Get the printer
	console.log("[OP][SERVICE][PRINTER] Clearing printer", printerId);
	const printer = await getPrinter(printerId);
	if (!printer) {
		console.log("[OP][SERVICE][PRINTER] Printer not found");
		throw errors.printerNotFoundError(printerId);
	}

	// Only allow clearing if the printer is in an idle state
	if (!["IDLE", "FINISHED"].includes(printer.printerStatus.state)) {
		console.log("[OP][SERVICE][PRINTER] Clearing printer");
		throw errors.printerNotIdleError();
	}

	// Update the printer
	console.log("[OP][SERVICE][PRINTER] Setting printer as cleared");
	await updatePrinter(printerId, {
		systemStatus: {
			...printer.systemStatus,
			isClear: true,
		},
		currentJob: {
			disconnect: true,
		},
	});

	// Update the print job
	if (!printer.currentJob) {
		console.log("[OP][SERVICE][PRINTER] No current job");
		return;
	}

	let jobState = await prisma.job
		.update({
			where: {
				id: printer.currentJob.id,
			},
			data: {
				state: isSuccessful ? "COMPLETED" : "FAILED",
				endedAt: new Date(),
			},
			select: jobDetailSelect,
		})
		.catch((err) => {
			console.error("[OP][SERVICE][PRINTER] Error updating job", err);
		});
	if (jobState) WebhookUtility.sendWebhook(jobState);
}

/**
 * Get all materials from all printers as a list of materials per printer.
 * @returns
 */
export async function getAllMaterials() {
	let printers = await prisma.printer.findMany({
		select: {
			materials: true,
		},
	});
	return printers.map((printer) => printer.materials);
}

/**
 * Get all materials from all printers as a single list.
 * @returns
 */
export async function getAllMaterialsFlat() {
	let materials = await getAllMaterials();
	return materials.flat();
}

/**
 * Set all printers to an unknown state and start queued jobs. This should only be used when the server starts up.
 */
export async function initializePrinters() {
	// Set all printers to an unknown state
	await prisma.printer.updateMany({
		where: {},
		data: {
			printerStatus: DEFAULT_PRINTER_STATUS,
			systemStatus: DEFAULT_SYSTEM_STATUS,
		},
	});

	// Queue update jobs for all printers
	const printers = await prisma.printer.findMany();
	for (const printer of printers) {
		UpdateQueue.queueUpdateJob(printer.id);
		CameraQueue.queueCaptureJob(printer.id);
	}
}
