import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { login } from "../api/login";
import useAuthStore from "../store/auth.store";
import { tokenStore } from "@/lib/auth-token";
import { ApiError } from "@/lib/api-error";
import type { LoginRequest } from "../types";

/**
 * useLogin — encapsulates the login mutation and all its side-effects.
 *
 * Returns:
 *  mutate(data)  – trigger the login call
 *  isPending     – true while the request is in-flight
 *  applyFieldErrors(setError) – call this in onError to wire server
 *                               validation errors back to RHF fields
 */
export function useLogin() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setStatus      = useAuthStore((s) => s.setStatus);
  const navigate       = useNavigate();
  const queryClient    = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: LoginRequest) => login(data),

    onSuccess: ({ accessToken }) => {
      tokenStore.set(accessToken);
      setAccessToken(accessToken);
      setStatus("authenticated");
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Welcome back!");
      navigate("/", { replace: true });
    },
  });

  /**
   * Wire server-side / API errors back into a React Hook Form `setError`.
   * Call this inside the form's onError handler.
   */
  function applyFieldErrors(
    error: unknown,
    setError: (field: string, error: { message: string }) => void
  ) {
    if (error instanceof ApiError) {
      const fieldErrors = error.fieldErrors ?? {};
      const hasFieldErrors = Object.keys(fieldErrors).length > 0;

      if (hasFieldErrors) {
        Object.entries(fieldErrors).forEach(([field, message]) => {
          setError(field === "root" ? "root" : field, { message: message as string });
        });
      } else {
        setError("root", { message: error.message });
        toast.error(error.message);
      }
    } else {
      const msg = (error as Error)?.message ?? "An unexpected error occurred.";
      setError("root", { message: msg });
      toast.error(msg);
    }
  }

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    applyFieldErrors,
  };
}
