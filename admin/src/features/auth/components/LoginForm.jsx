import * as React from "react";
import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import FormInput from "./FormInput";
import { useLogin } from "../hooks/useLogin";

// ─── Validation schema ───────────────────────────────────────────────────────
const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username must be at most 50 characters"),
  password: z
    .string()
    .min(1, "Password is required"),
});

// ─── Component ───────────────────────────────────────────────────────────────
function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  const { mutate, isPending: isMutating, applyFieldErrors } = useLogin();

  const methods = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
    mode: "onTouched",
  });

  const {
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = (data) =>
    mutate(data, {
      onError: (error) => applyFieldErrors(error, setError),
    });

  const isPending = isMutating || isSubmitting;

  return (
    <FormProvider {...methods}>
      <form
        className="flex flex-col gap-5"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {/* Username */}
        <FormInput
          name="username"
          label="Username"
          type="text"
          placeholder="admin"
          autoComplete="username"
          disabled={isPending}
        />

        {/* Password */}
        <FormInput
          name="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={isPending}
          className="relative"
        >
          {/* Show / hide password toggle */}
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </FormInput>

        {/* Root / server error */}
        {methods.formState.errors.root && (
          <p
            role="alert"
            className="text-sm font-medium text-destructive -mt-2"
          >
            {methods.formState.errors.root.message}
          </p>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full mt-1"
          size="lg"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </FormProvider>
  );
}

export default LoginForm;
