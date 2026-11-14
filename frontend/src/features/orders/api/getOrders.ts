import { apiClient } from "@/lib/api-client";
import { GetOrdersResponse } from "../types";
import { AxiosError } from "axios";

const getOrders = async (): Promise<GetOrdersResponse> => {
    try {
        const response = await apiClient.get<GetOrdersResponse>("/orders");
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching orders.";
                throw new Error(`Get orders failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while fetching orders.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while fetching orders.");
        }
    }
};

export default getOrders;
