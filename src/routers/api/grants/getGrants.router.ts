import type { GrantPreview } from "@/schemas/grant.schema";
import * as GrantService from "@/services/grant.service";
import type { FastifyPluginAsync } from "fastify";

export interface Querystring {
	limit?: number;
	offset?: number;
	sort?: string;
	type?: "IP" | "PASSWORD" | "CARD";
}

export interface Reply {
	"2xx": {
		success: true;
		grants: GrantPreview[];
	};
	"4xx": {
		success: false;
		error: {
			code: string;
			message: string;
		};
	};
}

function parseSortParams(sort: string) {
	const sortParams = sort.split(",");
	return sortParams.map((param) => {
		const [field, direction] = param.split(":");
		return {
			[field]: direction,
		};
	});
}

export default function getGrantsRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.route<{
			Reply: Reply;
			Querystring: Querystring;
		}>({
			method: "GET",
			url: "/",
			schema: {
				querystring: {
					type: "object",
					properties: {
						limit: { type: "integer" },
						offset: { type: "integer" },
						sort: { type: "string" },
						type: {
							type: "string",
							enum: ["IP", "PASSWORD", "CARD"],
						},
					},
				},
			},
			handler: async (request, reply) => {
				const query = request.query;
				const sort = query.sort ? parseSortParams(query.sort) : undefined;
				const filter = query.type ? { type: query.type } : {};

				const grants = await GrantService.getGrants(
					{
						limit: query.limit,
						offset: query.offset,
					},
					filter,
					sort,
				);

				reply.status(200).send({
					success: true,
					grants,
				});
			},
		});
	};
}
