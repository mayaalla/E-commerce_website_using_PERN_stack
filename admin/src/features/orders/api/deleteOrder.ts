import { apiClient } from "@/lib/api-client";
import type { DeleteOrderResponse } from "../types";
import { deleteOrderResponseSchema } from "../schemas";

const deleteOrder = async (id: number): Promise<DeleteOrderResponse> => {
    const response = await apiClient.delete<unknown>(`/orders/${id}`);
    return deleteOrderResponseSchema.parse(response.data);
};

export default deleteOrder;
