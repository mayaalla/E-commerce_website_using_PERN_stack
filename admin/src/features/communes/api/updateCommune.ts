import { apiClient } from "@/lib/api-client";
import type { updateCommuneRequest, updateCommuneResponse } from "../types";
import { AxiosError } from "axios";

const updateCommune = async (id: number, data: updateCommuneRequest): Promise<updateCommuneResponse> => {
    try {
        const response = await apiClient.put<updateCommuneResponse>(`/communes/${id}`, data);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while updating the Commune.";
                throw new Error(`Update Commune failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while updating the Commune.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while updating the Commune.");
        }
    }
}

export default updateCommune;
