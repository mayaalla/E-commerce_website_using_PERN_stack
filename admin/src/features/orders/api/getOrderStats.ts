import { apiClient } from "@/lib/api-client";
import type { GetOrderStatsResponse } from "../types";
import { getOrderStatsResponseSchema } from "../schemas";

const getOrderStats = async (): Promise<GetOrderStatsResponse> => {
    const response = await apiClient.get<unknown>("/orders/stats");
    return getOrderStatsResponseSchema.parse(response.data);
};

export default getOrderStats;
