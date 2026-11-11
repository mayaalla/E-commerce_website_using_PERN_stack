import * as React from "react";
import { useState, useRef, useEffect, useId } from "react";
import { Pencil, Trash2, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  useUpdateShippingCompany,
  useDeleteShippingCompany,
} from "@/features/shippings";

// ─── helpers ──────────────────────────────────────────────────────────────────

function statusVariant(status) {
  if (status === "active") return "default";
  return "secondary";
}

// ─── ShippingCompanyRow ───────────────────────────────────────────────────────
// Inline editing for `name` only. `apiKey` is write-only — only shown as a
// password input in edit mode; only sent if the user typed something (non-empty).
// ─────────────────────────────────────────────────────────────────────────────
function ShippingCompanyRow({ company }) {
  const nameInputId = useId();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(company.name);
  const [draftApiKey, setDraftApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const nameInputRef = useRef(null);

  const { mutate: update, isPending: isUpdating } = useUpdateShippingCompany();
  const { mutate: remove, isPending: isDeleting } = useDeleteShippingCompany();

  // isDirty: name changed OR apiKey field has content
  const isDirty =
    draftName.trim() !== company.name || draftApiKey.trim().length > 0;

  const isBusy = isUpdating || isDeleting;

  useEffect(() => {
    if (isEditing) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditing]);

  // ── handlers ───────────────────────────────────────────────────────────────
  function handleEditClick() {
    setDraftName(company.name);
    setDraftApiKey("");
    setShowApiKey(false);
    setFieldErrors({});
    setIsEditing(true);
  }

  function handleCancel() {
    setDraftName(company.name);
    setDraftApiKey("");
    setShowApiKey(false);
    setFieldErrors({});
    setIsEditing(false);
  }

  function validate() {
    const next = {};
    const name = draftName.trim();
    if (!name) {
      next.name = "Name cannot be empty.";
    } else if (name.length > 100) {
      next.name = "Name must be at most 100 characters.";
    }
    if (draftApiKey.trim() && draftApiKey.trim().length < 16) {
      next.apiKey = "API key must be at least 16 characters.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleConfirm() {
    if (!isDirty) return;
    if (!validate()) {
      nameInputRef.current?.focus();
      return;
    }

    /** @type {import("@/features/shippings").UpdateShippingCompanyRequest} */
    const data = {};
    if (draftName.trim() !== company.name) {
      data.name = draftName.trim();
    }
    if (draftApiKey.trim()) {
      data.apiKey = draftApiKey.trim();
    }

    update(
      { id: company.id, data },
      {
        onSuccess: () => {
          setIsEditing(false);
          setDraftApiKey("");
          setFieldErrors({});
        },
        onError: (err) => {
          setFieldErrors({
            _server: err?.message ?? "Failed to update. Please try again.",
          });
          nameInputRef.current?.focus();
        },
      }
    );
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") handleCancel();
  }

  function handleDelete() {
    remove(company.id);
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <TableRow
      data-state={isEditing ? "editing" : undefined}
      className={
        isEditing
          ? "bg-primary/5 dark:bg-primary/10 align-top"
          : "align-middle"
      }
    >
      {/* ID */}
      <TableCell className="w-16 pl-6 text-muted-foreground font-mono text-xs select-none">
        #{company.id}
      </TableCell>

      {/* Name (+ API key input in edit mode) */}
      <TableCell className="max-w-[16rem]">
        {isEditing ? (
          <div className="flex flex-col gap-1.5">
            {/* Name input */}
            <Input
              ref={nameInputRef}
              id={nameInputId}
              type="text"
              value={draftName}
              onChange={(e) => {
                setDraftName(e.target.value);
                if (fieldErrors.name)
                  setFieldErrors((prev) => ({ ...prev, name: "" }));
              }}
              onKeyDown={handleKeyDown}
              disabled={isUpdating}
              aria-label={`Edit name for company ${company.id}`}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={
                fieldErrors.name ? `err-name-${company.id}` : undefined
              }
              maxLength={100}
              className="h-8 text-sm"
              autoComplete="off"
            />
            {fieldErrors.name && (
              <p
                id={`err-name-${company.id}`}
                role="alert"
                className="text-xs text-destructive leading-tight"
              >
                {fieldErrors.name}
              </p>
            )}

            {/* API Key — write-only, password input, only in edit mode */}
            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                value={draftApiKey}
                onChange={(e) => {
                  setDraftApiKey(e.target.value);
                  if (fieldErrors.apiKey)
                    setFieldErrors((prev) => ({ ...prev, apiKey: "" }));
                }}
                onKeyDown={handleKeyDown}
                disabled={isUpdating}
                placeholder="New API key (leave blank to keep)"
                aria-label={`New API key for company ${company.id}`}
                aria-invalid={!!fieldErrors.apiKey}
                aria-describedby={
                  fieldErrors.apiKey ? `err-apikey-${company.id}` : undefined
                }
                className="h-8 text-sm pr-9"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showApiKey ? "Hide API key" : "Show API key"}
              >
                {showApiKey ? (
                  <EyeOff className="size-3.5" aria-hidden="true" />
                ) : (
                  <Eye className="size-3.5" aria-hidden="true" />
                )}
              </button>
            </div>
            {fieldErrors.apiKey && (
              <p
                id={`err-apikey-${company.id}`}
                role="alert"
                className="text-xs text-destructive leading-tight"
              >
                {fieldErrors.apiKey}
              </p>
            )}
          </div>
        ) : (
          <span className="text-sm font-medium">{company.name}</span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell className="w-28">
        <Badge variant={statusVariant(company.status)} className="capitalize">
          {company.status}
        </Badge>
      </TableCell>

      {/* Prices */}
      <TableCell className="w-36">
        <button
          onClick={() => navigate(`/shippings/${company.id}`)}
          disabled={isBusy}
          aria-label={`View prices for ${company.name}`}
          className="text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          View Prices →
        </button>
      </TableCell>

      {/* Actions */}
      <TableCell className="w-40 pr-6 text-right">
        {fieldErrors._server && (
          <p
            role="alert"
            className="mb-1 text-xs text-destructive leading-tight text-left"
          >
            {fieldErrors._server}
          </p>
        )}

        <div className="flex items-center justify-end gap-1">

          {isEditing ? (
            /* ── Confirm button (only enabled when something actually changed) ── */
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleConfirm}
              disabled={!isDirty || isUpdating}
              aria-label={`Confirm edit for company ${company.id}`}
              title={
                !isDirty
                  ? "Nothing changed"
                  : isUpdating
                  ? "Saving…"
                  : "Save changes"
              }
              className={
                isDirty && !isUpdating
                  ? "text-primary hover:text-primary hover:bg-primary/10"
                  : "text-muted-foreground/40"
              }
            >
              {isUpdating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
            </Button>
          ) : (
            /* ── Edit button ─────────────────────────────────────────────── */
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleEditClick}
              disabled={isBusy}
              aria-label={`Edit company ${company.name}`}
              title="Edit"
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
          )}

          {/* Delete — always visible, behind AlertDialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={isBusy}
                aria-label={`Delete company ${company.name}`}
                title={isDeleting ? "Deleting…" : "Delete"}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete shipping company?</AlertDialogTitle>
                <AlertDialogDescription>
                  This company has a soft-delete — it will be hidden but its
                  prices may prevent hard deletion if orders reference it.{" "}
                  <strong>{company.name}</strong> will no longer appear in the
                  list.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── ShippingCompanyTable ─────────────────────────────────────────────────────
// Renders the full shadcn/ui Table with one ShippingCompanyRow per company.
// ─────────────────────────────────────────────────────────────────────────────
function ShippingCompanyTable({ companies }) {
  if (!companies || companies.length === 0) {
    return (
      <div className="border-t border-dashed border-border bg-muted/20 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No shipping companies yet. Add one using the button above.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-b bg-muted/50">
          <TableHead className="w-16 pl-6 text-xs uppercase tracking-wider text-muted-foreground">
            ID
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Name
          </TableHead>
          <TableHead className="w-28 text-xs uppercase tracking-wider text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="w-36 text-xs uppercase tracking-wider text-muted-foreground">
            Prices
          </TableHead>
          <TableHead className="w-40 pr-6 text-right text-xs uppercase tracking-wider text-muted-foreground">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {companies.map((company) => (
          <ShippingCompanyRow key={company.id} company={company} />
        ))}
      </TableBody>
    </Table>
  );
}

export default ShippingCompanyTable;
