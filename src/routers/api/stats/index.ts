import getQueueTimeRouter from "./getQueueTime.router";
import type { FastifyPluginAsync } from "fastify";

export default function printerRouter(): FastifyPluginAsync {
	return async function (fastify) {
		// GET /api/stats/queue-time
		fastify.register(getQueueTimeRouter());
	};
}
