import { apiClient } from "@/lib/api-client";
import type { GetOrdersResponse, OrdersQueryParams } from "../types";
import { AxiosError } from "axios";

const getOrders = async (params?: OrdersQueryParams): Promise<GetOrdersResponse> => {
    try {
        const response = await apiClient.get<GetOrdersResponse>("/orders", { params });
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching orders.";
                throw new Error(`Get orders failed with status ${status}: ${message}`);
            } else {
                throw new Error("Network error occurred while fetching orders.");
            }
        } else {
            throw new Error("An unexpected error occurred while fetching orders.");
        }
    }
};

export default getOrders;
