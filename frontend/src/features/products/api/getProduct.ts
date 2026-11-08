import { apiClient } from "@/lib/api-client";
import { GetProductResponse } from "../types";
import { AxiosError } from "axios";

const getProduct = async (id: number): Promise<GetProductResponse> => {
    try {
        const response = await apiClient.get<GetProductResponse>(`/products/${id}`);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching the product.";
                throw new Error(`Get product failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while fetching the product.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while fetching the product.");
        }
    }
};

export default getProduct;
