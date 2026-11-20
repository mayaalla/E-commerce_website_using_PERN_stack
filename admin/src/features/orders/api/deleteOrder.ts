import { apiClient } from "@/lib/api-client";
import { DeleteOrderResponse } from "../types";
import { AxiosError } from "axios";

const deleteOrder = async (id: number): Promise<DeleteOrderResponse> => {
    try {
        const response = await apiClient.delete<DeleteOrderResponse>(`/orders/${id}`);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while deleting the order.";
                throw new Error(`Delete order failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred while deleting the order.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred while deleting the order.");
        }
    }
};

export default deleteOrder;
