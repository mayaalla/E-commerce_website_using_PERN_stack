import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { logout } from "../api/logout";
import useAuthStore from "../store/auth.store";
import { tokenStore } from "@/lib/auth-token";

/**
 * useLogout — encapsulates the logout mutation and all its side-effects.
 *
 * Always clears local state even if the server call fails,
 * so the user is never stuck in a broken session.
 *
 * Returns:
 *  mutate()   – trigger the logout call
 *  isPending  – true while the request is in-flight
 */
export function useLogout() {
  const logoutStore = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  const clearLocal = () => {
    tokenStore.set(null);
    queryClient.clear();   // wipe all cached queries
    logoutStore();         // status → "unauthenticated"
  };

  const { mutate, isPending } = useMutation({
    mutationFn: logout,

    onSuccess: () => {
      clearLocal();
      toast.success("Logged out successfully.");
    },

    onError: (error: Error) => {
      // Defensive: clear local state even when the server call fails
      clearLocal();
      toast.error(error?.message ?? "Logout failed. You have been signed out locally.");
    },
  });

  return { mutate, isPending };
}
