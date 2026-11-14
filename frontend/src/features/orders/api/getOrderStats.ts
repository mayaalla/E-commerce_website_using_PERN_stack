import { apiClient } from "@/lib/api-client";
import { GetOrderStatsResponse } from "../types";
import { AxiosError } from "axios";

const getOrderStats = async (): Promise<GetOrderStatsResponse> => {
    try {
        const response = await apiClient.get<GetOrderStatsResponse>("/orders/stats");
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred while fetching order stats.";
                throw new Error(`Get order stats failed with status ${status}: ${message}`);
            } else {
                throw new Error("Network error occurred while fetching order stats.");
            }
        } else {
            throw new Error("An unexpected error occurred while fetching order stats.");
        }
    }
};

export default getOrderStats;
