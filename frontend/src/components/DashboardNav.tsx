import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Tag,
  Ticket,
  ClipboardList,
  Truck,
  Map,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessPage, LogoutButton, useCurrentAdmin } from "@/features/auth";

// ─── Nav items (excluding auth) ──────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Dashboard",  href: "/",           icon: LayoutDashboard, page: "dashboard" },
  { label: "Products",   href: "/products",   icon: ShoppingBag,     page: "products" },
  { label: "Categories", href: "/categories", icon: Tag,              page: "categories" },
  { label: "Orders",     href: "/orders",     icon: ClipboardList,    page: "orders" },
  { label: "Coupons",    href: "/coupons",    icon: Ticket,           page: "coupons" },
  { label: "Shippings",  href: "/shippings",  icon: Truck,            page: "shippings" },
  { label: "Wilaya",     href: "/wilaya",     icon: Map,              page: "wilaya" },
  { label: "Admins",     href: "/admins",     icon: Users,            page: "admins" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardNav() {
  const location = useLocation();
  const { admin } = useCurrentAdmin();
  const visibleItems = NAV_ITEMS.filter(({ page }) => canAccessPage(admin, page));

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Logo / brand */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <ShoppingBag className="size-6 text-sidebar-primary" />
        <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
          E-Commerce
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {visibleItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(href);

            return (
              <li key={href}>
                <NavLink
                  to={href}
                  end={href === "/"}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout at the bottom */}
      <div className="border-t border-sidebar-border p-3">
        <LogoutButton
          variant="ghost"
          size="sm"
          showLabel
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        />
      </div>
    </aside>
  );
}
