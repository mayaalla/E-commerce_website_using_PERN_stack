import { apiClient } from "@/lib/api-client";
import {  deleteWilayaResponse } from "../types";
import { AxiosError } from "axios";

const deleteWilaya = async (id:number): Promise<deleteWilayaResponse> => {
    try {
        const response = await apiClient.delete<deleteWilayaResponse>(`/wilayas/${id}`);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while deleting the Wilaya.";
                throw new Error(`Delete Wilaya failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while deleting the Wilaya.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while deleting the Wilaya.");
        }
    }
}

export default deleteWilaya;