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
	} else if (error.code === "FST_ERR_VALIDATION") {
		reply.status(400).send({
			success: false,
			error: {
				name: "ValidationError",
				message: error.message,
			},
		});
	} else if (error.code === "P2025") {
		// Prisma model not found
		reply.status(404).send({
			success: false,
			error: {
				name: `${error.meta.modelName}NotFound`,
				message: `The requested ${error.meta.modelName} could not be found.`,
			},
		});
	} else {
		console.error("[OP][SERVER] Unknown error:", error);
		reply.status(500).send({
			success: false,
			error: {
				name: "UnknownError",
				message: "An unknown error occurred.",
			},
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
