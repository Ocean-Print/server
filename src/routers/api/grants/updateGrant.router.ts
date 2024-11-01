import type { GrantDetail } from "@/schemas/grant.schema";
import * as GrantService from "@/services/grant.service";
import type { FastifyPluginAsync } from "fastify";

export interface Body {
	type: "IP" | "PASSWORD" | "CARD";
	name: string;
	data: string;
	permissions: string[];
}

export interface Params {
	id: number;
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

export default function updateGrantRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.route<{
			Reply: Reply;
			Body: Body;
			Params: Params;
		}>({
			method: "PATCH",
			url: "/:id",
			schema: {
				params: {
					type: "object",
					required: ["id"],
					properties: {
						id: { type: "number" },
					},
				},
				body: {
					type: "object",
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
				const grantId = request.params.id;
				const grant = await GrantService.updateGrant(grantId, body);
				reply.status(200).send({
					success: true,
					grant,
				});
			},
		});
	};
}
