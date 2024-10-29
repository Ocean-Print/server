import * as ColorUtility from "./color.utility";

/**
 * Determine if two materials are compatible.
 * @param a - The first material.
 * @param b - The second material.
 * @param matchColor - Whether the color should be considered.
 * @returns Whether the materials are compatible.
 */
export function compareMaterial(
	a: { type: string; color: string },
	b: { type: string; color: string },
	matchColor: boolean,
) {
	// If the types are not the same, they are definitely incompatible
	if (a.type !== b.type) return false;
	// If we don't care about color, they are compatible
	if (!matchColor) return true;

	// If the colors are the same, they are compatible
	if (a.color === b.color) return true;

	// If the colors are within a certain deltaE, they are compatible
	const aRgb = ColorUtility.forceHexToRgb(a.color);
	const bRgb = ColorUtility.forceHexToRgb(b.color);
	const aLab = ColorUtility.rgbToLab(aRgb);
	const bLab = ColorUtility.rgbToLab(bRgb);
	const deltaE = ColorUtility.deltaE(aLab, bLab);
	return deltaE <= 10; // Arbitrary threshold, 10 is a good starting point
}

/**
 * Compare two lists of materials. a must have at least as many materials as b.
 * @param a - Primary list of materials (printer).
 * @param b - Secondary list of materials (job). The name property is optional, but will be used to determine if the color should be considered.
 * @returns Whether the materials are compatible.
 */
export function compareMaterials(
	a: { type: string; color: string }[],
	b: { type: string; color: string; name?: string }[],
) {
	// If a has fewer materials than b, they are incompatible
	if (a.length < b.length) return false;

	// Compare each material in b to the corresponding material in a
	for (let i = 0; i < b.length; i++) {
		if (!compareMaterial(a[i], b[i], /color/i.test(b[i].name ?? "")))
			return false;
	}

	return true;
}

/**
 * Compare a list of materials to a list of lists of materials.
 * @param a - Primary list of materials (printers).
 * @param b - Secondary list of lists of materials (job). The name property is optional, but will be used to determine if the color should be considered.
 */
export function compareMaterialsList(
	a: { type: string; color: string }[][],
	b: { type: string; color: string; name?: string }[],
) {
	return a.some((materials) => compareMaterials(materials, b));
}

/**
 * Round the material to the closest existing material.
 * The material type must be identical, but the color is rounded to the closest existing color.
 * Null is returned if no existing materials are found.
 * @param material - The material to round.
 * @param materials - The list of existing materials.
 */
export function roundMaterial(
	material: {
		id: number;
		type: string;
		color: string;
		name: string;
		usage: number;
	},
	materials: { type: string; color: string }[],
) {
	// If the name does not contain "color", we don't care about the color
	if (!/color/i.test(material.name)) {
		const existing = materials.find((m) => m.type === material.type);
		if (existing) {
			return material;
		}
		return null;
	}

	const type = material.type;
	const color = ColorUtility.forceHexToRgb(material.color);
	const lab = ColorUtility.rgbToLab(color);
	let closest: {
		id: number;
		type: string;
		color: string;
		name: string;
		usage: number;
	} | null = null;
	let closestDeltaE = Infinity;

	for (const existing of materials) {
		if (existing.type !== type) continue;

		const existingColor = ColorUtility.forceHexToRgb(existing.color);
		const existingLab = ColorUtility.rgbToLab(existingColor);
		const deltaE = ColorUtility.deltaE(lab, existingLab);

		if (deltaE < closestDeltaE) {
			closest = {
				id: material.id,
				type: existing.type,
				color: existing.color,
				name: material.name,
				usage: material.usage,
			};
			closestDeltaE = deltaE;
		}
	}

	return closest;
}

/**
 * Round the materials to the closest existing materials.
 * @param materials - The materials to round.
 * @param existing - The list of existing materials.
 * @returns The rounded materials.
 */
export function roundMaterials(
	materials: {
		id: number;
		type: string;
		color: string;
		name: string;
		usage: number;
	}[],
	existing: { type: string; color: string }[],
) {
	return materials.map((material) => roundMaterial(material, existing));
}
