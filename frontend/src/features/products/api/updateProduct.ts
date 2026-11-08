import { apiClient } from "@/lib/api-client";
import { UpdateProductRequest, UpdateProductResponse } from "../types";
import { AxiosError } from "axios";

const updateProduct = async (id: number, data: UpdateProductRequest): Promise<UpdateProductResponse> => {
    try {
        const response = await apiClient.put<UpdateProductResponse>(`/products/${id}`, data);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while updating the product.";
                throw new Error(`Update product failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while updating the product.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while updating the product.");
        }
    }
};

export default updateProduct;
