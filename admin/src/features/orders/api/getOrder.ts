import { apiClient } from "@/lib/api-client";
import type { GetOrderResponse } from "../types";
import { getOrderResponseSchema } from "../schemas";

const getOrder = async (id: number): Promise<GetOrderResponse> => {
    const response = await apiClient.get<unknown>(`/orders/${id}`);
    return getOrderResponseSchema.parse(response.data);
};

export default getOrder;
