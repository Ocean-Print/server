import * as ErrorUtility from "@/utilities/error.utility";
import type { preHandlerHookHandler } from "fastify";

/**
 * Require permissions to be applied to the request.
 */
export const requirePermissions =
	(required: string[]): preHandlerHookHandler =>
	(request, reply) => {
		if (!request.opPermissions || request.opPermissions.length === 0) {
			throw ErrorUtility.unauthorizedError();
		}

		for (const permission of required) {
			if (!request.opPermissions.includes(permission)) {
				throw ErrorUtility.forbiddenError();
			}
		}
	};
