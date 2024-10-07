import type { PrinterPreviewOuput } from "@/schemas/printer.schema";
import * as PrinterService from "@/services/printer.service";
import type { FastifyPluginAsync } from "fastify";

export interface Reply {
	"2xx": {
		success: true;
		printers: PrinterPreviewOuput[];
	};
	"4xx": {
		success: false;
		error: {
			code: string;
			message: string;
		};
	};
}

export default function getPrintersRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.route<{
			Reply: Reply;
		}>({
			method: "GET",
			url: "/",
			handler: async (request, reply) => {
				const printers = await PrinterService.getPrinters();

				reply.code(200).send({
					success: true,
					printers,
				});
			},
		});
	};
}
