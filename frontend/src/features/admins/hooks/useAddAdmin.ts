import { useMutation, useQueryClient } from "@tanstack/react-query";
import addAdmin from "../api/addAdmin";
import type { addAdminRequest } from "../types";

export function useAddAdmin(options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: addAdminRequest) => addAdmin(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admins"] });
            options?.onSuccess?.();
        },
        onError: (error: Error) => {
            options?.onError?.(error);
        },
    });
}
