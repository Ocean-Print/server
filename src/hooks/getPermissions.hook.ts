import * as GrantService from "@/services/grant.service";
import type { preHandlerHookHandler } from "fastify";

// Extend the FastifyRequest interface to include the grants.
declare module "fastify" {
	interface FastifyRequest {
		opPermissions: string[];
	}
}

/**
 * Get the grants applied to the request.
 * The resulting grants are stored in the request object as `grants`.
 */
export const getPermissionsHook: preHandlerHookHandler = async (
	request,
	reply,
) => {
	const permissions = await GrantService.getAppliedPermissions({
		ip: request.opIp,
		token: request.opToken,
	});
	request.opPermissions = permissions;
};
