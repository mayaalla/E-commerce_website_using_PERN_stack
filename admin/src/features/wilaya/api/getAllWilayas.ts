import { apiClient } from "@/lib/api-client";
import {getAllWilayasResponse} from "../types";
import { AxiosError } from "axios";

const getAllWilayas = async (): Promise<getAllWilayasResponse> => {
    try {
        const response = await apiClient.get<getAllWilayasResponse>("/wilayas");
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching AllWilays.";
                throw new Error(`Get AllWilays failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while fetching AllWilays.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while fetching AllWilays.");
        }
    }
}

export default getAllWilayas;