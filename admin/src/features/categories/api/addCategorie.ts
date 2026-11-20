import { apiClient } from "@/lib/api-client";

import type { addCategoryRequest, addCategoryResponse } from "../types";

import { AxiosError } from "axios";


const addCategory = async (data: addCategoryRequest): Promise<addCategoryResponse> => {
    try {
        const response = await apiClient.post<addCategoryResponse>("/categories", data);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while adding the category.";
                throw new Error(`Add category failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while adding the category.");
            };

            
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while adding the category.");
        }
    }
}

export default addCategory;