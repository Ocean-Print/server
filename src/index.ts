import server from "./server";
import * as PrinterService from "./services/printer.service";

const main = async () => {
	// Reset printer states and queue jobs
	console.log("[OP][BOOT] Initializing printers");
	await PrinterService.initializePrinters();

	try {
		console.log("[OP][BOOT] Starting HTTP server");
		await server.listen({
			port: parseInt(process.env.SERVER_PORT ?? "80"),
			host: "0.0.0.0",
		});
	} catch (err) {
		server.log.error(err);
		process.exit(1);
	}
};

main();
