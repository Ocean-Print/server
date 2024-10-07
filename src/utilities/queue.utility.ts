import { Sema } from "async-sema";

const sema = new Sema(5);
const deviceLocks = new Map<string, boolean>();
let dispatchLock = false;
const queue: Job[] = [];
const activeJobs: Job[] = [];
const delayedJobs: Job[] = [];

/**
 * Add a job to the queue.
 * @param job
 * @param isPriority
 */
export function enqueue(job: Job, isPriority = false) {
	// Ensure the job is unique
	if (
		activeJobs.find((activeJob) => activeJob.jobId === job.jobId) ||
		queue.find((queuedJob) => queuedJob.jobId === job.jobId) ||
		delayedJobs.find((delayedJob) => delayedJob.jobId === job.jobId)
	) {
		return;
	}

	// Add the job to the queue
	if (isPriority) queue.unshift(job);
	else queue.push(job);

	// Process the queue
	processQueue();
}

export function enqueueDelayed(job: Job, delay: number, isPriority = false) {
	delayedJobs.push(job);
	setTimeout(() => {
		delayedJobs.splice(delayedJobs.indexOf(job), 1);
		enqueue(job, isPriority);
	}, delay);
}

/**
 * Process all possible jobs in the queue.
 */
export async function processQueue() {
	// Loop over every current job and start it if possible
	for (let i = 0; i < queue.length; i++) {
		const job = queue[i];
		if (job.jobId.startsWith("dispatch") && dispatchLock) continue;
		if (deviceLocks.has(job.deviceId)) continue;
		if (!sema.tryAcquire()) continue;

		// Add the dispatch lock
		if (job.jobId.startsWith("dispatch")) dispatchLock = true;
		// Add the device lock
		deviceLocks.set(job.deviceId, true);

		// Remove the job from the queue
		queue.splice(i, 1);
		i--;

		// Add the job to the active jobs
		activeJobs.push(job);

		// Execute the job
		executeJob(job);
	}
}

/**
 * Execute a job.
 * @param job - The job to execute
 */
export async function executeJob(job: Job) {
	try {
		let result = await job.worker.call(job, job.data);
		activeJobs.splice(activeJobs.indexOf(job), 1);
		await job.onSuccess(result);
	} catch (err) {
		activeJobs.splice(activeJobs.indexOf(job), 1);
		await job.onFailure(err as Error);
	} finally {
		// Remove the semaphore
		sema.release();
		// Remove the device lock
		deviceLocks.delete(job.deviceId);
		// Remove the dispatch lock
		if (job.jobId.startsWith("dispatch")) dispatchLock = false;
		// Process the queue
		setImmediate(processQueue);
	}
}

export type Job = {
	jobId: string;
	deviceId: string;
	data: any;
	worker: (data: any) => Promise<any>;
	onSuccess: (result: any) => Promise<void>;
	onFailure: (error: Error) => Promise<void>;
};
