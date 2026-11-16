import { apiClient } from "@/lib/api-client";
import type { deleteAdminResponse } from "../types";
import { AxiosError } from "axios";

const deleteAdmin = async (id:number): Promise<deleteAdminResponse> => {
    try {
        const response = await apiClient.delete<deleteAdminResponse>(`/admins/${id}`);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while deleting the Admin.";
                throw new Error(`Delete Admin failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while deleting the Admin.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while deleting the Admin.");
        }
    }
}

export default deleteAdmin;
