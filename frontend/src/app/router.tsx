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
// import SettingsPage    from "@/pages/Settings";

import { AuthGuard, AuthInitializer } from "@/features/auth";
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
          { index: true, element: <HomePage /> },
          { path: "/",   element: <HomePage /> },
          { path: "/products",  element: <ProductsPage /> },
          { path: "/categories",element: <CategoriesPage /> },
          { path: "/orders",    element: <OrdersPage /> },
          { path: "/coupons",   element: <CouponsPage /> },
          { path: "/shippings", element: <ShippingsPage /> },
          { path: "/shippings/:companyId", element: <ShippingPricesPage /> },
          { path: "/wilaya",    element: <WilayaPage /> },
          { path: "/commune/:wilayaCode", element: <CommunePage /> },
          // { path: "/settings",  element: <SettingsPage /> },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
