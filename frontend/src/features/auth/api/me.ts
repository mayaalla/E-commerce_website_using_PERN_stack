import { apiClient } from "@/lib/api-client";
import { MeResponse } from "../types";
import { AxiosError } from "axios";


export const me = async (): Promise<MeResponse> => {
    try {
        const response = await apiClient.get<MeResponse>("/auth/me");
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching user data.";
                throw new Error(`Fetching user data failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while fetching user data.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while fetching user data.");
        }
    }
};


//     Status	Message
// 401	No token provided
// 401	Invalid or expired token
// 401	Token has been revoked
// 401	Admin not found
// 401	Unauthorized
