import { apiClient } from "@/lib/api-client";
import type { CreateOrderRequest, CreateOrderResponse } from "../types";
import { AxiosError } from "axios";

const addOrder = async (data: CreateOrderRequest): Promise<CreateOrderResponse> => {
    try {
        const response = await apiClient.post<CreateOrderResponse>("/orders", data);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while adding the order.";
                throw new Error(`Add order failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while adding the order.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while adding the order.");
        }
    }
};

export default addOrder;