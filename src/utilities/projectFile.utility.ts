import type { ProjectMaterial } from "@/schemas/project.schema";
import XML from "fast-xml-parser";
import StreamZip from "node-stream-zip";

/**
 * Printer model IDs and their corresponding names.
 */
const PRINTER_MODELS = {
	"BL-P001": "Bambu Lab X1 Carbon",
	"BL-P002": "Bambu Lab X1",
	C11: "Bambu Lab P1P",
	C12: "Bambu Lab P1S",
	C13: "Bambu Lab X1E",
	N1: "Bambu Lab A1 mini",
	N2S: "Bambu Lab A1",
	Default: "Unknown",
};

/**
 * Regular expression to parse the name of a print.
 */
const PRINT_NAME_REGEX = /^(?:((?:m?pi)|(?:staff))_)?([a-z]+\d+)_(.+)$/i;

/**
 * Parse the name of a print into its components.
 * @param name - The name of the print.
 * @returns The parsed print name.
 * @example parseName("mpi_gburdell1_test")
 * // { userRole: "MPI", user: "gburdell1", description: "test" }
 * @example parseName("gburdell23_file_name")
 * // { userRole: "DEFAULT", user: "gburdell23", description: "file_name" }
 */
export function parseName(name: string) {
	let match = PRINT_NAME_REGEX.exec(name);
	if (match === null) {
		throw new Error(`Invalid print name. Use the format "gtname_desc".`);
	}

	let userRole = match[1]?.toUpperCase() ?? null;
	let user = match[2].toLowerCase();
	let desc = match[3];

	return {
		userRole: (userRole ?? "DEFAULT") as "DEFAULT" | "STAFF" | "MPI" | "PI",
		user,
		description: desc,
	};
}

/**
 * Get the metadata of a 3MF project file.
 * @param path - The path to the project file.
 * @returns The metadata of the project.
 */
export async function getMetadata(path: string) {
	const output = {
		hash: "",
		printTime: 0,
		printerModel: "",
		materials: [] as ProjectMaterial[],
		thumbnail: Buffer.from(""),
	};

	const zip = new StreamZip.async({
		file: path,
		storeEntries: true,
	});

	const sliceInfoData = await zip.entryData("Metadata/slice_info.config");

	const parser = new XML.XMLParser({
		ignoreAttributes: false,
		isArray: (tag) => ["metadata", "filament"].includes(tag),
		attributeNamePrefix: "$",
	});
	const sliceInfo = parser.parse(sliceInfoData.toString());

	if (!sliceInfo.config?.plate?.metadata)
		throw new Error("Metadata not found in slice_info.config");
	if (!sliceInfo.config?.plate?.filament)
		throw new Error("Filament not found in slice_info.config");

	// Parse metadata
	const metadataArray = sliceInfo.config.plate.metadata;
	const metadataObject = Object.fromEntries(
		metadataArray.map((item: any) => [item["$key"], item["$value"]]),
	);

	output.printTime = parseInt(metadataObject["prediction"]);
	output.printerModel =
		(PRINTER_MODELS as any)[metadataObject["printer_model_id"]] ??
		PRINTER_MODELS["Default"];

	// Parse materials
	const filamentArray = sliceInfo.config.plate.filament as any[];
	const materialArray = filamentArray.map((item) => ({
		id: parseInt(item["$id"]),
		name: item["$id"] as string,
		type: item["$type"] as string,
		usage: parseFloat(item["$used_g"]),
		color: item["$color"] as string,
	})) as ProjectMaterial[];

	// Remove all elements at the end of the materials array that have a usage of zero.
	// This helps prevent problems when users have unused materials in their project
	// and think it is a bug when their project is not accepted by the system.
	for (let i = materialArray.length - 1; i >= 0; i--) {
		if (materialArray[i].usage === 0) {
			materialArray.pop();
		} else {
			break;
		}
	}

	output.materials = materialArray;

	// Parse project settings
	const settingsData = await zip.entryData("Metadata/project_settings.config");
	const settings = JSON.parse(settingsData.toString());

	// Update material names, if available
	output.materials = output.materials.map((item) => ({
		...item,
		name: settings["filament_settings_id"]?.[item.id - 1] ?? item.name,
	}));

	// Get the hash
	const hashData = await zip.entryData("Metadata/plate_1.gcode.md5");
	output.hash = hashData.toString();

	// Get the thumbnail
	const thumbnailData = await zip.entryData("Metadata/plate_1.png");
	output.thumbnail = thumbnailData;

	zip.close();

	return output;
}
