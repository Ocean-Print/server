import type { PrinterDetailOutput } from "@/schemas/printer.schema";
import * as PrinterService from "@/services/printer.service";
import { printerNotFoundError } from "@/utilities/error.utility";
import type { FastifyPluginAsync } from "fastify";

export interface Params {
	id: number;
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

export default function getPrinterRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.route<{
			Params: Params;
			Reply: Reply;
		}>({
			method: "GET",
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
			},
			handler: async (request, reply) => {
				const printer = await PrinterService.getPrinter(request.params.id);
				if (!printer) throw printerNotFoundError(request.params.id);
				reply.code(200).send({
					success: true,
					printer,
				});
			},
		});
	};
}
