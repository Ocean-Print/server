import crypto from "crypto";
import * as jose from "jose";

const instanceId = crypto.randomBytes(16).toString("hex");
const key = crypto.randomBytes(64);

export function signToken(payload: Record<string, unknown>) {
	return new jose.SignJWT(payload)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setIssuer(`ocean_print:${instanceId}`)
		.setExpirationTime("300s")
		.sign(key);
}

export function decodeToken(token: string) {
	return jose.jwtVerify(token, key, {
		issuer: `ocean_print:${instanceId}`,
		maxTokenAge: "300s",
	});
}
