import type {
	PrinterDetailOutput,
	PrinterMaterial,
	PrinterOptions,
} from "@/schemas/printer.schema";
import * as PrinterService from "@/services/printer.service";
import type { FastifyPluginAsync } from "fastify";

export interface Params {
	id: number;
}

export interface Body {
	name?: string;
	type?: string;
	notes?: string;
	isEnabled?: boolean;
	materials?: PrinterMaterial[];
	options?: PrinterOptions;
}

export interface Reply {
	"2xx": {
		success: true;
		printer: PrinterDetailOutput;
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
			Body: Body;
			Params: Params;
		}>({
			method: "PUT",
			url: "/:id",
			schema: {
				params: {
					type: "object",
					properties: {
						id: {
							type: "number",
						},
					},
					required: ["id"],
				},
				body: {
					type: "object",
					properties: {
						name: {
							type: "string",
						},
						type: {
							type: "string",
						},
						notes: {
							type: "string",
						},
						isEnabled: {
							type: "boolean",
						},
						materials: {
							type: "array",
							items: {
								type: "object",
								properties: {
									type: {
										type: "string",
									},
									color: {
										type: "string",
									},
								},
								required: ["type", "color"],
							},
						},
						options: {
							type: "object",
							properties: {
								host: {
									type: "string",
								},
								serial: {
									type: "string",
								},
								accessCode: {
									type: "string",
								},
							},
							required: ["host", "serial", "accessCode"],
						},
					},
				},
			},
			handler: async (request, reply) => {
				const printer = await PrinterService.updatePrinter(
					request.params.id,
					request.body,
				);
				reply.code(200).send({
					success: true,
					printer,
				});
			},
		});
	};
}
