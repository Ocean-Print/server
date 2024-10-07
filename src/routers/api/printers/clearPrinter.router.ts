import * as PrinterService from "@/services/printer.service";
import type { FastifyPluginAsync } from "fastify";

export interface Params {
	id: number;
}

export interface Body {
	isSuccess: boolean;
}

export interface Reply {
	"2xx": {
		success: true;
	};
	"4xx": {
		success: false;
		error: {
			code: string;
			message: string;
		};
	};
}

export default function updatePrinterRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.route<{
			Params: Params;
			Body: Body;
		}>({
			method: "POST",
			url: "/:id/_clear",
			schema: {
				params: {
					type: "object",
					properties: {
						id: {
							type: "number",
						},
					},
				},
				body: {
					type: "object",
					properties: {
						isSuccess: {
							type: "boolean",
						},
					},
					required: ["isSuccess"],
				},
			},
			handler: async (request, reply) => {
				await PrinterService.setCleared(
					request.params.id,
					request.body.isSuccess,
				);
				reply.code(200).send({
					success: true,
				});
			},
		});
	};
}
