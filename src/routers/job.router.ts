import * as JobService from "../services/job.service";
import { type FastifyPluginAsync } from "fastify";

function parseSortParams(sort: string) {
	const sortParams = sort.split(",");
	return sortParams.map((param) => {
		const [field, direction] = param.split(":");
		return {
			[field]: direction,
		};
	});
}

export default function jobRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.route<{
			Querystring: {
				limit?: number;
				offset?: number;
				state?:
					| ("QUEUED" | "PRINTING" | "COMPLETED" | "FAILED")
					| ("QUEUED" | "PRINTING" | "COMPLETED" | "FAILED")[];
				userId?: number;
				projectId?: number;
				createdBefore?: string;
				createdAfter?: string;
				startedBefore?: string;
				startedAfter?: string;
				endedBefore?: string;
				endedAfter?: string;
				sort?: string;
			};
		}>({
			method: "GET",
			url: "/",
			schema: {
				querystring: {
					limit: { type: "integer" },
					offset: { type: "integer" },
					state: {
						anyOf: [
							{ type: "string" },
							{
								type: "array",
								items: {
									type: "string",
									enum: ["QUEUED", "PRINTING", "COMPLETED", "FAILED"],
								},
							},
						],
					},
					userId: { type: "integer" },
					projectId: { type: "integer" },
					createdBefore: { type: "string" },
					createdAfter: { type: "string" },
					startedBefore: { type: "string" },
					startedAfter: { type: "string" },
					endedBefore: { type: "string" },
					endedAfter: { type: "string" },
					sort: { type: "string" },
				},
			},
			handler: async (request, reply) => {
				const query = request.query;
				const sort = query.sort ? parseSortParams(query.sort) : undefined;

				const filter = {
					state: query.state,
					userId: query.userId,
					projectId: query.projectId,
					createdBefore: query.createdBefore
						? new Date(query.createdBefore)
						: undefined,
					createdAfter: query.createdAfter
						? new Date(query.createdAfter)
						: undefined,
					startedBefore: query.startedBefore
						? new Date(query.startedBefore)
						: undefined,
					startedAfter: query.startedAfter
						? new Date(query.startedAfter)
						: undefined,
					endedBefore: query.endedBefore
						? new Date(query.endedBefore)
						: undefined,
					endedAfter: query.endedAfter ? new Date(query.endedAfter) : undefined,
				};

				const jobs = await JobService.getJobs(
					{
						limit: query.limit,
						offset: query.offset,
					},
					filter,
					sort,
				);
				const count = await JobService.getJobsCount(filter);

				return {
					jobs,
					count,
				};
			},
		});
	};
}
