import { type FastifyPluginAsync } from "fastify";
import fse from "fs-extra";
import path from "node:path";

const THUMBNAILS_DIR = path.resolve(
	process.cwd(),
	process.env.DATA_THUMBNAILS_DIR ?? "/thumbnails",
);

export default function assetRouter(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.route<{
			Params: { hash: string };
		}>({
			method: "GET",
			url: "/thumbnails/:hash.png",
			schema: {
				params: {
					hash: { type: "string" },
				},
			},
			handler: async (request, reply) => {
				const path = `${THUMBNAILS_DIR}/${request.params.hash}.png`;
				if (!fse.existsSync(path)) {
					reply.status(404);
					throw new Error("Thumbnail not found");
				}
				const file = await fse.readFile(path);
				reply.type("image/png").send(file);
			},
		});
	};
}
