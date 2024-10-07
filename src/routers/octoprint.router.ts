import * as JobService from "@/services/job.service";
import * as PrinterService from "@/services/printer.service";
import * as errors from "@/utilities/error.utility";
import * as MaterialUtility from "@/utilities/material.utility";
import * as ProjectFileUtility from "@/utilities/projectFile.utility";
import multipartPlugin, { MultipartFile } from "@fastify/multipart";
import { type FastifyPluginAsync } from "fastify";
import fse from "fs-extra";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";

const UPLOADS_DIR = path.resolve(
	process.cwd(),
	process.env.DATA_UPLOADS_DIR ?? "/data/uploads",
);
const THUMBNAILS_DIR = path.resolve(
	process.cwd(),
	process.env.DATA_THUMBNAILS_DIR ?? "/data/thumbnails",
);

export default function oceanPrintRoute(): FastifyPluginAsync {
	return async function (fastify) {
		fastify.setErrorHandler((error, request, reply) => {
			console.error(error);

			if (error instanceof errors.OceanPrintError) {
				reply
					.status(error.statusCode ?? 400)
					.send(error.message ?? "An unknown error occurred");
			} else {
				reply
					.status(500)
					.send("An unknown error occurred. Please contact staff.");
			}
		});

		fastify.register(multipartPlugin, {
			limits: {
				files: 1,
				fileSize: 1_000_000_000, // 1GB
			},
		});

		fastify.get("/api/version", async (request, reply) => {
			return {
				api: "0.1",
				server: "1.10.0",
				text: `OctoPrint (Ocean Print) 1.10.0`,
			};
		});

		fastify.post<{
			Body: {
				file: MultipartFile;
			};
		}>("/api/files/local", async (request, reply) => {
			// Check if a file was provided
			const data = await request.file();
			if (!data) {
				throw errors.fileNotFoundError();
			}

			// Check if the file is too large
			if (data.file.truncated) {
				throw errors.fileTooLargeError();
			}

			// Save the file to a temporary directory under a random name
			const uuid = crypto.randomUUID();
			const tmpName = `${uuid}.3mf`;
			const tmpPath = path.resolve(os.tmpdir(), tmpName);
			// Ensure the directory exists
			await fse.ensureDir(path.dirname(tmpPath));
			// Write the file to the temporary
			const fileStream = fse.createWriteStream(tmpPath);
			await data.file.pipe(fileStream);
			await new Promise((resolve, reject) => {
				fileStream.on("finish", resolve);
				fileStream.on("error", reject);
			});

			// Parse the file name and metadata
			const projectName = data.filename.replace(/\.3mf$/i, "");
			const parsedName = ProjectFileUtility.parseName(projectName);
			const metadata = await ProjectFileUtility.getMetadata(tmpPath);

			// Ensure the material is valid
			const printerMaterials = await PrinterService.getAllMaterials();
			const isValidMaterials = printerMaterials.some((printerMaterial) =>
				MaterialUtility.compareMaterials(printerMaterial, metadata.materials),
			);
			if (!isValidMaterials) {
				throw errors.incompatibleMaterialsError();
			}

			// Save the file to the data directory
			const fileName = `${parsedName.description}-${uuid}.3mf`;
			const filePath = path.resolve(UPLOADS_DIR, fileName);
			// Ensure the directory exists
			await fse.ensureDir(path.dirname(filePath));
			// Move the file to the data directory
			await fse.move(tmpPath, filePath);

			// Convert the user role
			const userRole =
				parsedName.userRole === "PI"
					? "PI"
					: parsedName.userRole === "MPI"
						? "MPI"
						: parsedName.userRole === "STAFF"
							? "STAFF"
							: "DEFAULT";

			// Write the thumbnail to the data directory
			const thumbnailPath = path.resolve(
				THUMBNAILS_DIR,
				`${metadata.hash}.png`,
			);
			await fse.writeFile(thumbnailPath, metadata.thumbnail);

			// Create the project, user, and initial job
			await JobService.createJob({
				project: {
					create: {
						name: parsedName.description,
						user: {
							connectOrCreate: {
								where: {
									username: parsedName.user,
								},
								create: {
									username: parsedName.user,
									email: parsedName.user + "@gatech.edu",
									password: "",
									role: userRole,
									access: "NONE",
								},
							},
						},
						hash: metadata.hash,
						file: fileName,
						printerModel: metadata.printerModel,
						printTime: metadata.printTime,
						materials: metadata.materials,
					},
				},
			});
		});
	};
}
