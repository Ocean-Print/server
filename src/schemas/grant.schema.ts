import type { Prisma } from "@prisma/client";

export const grantPreviewSelect: Prisma.GrantSelect = {
	id: true,
	type: true,
	name: true,
	createdAt: true,
	updatedAt: true,
};
export type GrantPreview = Prisma.GrantGetPayload<{
	select: typeof grantPreviewSelect;
}>;

export const grantDetailSelect: Prisma.GrantSelect = {
	id: true,
	type: true,
	name: true,
	data: true,
	createdAt: true,
	updatedAt: true,
};
export type GrantDetail = Prisma.GrantGetPayload<{
	select: typeof grantDetailSelect;
}>;
