import { AxiosError } from "axios";

import { apiClient } from "@/lib/api-client";
import type { DeleteProductResponse } from "../types";
import { deleteProductResponseSchema } from "../schemas";

const deleteProduct = async (id: number): Promise<DeleteProductResponse> => {
    let responseData: unknown;

    try {
        const response = await apiClient.delete<unknown>(`/products/${id}`);
        responseData = response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while deleting the product.";
                throw new Error(`Delete product failed with status ${status}: ${message}`);
            }
            throw new Error("Network error occurred while deleting the product.");
        }
        if (error instanceof Error) throw error;
        throw new Error("An unexpected error occurred while deleting the product.");
    }

    return deleteProductResponseSchema.parse(responseData);
};

export default deleteProduct;
