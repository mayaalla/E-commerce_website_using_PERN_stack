import { apiClient } from "@/lib/api-client";
import type { GetOrdersResponse, OrdersQueryParams } from "../types";
import { getOrdersResponseSchema } from "../schemas";

const getOrders = async (params?: OrdersQueryParams): Promise<GetOrdersResponse> => {
    const response = await apiClient.get<unknown>("/orders", { params });
    return getOrdersResponseSchema.parse(response.data);
};

export default getOrders;
