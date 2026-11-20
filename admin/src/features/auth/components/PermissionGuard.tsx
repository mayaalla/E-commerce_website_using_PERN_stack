import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import NotAuthorizedPanel from "./NotAuthorizedPanel";
import { useCurrentAdmin } from "../hooks/useCurrentAdmin";
import { canAccessPage, type ProtectedPage } from "../permissions";

export default function PermissionGuard({
  page,
  children,
}: {
  page: ProtectedPage;
  children: ReactNode;
}) {
  const { admin, isLoading } = useCurrentAdmin();

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center" aria-live="polite">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="Loading permissions" />
      </div>
    );
  }

  if (!admin) return <Navigate to="/auth" replace />;
  if (!canAccessPage(admin, page)) return <NotAuthorizedPanel />;

  return children;
}
