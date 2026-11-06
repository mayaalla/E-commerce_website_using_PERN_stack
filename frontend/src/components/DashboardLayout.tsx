import { Outlet } from "react-router-dom";
import DashboardNav from "@/components/DashboardNav";

/**
 * DashboardLayout — wraps all protected pages with the sidebar nav.
 * Place this as the `element` of the protected route group in the router.
 */
export default function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
