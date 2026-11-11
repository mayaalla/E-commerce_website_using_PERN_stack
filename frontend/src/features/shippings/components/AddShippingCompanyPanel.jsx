import * as React from "react";
import { useState } from "react";
import { Plus, Loader2, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { useCreateShippingCompany } from "@/features/shippings";

// ─── constants ────────────────────────────────────────────────────────────────
const EMPTY_FORM = { name: "", apiKey: "" };

// ─── AddShippingCompanyPanel ──────────────────────────────────────────────────
// A "New Company" button that opens a Dialog with the creation form.
// Fields: name (required, max 100) and apiKey (required, min 16, password input).
// ─────────────────────────────────────────────────────────────────────────────
function AddShippingCompanyPanel() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [showApiKey, setShowApiKey] = useState(false);

  const { mutate, isPending } = useCreateShippingCompany();

  // ── field helpers ──────────────────────────────────────────────────────────
  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  // ── validation ─────────────────────────────────────────────────────────────
  function validate() {
    const next = {};

    const name = form.name.trim();
    if (!name) {
      next.name = "Company name is required.";
    } else if (name.length > 100) {
      next.name = "Name must be at most 100 characters.";
    }

    const apiKey = form.apiKey.trim();
    if (!apiKey) {
      next.apiKey = "API key is required.";
    } else if (apiKey.length < 16) {
      next.apiKey = "API key must be at least 16 characters.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    mutate(
      {
        name: form.name.trim(),
        apiKey: form.apiKey.trim(),
      },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM);
          setErrors({});
          setShowApiKey(false);
          setOpen(false);
        },
        onError: (err) => {
          setErrors({ _server: err?.message ?? "Failed to create company." });
        },
      }
    );
  }

  function handleOpenChange(val) {
    if (!val) {
      setForm(EMPTY_FORM);
      setErrors({});
      setShowApiKey(false);
    }
    setOpen(val);
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="shrink-0 gap-1.5"
        aria-label="Add new shipping company"
      >
        <Plus className="size-4" aria-hidden="true" />
        New Company
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Shipping Company</DialogTitle>
            <DialogDescription>
              Enter the company name and its integration API key. The API key is
              stored securely and never shown again.
            </DialogDescription>
          </DialogHeader>

          <form
            id="add-company-form"
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4 py-2"
          >
            {/* Server-level error */}
            {errors._server && (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {errors._server}
              </p>
            )}

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-name">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company-name"
                type="text"
                placeholder="e.g. Yalidine Express"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                disabled={isPending}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "err-company-name" : undefined}
                maxLength={100}
                autoComplete="off"
              />
              {errors.name && (
                <p
                  id="err-company-name"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.name}
                </p>
              )}
            </div>

            {/* API Key */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-apikey">
                API Key <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="company-apikey"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Min. 16 characters"
                  value={form.apiKey}
                  onChange={(e) => set("apiKey", e.target.value)}
                  disabled={isPending}
                  aria-invalid={!!errors.apiKey}
                  aria-describedby={
                    errors.apiKey ? "err-company-apikey" : undefined
                  }
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.apiKey && (
                <p
                  id="err-company-apikey"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.apiKey}
                </p>
              )}
            </div>
          </form>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form="add-company-form"
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AddShippingCompanyPanel;
