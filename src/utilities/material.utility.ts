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
	if (a.color === b.color) return 1;

	// Parse the hex colors and return a score based on the difference
	const colorA = a.color.replace("#", "");
	const colorB = b.color.replace("#", "");
	const rA = parseInt(colorA.substring(0, 2), 16);
	const gA = parseInt(colorA.substring(2, 4), 16);
	const bA = parseInt(colorA.substring(4, 6), 16);
	const rB = parseInt(colorB.substring(0, 2), 16);
	const gB = parseInt(colorB.substring(2, 4), 16);
	const bB = parseInt(colorB.substring(4, 6), 16);
	const diff = Math.sqrt(
		Math.pow(rA - rB, 2) + Math.pow(gA - gB, 2) + Math.pow(bA - bB, 2),
	);

	// Return true if the colors are similar enough
	return 1 - diff / 441.6729559300637 >= 0.5;
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
		if (!compareMaterial(a[i], b[i], /colored/i.test(b[i].name ?? "")))
			return false;
	}

	return true;
}
