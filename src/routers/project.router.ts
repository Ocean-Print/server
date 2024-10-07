import * as ProjectService from "../services/project.service";
import { type FastifyPluginAsync } from "fastify";
import fse from "fs-extra";
import path from "node:path";

const THUMBNAILS_DIR = path.resolve(
	process.cwd(),
	process.env.DATA_THUMBNAILS_DIR ?? "/thumbnails",
);

export default function projectRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.route<{
			Querystring: {
				limit?: number;
				offset?: number;
				userId?: number;
			};
		}>({
			method: "GET",
			url: "/",
			schema: {
				querystring: {
					limit: { type: "integer" },
					offset: { type: "integer" },
					userId: { type: "integer" },
				},
			},
			handler: async (request, reply) => {
				const projects = await ProjectService.getProjects(
					{
						limit: request.query.limit,
						offset: request.query.offset,
					},
					{
						userId: request.query.userId,
					},
				);

				const count = await ProjectService.getProjectsCount({
					userId: request.query.userId,
				});

				return {
					projects,
					count,
				};
			},
		});

		fastify.route<{
			Params: {
				projectId: number;
			};
		}>({
			method: "GET",
			url: "/:projectId/thumbnail.png",
			schema: {
				params: {
					projectId: { type: "integer" },
				},
			},
			handler: async (request, reply) => {
				const project = await ProjectService.getProject(
					request.params.projectId,
				);
				if (!project) {
					reply.status(404);
					return;
				}

				const hash = project.hash;
				await fse
					.readFile(path.join(THUMBNAILS_DIR, `${hash}.png`))
					.then((data) => {
						reply.type("image/png");
						reply.send(data);
					})
					.catch(() => {
						reply.status(404);
					});
			},
		});
	};
}
