import * as React from "react";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAddCategory } from "@/features/categories";

// ─── AddCategoryBar ───────────────────────────────────────────────────────────
// Toolbar sitting above the categories table.
// Lets the user type a new category name and submit it.
// ─────────────────────────────────────────────────────────────────────────────
function AddCategoryBar() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const { mutate, isPending } = useAddCategory();

  // ── helpers ────────────────────────────────────────────────────────────────
  const trimmed = name.trim();

  function validate() {
    if (!trimmed) {
      setError("Category name cannot be empty.");
      return false;
    }
    if (trimmed.length > 100) {
      setError("Category name must be at most 100 characters.");
      return false;
    }
    setError("");
    return true;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setName("");
          setError("");
        },
        onError: (err) => {
          setError(err?.message ?? "Failed to add category. Please try again.");
        },
      }
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
      aria-label="Add new category"
    >
      {/* Input */}
      <div className="relative flex-1">
        <Input
          id="new-category-name"
          type="text"
          placeholder="New category name…"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          disabled={isPending}
          aria-invalid={!!error}
          aria-describedby={error ? "add-cat-error" : undefined}
          maxLength={101}
          className="pr-3"
          autoComplete="off"
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isPending || !name.trim()}
        className="shrink-0 gap-1.5"
        aria-label="Add category"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="size-4" aria-hidden="true" />
        )}
        Add Category
      </Button>

      {/* Inline validation message */}
      {error && (
        <p
          id="add-cat-error"
          role="alert"
          className="text-xs font-medium text-destructive sm:absolute sm:bottom-[-1.4rem] sm:left-0"
        >
          {error}
        </p>
      )}
    </form>
  );
}

export default AddCategoryBar;
