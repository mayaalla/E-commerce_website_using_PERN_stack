import { apiClient } from "@/lib/api-client";
import { LogoutResponse } from "../types";
import { AxiosError } from "axios";


export const logout = async (): Promise<LogoutResponse> => {  
//   const response = await api.post<LogoutResponse>("/auth/logout");
//   return response.data;

    try {
        const response = await apiClient.post<LogoutResponse>("/auth/logout");
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred during logout.";
                throw new Error(`Logout failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred during logout.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred during logout.");
        }
    }
};

// Status	Message
// 401	No token provided
// 401	Invalid or expired token
// 401	Token has been revoked
// 401	Admin not found
// 401	Unauthorized