import jobRouter from "../job.router";
import projectRouter from "../project.router";
import authRouter from "./auth";
import printerRouter from "./printers";
import { type FastifyPluginAsync } from "fastify";

export default function apiRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.register(projectRouter(), { prefix: "/projects" });
		fastify.register(jobRouter(), { prefix: "/jobs" });
		fastify.register(printerRouter(), { prefix: "/printers" });
		fastify.register(authRouter(), { prefix: "/auth" });

		fastify.get("/", async (request, reply) => {
			return { status: "ok" };
		});
	};
}
