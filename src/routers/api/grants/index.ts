import createGrantRouter from "./createGrant.router";
import deleteGrantRouter from "./deleteGrant.router";
import getGrantsRouter from "./getGrants.router";
import updateGrantRouter from "./updateGrant.router";
import type { FastifyPluginAsync } from "fastify";

export default function printerRouter(): FastifyPluginAsync {
	return async function (fastify) {
		// GET /api/grants
		fastify.register(getGrantsRouter());
		// POST /api/grants
		fastify.register(createGrantRouter());
		// PATCH /api/grants/:id
		fastify.register(updateGrantRouter());
		// DELETE /api/grants/:id
		fastify.register(deleteGrantRouter());
	};
}
