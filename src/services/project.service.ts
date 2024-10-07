import prisma from "../utilities/prisma.utility";
import type { Prisma } from "@prisma/client";

/**
 * Create a new project in the database.
 * @param projectData - The project to create.
 * @returns The created project.
 */
export function createProject(projectData: Prisma.ProjectCreateInput) {
	return prisma.project.create({ data: projectData });
}

/**
 * Get projects from the database.
 * @param pagination - The pagination options.
 * @param filter - The filter options.
 * @returns All projects.
 */
export async function getProjects(
	pagination: {
		limit?: number;
		offset?: number;
	},
	filter: {
		userId?: number;
		createdBefore?: Date;
		createdAfter?: Date;
	},
) {
	return prisma.project.findMany({
		take: pagination.limit,
		skip: pagination.offset,
		where: {
			...(filter.userId ? { userId: filter.userId } : {}),
			...(filter.createdBefore && filter.createdAfter
				? {
						createdAt: {
							lte: filter.createdBefore,
							gte: filter.createdAfter,
						},
					}
				: {}),
		},
	});
}

/**
 * Get the number of projects in the database.
 * @param filter - The filter options.
 * @returns The number of projects.
 */
export async function getProjectsCount(filter: { userId?: number }) {
	return prisma.project.count({
		where: {
			...(filter.userId ? { userId: filter.userId } : {}),
		},
	});
}

export async function getProject(projectId: number) {
	return prisma.project.findUnique({
		where: {
			id: projectId,
		},
		include: {
			user: true,
			jobs: true,
		},
	});
}
