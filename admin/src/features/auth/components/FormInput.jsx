import * as React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";

/**
 * FormInput — a controlled input wired to the nearest React Hook Form context.
 *
 * Props:
 *  name        – field name (required, matches the schema key)
 *  label       – visible label text
 *  description – optional helper text below the field
 *  className   – extra classes on the wrapper div
 *  ...rest     – forwarded to <Input /> (type, placeholder, autoComplete, etc.)
 */
function FormInput({
  name,
  label,
  description,
  className,
  children,  // optional slot for suffix icons / buttons (e.g. show-password toggle)
  ...rest
}) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const error = errors[name]?.message;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className={cn("flex flex-col gap-1.5", className)}>
          {label && (
            <Label
              htmlFor={name}
              className={cn(error && "text-destructive")}
            >
              {label}
            </Label>
          )}

          <div className="relative">
            <Input
              id={name}
              aria-invalid={!!error}
              aria-describedby={
                error ? `${name}-error` : description ? `${name}-desc` : undefined
              }
              {...field}
              {...rest}
            />
            {/* Suffix slot (e.g. show/hide password button) */}
            {children}
          </div>

          {description && !error && (
            <p id={`${name}-desc`} className="text-xs text-muted-foreground">
              {description}
            </p>
          )}

          {error && (
            <p
              id={`${name}-error`}
              role="alert"
              className="text-xs font-medium text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      )}
    />
  );
}

export default FormInput;
