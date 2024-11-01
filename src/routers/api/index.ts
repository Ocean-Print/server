import jobRouter from "../job.router";
import projectRouter from "../project.router";
import authRouter from "./auth";
import grantRouter from "./grants";
import printerRouter from "./printers";
import statsRouter from "./stats";
import { getDetailsHook } from "@/hooks/getDetails.hook";
import { type FastifyPluginAsync } from "fastify";

export default function apiRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.register(projectRouter(), { prefix: "/projects" });
		fastify.register(jobRouter(), { prefix: "/jobs" });
		fastify.register(printerRouter(), { prefix: "/printers" });
		fastify.register(authRouter(), { prefix: "/auth" });
		fastify.register(grantRouter(), { prefix: "/grants" });
		fastify.register(statsRouter(), { prefix: "/stats" });

		fastify.route({
			method: "GET",
			url: "/",
			preHandler: [getDetailsHook],
			handler: async (request, reply) => {
				reply.status(200).send({
					success: true,
					client: {
						ip: request.opIp,
						token: request.opToken,
					},
					server: {
						online: true,
					},
				});
			},
		});
	};
}
