import { apiClient } from "@/lib/api-client";
import {getCategoriesResponse} from "../types";
import { AxiosError } from "axios";

const getCategories = async (): Promise<getCategoriesResponse> => {
    try {
        const response = await apiClient.get<getCategoriesResponse>("/categories");
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching categories.";
                throw new Error(`Get categories failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while fetching categories.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while fetching categories.");
        }
    }
}

export default getCategories;