import { apiClient } from "@/lib/api-client";

import type { addCommuneRequest, addCommuneResponse } from "../types";

import { AxiosError } from "axios";


const addCommune = async (data: addCommuneRequest): Promise<addCommuneResponse> => {
    try {
        const response = await apiClient.post<addCommuneResponse>("/communes", data);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while adding the Commune.";
                throw new Error(`Add Commune failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while adding the Commune.");
            };

            
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while adding the Commune.");
        }
    }
}

export default addCommune;
