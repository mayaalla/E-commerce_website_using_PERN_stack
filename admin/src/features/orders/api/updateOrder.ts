import { apiClient } from "@/lib/api-client";
import type {
    UpdateOrderInfoRequest,
    UpdateOrderInfoResponse,
    UpdateOrderStatusRequest,
    UpdateOrderStatusResponse,
} from "../types";
import {
    updateOrderInfoRequestSchema,
    updateOrderInfoResponseSchema,
    updateOrderStatusRequestSchema,
    updateOrderStatusResponseSchema,
} from "../schemas";

const updateOrder = async (id: number, data: UpdateOrderStatusRequest): Promise<UpdateOrderStatusResponse> => {
    const request = updateOrderStatusRequestSchema.parse(data);
    const response = await apiClient.patch<unknown>(`/orders/${id}/status`, request);
    return updateOrderStatusResponseSchema.parse(response.data);
};

export const updateOrderInfo = async (
    id: number,
    data: UpdateOrderInfoRequest,
): Promise<UpdateOrderInfoResponse> => {
    const request = updateOrderInfoRequestSchema.parse(data);
    const response = await apiClient.patch<unknown>(`/orders/${id}`, request);
    return updateOrderInfoResponseSchema.parse(response.data);
};

export default updateOrder;
