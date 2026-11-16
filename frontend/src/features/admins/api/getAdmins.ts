import { apiClient } from "@/lib/api-client";
import type { getAllAdminsResponse } from "../types";

const getAllAdmins = async (): Promise<getAllAdminsResponse> => {
    const response = await apiClient.get<getAllAdminsResponse>("/admins");
    return response.data;
};

export default getAllAdmins;
