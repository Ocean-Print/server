import type { GrantDetail, GrantPreview } from "@/schemas/grant.schema";
import * as GrantService from "@/services/grant.service";
import type { FastifyPluginAsync } from "fastify";

export interface Body {
	type: "IP" | "PASSWORD" | "CARD";
	name: string;
	data: string;
	permissions: string[];
}

export interface Reply {
	"2xx": {
		success: true;
		grant: GrantDetail;
	};
	"4xx": {
		success: false;
		error: {
			code: string;
			message: string;
		};
	};
}

export default function createGrantRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.route<{
			Reply: Reply;
			Body: Body;
		}>({
			method: "POST",
			url: "/",
			schema: {
				body: {
					type: "object",
					required: ["type", "name", "data", "permissions"],
					properties: {
						type: {
							type: "string",
							enum: ["IP", "PASSWORD", "CARD"],
						},
						name: { type: "string" },
						data: { type: "string" },
						permissions: {
							type: "array",
							items: {
								type: "string",
							},
						},
					},
				},
			},
			handler: async (request, reply) => {
				const body = request.body;
				const grant = await GrantService.createGrant(body);
				reply.status(200).send({
					success: true,
					grant,
				});
			},
		});
	};
}
