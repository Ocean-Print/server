import clearPrinterRouter from "./clearPrinter.router";
import createPrinterRouter from "./createPrinter.router";
import deletePrinterRouter from "./deletePrinter.router";
import getPrinterRouter from "./getPrinter.router";
import getPrintersRouter from "./getPrinters.router";
import updatePrinterRouter from "./updatePrinter.router";
import type { FastifyPluginAsync } from "fastify";

export default function printerRouter(): FastifyPluginAsync {
	return async function (fastify) {
		// GET /api/printers
		fastify.register(getPrintersRouter());
		// GET /api/printers/:id
		fastify.register(getPrinterRouter());
		// POST /api/printers
		fastify.register(createPrinterRouter());
		// PUT /api/printers/:id
		fastify.register(updatePrinterRouter());
		// POST /api/printers/:id/_clear
		fastify.register(clearPrinterRouter());
		// DELETE /api/printers/:id
		fastify.register(deletePrinterRouter());
	};
}
