import type { JobDetail } from "@/schemas/job.schema";
import * as JobService from "@/services/job.service";
import * as PrinterService from "@/services/printer.service";
import * as ErrorUtility from "@/utilities/error.utility";
import * as FtpUtility from "@/utilities/ftp.utility";
import * as MaterialUtility from "@/utilities/material.utility";
import * as MqttUtility from "@/utilities/mqtt.utility";
import * as QueueUtility from "@/utilities/queue.utility";
import * as WebhookUtility from "@/utilities/webhook.utility";
import type { Printer } from "@prisma/client";
import { PrintStage } from "bambu-js";
import path from "node:path";

const UPLOADS_DIR = path.resolve(
	process.cwd(),
	process.env.DATA_UPLOADS_DIR ?? "/data/uploads",
);

type Result<T> = [T, undefined] | [undefined, Error];

export function queueDispatchJob(printerId: number, i = 0, delay = 0) {
	if (i > 10) {
		console.error(`[OP][DISPATCH][${printerId}] Job failed too many times`);
		return;
	}

	QueueUtility.enqueueDelayed(
		{
			jobId: `dispatch:${printerId}`,
			deviceId: printerId.toString(),
			data: {
				printerId,
			},
			worker,
			onSuccess: async () => {
				console.log(`[OP][DISPATCH][${printerId}] Job completed`);
			},
			onFailure: async (error) => {
				if (
					error instanceof ErrorUtility.OceanPrintError &&
					error.name === "PrinterRemoved"
				) {
					console.error(
						`[OP][DISPATCH][${printerId}] Printer removed before job completion`,
					);
				} else {
					console.log(
						`[OP][DISPATCH][${printerId}] Job failed: ${error.message}`,
					);

					console.error(error);

					// Retry the job
					console.log(`[OP][DISPATCH][${printerId}] Retrying job`);
					queueDispatchJob(printerId, i + 1, 1000);
				}
			},
		},
		delay,
	);
}

/**
 * Processor for the MQTT worker.
 * @param job - The job to process
 */
async function worker({ printerId }: JobData) {
	const printer = await PrinterService.getPrinter(printerId);
	if (!printer) {
		throw ErrorUtility.printerNotFoundError(printerId);
	}

	// Update printer state
	await PrinterService.updatePrinter(printer.id, {
		systemStatus: {
			...printer.systemStatus,
			state: "DISPATCHING",
		},
	});

	console.log(`[OP][DISPATCH][${printer.id}] Finding job to dispatch`);

	const [jobToSend, jobToSendError] = await findJob(printer);
	if (!jobToSend || jobToSendError) {
		console.log(`[OP][DISPATCH][${printer.id}] No jobs to dispatch`);
		await PrinterService.updatePrinter(printer.id, {
			systemStatus: {
				...printer.systemStatus,
				state: "GOOD",
			},
		});
		return;
	}

	console.log(`[OP][DISPATCH][${printer.id}] Dispatching job ${jobToSend.id}`);

	// Get the current job, and also update the job state
	const job = await JobService.updateJob(jobToSend.id, {
		state: "DISPATCHING",
	});
	if (!job) {
		console.error(`[OP][DISPATCH][${printer.id}] Job not found`);
		await PrinterService.updatePrinter(printer.id, {
			systemStatus: {
				...printer.systemStatus,
				state: "GOOD",
			},
		});
		return;
	}

	// Send the job to the printer
	console.log(`[OP][DISPATCH][${printer.id}] Sending job ${job.id}`);
	let [, sendJobError] = await sendJob(printer, job);
	if (sendJobError) {
		console.error(
			`[OP][DISPATCH][${printer.id}] Error sending job: ${sendJobError}`,
		);
		// Reset states
		await JobService.updateJob(job.id, {
			state: "QUEUED",
		});
		await PrinterService.updatePrinter(printer.id, {
			systemStatus: {
				...printer.systemStatus,
				state: "GOOD",
			},
		});
		return;
	}

	// Start the job
	console.log(`[OP][DISPATCH][${printer.id}] Starting job ${job.id}`);
	let [, startJobError] = await startJob(printer, job);
	if (startJobError) {
		console.error(
			`[OP][DISPATCH][${printer.id}] Error starting job: ${startJobError}`,
		);
		// Reset states
		await JobService.updateJob(job.id, {
			state: "QUEUED",
		});
		await PrinterService.updatePrinter(printer.id, {
			systemStatus: {
				...printer.systemStatus,
				state: "GOOD",
			},
		});
		return;
	}

	// Update states
	const updatedJob = await JobService.updateJob(job.id, {
		state: "PRINTING",
		startedAt: new Date(),
		printer: {
			connect: {
				id: printer.id,
			},
		},
	}).catch((e) => console.error(e));

	await PrinterService.updatePrinter(printer.id, {
		systemStatus: {
			...printer.systemStatus,
			state: "GOOD",
			progress: 0,
			isClear: false,
		},
		printerStatus: {
			...printer.printerStatus,
			state: "PRINTING",
		},
		currentJob: {
			connect: {
				id: job.id,
			},
		},
	});

	// Send webhook
	if (updatedJob) await WebhookUtility.sendWebhook(updatedJob);

	console.log(`[OP][DISPATCH][${printer.id}] Dispatch complete`);
}

/**
 * Find the first queued job that matches the printer.
 * @param printer - The printer to find a job for
 * @returns The job to dispatch, or undefined if no job is found
 */
async function findJob(printer: Printer): Promise<Result<JobDetail>> {
	try {
		let page = 0;

		while (true) {
			const jobs = await JobService.getJobs(
				{ limit: 10, offset: page * 10 },
				{ state: "QUEUED" },
				[
					{
						priority: "desc",
					},
					{
						createdAt: "asc",
					},
				],
			);
			if (jobs.length === 0) {
				break;
			}
			for (const job of jobs) {
				let validChoice = MaterialUtility.compareMaterials(
					printer.materials ?? [],
					job.project.materials,
				);
				if (validChoice) {
					return [job, undefined];
					break;
				}
			}
			page++;
		}
		return [undefined, new Error("No valid jobs found")];
	} catch (e) {
		return [undefined, e as Error];
	}
}

function getDestinationFilePath(job: JobDetail) {
	const jobName =
		job.id.toString(32).padStart(6, "0") + "-" + job.project.name + ".3mf";
	return path.join("/ocean_print/", jobName);
}

/**
 * Send a job to the printer.
 * @param printerInstance - The printer instance to send the job to
 * @param printer - The printer to send the job to
 * @param job - The job to send
 */
async function sendJob(
	printer: Printer,
	job: JobDetail,
): Promise<Result<boolean>> {
	try {
		const projectFilePath = path.join(UPLOADS_DIR, job.project.file);
		const destinationPath = getDestinationFilePath(job);

		await FtpUtility.createFileContext(
			printer.options.host,
			printer.options.accessCode,
			async (ctx) => {
				// Clear the file system
				let files = await ctx.readDir("/ocean_print");
				for (let file of files) {
					await ctx.removeFile(path.join("/ocean_print/", file));
				}

				// Send the file to the printer
				await ctx.sendFile(
					projectFilePath,
					destinationPath,
					async (progress) => {
						console.log(`[OP][DISPATCH][${printer.id}] Progress: ${progress}`);
						await PrinterService.updatePrinter(printer.id, {
							systemStatus: {
								...printer.systemStatus,
								state: "DISPATCHING",
								progress,
							},
						});
					},
				);
			},
		);

		return [true, undefined];
	} catch (e) {
		return [undefined, e as Error];
	}
}

/**
 * Start a job.
 * @param printerInstance - The printer instance to start the job on
 * @param printer - The printer to start the job on
 * @param job - The job to start
 */
async function startJob(
	printer: Printer,
	job: JobDetail,
): Promise<Result<boolean>> {
	try {
		const destinationPath = getDestinationFilePath(job);

		await MqttUtility.sendPrinterCommend(
			printer.options.host,
			printer.options.serial,
			printer.options.accessCode,
			{
				print: {
					command: "project_file",
					// File info
					param: "Metadata/plate_1.gcode",
					url: "file://" + path.join("/sdcard/", destinationPath),
					subtask_name: "opx" + job.project.id.toString(32).padStart(6, "0"),
					md5: job.project.hash,
					// Options
					flow_cali: true,
					layer_inspect: true,
					timelapse: false,
					vibration_cali: true,
					bed_leveling: true,
					bed_type: "textured_plate",
					use_ams: true,
					// Required misc
					profile_id: "0",
					project_id: "0",
					sequence_id: "0",
					subtask_id: "0",
					task_id: "0",
				},
			},
		);

		// Wait for the printer to be in the printing state, or the timeout to expire
		await MqttUtility.awaitPrinterState(
			printer.options.host,
			printer.options.serial,
			printer.options.accessCode,
			PrintStage.PRINTING,
		);

		return [true, undefined];
	} catch (e) {
		return [undefined, e as Error];
	}
}

type JobData = {
	printerId: number;
};
