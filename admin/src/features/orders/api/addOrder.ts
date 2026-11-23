import { apiClient } from "@/lib/api-client";
import type { CreateOrderRequest, CreateOrderResponse } from "../types";
import {
    createOrderRequestSchema,
    createOrderResponseSchema,
} from "../schemas";

const addOrder = async (data: CreateOrderRequest): Promise<CreateOrderResponse> => {
    const request = createOrderRequestSchema.parse(data);
    const response = await apiClient.post<unknown>("/orders", request);
    return createOrderResponseSchema.parse(response.data);
};

export default addOrder;
