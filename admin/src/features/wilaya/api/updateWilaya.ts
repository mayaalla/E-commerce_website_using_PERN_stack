import { apiClient } from "@/lib/api-client";
import {updateWilayaRequest, updateWilayaResponse} from "../types";
import { AxiosError } from "axios";

const updateWilaya = async (id: number, data: updateWilayaRequest): Promise<updateWilayaResponse> => {
    try {
        const response = await apiClient.put<updateWilayaResponse>(`/wilayas/${id}`, data);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while updating the Wilaya.";
                throw new Error(`Update Wilaya failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while updating the Wilaya.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while updating the Wilaya.");
        }
    }
}

export default updateWilaya;