import { AxiosError } from "axios";

import { apiClient } from "@/lib/api-client";
import type { GetProductsResponse, ProductsQueryParams } from "../types";
import { getProductsResponseSchema } from "../schemas";

const getProducts = async (params?: ProductsQueryParams): Promise<GetProductsResponse> => {
    let responseData: unknown;

    try {
        const response = await apiClient.get<unknown>("/products", { params });
        responseData = response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching products.";
                throw new Error(`Get products failed with status ${status}: ${message}`);
            }
            throw new Error("Network error occurred while fetching products.");
        }
        if (error instanceof Error) throw error;
        throw new Error("An unexpected error occurred while fetching products.");
    }

    return getProductsResponseSchema.parse(responseData);
};

export default getProducts;
