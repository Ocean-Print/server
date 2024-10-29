import { getQueueTimeToCompletion } from "@/services/stats.service";
import type { FastifyPluginAsync } from "fastify";

export default function getQueueTimeRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.route({
			method: "GET",
			url: "/queue-time",
			handler: async (request, reply) => {
				const queueTime = await getQueueTimeToCompletion();
				reply.code(200).send({
					success: true,
					queueTime,
				});
			},
		});
	};
}
