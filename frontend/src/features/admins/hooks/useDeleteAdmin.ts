import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteAdmin from "../api/deleteAdmin";

export function useDeleteAdmin(options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteAdmin(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admins"] });
            options?.onSuccess?.();
        },
        onError: (error: Error) => {
            options?.onError?.(error);
        },
    });
}
