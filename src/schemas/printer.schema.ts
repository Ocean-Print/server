import type { Prisma } from "@prisma/client";

export const printerPreviewArgs = {
	select: {
		id: true,
		name: true,
		systemStatus: true,
		printerStatus: true,
		materials: true,
		camera: true,
		currentJob: {
			select: {
				id: true,
				project: {
					select: {
						id: true,
						name: true,
						hash: true,
					},
				},
			},
		},
	},
};
export type PrinterPreviewOuput = Prisma.PrinterGetPayload<
	typeof printerPreviewArgs
>;

export const printerDetailSelect: Partial<Prisma.PrinterSelect> = {
	id: true,
	name: true,
	systemStatus: true,
	printerStatus: true,
	materials: true,
	options: true,
	camera: true,
	currentJob: {
		select: {
			id: true,
			createdAt: true,
			startedAt: true,
			endedAt: true,
			project: {
				select: {
					id: true,
					name: true,
					hash: true,
					printTime: true,
					printerModel: true,
				},
			},
		},
	},
};
export type PrinterDetailOutput = Prisma.PrinterGetPayload<{
	select: typeof printerDetailSelect;
}>;

export type SystemStatus = {
	state: "UNKNOWN" | "ERROR" | "GOOD" | "UPDATING" | "DISPATCHING";
	errors: Array<{ name: string; message: string }>;
	progress: number;
	isClear: boolean;
};
export type PrinterStatus = {
	state: "UNKNOWN" | "IDLE" | "PRINTING" | "PAUSED" | "FINISHED";
	errors: Array<{ name: string; message: string }>;
	currentJobName: string;
	progress: number;
	timeRemaining: number;
};
export type PrinterOptions = {
	host: string;
	accessCode: string;
	serial: string;
};
export type PrinterMaterial = {
	type: string;
	color: string;
};
