import jobRouter from "../job.router";
import projectRouter from "../project.router";
import printerRouter from "./printers";
import { type FastifyPluginAsync } from "fastify";

export default function apiRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.register(projectRouter(), { prefix: "/projects" });
		fastify.register(jobRouter(), { prefix: "/jobs" });
		fastify.register(printerRouter(), { prefix: "/printers" });

		fastify.get("/", async (request, reply) => {
			return { status: "ok" };
		});
	};
}
