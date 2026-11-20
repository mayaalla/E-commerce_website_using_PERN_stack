import { apiClient } from "@/lib/api-client";
import {updateCategoryRequest, updateCategoryResponse} from "../types";
import { AxiosError } from "axios";

const updateCategory = async (id: number, data: updateCategoryRequest): Promise<updateCategoryResponse> => {
    try {
        const response = await apiClient.put<updateCategoryResponse>(`/categories/${id}`, data);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while updating the category.";
                throw new Error(`Update category failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while updating the category.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while updating the category.");
        }
    }
}

export default updateCategory;