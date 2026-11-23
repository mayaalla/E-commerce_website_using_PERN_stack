import { AxiosError } from "axios";

import { apiClient } from "@/lib/api-client";
import type { GetProductStockResponse } from "../types";
import { getProductStockResponseSchema } from "../schemas";

const getProductStock = async (
    productId: number,
    signal?: AbortSignal
): Promise<GetProductStockResponse> => {
    let responseData: unknown;

    try {
        const response = await apiClient.get<unknown>(`/products/${productId}/stock`, { signal });
        responseData = response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching product stock.";
                throw new Error(`Get product stock failed with status ${status}: ${message}`);
            }
            throw new Error("Network error occurred while fetching product stock.");
        }
        if (error instanceof Error) throw error;
        throw new Error("An unexpected error occurred while fetching product stock.");
    }

    return getProductStockResponseSchema.parse(responseData);
};

export default getProductStock;

