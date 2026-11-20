import { apiClient } from "@/lib/api-client";
import type { deleteCommuneResponse } from "../types";
import { AxiosError } from "axios";

const deleteCommune = async (id:number): Promise<deleteCommuneResponse> => {
    try {
        const response = await apiClient.delete<deleteCommuneResponse>(`/communes/${id}`);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while deleting the Commune.";
                throw new Error(`Delete Commune failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while deleting the Commune.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while deleting the Commune.");
        }
    }
}

export default deleteCommune;
