import { apiClient } from "@/lib/api-client";
import { MeResponse } from "../types";

/**
 * Fetch the current admin profile.
 *
 * We intentionally do NOT wrap this in a try/catch so that the
 * api-client response interceptor can intercept any 401, silently
 * refresh the access token via the HttpOnly cookie, and retry the
 * request — which is what restores the session on a hard page reload.
 */
export const me = async (): Promise<MeResponse> => {
  const response = await apiClient.get<MeResponse>("/auth/me");
  return response.data;
};


//     Status	Message
// 401	No token provided
// 401	Invalid or expired token
// 401	Token has been revoked
// 401	Admin not found
// 401	Unauthorized
