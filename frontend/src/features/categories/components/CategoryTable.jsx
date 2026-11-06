import * as React from "react";
import { useState, useRef, useEffect, useId } from "react";
import { Pencil, Trash2, Check, Loader2 } from "lucide-react";

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

import { useUpdateCategory, useDeleteCategory } from "@/features/categories";

// ─── CategoryRow ──────────────────────────────────────────────────────────────
// A single row in the categories table.
//
// Behaviour:
//   • Displays category id + name as plain text by default.
//   • Clicking ✏ Edit activates an inline <Input> for the name.
//   • The ✓ Confirm button is only enabled when the name has actually changed.
//   • Clicking 🗑 Delete triggers the delete mutation with optimistic feedback.
// ─────────────────────────────────────────────────────────────────────────────
function CategoryRow({ category }) {
  const inputId = useId();

  // ── local state ────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(category.name);
  const [fieldError, setFieldError] = useState("");
  const inputRef = useRef(null);

  const { mutate: update, isPending: isUpdating } = useUpdateCategory();
  const { mutate: remove, isPending: isDeleting } = useDeleteCategory();

  const isDirty = draft.trim() !== category.name;
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
    setDraft(category.name);
    setFieldError("");
    setIsEditing(true);
  }

  function handleCancel() {
    setDraft(category.name);
    setFieldError("");
    setIsEditing(false);
  }

  function handleConfirm() {
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
      { id: category.id, data: { name: trimmed } },
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
    remove(category.id);
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
      {/* ID */}
      <TableCell className="w-16 text-muted-foreground font-mono text-xs select-none">
        #{category.id}
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
              aria-label={`Edit name for category ${category.id}`}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? `err-${category.id}` : undefined}
              maxLength={101}
              className="h-8 text-sm"
              autoComplete="off"
            />
            {fieldError && (
              <p
                id={`err-${category.id}`}
                role="alert"
                className="text-xs text-destructive leading-tight"
              >
                {fieldError}
              </p>
            )}
          </div>
        ) : (
          <span className="text-sm font-medium">{category.name}</span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-24 text-right">
        <div className="flex items-center justify-end gap-1">
          {isEditing ? (
            /* ── Confirm button (only enabled when name actually changed) ── */
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleConfirm}
              disabled={!isDirty || isUpdating}
              aria-label={`Confirm edit for category ${category.id}`}
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
              aria-label={`Edit category ${category.name}`}
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
            aria-label={`Delete category ${category.name}`}
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

// ─── CategoryTable ────────────────────────────────────────────────────────────
// Renders the full shadcn/ui Table with one CategoryRow per category.
// ─────────────────────────────────────────────────────────────────────────────
function CategoryTable({ categories }) {
  if (!categories || categories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No categories yet. Add one above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b bg-muted/50">
            <TableHead className="w-16 text-xs uppercase tracking-wider text-muted-foreground">
              ID
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
              Name
            </TableHead>
            <TableHead className="w-24 text-right text-xs uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {categories.map((cat) => (
            <CategoryRow key={cat.id} category={cat} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default CategoryTable;
