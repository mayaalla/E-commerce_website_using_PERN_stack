import { apiClient } from "@/lib/api-client";
import type {
    UpdateOrderInfoRequest,
    UpdateOrderInfoResponse,
    UpdateOrderStatusRequest,
    UpdateOrderStatusResponse,
} from "../types";
import { AxiosError } from "axios";

const updateOrder = async (id: number, data: UpdateOrderStatusRequest): Promise<UpdateOrderStatusResponse> => {
    try {
        const response = await apiClient.patch<UpdateOrderStatusResponse>(`/orders/${id}/status`, data);
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

export const updateOrderInfo = async (
    id: number,
    data: UpdateOrderInfoRequest,
): Promise<UpdateOrderInfoResponse> => {
    try {
        const response = await apiClient.patch<UpdateOrderInfoResponse>(`/orders/${id}`, data);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while updating order information.";
                throw new Error(`Update order information failed with status ${status}: ${message}`);
            }
            throw new Error("Network error occurred while updating order information.");
        }
        throw new Error("An unexpected error occurred while updating order information.");
    }
}

export default updateOrder;
