import type {
	PrinterDetailOutput,
	PrinterOptions,
	PrinterMaterial,
} from "@/schemas/printer.schema";
import * as PrinterService from "@/services/printer.service";
import type { FastifyPluginAsync } from "fastify";

export interface Body {
	name: string;
	type: string;
	materials: PrinterMaterial[];
	options: PrinterOptions;
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

export default function createPrinterRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.route<{
			Body: Body;
		}>({
			method: "POST",
			url: "/",
			schema: {
				body: {
					type: "object",
					properties: {
						name: {
							type: "string",
						},
						type: {
							type: "string",
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
					required: ["name", "type", "materials", "options"],
				},
			},
			handler: async (request, reply) => {
				const printer = await PrinterService.createPrinter(request.body);
				reply.code(200).send({
					success: true,
					printer,
				});
			},
		});
	};
}
