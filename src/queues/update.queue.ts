import * as JobService from "../services/job.service";
import * as PrinterService from "../services/printer.service";
import * as MqttUtility from "../utilities/mqtt.utility";
import * as DispatchQueue from "./dispatch.queue";
import { SystemStatus } from "@/schemas/printer.schema";
import * as ErrorUtility from "@/utilities/error.utility";
import * as QueueUtility from "@/utilities/queue.utility";
import type { Printer, Prisma } from "@prisma/client";
import { hms } from "bambu-js";

const JOB_NAME_REGEX = /^opx([0-9a-v]{6})/;

type UpdateJobData = {
	printerId: number;
};

export async function queueUpdateJob(printerId: number, i = 0, delay = 0) {
	if (i > 10) {
		console.error(`[OP][UPDATE][${printerId}] Update failed too many times`);
		return;
	}

	QueueUtility.enqueueDelayed(
		{
			jobId: `update:${printerId}`,
			deviceId: printerId.toString(),
			data: {
				printerId,
			},
			worker,
			onSuccess: async () => {
				// Queue the next job
				console.log(`[OP][UPDATE][${printerId}] Update completed`);
				queueUpdateJob(printerId, 0, 10000);
			},
			onFailure: async (error) => {
				if (
					error instanceof ErrorUtility.OceanPrintError &&
					error.name === "PrinterRemoved"
				) {
					console.error(
						`[OP][UPDATE][${printerId}] Printer removed before update completion`,
					);
				} else {
					console.log(
						`[OP][UPDATE][${printerId}] Update failed: ${error.message}`,
					);

					// Retry the job
					console.log(`[OP][UPDATE][${printerId}] Retrying update`);
					queueUpdateJob(printerId, i + 1, 1000);
				}
			},
		},
		delay,
	);
}

/**
 * Update queue job worker.
 * @param job - The job to process
 */
async function worker({ printerId }: UpdateJobData) {
	let printer = await PrinterService.getPrinter(printerId);
	if (!printer) {
		throw ErrorUtility.printerNotFoundError(printerId);
	}

	// Update printer state
	await PrinterService.updatePrinter(printer.id, {
		systemStatus: {
			...printer.systemStatus,
			state: "UPDATING",
		},
	});

	console.log(`[OP][UPDATE][${printer.id}] Updating state`);

	await MqttUtility.getPrinterState(
		printer.options.host,
		printer.options.serial,
		printer.options.accessCode,
	)
		.then(async (state) => {
			// This must be done just incase the printer was updated while this job was getting the state
			// For example, if the printer was cleared or removed
			printer = await PrinterService.getPrinter(printerId);
			if (!printer) {
				console.error(`[OP][UPDATE][${printerId}] Printer not found`);
				return;
			}

			const oldPrinterStatus = printer.printerStatus;
			const oldSystemStatus = printer.systemStatus;

			const newPrinterData = {
				printerStatus: {
					...oldPrinterStatus,
					state: state.controller.printStage,
					errors:
						state.errors?.map((e) => {
							let code = hms.getErrorCode(e.attr, e.code);
							return {
								name: code,
								message: hms.getErrorMessage(code),
							};
						}) ?? [],
					currentJobName: state.controller.printName,
					progress: state.controller.printPercent / 100,
					timeRemaining: state.controller.printTimeRemaining,
				},
				systemStatus: {
					...oldSystemStatus,
					state: "GOOD",
					errors: [],
				},
			} as Prisma.PrinterUpdateInput;

			// This is a bit of a typescript hack, but it works
			if (!newPrinterData.printerStatus) return;
			if (!newPrinterData.systemStatus) return;

			const currentJobIdString = JOB_NAME_REGEX.exec(
				state.controller.printName,
			)?.[1];
			const currentJobId = currentJobIdString
				? parseInt(currentJobIdString, 32)
				: null;

			// If the printer is idle or finished, and the system status is cleared, send a print
			if (
				["IDLE", "FINISHED"].includes(newPrinterData.printerStatus.state) &&
				printer.systemStatus.isClear
			) {
				console.log(`[OP][UPDATE][${printer.id}] Queuing dispatch`);
				DispatchQueue.queueDispatchJob(printer.id);
			}

			if (
				["FINISHED"].includes(newPrinterData.printerStatus.state) &&
				["RUNNING", "IDLE"].includes(oldPrinterStatus.state)
			) {
				console.log(`[OP][UPDATE][${printer.id}] Print finished`);
			}

			if (
				["PAUSED"].includes(newPrinterData.printerStatus.state) &&
				["RUNNING", "IDLE"].includes(oldPrinterStatus.state)
			) {
				console.log(`[OP][UPDATE][${printer.id}] Print paused`);
			}

			// If the printer started printing, and the job is known
			if (
				["PRINTING"].includes(newPrinterData.printerStatus.state) &&
				["UNKNOWN", "FINISHED", "IDLE"].includes(oldPrinterStatus.state) &&
				currentJobId
			) {
				// Update the job
				await JobService.updateJob(currentJobId, {
					state: "PRINTING",
					printer: {
						connect: {
							id: printer.id,
						},
					},
					currentPrinter: {
						connect: {
							id: printer.id,
						},
					},
					startedAt: new Date(),
				});
				// Update the system status
				newPrinterData.systemStatus.isClear = false;
			}

			// Update the printer
			await PrinterService.updatePrinter(printer.id, newPrinterData);
		})
		.catch(async (err) => {
			if (!printer) return;
			await PrinterService.updatePrinter(printer.id, {
				systemStatus: {
					...printer.systemStatus,
					state: "ERROR",
					errors: handleSystemError(err),
					isClear: false,
				},
			});
		});
}

/**
 * Handle system errors.
 * @param printer - The printer
 * @param error - The error
 */
function handleSystemError(error: Error) {
	if (error instanceof MqttUtility.MqttConnectionError) {
		return [
			{
				name: "ConnectionError",
				message: error.message,
			},
		];
	} else if (error instanceof MqttUtility.MqttClientError) {
		return [
			{
				name: "ClientError",
				message: error.message,
			},
		];
	} else {
		return [
			{
				name: "UnknownError",
				message: error.message,
			},
		];
	}
}
