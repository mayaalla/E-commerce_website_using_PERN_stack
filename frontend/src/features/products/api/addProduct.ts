import { apiClient } from "@/lib/api-client";
import type { CreateProductRequest, CreateProductResponse } from "../types";
import { AxiosError } from "axios";

const addProduct = async (data: CreateProductRequest): Promise<CreateProductResponse> => {
    try {
        const response = await apiClient.post<CreateProductResponse>("/products", data);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while adding the product.";
                throw new Error(`Add product failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while adding the product.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while adding the product.");
        }
    }
};

export default addProduct;
