import { apiClient } from "@/lib/api-client";
import type { getAllCommunesResponse } from "../types";
import { AxiosError } from "axios";

const getAllCommunes = async (): Promise<getAllCommunesResponse> => {
    try {
        const response = await apiClient.get<getAllCommunesResponse>("/communes");
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching AllCommunes.";
                throw new Error(`Get AllCommunes failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while fetching AllCommunes.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while fetching AllCommunes.");
        }
    }
}

export default getAllCommunes;
