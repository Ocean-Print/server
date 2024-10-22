import type { Prisma } from "@prisma/client";

export const jobPreviewSelect: Prisma.JobSelect = {
	id: true,
	state: true,
	priority: true,
	createdAt: true,
	startedAt: true,
	endedAt: true,
	project: {
		select: {
			id: true,
			name: true,
			printTime: true,
			hash: true,
			materials: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
		},
	},
	printer: {
		select: {
			id: true,
			name: true,
		},
	},
};
export type JobPreview = Prisma.JobGetPayload<{
	select: typeof jobPreviewSelect;
}>;

export const jobDetailSelect: Prisma.JobSelect = {
	id: true,
	state: true,
	priority: true,
	createdAt: true,
	startedAt: true,
	endedAt: true,
	project: {
		select: {
			id: true,
			name: true,
			printTime: true,
			materials: true,
			printerModel: true,
			hash: true,
			file: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
		},
	},
	printer: {
		select: {
			id: true,
			name: true,
		},
	},
};
export type JobDetail = Prisma.JobGetPayload<{
	select: typeof jobDetailSelect;
}>;
