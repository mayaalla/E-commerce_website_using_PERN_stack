import * as React from "react";
import { LogOut, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLogout } from "../hooks/useLogout";

/**
 * LogoutButton — calls POST /auth/logout, then clears the in-memory token and
 * resets Zustand auth state.  Accepts any Button props so it can be dropped in
 * nav bars, sidebars, dropdowns, etc.
 *
 * Props (all optional):
 *  variant   – shadcn Button variant (default "ghost")
 *  size      – shadcn Button size    (default "sm")
 *  showLabel – render "Logout" text next to the icon (default true)
 *  className – extra Tailwind classes
 */
function LogoutButton({
  variant = "ghost",
  size = "sm",
  showLabel = true,
  className,
  ...rest
}) {
  const { mutate, isPending } = useLogout();

  return (
    <Button
      variant={variant}
      size={size}
      disabled={isPending}
      onClick={() => mutate()}
      className={className}
      aria-label="Logout"
      {...rest}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      {showLabel && (
        <span className={isPending ? "opacity-50" : ""}>
          {isPending ? "Logging out…" : "Logout"}
        </span>
      )}
    </Button>
  );
}

export default LogoutButton;
