import { apiClient } from "@/lib/api-client";
import {  deleteCategoryResponse } from "../types";
import { AxiosError } from "axios";

const deleteCategory = async (id:number): Promise<deleteCategoryResponse> => {
    try {
        const response = await apiClient.delete<deleteCategoryResponse>(`/categories/${id}`);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while deleting the category.";
                throw new Error(`Delete category failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while deleting the category.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while deleting the category.");
        }
    }
}

export default deleteCategory;