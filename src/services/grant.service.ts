import prisma from "../utilities/prisma.utility";
import { grantDetailSelect, grantPreviewSelect } from "@/schemas/grant.schema";
import * as ErrorUtility from "@/utilities/error.utility";
import * as JoseUtility from "@/utilities/jose.utility";
import type { Prisma, GrantType } from "@prisma/client";
import crypto from "crypto";

/**
 * Get grants from the database.
 * @param pagination - The pagination options.
 * @param filter - The filter options.
 * @returns All grants.
 */
export function getGrants(
	pagination: {
		limit?: number;
		offset?: number;
	},
	filter: {
		type?: GrantType | GrantType[];
	},
	sort:
		| Prisma.GrantOrderByWithRelationInput
		| Prisma.GrantOrderByWithRelationInput[] = { createdAt: "desc" },
) {
	return prisma.grant.findMany({
		take: pagination.limit,
		skip: pagination.offset,
		where: {
			...(Array.isArray(filter.type) ? { state: { in: filter.type } } : {}),
			...(filter.type && !Array.isArray(filter.type)
				? { type: filter.type }
				: {}),
		},
		select: grantPreviewSelect,
		orderBy: sort,
	});
}

/**
 * Get the number of grants in the database.
 * @param filter - The filter options.
 */
export function getGrantsCount(filter: {
	type?: GrantType | GrantType[];
	name?: string;
}) {
	return prisma.grant.count({
		where: {
			...(Array.isArray(filter.type) ? { state: { in: filter.type } } : {}),
			...(filter.type && !Array.isArray(filter.type)
				? { state: filter.type }
				: {}),
			...(filter.name ? { name: filter.name } : {}),
		},
	});
}

/**
 * Get all grants applied to an auth context.
 * @param authContext - The auth context to get grants for.
 */
export async function getAppliedPermissions(context: {
	ip?: string;
	token?: string;
}) {
	let tokenGrantId = null as number | null;
	if (context.token) {
		try {
			let tokenData = await JoseUtility.decodeToken(context.token);
			tokenGrantId = tokenData.payload.grantId as number;
		} catch (error) {
			throw ErrorUtility.invalidTokenError();
		}
	}

	let data = await prisma.grant.findMany({
		where: {
			OR: [
				context.ip
					? {
							type: "IP",
							data: context.ip,
						}
					: {},
				tokenGrantId
					? {
							id: tokenGrantId,
						}
					: {},
			],
		},
		select: {
			permissions: true,
		},
	});

	return data.flatMap((grant) => grant.permissions);
}

/**
 * Get a grant.
 * @param grantId - The ID of the grant to get.
 * @returns The grant.
 */
export function getGrant(grantId: number) {
	return prisma.grant.findUnique({
		where: { id: grantId },
		select: grantDetailSelect,
	});
}

/**
 * Get the grant for a given card.
 * @param card - The card to get the grant for.
 * @returns The grant.
 */
export function getGrantForCard(card: string) {
	let cardHash = crypto.createHash("sha256").update(card).digest("hex");
	return prisma.grant.findFirst({
		where: {
			type: "CARD",
			data: cardHash,
		},
		select: grantDetailSelect,
	});
}

/**
 * Get the grant for a given password.
 * @param password - The password to get the grant for.
 * @returns The grant.
 */
export function getGrantForPassword(password: string) {
	let passwordHash = crypto.createHash("sha256").update(password).digest("hex");
	return prisma.grant.findFirst({
		where: {
			type: "PASSWORD",
			data: passwordHash,
		},
		select: grantDetailSelect,
	});
}

/**
 * Create a new grant in the database.
 * @param newGrant - The grant to create.
 * @returns The created grant.
 */
export function createGrant(newGrant: Prisma.GrantCreateInput) {
	if (newGrant.type === "CARD" || newGrant.type === "PASSWORD") {
		newGrant.data = crypto
			.createHash("sha256")
			.update(newGrant.data)
			.digest("hex");
	}
	return prisma.grant.create({ data: newGrant, select: grantDetailSelect });
}

/**
 * Update a grant.
 * @param grantId - The ID of the grant to update.
 * @param updatedJob - The updated grant.
 * @returns The updated grant.
 */
export function updateGrant(
	grantId: number,
	updatedGrant: Prisma.GrantUpdateInput,
) {
	return prisma.grant.update({
		where: { id: grantId },
		data: updatedGrant,
		select: grantDetailSelect,
	});
}

/**
 * Delete a grant.
 * @param grantId - The ID of the grant to delete.
 * @returns The deleted grant.
 */
export function deleteGrant(grantId: number) {
	return prisma.grant.delete({
		where: { id: grantId },
		select: grantDetailSelect,
	});
}

/**
 * Create a token for a grant.
 * @param grantId - The ID of the grant to create a token for.
 * @returns The token.
 */
export function createToken(grantId: number) {
	return JoseUtility.signToken({ grantId });
}
