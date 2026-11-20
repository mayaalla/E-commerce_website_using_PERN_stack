import React from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";

import Auth            from "@/pages/Auth";
import HomePage        from "@/pages/Home";
import CategoriesPage  from "@/pages/Categories";
import ProductsPage    from "@/pages/Products";
import OrdersPage      from "@/pages/Orders";
import CouponsPage     from "@/pages/Coupons";
import ShippingsPage   from "@/pages/Shippings";
import ShippingPricesPage from "@/pages/ShippingPrices";
import WilayaPage      from "@/pages/Willaya";
import CommunePage     from "@/pages/Commune";
import AdminsPage      from "@/pages/Admins";
// import SettingsPage    from "@/pages/Settings";

import { AuthGuard, AuthInitializer, PermissionGuard } from "@/features/auth";
import DashboardLayout from "@/components/DashboardLayout";

// ─── Root Layout ─────────────────────────────────────────────────────────────
function RootLayout() {
  return (
    <>
      <AuthInitializer />
      <Outlet />
    </>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        // Public — login page
        path: "/auth",
        element: <Auth />,
      },
      {
        // Protected — all dashboard pages share DashboardLayout (sidebar nav)
        element: (
          <AuthGuard>
            <DashboardLayout />
          </AuthGuard>
        ),
        children: [
          // Home dashboard
          {
            index: true,
            element: <PermissionGuard page="dashboard"><HomePage /></PermissionGuard>,
          },
          {
            path: "/",
            element: <PermissionGuard page="dashboard"><HomePage /></PermissionGuard>,
          },
          {
            path: "/products",
            element: <PermissionGuard page="products"><ProductsPage /></PermissionGuard>,
          },
          {
            path: "/categories",
            element: <PermissionGuard page="categories"><CategoriesPage /></PermissionGuard>,
          },
          {
            path: "/orders",
            element: <PermissionGuard page="orders"><OrdersPage /></PermissionGuard>,
          },
          {
            path: "/coupons",
            element: <PermissionGuard page="coupons"><CouponsPage /></PermissionGuard>,
          },
          {
            path: "/shippings",
            element: <PermissionGuard page="shippings"><ShippingsPage /></PermissionGuard>,
          },
          {
            path: "/shippings/:companyId",
            element: <PermissionGuard page="shippingPrices"><ShippingPricesPage /></PermissionGuard>,
          },
          {
            path: "/wilaya",
            element: <PermissionGuard page="wilaya"><WilayaPage /></PermissionGuard>,
          },
          {
            path: "/commune/:wilayaCode",
            element: <PermissionGuard page="commune"><CommunePage /></PermissionGuard>,
          },
          {
            path: "/admins",
            element: <PermissionGuard page="admins"><AdminsPage /></PermissionGuard>,
          },
          // { path: "/admins",  element: <SettingsPage /> },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
