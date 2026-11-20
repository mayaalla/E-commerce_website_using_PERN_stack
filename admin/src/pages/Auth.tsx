import * as React from "react";
import { Navigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm, useAuthStatus } from "@/features/auth";

export default function Auth() {
  const { isAuthenticated, isChecking } = useAuthStatus();

  // Already logged in → go to dashboard
  if (isAuthenticated) return <Navigate to="/" replace />;

  // Session is still being restored → wait (AuthGuard handles the spinner
  // on protected routes; here we just render nothing to avoid a flash)
  if (isChecking) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Brand / Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5 text-primary-foreground"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              {/* eslint-disable-next-line react/no-unknown-property */}
              <line x1="3" y1="6" x2="21" y2="6" className="" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">
            ShopAdmin
          </span>
        </div>

        {/* Auth Card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-0">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            {/* className prop is optional at runtime; TS infers it as required from the .jsx file */}
            <CardDescription className="">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <LoginForm />
          </CardContent>
        </Card>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in, you agree to our{" "}
          <button
            type="button"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button
            type="button"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Privacy Policy
          </button>
          .
        </p>
      </div>
    </div>
  );
}
