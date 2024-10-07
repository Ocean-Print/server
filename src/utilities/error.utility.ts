export class OceanPrintError extends Error {
	statusCode: number;
	isOceanPrintError = true;

	constructor(name: string, message: string, statusCode = 500) {
		super(message);
		this.name = name;
		this.statusCode = statusCode;
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
		};
	}
}

export class SystemError extends Error {
	isSystemError = true;

	constructor(name: string, message: string) {
		super(message);
		this.name = name;
	}

	toJson() {
		return {
			name: this.name,
			message: this.message,
		};
	}
}

/**
 * Printer not found error.
 * @param printerId - The id of the printer.
 */
export function printerNotFoundError(printerId: number) {
	return new OceanPrintError(
		"PrinterNotFound",
		`Printer with id ${printerId} not found`,
		404,
	);
}

/**
 * Printer not idle error.
 */
export function printerNotIdleError() {
	return new OceanPrintError(
		"PrinterNotIdle",
		"Printer is not in an idle state",
		400,
	);
}

export function printerOfflineError() {
	return new SystemError(
		"PrinterOffline",
		"Connection could not be established to printer",
	);
}

/**
 * Job not found error.
 * @param jobId - The id of the job.
 */
export function jobNotFoundError(jobId: number) {
	return new OceanPrintError(
		"JobNotFound",
		`Job with id ${jobId} not found`,
		404,
	);
}

/**
 * User not found error.
 * @param userId - The id of the user.
 */
export function userNotFoundError(userId: number) {
	return new OceanPrintError(
		"UserNotFound",
		`User with id ${userId} not found`,
		404,
	);
}

/**
 * Project not found error.
 * @param projectId - The id of the project.
 */
export function projectNotFoundError(projectId: number) {
	return new OceanPrintError(
		"ProjectNotFound",
		`Project with id ${projectId} not found`,
		404,
	);
}

/**
 * File not found error.
 */
export function fileNotFoundError() {
	return new OceanPrintError(
		"FileNotFound",
		"No file upload was provided",
		400,
	);
}

/**
 * File too large error.
 */
export function fileTooLargeError() {
	return new OceanPrintError("FileTooLarge", "File provided is too large", 400);
}

/**
 * Incompatible materials error.
 */
export function incompatibleMaterialsError() {
	return new OceanPrintError(
		"IncompatibleMaterials",
		"Selected materials are not compatible with any printer",
		400,
	);
}
