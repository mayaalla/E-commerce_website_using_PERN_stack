import { apiClient } from "@/lib/api-client";
import type { addAdminRequest, addAdminResponse } from "../types";

const addAdmin = async (data: addAdminRequest): Promise<addAdminResponse> => {
    const response = await apiClient.post<addAdminResponse>("/admins", data);
    return response.data;
};

export default addAdmin;
