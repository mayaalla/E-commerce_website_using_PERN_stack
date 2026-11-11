import { apiClient } from "@/lib/api-client";
import type { getCommuneResponse } from "../types";
import { AxiosError } from "axios";

const getCommune = async (id: number): Promise<getCommuneResponse> => {
    try {
        const response = await apiClient.get<getCommuneResponse>(`/communes/${id}`);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching the Commune.";
                throw new Error(`Get Commune failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while fetching the Commune.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while fetching the Commune.");
        }
    }
}

export default getCommune;
