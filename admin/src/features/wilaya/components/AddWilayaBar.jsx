import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAddWilaya } from "@/features/wilaya/hooks/useAddWilaya";

// ─── AddWilayaBar ───────────────────────────────────────────────────────────
// Toolbar sitting above the wilaya table.
// Lets the user enter a Wilaya code and name and submit them.
// ─────────────────────────────────────────────────────────────────────────────
function AddWilayaBar() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const { mutate, isPending } = useAddWilaya();

  // ── helpers ────────────────────────────────────────────────────────────────
  const trimmedCode = code.trim();
  const trimmedName = name.trim();

  function validate() {
    if (!/^\d{2}$/.test(trimmedCode)) {
      setError("Wilaya code must be exactly 2 digits.");
      return false;
    }
    if (!trimmedName) {
      setError("Wilaya name cannot be empty.");
      return false;
    }
    if (trimmedName.length > 100) {
      setError("Wilaya name must be at most 100 characters.");
      return false;
    }
    setError("");
    return true;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    mutate(
      { code: trimmedCode, name: trimmedName },
      {
        onSuccess: () => {
          setCode("");
          setName("");
          setError("");
        },
        onError: (err) => {
          setError(err?.message ?? "Failed to add Wilaya. Please try again.");
        },
      }
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="relative flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
      aria-label="Add new Wilaya"
    >
      {/* Wilaya code */}
      <div className="relative flex-1">
        <Input
          id="new-wilaya-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{2}"
          placeholder="Wilaya code (e.g. 16)"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError("");
          }}
          disabled={isPending}
          aria-label="Wilaya code"
          aria-invalid={!!error}
          aria-describedby={error ? "add-wilaya-error" : undefined}
          maxLength={2}
          className="pr-3"
          autoComplete="off"
        />
      </div>

      {/* Wilaya name */}
      <div className="relative flex-1">
        <Input
          id="new-wilaya-name"
          type="text"
          placeholder="Wilaya name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          disabled={isPending}
          aria-label="Wilaya name"
          aria-invalid={!!error}
          aria-describedby={error ? "add-wilaya-error" : undefined}
          maxLength={101}
          className="pr-3"
          autoComplete="off"
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isPending || !trimmedCode || !trimmedName}
        className="shrink-0 gap-1.5"
        aria-label="Add Wilaya"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="size-4" aria-hidden="true" />
        )}
        Add Wilaya
      </Button>

      {/* Inline validation message */}
      {error && (
        <p
          id="add-wilaya-error"
          role="alert"
          className="text-xs font-medium text-destructive sm:absolute sm:bottom-[-1.4rem] sm:left-0"
        >
          {error}
        </p>
      )}
    </form>
  );
}

export default AddWilayaBar;
