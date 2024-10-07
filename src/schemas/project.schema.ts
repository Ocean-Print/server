import type { Prisma } from "@prisma/client";

export type ProjectMaterial = {
	id: number;
	name: string;
	type: string;
	usage: number;
	color: string;
};
