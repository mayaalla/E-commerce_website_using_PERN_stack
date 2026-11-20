import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateAdmin from "../api/updateAdmin";
import type { updateAdminRequest } from "../types";

export function useUpdateAdmin(options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: updateAdminRequest }) =>
            updateAdmin(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admins"] });
            options?.onSuccess?.();
        },
        onError: (error: Error) => {
            options?.onError?.(error);
        },
    });
}
