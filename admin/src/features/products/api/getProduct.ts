import { apiClient } from "@/lib/api-client";
import type { GetProductResponse } from "../types";
import { productResponseSchema } from "../schemas";
import { AxiosError } from "axios";

const getProduct = async (id: number): Promise<GetProductResponse> => {
    let responseData: unknown;

    try {
        const response = await apiClient.get<unknown>(`/products/${id}`);
        responseData = response.data;
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

    return productResponseSchema.parse(responseData);
};

export default getProduct;
