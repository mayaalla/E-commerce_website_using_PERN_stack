import { apiClient } from "@/lib/api-client";
import {getCategoryResponse} from "../types";
import { AxiosError } from "axios";

const getCategory = async (id: number): Promise<getCategoryResponse> => {
    try {
        const response = await apiClient.get<getCategoryResponse>(`/categories/${id}`);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching the category.";
                throw new Error(`Get category failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while fetching the category.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while fetching the category.");
        }
    }
}

export default getCategory;