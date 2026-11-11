import { apiClient } from "@/lib/api-client";

import type { addWilayaRequest, addWilayaResponse } from "../types";

import { AxiosError } from "axios";


const addWilaya = async (data: addWilayaRequest): Promise<addWilayaResponse> => {
    try {
        const response = await apiClient.post<addWilayaResponse>("/wilayas", data);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while adding the Wilaya.";
                throw new Error(`Add Wilaya failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while adding the Wilaya.");
            };

            
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while adding the Wilaya.");
        }
    }
}

export default addWilaya;