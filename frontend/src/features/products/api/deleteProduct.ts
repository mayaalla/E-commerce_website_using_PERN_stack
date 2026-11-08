import { apiClient } from "@/lib/api-client";
import { DeleteProductResponse } from "../types";
import { AxiosError } from "axios";

const deleteProduct = async (id: number): Promise<DeleteProductResponse> => {
    try {
        const response = await apiClient.delete<DeleteProductResponse>(`/products/${id}`);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while deleting the product.";
                throw new Error(`Delete product failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while deleting the product.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while deleting the product.");
        }
    }
};

export default deleteProduct;
