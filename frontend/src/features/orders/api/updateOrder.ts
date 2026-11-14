import { apiClient } from "@/lib/api-client";
import { UpdateOrderStatusRequest, UpdateOrderStatusResponse } from "../types";
import { AxiosError } from "axios";

const updateOrder = async (id: number, data: UpdateOrderStatusRequest): Promise<UpdateOrderStatusResponse> => {
    try {
        const response = await apiClient.put<UpdateOrderStatusResponse>(`/orders/${id}`, data);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while updating the order.";
                throw new Error(`Update order failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while updating the order.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while updating the order.");
        }
    }
};

export default updateOrder;
