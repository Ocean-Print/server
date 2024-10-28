import type { GrantDetail, GrantPreview } from "@/schemas/grant.schema";
import * as GrantService from "@/services/grant.service";
import type { FastifyPluginAsync } from "fastify";

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

export default function createGrantRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.route<{
			Reply: Reply;
			Params: Params;
		}>({
			method: "DELETE",
			url: "/:id",
			schema: {
				params: {
					type: "object",
					required: ["id"],
					properties: {
						id: { type: "number" },
					},
				},
			},
			handler: async (request, reply) => {
				const grantId = request.params.id;
				const grant = await GrantService.deleteGrant(grantId);
				reply.status(200).send({
					success: true,
					grant,
				});
			},
		});
	};
}
