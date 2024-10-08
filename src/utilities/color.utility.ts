/**
 * Convert a hex color to an HSV color.
 * @param hex - The hex color to convert.
 * @returns The HSV color.
 */
export function hexToHsv(hex: string): { h: number; s: number; v: number } {
	// Remove the '#' if present
	hex = hex.replace(/^#/, "");

	// Parse r, g, b values from the hex string
	let r = 0,
		g = 0,
		b = 0;
	if (hex.length === 3) {
		// Short hex format (#RGB)
		r = parseInt(hex[0] + hex[0], 16);
		g = parseInt(hex[1] + hex[1], 16);
		b = parseInt(hex[2] + hex[2], 16);
	} else if (hex.length === 6) {
		// Full hex format (#RRGGBB)
		r = parseInt(hex.substring(0, 2), 16);
		g = parseInt(hex.substring(2, 4), 16);
		b = parseInt(hex.substring(4, 6), 16);
	}

	// Normalize r, g, b values to 0 - 1 range
	const rNorm = r / 255;
	const gNorm = g / 255;
	const bNorm = b / 255;

	const max = Math.max(rNorm, gNorm, bNorm);
	const min = Math.min(rNorm, gNorm, bNorm);
	const delta = max - min;

	// Calculate Hue
	let h = 0;
	if (delta !== 0) {
		if (max === rNorm) {
			h = ((gNorm - bNorm) / delta) % 6;
		} else if (max === gNorm) {
			h = (bNorm - rNorm) / delta + 2;
		} else {
			h = (rNorm - gNorm) / delta + 4;
		}
	}
	h = Math.round(h * 60);
	if (h < 0) h += 360;

	// Calculate Saturation
	const s = max === 0 ? 0 : (delta / max) * 100;

	// Calculate Value
	const v = max * 100;

	return {
		h: h,
		s: parseFloat(s.toFixed(2)), // Round to two decimal places
		v: parseFloat(v.toFixed(2)), // Round to two decimal places
	};
}

/**
 * Compare the hues of two hex colors.
 * @param a - The first hex color.
 * @param b - The second hex color.
 * @returns The difference in hues between the two colors, in degrees (0-180).
 */
export function compareHexHues(a: string, b: string) {
	// Convert the hex colors to HSV
	const hsvA = hexToHsv(a);
	const hsvB = hexToHsv(b);

	// Get the difference in hues, accounting for the circular nature of the hue scale
	const hueDiff = Math.abs(hsvA.h - hsvB.h);
	return hueDiff > 180 ? 360 - hueDiff : hueDiff;
}
