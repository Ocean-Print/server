import apiRouter from "./routers/api";
import assetRouter from "./routers/asset.router";
import octoprintRouter from "./routers/octoprint.router";
import { OceanPrintError } from "./utilities/error.utility";
import fastify from "fastify";

const server = fastify();

server.setErrorHandler((error, request, reply) => {
	if (error instanceof OceanPrintError) {
		reply.status(error.statusCode).send({
			success: false,
			error: error.toJSON(),
		});
	} else {
		console.error("[OP][SERVER] Unknown error:", error);
		reply.status(500).send({
			error: "InternalError",
			message: "An unknown error occurred",
		});
	}
});

server.register(apiRouter(), {
	prefix: "/api",
});

server.register(assetRouter(), {
	prefix: "/assets",
});

server.register(octoprintRouter(), {
	prefix: "/octoprint",
});

export default server;
