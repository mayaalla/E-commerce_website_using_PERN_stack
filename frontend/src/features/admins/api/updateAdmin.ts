import { apiClient } from "@/lib/api-client";
import type { updateAdminRequest, updateAdminResponse } from "../types";
import { AxiosError } from "axios";

const updateAdmin = async (id: number, data: updateAdminRequest): Promise<updateAdminResponse> => {
    try {
        const response = await apiClient.put<updateAdminResponse>(`/admins/${id}`, data);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while updating the Admin.";
                throw new Error(`Update Admin failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while updating the Admin.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while updating the Admin.");
        }
    }
}

export default updateAdmin;
