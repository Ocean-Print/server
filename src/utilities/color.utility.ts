/**
 * Convert a hex color to an RGB color.
 * @param hex - The hex color to convert.
 * @returns The RGB color.
 */
function hexToRgb(hex: string): RGB | null {
	// Remove the leading '#' if present
	hex = hex.replace(/^#/, "");

	// Handle 3-character shorthand hex code (e.g., #RGB)
	if (hex.length === 3) {
		hex = hex
			.split("")
			.map((char) => char + char)
			.join("");
	}

	// Ensure hex string is now 6 characters long
	if (hex.length !== 6) {
		return null;
	}

	// Parse the hex string to integer RGB values
	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);

	return { r, g, b };
}

/**
 * Force conversion of a hex color to an RGB color.
 * @param hex - The hex color to convert.
 */
export function forceHexToRgb(hex: string): RGB {
	return hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
}

/**
 * Convert an RGB color to an LAB color.
 * @param rgb - The RGB color to convert.
 * @returns The LAB color.
 */
export function rgbToLab(rgb: RGB): LAB {
	return xyzToLab(rgbToXyz(rgb));
}

/**
 * Convert an RGB color to an XYZ color.
 * @param rgb - The RGB color to convert.
 * @returns The XYZ color.
 */
function rgbToXyz(rgb: RGB): XYZ {
	// Normalize RGB values to the range [0, 1]
	let r = rgb.r / 255;
	let g = rgb.g / 255;
	let b = rgb.b / 255;

	// Apply gamma correction (linearization of RGB values)
	r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
	g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
	b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

	// Convert the linearized RGB values to XYZ using the transformation matrix
	// Reference white: D65 (Daylight)
	const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100;
	const y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) * 100;
	const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) * 100;

	return { x, y, z };
}

/**
 * Convert an XYZ color to an LAB color.
 * @param xyz - The XYZ color to convert.
 * @returns The LAB color.
 */
export function xyzToLab(xyz: XYZ): LAB {
	let x = xyz.x / 95.047;
	let y = xyz.y / 100.0;
	let z = xyz.z / 108.883;

	x = x > 0.008856 ? Math.pow(x, 1 / 3) : x * 7.787 + 16 / 116;
	y = y > 0.008856 ? Math.pow(y, 1 / 3) : y * 7.787 + 16 / 116;
	z = z > 0.008856 ? Math.pow(z, 1 / 3) : z * 7.787 + 16 / 116;

	return {
		l: Math.max(0, 116 * y - 16),
		a: 500 * (x - y),
		b: 200 * (y - z),
	};
}

/**
 * Get the difference of two LAB colors using the CIEDE2000 formula.
 * @param a - The first LAB color.
 * @param b - The second LAB color.
 * @returns The difference between the two colors.
 */
export function deltaE(a: LAB, b: LAB): number {
	const kL = 1;
	const kC = 1;
	const kH = 1;

	const c1 = Math.sqrt(a.a * a.a + a.b * a.b);
	const c2 = Math.sqrt(b.a * b.a + b.b * b.b);
	const cBar = (c1 + c2) / 2;

	const c7 = cBar * cBar * cBar * cBar * cBar;
	const g = 0.5 * (1 - Math.sqrt(c7 / (c7 + 6103515625))); // 25^7

	const aPrime1 = a.a * (1 + g);
	const aPrime2 = b.a * (1 + g);

	const cPrime1 = Math.sqrt(aPrime1 * aPrime1 + a.b * a.b);
	const cPrime2 = Math.sqrt(aPrime2 * aPrime2 + b.b * b.b);

	const hPrime1 = Math.atan2(a.b, aPrime1);
	const hPrime2 = Math.atan2(b.b, aPrime2);

	const deltaLPrime = b.l - a.l;
	const deltaCPrime = cPrime2 - cPrime1;

	let deltaHPrime: number;
	if (cPrime1 * cPrime2 === 0) {
		deltaHPrime = 0;
	} else {
		deltaHPrime = hPrime2 - hPrime1;
		if (deltaHPrime < -Math.PI) deltaHPrime += 2 * Math.PI;
		if (deltaHPrime > Math.PI) deltaHPrime -= 2 * Math.PI;
	}

	const deltaHPrimeAbs = Math.abs(deltaHPrime);
	const deltaLPrimeDivKLSL = deltaLPrime / (kL * 1);
	const deltaCPrimeDivKCSC = deltaCPrime / (kC * 1);
	const deltaHPrimeDivKHSH = deltaHPrimeAbs / (kH * 1);

	const deltaE = Math.sqrt(
		deltaLPrimeDivKLSL * deltaLPrimeDivKLSL +
			deltaCPrimeDivKCSC * deltaCPrimeDivKCSC +
			deltaHPrimeDivKHSH * deltaHPrimeDivKHSH +
			deltaCPrimeDivKCSC * deltaHPrimeDivKHSH,
	);

	return deltaE;
}

type RGB = {
	r: number;
	g: number;
	b: number;
};

type XYZ = {
	x: number;
	y: number;
	z: number;
};

type LAB = {
	l: number;
	a: number;
	b: number;
};
