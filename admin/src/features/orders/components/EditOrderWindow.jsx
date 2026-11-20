import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useUpdateOrderInfo } from "@/features/orders";
import { useGetCommunesByWilaya } from "@/features/communes/hooks/useGetCommunesByWilaya";
import { useGetWilayas } from "@/features/wilaya";

const PHONE_RE = /^0\d{9}$/;
const WILAYA_RE = /^\d{2}$/;

function getInitialForm(order) {
  return {
    name: order.name,
    phoneNumber: order.phoneNumber,
    wilayaCode: order.wilayaCode,
    communeId: String(order.communeId),
  };
}

function EditOrderWindow({ order, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => getInitialForm(order));
  const [errors, setErrors] = useState({});

  const { mutate, isPending } = useUpdateOrderInfo();
  const { data: wilayasData, isLoading: wilayasLoading } = useGetWilayas();

  const wilayaReady = WILAYA_RE.test(form.wilayaCode.trim());
  const { data: communesData, isLoading: communesLoading } = useGetCommunesByWilaya(
    wilayaReady ? form.wilayaCode.trim() : "",
  );

  const wilayas = wilayasData?.data ?? [];
  const communes = communesData?.data ?? [];

  function handleOpenChange(nextOpen) {
    if (nextOpen) {
      setForm(getInitialForm(order));
      setErrors({});
    }
    setOpen(nextOpen);
  }

  function setField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: "" }));
    }
  }

  function handleWilayaChange(wilayaCode) {
    setForm((previous) => ({ ...previous, wilayaCode, communeId: "" }));
    setErrors((previous) => ({
      ...previous,
      wilayaCode: "",
      communeId: "",
    }));
  }

  function validate() {
    const next = {};

    if (!form.name.trim()) next.name = "Customer name is required.";

    if (!form.phoneNumber.trim()) {
      next.phoneNumber = "Phone number is required.";
    } else if (!PHONE_RE.test(form.phoneNumber.trim())) {
      next.phoneNumber = "Must be 10 digits starting with 0 (e.g. 0555123456).";
    }

    if (!WILAYA_RE.test(form.wilayaCode.trim())) {
      next.wilayaCode = "Please select a wilaya.";
    }

    if (!form.communeId) next.communeId = "Please select a commune.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildPayload() {
    const payload = {};
    const name = form.name.trim();
    const phoneNumber = form.phoneNumber.trim();

    if (name !== order.name) payload.name = name;
    if (phoneNumber !== order.phoneNumber) payload.phoneNumber = phoneNumber;
    if (form.wilayaCode !== order.wilayaCode) payload.wilayaCode = form.wilayaCode;

    const communeId = Number(form.communeId);
    if (communeId !== order.communeId) payload.communeId = communeId;

    return payload;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    const data = buildPayload();
    if (Object.keys(data).length === 0) {
      setOpen(false);
      return;
    }

    mutate(
      { id: order.id, data },
      {
        onSuccess: () => setOpen(false),
        onError: (error) => {
          setErrors((previous) => ({
            ...previous,
            form: error?.message ?? "Failed to update order information.",
          }));
        },
      },
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => handleOpenChange(true)}
        disabled={disabled || isPending}
        aria-label={`Edit order #${order.id}`}
        title={isPending ? "Saving…" : "Edit order"}
        className="text-muted-foreground hover:text-foreground"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Pencil className="size-4" aria-hidden="true" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Order Information</DialogTitle>
            <DialogDescription>
              Edit the customer and delivery details for order #{order.id}.
            </DialogDescription>
          </DialogHeader>

          <form
            id={`edit-order-form-${order.id}`}
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4 py-2"
          >
            {errors.form && (
              <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {errors.form}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`eo-name-${order.id}`}>Customer Name</Label>
                <Input
                  id={`eo-name-${order.id}`}
                  type="text"
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                  disabled={isPending}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? `eo-name-error-${order.id}` : undefined}
                  autoComplete="off"
                />
                {errors.name && (
                  <p id={`eo-name-error-${order.id}`} role="alert" className="text-xs text-destructive">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`eo-phone-${order.id}`}>Phone Number</Label>
                <Input
                  id={`eo-phone-${order.id}`}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phoneNumber}
                  onChange={(event) => setField("phoneNumber", event.target.value)}
                  disabled={isPending}
                  aria-invalid={!!errors.phoneNumber}
                  aria-describedby={errors.phoneNumber ? `eo-phone-error-${order.id}` : undefined}
                  autoComplete="tel"
                />
                {errors.phoneNumber && (
                  <p id={`eo-phone-error-${order.id}`} role="alert" className="text-xs text-destructive">
                    {errors.phoneNumber}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`eo-wilaya-${order.id}`}>Wilaya</Label>
                <Select
                  value={form.wilayaCode}
                  onValueChange={handleWilayaChange}
                  disabled={isPending || wilayasLoading}
                >
                  <SelectTrigger
                    id={`eo-wilaya-${order.id}`}
                    aria-invalid={!!errors.wilayaCode}
                    aria-describedby={errors.wilayaCode ? `eo-wilaya-error-${order.id}` : undefined}
                  >
                    <SelectValue placeholder={wilayasLoading ? "Loading…" : "Select wilaya…"} />
                  </SelectTrigger>
                  <SelectContent>
                    {wilayas.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-muted-foreground text-center">
                        No wilayas found
                      </p>
                    ) : (
                      wilayas.map((wilaya) => (
                        <SelectItem key={wilaya.code} value={wilaya.code}>
                          {wilaya.code} — {wilaya.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.wilayaCode && (
                  <p id={`eo-wilaya-error-${order.id}`} role="alert" className="text-xs text-destructive">
                    {errors.wilayaCode}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`eo-commune-${order.id}`}>Commune</Label>
                <Select
                  value={form.communeId}
                  onValueChange={(value) => setField("communeId", value)}
                  disabled={isPending || !wilayaReady || communesLoading}
                >
                  <SelectTrigger
                    id={`eo-commune-${order.id}`}
                    aria-invalid={!!errors.communeId}
                    aria-describedby={errors.communeId ? `eo-commune-error-${order.id}` : undefined}
                  >
                    <SelectValue
                      placeholder={
                        !wilayaReady
                          ? "Select a wilaya first…"
                          : communesLoading
                            ? "Loading…"
                            : "Select commune…"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {communes.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-muted-foreground text-center">
                        No communes found for this wilaya
                      </p>
                    ) : (
                      communes.map((commune) => (
                        <SelectItem key={commune.id} value={String(commune.id)}>
                          {commune.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.communeId && (
                  <p id={`eo-commune-error-${order.id}`} role="alert" className="text-xs text-destructive">
                    {errors.communeId}
                  </p>
                )}
              </div>
            </div>
          </form>

          <DialogFooter className="gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form={`edit-order-form-${order.id}`}
              disabled={isPending || wilayasLoading || communesLoading}
              className="gap-1.5"
            >
              {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default EditOrderWindow;
