import api from "@/lib/axios";
import { LoginRequest, LoginResponse} from "../types";
import { AxiosError } from "axios";

export const login = async (data: LoginRequest): Promise<LoginResponse> => {

    try {
        const response = await api.post<LoginResponse>("/auth/login", data);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                // Handle the error response from the server
                const status = error.response.status;
                const message = error.response.data?.message || "An error occurred during login.";
                throw new Error(`Login failed with status ${status}: ${message}`);
            } else {
                // Handle network or other errors
                throw new Error("Network error occurred during login.");
            }
        } else {
            // Handle unexpected errors
            throw new Error("An unexpected error occurred during login.");
        }
    }
}




// Status	Message
// 400	Validation error
// 401	Invalid credentials
