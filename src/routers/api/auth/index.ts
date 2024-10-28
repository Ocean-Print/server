import getAuthRouter from "./getAuth.router";
import loginRouter from "./login.router";
import type { FastifyPluginAsync } from "fastify";

export default function printerRouter(): FastifyPluginAsync {
	return async function (fastify) {
		// GET /api/auth
		fastify.register(getAuthRouter());
		// POST /api/auth
		fastify.register(loginRouter());
	};
}
