import { apiClient } from "@/lib/api-client";
import {getWilayaResponse} from "../types";
import { AxiosError } from "axios";

const getWilaya = async (id: number): Promise<getWilayaResponse> => {
    try {
        const response = await apiClient.get<getWilayaResponse>(`/wilayas/${id}`);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching the Wilaya.";
                throw new Error(`Get Wilaya failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while fetching the Wilaya.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while fetching the Wilaya.");
        }
    }
}

export default getWilaya;