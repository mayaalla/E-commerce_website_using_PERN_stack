import { useState, useRef, useEffect, useId } from "react";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import { useUpdateWilaya } from "@/features/wilaya/hooks/useUpdateWilaya";
import { useDeleteWilaya } from "@/features/wilaya/hooks/useDeleteWilaya";

// ─── WilayaRow ──────────────────────────────────────────────────────────────
// A single row in the wilayas table.
//
// Behaviour:
//   • Displays Wilaya code + name as plain text by default.
//   • Clicking ✏ Edit activates an inline <Input> for the name.
//   • The ✓ Confirm button is only enabled when the name has actually changed.
//   • Clicking 🗑 Delete triggers the delete mutation with optimistic feedback.
// ─────────────────────────────────────────────────────────────────────────────
function WilayaRow({ wilaya, orderCount = 0 }) {
  const inputId = useId();
  const navigate = useNavigate();

  // ── local state ────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(wilaya.name);
  const [fieldError, setFieldError] = useState("");
  const inputRef = useRef(null);

  const { mutate: update, isPending: isUpdating } = useUpdateWilaya();
  const { mutate: remove, isPending: isDeleting } = useDeleteWilaya();

  const isDirty = draft.trim() !== wilaya.name;
  const isBusy = isUpdating || isDeleting;

  // Focus the input as soon as editing mode opens
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  // ── handlers ───────────────────────────────────────────────────────────────
  function handleEditClick() {
    setDraft(wilaya.name);
    setFieldError("");
    setIsEditing(true);
  }

  function handleCancel() {
    setDraft(wilaya.name);
    setFieldError("");
    setIsEditing(false);
  }

  function handleConfirm() {
    if (!isDirty) return;

    const trimmed = draft.trim();

    // Validation
    if (!trimmed) {
      setFieldError("Name cannot be empty.");
      inputRef.current?.focus();
      return;
    }
    if (trimmed.length > 100) {
      setFieldError("Name must be at most 100 characters.");
      inputRef.current?.focus();
      return;
    }

    update(
      { id: wilaya.code, data: { name: trimmed } },
      {
        onSuccess: () => {
          setIsEditing(false);
          setFieldError("");
        },
        onError: (err) => {
          setFieldError(
            err?.message ?? "Failed to update. Please try again."
          );
          inputRef.current?.focus();
        },
      }
    );
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") handleCancel();
  }

  function handleDelete() {
    remove(wilaya.code);
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <TableRow
      data-state={isEditing ? "editing" : undefined}
      className={
        isEditing
          ? "bg-primary/5 dark:bg-primary/10"
          : undefined
      }
    >
      {/* Code */}
      <TableCell className="w-16 pl-6 text-muted-foreground font-mono text-xs select-none">
        {wilaya.code}
      </TableCell>

      {/* Name — plain text OR inline editable input */}
      <TableCell className="max-w-xs">
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <Input
              ref={inputRef}
              id={inputId}
              type="text"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (fieldError) setFieldError("");
              }}
              onKeyDown={handleKeyDown}
              disabled={isUpdating}
              aria-label={`Edit name for Wilaya ${wilaya.code}`}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? `err-${wilaya.code}` : undefined}
              maxLength={101}
              className="h-8 text-sm"
              autoComplete="off"
            />
            {fieldError && (
              <p
                id={`err-${wilaya.code}`}
                role="alert"
                className="text-xs text-destructive leading-tight"
              >
                {fieldError}
              </p>
            )}
          </div>
        ) : (
          <span className="text-sm font-medium">{wilaya.name}</span>
        )}
      </TableCell>

      {/* Communes */}
      <TableCell className="w-36">
        <button
          onClick={() =>
            navigate(`/commune/${encodeURIComponent(wilaya.code)}`)
          }
          disabled={isBusy}
          aria-label={`View communes for Wilaya ${wilaya.name}`}
          className="text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          View Commune →
        </button>
      </TableCell>

      {/* Orders */}
      <TableCell className="w-28">
        <span className="text-sm font-medium tabular-nums">
          {orderCount.toLocaleString()}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell className="w-28 pr-6 text-right">
        <div className="flex items-center justify-end gap-1">
          {isEditing ? (
            <>
              {/* Confirm */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleConfirm}
                disabled={!isDirty || isUpdating}
                aria-label={`Confirm edit for Wilaya ${wilaya.code}`}
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

              {/* Cancel */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCancel}
                disabled={isUpdating}
                aria-label="Cancel editing"
                title="Cancel"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </>
          ) : (
            /* ── Edit button ─────────────────────────────────────────────── */
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleEditClick}
              disabled={isBusy}
              aria-label={`Edit Wilaya ${wilaya.name}`}
              title="Edit"
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
          )}

          {/* Delete button — always visible */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            disabled={isBusy}
            aria-label={`Delete Wilaya ${wilaya.name}`}
            title={isDeleting ? "Deleting…" : "Delete"}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── WilayaTable ────────────────────────────────────────────────────────────
// Renders the full shadcn/ui Table with one WilayaRow per Wilaya.
// Lives inside the wilayasPanel Card — no extra wrapper border needed.
// ─────────────────────────────────────────────────────────────────────────────
function WilayaTable({ wilayas, orderCountsByCode = {} }) {
  if (!wilayas || wilayas.length === 0) {
    return (
      <div className="border-t border-dashed border-border bg-muted/20 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No wilayas yet. Add one above to get started.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-b bg-muted/50">
          <TableHead className="w-16 pl-6 text-xs uppercase tracking-wider text-muted-foreground">
            Code
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Name
          </TableHead>
          <TableHead className="w-36 text-xs uppercase tracking-wider text-muted-foreground">
            View Commune →
          </TableHead>
          <TableHead className="w-28 text-xs uppercase tracking-wider text-muted-foreground">
            Orders
          </TableHead>
          <TableHead className="w-28 pr-6 text-right text-xs uppercase tracking-wider text-muted-foreground">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {wilayas.map((wilaya) => (
          <WilayaRow
            key={wilaya.code}
            wilaya={wilaya}
            orderCount={orderCountsByCode[wilaya.code] ?? 0}
          />
        ))}
      </TableBody>
    </Table>
  );
}

export default WilayaTable;
