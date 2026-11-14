import { apiClient } from "@/lib/api-client";
import { GetOrderResponse } from "../types";
import { AxiosError } from "axios";

const getOrder = async (id: number): Promise<GetOrderResponse> => {
    try {
        const response = await apiClient.get<GetOrderResponse>(`/orders/${id}`);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching the order.";
                throw new Error(`Get order failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while fetching the order.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while fetching the order.");
        }
    }
};

export default getOrder;
