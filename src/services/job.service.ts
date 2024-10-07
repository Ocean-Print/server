import prisma from "../utilities/prisma.utility";
import { jobDetailSelect, jobPreviewSelect } from "@/schemas/job.schema";
import type { Prisma, JobState } from "@prisma/client";

/**
 * Create a new job in the database.
 * @param newJob - The job to create.
 * @returns The created job.
 */
export function createJob(newJob: Prisma.JobCreateInput) {
	return prisma.job.create({ data: newJob, select: jobDetailSelect });
}

/**
 * Get jobs from the database.
 * @param pagination - The pagination options.
 * @param filter - The filter options.
 * @returns All jobs.
 */
export function getJobs(
	pagination: {
		limit?: number;
		offset?: number;
	},
	filter: {
		state?: JobState | JobState[];
		userId?: number;
		projectId?: number;
		createdBefore?: Date;
		createdAfter?: Date;
		startedBefore?: Date;
		startedAfter?: Date;
		endedBefore?: Date;
		endedAfter?: Date;
	},
	sort:
		| Prisma.JobOrderByWithRelationInput
		| Prisma.JobOrderByWithRelationInput[] = { createdAt: "desc" },
) {
	return prisma.job.findMany({
		take: pagination.limit,
		skip: pagination.offset,
		where: {
			...(Array.isArray(filter.state) ? { state: { in: filter.state } } : {}),
			...(filter.state && !Array.isArray(filter.state)
				? { state: filter.state }
				: {}),
			...(filter.userId ? { userId: filter.userId } : {}),
			...(filter.projectId ? { projectId: filter.projectId } : {}),
			...(filter.createdBefore && filter.createdAfter
				? {
						createdAt: {
							lte: filter.createdBefore,
							gte: filter.createdAfter,
						},
					}
				: {}),
			...(filter.startedBefore && filter.startedAfter
				? {
						startedAt: {
							lte: filter.startedBefore,
							gte: filter.startedAfter,
						},
					}
				: {}),
			...(filter.endedBefore && filter.endedAfter
				? {
						endedAt: {
							lte: filter.endedBefore,
							gte: filter.endedAfter,
						},
					}
				: {}),
		},
		select: jobPreviewSelect,
		orderBy: sort,
	});
}

/**
 * Get the number of jobs in the database.
 * @param filter - The filter options.
 */
export function getJobsCount(filter: {
	state?: JobState | JobState[];
	userId?: number;
	projectId?: number;
	createdBefore?: Date;
	createdAfter?: Date;
	startedBefore?: Date;
	startedAfter?: Date;
	endedBefore?: Date;
	endedAfter?: Date;
}) {
	return prisma.job.count({
		where: {
			...(Array.isArray(filter.state) ? { state: { in: filter.state } } : {}),
			...(filter.state && !Array.isArray(filter.state)
				? { state: filter.state }
				: {}),
			...(filter.userId ? { userId: filter.userId } : {}),
			...(filter.projectId ? { projectId: filter.projectId } : {}),
			...(filter.createdBefore && filter.createdAfter
				? {
						createdAt: {
							lte: filter.createdBefore,
							gte: filter.createdAfter,
						},
					}
				: {}),
			...(filter.startedBefore && filter.startedAfter
				? {
						startedAt: {
							lte: filter.startedBefore,
							gte: filter.startedAfter,
						},
					}
				: {}),
			...(filter.endedBefore && filter.endedAfter
				? {
						endedAt: {
							lte: filter.endedBefore,
							gte: filter.endedAfter,
						},
					}
				: {}),
		},
	});
}

/**
 * Get a job.
 * @param jobId - The ID of the job to get.
 * @returns The job.
 */
export function getJob(jobId: number) {
	return prisma.job.findUnique({
		where: { id: jobId },
		select: jobDetailSelect,
	});
}

/**
 * Update a job.
 * @param jobId - The ID of the job to update.
 * @param updatedJob - The updated job.
 * @returns The updated job.
 */
export function updateJob(jobId: number, updatedJob: Prisma.JobUpdateInput) {
	return prisma.job.update({
		where: { id: jobId },
		data: updatedJob,
		select: jobDetailSelect,
	});
}
