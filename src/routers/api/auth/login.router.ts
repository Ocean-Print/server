import * as GrantService from "@/services/grant.service";
import * as ErrorUtility from "@/utilities/error.utility";
import type { FastifyPluginAsync } from "fastify";

export interface Body {
	type: "PASSWORD" | "CARD";
	data: string;
}

export interface Reply {
	"2xx": {
		success: true;
		token: string;
	};
	"4xx": {
		success: false;
		error: {
			code: string;
			message: string;
		};
	};
}

export default function loginRouter(): FastifyPluginAsync {
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
					required: ["type", "data"],
					properties: {
						type: {
							type: "string",
							enum: ["PASSWORD", "CARD"],
						},
						data: {
							type: "string",
						},
					},
				},
			},
			handler: async (request, reply) => {
				const type = request.body.type;
				switch (type) {
					case "PASSWORD":
						const passwordGrant = await GrantService.getGrantForPassword(
							request.body.data,
						);
						if (!passwordGrant) {
							throw ErrorUtility.unauthorizedError("Invalid password.");
						}
						const passwordToken = await GrantService.createToken(
							passwordGrant.id,
						);
						reply.code(200).send({
							success: true,
							token: passwordToken,
						});
						break;
					case "CARD":
						const cardGrant = await GrantService.getGrantForCard(
							request.body.data,
						);
						if (!cardGrant) {
							throw ErrorUtility.unauthorizedError("Invalid card.");
							return;
						}
						const cardToken = await GrantService.createToken(cardGrant.id);
						reply.code(200).send({
							success: true,
							token: cardToken,
						});
						break;
					default:
						throw ErrorUtility.unauthorizedError("Invalid login.");
						break;
				}
			},
		});
	};
}
