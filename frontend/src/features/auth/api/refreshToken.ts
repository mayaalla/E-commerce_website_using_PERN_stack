import { apiClient } from "@/lib/api-client";
import { RefreshTokenResponse } from "../types";
import { AxiosError } from "axios";

export const refreshToken = async (): Promise<RefreshTokenResponse> => {
try{
    const response = await apiClient.post<RefreshTokenResponse>("/auth/refresh-token");
    return response.data;
}catch (error) {
    if (error instanceof AxiosError) {
        if (error.response) {
            // Handle the error response from the server
            const status = error.response.status;
            const message = error.response.data?.message || "An error occurred during token refresh.";
            throw new Error(`Token refresh failed with status ${status}: ${message}`);
        } else {
            // Handle network or other errors
            throw new Error("Network error occurred during token refresh.");
        }
    } else {
        // Handle unexpected errors
        throw new Error("An unexpected error occurred during token refresh.");
    }
}
}



// Status	Message
// 401	Refresh token not provided
// 401	Invalid or expired refresh token
// 401	Refresh token not found or already revoked
