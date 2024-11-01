import prisma from "../utilities/prisma.utility";
import type { Prisma } from "@prisma/client";

/**
 * Create a new user in the database. If the user already exists, do nothing.
 * @param newUser - The user to create.
 * @returns The created user.
 */
export function createUser(newUser: Prisma.UserCreateInput) {
	return prisma.user.upsert({
		where: { name: newUser.name },
		update: {},
		create: newUser,
	});
}

/**
 * Get a user by their name.
 * @param name - The name of the user.
 * @returns The user.
 */
export async function getUserByName(name: string) {
	return prisma.user.findUnique({
		where: { name },
	});
}
