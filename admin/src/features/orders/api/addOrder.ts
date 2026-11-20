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
                const status = error.response.status;
                // The backend returns either { message: "..." } or { errors: ["..."] }
                const responseData = error.response.data;
                const message =
                    responseData?.message ||
                    (Array.isArray(responseData?.errors) && responseData.errors.length > 0
                        ? responseData.errors.join(", ")
                        : "An error occurred while adding the order.");
                throw new Error(`Add order failed with status ${status}: ${message}`);
            } else {
                // Network / no response (e.g. server is down)
                throw new Error("Network error occurred while adding the order.");
            }
        }
        // Re-throw anything that's already a transformed API error from the interceptor
        throw error;
    }
};

export default addOrder;