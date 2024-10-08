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
