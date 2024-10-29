import { JobDetail } from "@/schemas/job.schema";
import axios from "axios";

const WEBHOOK_URL = process.env.WEBHOOK_URL;

export async function sendWebhook(job: JobDetail) {
	if (!WEBHOOK_URL) return;
	try {
		await axios.post(WEBHOOK_URL, job);
	} catch (error) {
		console.error("Failed to send webhook", error);
	}
}
