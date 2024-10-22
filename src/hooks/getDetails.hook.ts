import type { preHandlerHookHandler } from "fastify";

// Extend the FastifyRequest interface to include the client IP address.
declare module "fastify" {
	interface FastifyRequest {
		opIp?: string;
		opToken?: string;
	}
}

/**
 * Get the client IP address from the request headers.
 * The resulting IP address is stored in the request object as `clientIp`.
 */
export const getDetailsHook: preHandlerHookHandler = async (request, reply) => {
	// IP
	if (request.headers["cf-connecting-ip"]) {
		// Cloudflare
		request.opIp = request.headers["cf-connecting-ip"] as string;
	} else if (request.headers["x-forwarded-for"]) {
		// Proxy forwarding
		request.opIp = (request.headers["x-forwarded-for"] as string).split(",")[0];
	} else {
		request.opIp = request.ip;
	}

	// Token
	if (request.headers.authorization) {
		const token = request.headers.authorization.split(" ")[1];
		request.opToken = token;
	}
};
