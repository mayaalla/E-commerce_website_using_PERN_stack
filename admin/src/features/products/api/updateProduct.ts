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
                const status = error.response.status;
                // Surface the backend's validation errors if present (Zod returns an array)
                const body = error.response.data;
                const message =
                    (Array.isArray(body?.errors) && body.errors.length > 0
                        ? body.errors.join("; ")
                        : body?.message) ||
                    "An error occurred while updating the product.";
                throw new Error(`Update product failed with status ${status}: ${message}`);
            } else {
                throw new Error("Network error occurred while updating the product.");
            }
        }
        // Re-throw unexpected errors as-is so the original message is preserved.
        if (error instanceof Error) throw error;
        throw new Error("An unexpected error occurred while updating the product.");
    }
};

export default updateProduct;
