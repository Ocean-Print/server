import * as MaterialUtility from "../utilities/material.utility";
import prisma from "../utilities/prisma.utility";

/**
 * Get the estimated time until the completion of the print queue.
 */
export async function getQueueTimeToCompletion() {
	const printers = await prisma.printer.findMany({
		select: {
			id: true,
			printerStatus: true,
			materials: true,
		},
		orderBy: {
			id: "asc",
		},
	});

	const queuedJobs = await prisma.job.findMany({
		where: {
			state: "QUEUED",
		},
		select: {
			project: {
				select: {
					printTime: true,
					materials: true,
				},
			},
		},
		orderBy: {
			id: "asc",
		},
	});

	const queueTimes = printers.map((printer) => {
		return printer.printerStatus.timeRemaining;
	});

	// Loop over every job and add the print time to the matching printer with the lowest queue time
	for (const job of queuedJobs) {
		let lowestTime = Number.MAX_SAFE_INTEGER;
		let lowestIndex = -1;
		for (let i = 0; i < queueTimes.length; i++) {
			if (
				MaterialUtility.compareMaterials(
					printers[i].materials,
					job.project.materials,
				) &&
				queueTimes[i] < lowestTime
			) {
				lowestTime = queueTimes[i];
				lowestIndex = i;
			}
		}

		if (lowestIndex !== -1) {
			queueTimes[lowestIndex] += Math.ceil(job.project.printTime / 60);
		}
	}

	// Return the highest queue time
	return Math.max(...queueTimes);
}
