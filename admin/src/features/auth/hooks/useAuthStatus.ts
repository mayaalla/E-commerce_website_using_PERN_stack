import useAuthStore from "../store/auth.store";

/**
 * useAuthStatus — lightweight selector hook for reading auth state.
 *
 * Returns:
 *  status           – "checking" | "authenticated" | "unauthenticated"
 *  isAuthenticated  – true when the user is fully logged in
 *  isChecking       – true while the session is being restored on app boot
 *  accessToken      – the in-memory JWT (null when logged out)
 */
export function useAuthStatus() {
  const status      = useAuthStore((s) => s.status);
  const accessToken = useAuthStore((s) => s.accessToken);

  return {
    status,
    accessToken,
    isAuthenticated: status === "authenticated",
    isChecking:      status === "checking",
  };
}
