import prisma from "../utilities/prisma.utility";
import type { Prisma } from "@prisma/client";

/**
 * Create a new user in the database. If the user already exists, do nothing.
 * @param newUser - The user to create.
 * @returns The created user.
 */
export function createUser(newUser: Prisma.UserCreateInput) {
	return prisma.user.upsert({
		where: { username: newUser.username },
		update: {},
		create: newUser,
	});
}

/**
 * Get a user by their username.
 * @param username - The username of the user.
 * @returns The user.
 */
export async function getUserByName(username: string) {
	return prisma.user.findUnique({
		where: { username },
	});
}
