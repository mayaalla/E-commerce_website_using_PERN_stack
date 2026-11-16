import { apiClient } from "@/lib/api-client";
import type { getAdminResponse } from "../types";

const getAdmin = async (id: number): Promise<getAdminResponse> => {
    const response = await apiClient.get<getAdminResponse>(`/admins/${id}`);
    return response.data;
};

export default getAdmin;
