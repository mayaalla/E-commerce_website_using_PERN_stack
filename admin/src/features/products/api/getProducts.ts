import { apiClient } from "@/lib/api-client";
import type { GetProductsResponse, ProductsQueryParams } from "../types";
import { AxiosError } from "axios";

const getProducts = async (params?: ProductsQueryParams): Promise<GetProductsResponse> => {
    try {
        const response = await apiClient.get<GetProductsResponse>("/products", { params });
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching products.";
                throw new Error(`Get products failed with status ${status}: ${message}`);
            } else {
                throw new Error("Network error occurred while fetching products.");
            }
        } else {
            throw new Error("An unexpected error occurred while fetching products.");
        }
    }
};

export default getProducts;
