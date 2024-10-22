import { getDetailsHook } from "@/hooks/getDetails.hook";
import { getPermissionsHook } from "@/hooks/getPermissions.hook";
import type { FastifyPluginAsync } from "fastify";

export interface Reply {
	"2xx": {
		success: true;
		permissions: string[];
	};
	"4xx": {
		success: false;
		error: {
			code: string;
			message: string;
		};
	};
}

export default function getAuthRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.route<{
			Reply: Reply;
		}>({
			method: "GET",
			url: "/",
			preHandler: [getDetailsHook, getPermissionsHook],
			handler: async (request, reply) => {
				reply.code(200).send({
					success: true,
					permissions: request.opPermissions,
				});
			},
		});
	};
}
