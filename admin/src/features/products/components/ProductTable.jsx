import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { Pencil, Trash2, Loader2, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { useUpdateProduct, useDeleteProduct } from "@/features/products";
import { useGetCategories } from "@/features/categories";
import { apiClient } from "@/lib/api-client";

// ─── Constants ────────────────────────────────────────────────────────────────
const CLOTHING_SIZES = ["34", "36", "38", "40", "42", "44", "46", "48"];
const MAX_BADGES = 3;
const MAX_PRODUCT_IMAGES = 8;
const MAX_IMAGE_SIZE_BYTES = 5_242_880;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// ─── Color picker constants (mirrors AddProductWindow) ────────────────────────
/** 16 famous preset colors shown as swatches */
const PRESET_COLORS = [
  { hex: "#000000", label: "Black" },
  { hex: "#FFFFFF", label: "White" },
  { hex: "#FF0000", label: "Red" },
  { hex: "#0000FF", label: "Blue" },
  { hex: "#008000", label: "Green" },
  { hex: "#FFFF00", label: "Yellow" },
  { hex: "#FFA500", label: "Orange" },
  { hex: "#800080", label: "Purple" },
  { hex: "#FFC0CB", label: "Pink" },
  { hex: "#A52A2A", label: "Brown" },
  { hex: "#808080", label: "Gray" },
  { hex: "#C0C0C0", label: "Silver" },
  { hex: "#FFD700", label: "Gold" },
  { hex: "#40E0D0", label: "Turquoise" },
  { hex: "#000080", label: "Navy" },
  { hex: "#FFCBA4", label: "Skin" },
];

/** Light-coloured swatches that need a dark border / check mark */
const LIGHT_HEXES = new Set([
  "#FFFFFF",
  "#FFFF00",
  "#FFCBA4",
  "#C0C0C0",
  "#FFD700",
  "#FFC0CB",
]);
const isLightHex = (hex) => LIGHT_HEXES.has(hex.toUpperCase());

/**
 * Convert the product's colors array (string names) into the
 * selectedColors format: { hex, name }[].
 *
 * Strategy:
 *   • If the name matches a preset label → use that preset's hex.
 *   • If the name is itself a valid hex (#RRGGBB) → use it directly.
 *   • Otherwise → store it as a chip with a generated hex placeholder
 *     that won't collide with presets (we use the string as both hex key
 *     and name, but wrapped so the UI still works).
 */
function colorsArrayToSelected(colors) {
  return colors.map((name) => {
    // Try to find a matching preset by label (case-insensitive)
    const preset = PRESET_COLORS.find(
      (p) => p.label.toLowerCase() === name.toLowerCase()
    );
    if (preset) return { hex: preset.hex.toUpperCase(), name: preset.label };

    // Check if it's already a hex value
    if (/^#[0-9A-Fa-f]{6}$/.test(name)) {
      return { hex: name.toUpperCase(), name: name.toUpperCase() };
    }

    // Unknown name — store it with a fake hex key so the chip renders.
    // We generate a stable-ish key by hashing the name string.
    const fakeHex = "#" + [...name].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffff, 0)
      .toString(16)
      .padStart(6, "0")
      .toUpperCase();
    return { hex: fakeHex, name };
  });
}

// ─── EditProductDialog ────────────────────────────────────────────────────────
// Dialog that lets the user edit a product's fields.
// Colors section mirrors AddProductWindow: preset swatches + hex picker + chips.
// Only submits fields that actually changed (dirty check).
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Build the initial stock grid from the product's existing stock rows.
 * Returns a map keyed by "COLORHEX|size" → stock count (string for input binding).
 *
 * We use a flat map (not a nested object) so React state updates stay simple
 * and we can always derive the array for the API from the current form state.
 */
function buildInitialStockGrid(product) {
  const grid = {};
  for (const entry of product.stock ?? []) {
    // colorHex from API is already uppercase without #
    const key = `${entry.colorHex.toUpperCase()}|${entry.size}`;
    grid[key] = String(entry.stock);
  }
  return grid;
}

function buildInitialForm(product) {
  return {
    title: product.title,
    description: product.description,
    price: String(product.price),
    promo: product.promo ?? "",
    categoryId: String(product.categoryId),
    // Convert string names → { hex, name }[] using the helper above
    selectedColors: colorsArrayToSelected(product.colors),
    sizes: [...product.sizes],
  };
}

function buildInitialImageDraft(product) {
  return (product.images ?? []).map((url, originalIndex) => ({
    originalUrl: url,
    originalIndex,
    file: null,
    preview: url,
  }));
}

function EditProductDialog({ product, open, onOpenChange }) {
  const { data: categoriesData, isSuccess: categoriesLoaded } = useGetCategories();
  const categories = categoriesData?.data ?? [];

  // Initialise draft from current product values
  const [form, setForm] = useState(() => buildInitialForm(product));
  const [errors, setErrors] = useState({});
  const [imageDraft, setImageDraft] = useState(() => buildInitialImageDraft(product));
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRefs = React.useRef({});
  const addImagesInputRef = React.useRef(null);

  /** Tracks the value of the hex-picker input (not yet committed) */
  const [pickerHex, setPickerHex] = useState("#e11d48");
  /** Optional custom name the admin types before hitting "Add" */
  const [pickerName, setPickerName] = useState("");

  /**
   * Stock grid: flat map keyed by "COLORHEX|size" → stock count (string).
   *
   * NOTE: GET /products (the list) does NOT embed stock — only create/update
   * responses do. So we fetch GET /products/:id when the dialog opens to get
   * the real stock data, then hydrate the grid from it.
   */
  const [stockGrid, setStockGrid] = useState({});
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Re-sync form state whenever the dialog is opened (or product data changes),
  // so that re-opening the dialog after a save always shows fresh data.
  useEffect(() => {
    if (!open) return;

    // Reset form immediately with the data we already have from the list.
    setForm(buildInitialForm(product));
    setImageDraft(buildInitialImageDraft(product));
    setErrors({});
    setPickerHex("#e11d48");
    setPickerName("");

    // Fetch the stock for this product from the dedicated stock endpoint.
    // The list endpoint omits stock for performance; GET /products/:id also
    // does not include stock — only GET /products/:id/stock does.
    setIsLoadingStock(true);
    apiClient
      .get(`/products/${product.id}/stock`)
      .then((res) => {
        // The stock endpoint returns { success: true, data: StockEntry[] }
        const stockEntries = res.data?.data ?? [];
        const grid = {};
        for (const entry of stockEntries) {
          const key = `${entry.colorHex.toUpperCase()}|${entry.size}`;
          grid[key] = String(entry.stock);
        }
        setStockGrid(grid);
      })
      .catch(() => {
        // If the fetch fails, fall back to whatever stock is already on the
        // product object (empty on list responses → shows 0s, which is safe).
        setStockGrid(buildInitialStockGrid(product));
      })
      .finally(() => setIsLoadingStock(false));
  }, [open, product]);

  /**
   * Update a single cell in the stock grid.
   * @param {string} colorHex - Uppercase hex WITHOUT #  (e.g. "FF0000")
   * @param {string} size     - Clothing size (e.g. "40")
   * @param {string} rawValue - Raw string from the number <input>
   */
  function setStockCell(colorHex, size, rawValue) {
    const key = `${colorHex}|${size}`;
    setStockGrid((prev) => ({ ...prev, [key]: rawValue }));
  }

  /**
   * Read a cell value from the grid (defaults to "0").
   */
  function getStockCell(colorHex, size) {
    return stockGrid[`${colorHex}|${size}`] ?? "0";
  }

  /**
   * Convert the stockGrid back into the StockEntry[] array the API expects.
   * Only includes cells whose colors and sizes are in the current form state,
   * so removing a color/size automatically removes orphaned stock entries too.
   */
  function buildStockEntries() {
    const entries = [];
    for (const { hex } of form.selectedColors) {
      const colorHex = hex.replace("#", "").toUpperCase();
      for (const size of form.sizes) {
        const rawVal = stockGrid[`${colorHex}|${size}`] ?? "0";
        const qty = parseInt(rawVal, 10);
        entries.push({ colorHex, size, stock: isNaN(qty) || qty < 0 ? 0 : qty });
      }
    }
    return entries;
  }

  const { mutate: update, isPending: isUpdating } = useUpdateProduct();
  const isPending = isUpdating || isUploading;
  const isBusy = isPending;

  // ── Dirty check: is there anything worth saving? ───────────────────────────
  // Recomputed whenever form, imageDraft, or stockGrid changes.
  // While stock is still loading we treat the form as not-dirty so the button
  // stays disabled until we have a real baseline to compare against.
  const isDirty = useMemo(() => {
    if (isLoadingStock) return false;

    const hasNewImages = imageDraft.some((img) => img.file);
    const hasImageRemovals =
      imageDraft.length !== (product.images ?? []).length ||
      imageDraft.some((img, i) => img.originalIndex !== i);

    if (hasNewImages || hasImageRemovals) return true;

    if (form.title.trim()       !== product.title)       return true;
    if (form.description.trim() !== product.description) return true;
    if (normalisePrice(form.price.trim()) !== normalisePrice(String(product.price))) return true;

    const formPromo = form.promo.trim() === "" ? null : normalisePrice(form.promo.trim());
    const origPromo = product.promo == null ? null : normalisePrice(String(product.promo));
    if (formPromo !== origPromo) return true;

    if (parseInt(form.categoryId, 10) !== product.categoryId) return true;

    if (
      JSON.stringify(form.selectedColors.map((c) => c.name || c.hex)) !==
      JSON.stringify(product.colors)
    ) return true;

    if (
      JSON.stringify([...form.sizes].sort()) !==
      JSON.stringify([...product.sizes].sort())
    ) return true;

    // Compare stock grid against the fetched baseline
    const currentEntries = buildStockEntries();
    const originalEntries = Object.entries(stockGrid).map(([key, val]) => {
      const [colorHex, size] = key.split("|");
      return { colorHex, size, stock: parseInt(val, 10) || 0 };
    });

    const sortEntries = (arr) =>
      [...arr].sort((a, b) =>
        `${a.colorHex}|${a.size}`.localeCompare(`${b.colorHex}|${b.size}`)
      );

    if (
      JSON.stringify(sortEntries(currentEntries)) !==
      JSON.stringify(sortEntries(originalEntries))
    ) return true;

    return false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, imageDraft, stockGrid, isLoadingStock, product]);

  // ── helpers ────────────────────────────────────────────────────────────────
  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validateImageFile(file) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return `${file.name} must be a JPEG, PNG, WebP, or GIF image.`;
    }
    if (file.size === 0 || file.size > MAX_IMAGE_SIZE_BYTES) {
      return `${file.name} must be larger than 0 bytes and not exceed 5 MB.`;
    }
    return "";
  }

  function addImages(files) {
    const accepted = [];
    const fileErrors = [];
    const remaining = MAX_PRODUCT_IMAGES - imageDraft.length;

    for (const file of files) {
      const fileError = validateImageFile(file);
      if (fileError) {
        fileErrors.push(fileError);
      } else if (accepted.length >= remaining) {
        fileErrors.push(`A product may have at most ${MAX_PRODUCT_IMAGES} images.`);
      } else {
        accepted.push(file);
      }
    }

    if (accepted.length > 0) {
      const entries = accepted.map((file) => ({
        originalUrl: null,
        originalIndex: null,
        file,
        preview: URL.createObjectURL(file),
      }));
      setImageDraft((previous) => [
        ...previous,
        ...entries,
      ]);
    }

    setErrors((previous) => ({ ...previous, images: fileErrors.join(" ") }));
  }

  function replaceImage(index, file) {
    const fileError = validateImageFile(file);
    if (fileError) {
      setErrors((previous) => ({ ...previous, images: fileError }));
      return;
    }

    const preview = URL.createObjectURL(file);
    const existingImage = imageDraft[index];
    if (existingImage?.file) URL.revokeObjectURL(existingImage.preview);
    setImageDraft((previous) =>
      previous.map((image, imageIndex) => {
        if (imageIndex !== index) return image;
        return { ...image, file, preview };
      })
    );
    setErrors((previous) => ({ ...previous, images: "" }));
  }

  function removeImage(index) {
    const image = imageDraft[index];
    if (image?.file) URL.revokeObjectURL(image.preview);
    setImageDraft((previous) => previous.filter((_, imageIndex) => imageIndex !== index));
    setErrors((previous) => ({ ...previous, images: "" }));
  }

  function resetImageDraft() {
    imageDraft.forEach((image) => {
      if (image.file) URL.revokeObjectURL(image.preview);
    });
    setImageDraft(buildInitialImageDraft(product));
  }

  function handleDialogOpenChange(nextOpen) {
    if (!nextOpen && isBusy) return;
    if (!nextOpen) resetImageDraft();
    onOpenChange(nextOpen);
  }

  function closeAfterSave() {
    resetImageDraft();
    onOpenChange(false);
  }

  function toggleSize(size) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size],
    }));
  }

  // ── Color helpers (identical to AddProductWindow) ──────────────────────────
  function togglePresetColor(hex, label) {
    const key = hex.toUpperCase();
    setForm((prev) => {
      const already = prev.selectedColors.some((c) => c.hex === key);
      return {
        ...prev,
        selectedColors: already
          ? prev.selectedColors.filter((c) => c.hex !== key)
          : [...prev.selectedColors, { hex: key, name: label }],
      };
    });
  }

  function addPickerColor() {
    const key = pickerHex.toUpperCase();
    const name = pickerName.trim() || key;
    setForm((prev) => {
      if (prev.selectedColors.some((c) => c.hex === key)) return prev;
      return {
        ...prev,
        selectedColors: [...prev.selectedColors, { hex: key, name }],
      };
    });
    setPickerName("");
  }

  function removeColor(hex) {
    const key = hex.toUpperCase();
    setForm((prev) => ({
      ...prev,
      selectedColors: prev.selectedColors.filter((c) => c.hex !== key),
    }));
  }

  function renameColor(hex, newName) {
    const key = hex.toUpperCase();
    setForm((prev) => ({
      ...prev,
      selectedColors: prev.selectedColors.map((c) =>
        c.hex === key ? { ...c, name: newName } : c
      ),
    }));
  }

  // ── build payload: always include all fields so the backend never
  // receives a partial update that wipes unchanged data.
  // Image-only changes (add / replace / delete) still work correctly
  // because the full product state is sent every time.
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Normalise a price/promo string so it always passes the backend
   * moneySchema regex (^\d+(\.\d{1,2})?$).
   *
   * Postgres numeric columns can return values like "1500.000" or "29.9"
   * that have more than 2 decimal places or a trailing zero pattern that
   * differs from what the user typed.  parseFloat → toFixed(2) → strip
   * trailing zeros gives us a canonical form like "1500", "29.9", "0.99".
   */
  function normalisePrice(raw) {
    const n = parseFloat(raw);
    if (isNaN(n)) return raw; // let validation catch it
    // toFixed(2) gives "1500.00"; replace removes the unnecessary ".00" / "0"
    return n.toFixed(2).replace(/\.?0+$/, "");
  }

  function buildPayload() {
    // ── Core fields: always included so the backend never sees a missing
    // field as "clear this value". ──────────────────────────────────────────
    const rawPromo = form.promo.trim();
    const payload = {
      title:       form.title.trim(),
      description: form.description.trim(),
      price:       normalisePrice(form.price.trim()),
      promo:       rawPromo === "" ? null : normalisePrice(rawPromo),
      categoryId:  parseInt(form.categoryId, 10),
      // Derive color name strings to send to the backend
      colors:      form.selectedColors.map((c) => c.name || c.hex),
      sizes:       form.sizes,
      // Always send the stock grid so the backend replaces it atomically.
      // buildStockEntries() only emits cells for the current colors × sizes
      // matrix, so removing a color/size also purges its orphaned stock rows.
      stockEntries: buildStockEntries(),
    };

    // ── Image removals: tell the backend which original URLs to delete ──────
    const retainedOriginalIndexes = new Set(
      imageDraft
        .map((image) => image.originalIndex)
        .filter((index) => index !== null)
    );
    const imageRemovals = (product.images ?? []).filter(
      (_image, index) => !retainedOriginalIndexes.has(index)
    );
    if (imageRemovals.length > 0) payload.imageRemovals = imageRemovals;

    return payload;
  }

  // ── validation ─────────────────────────────────────────────────────────────
  function validate() {
    const next = {};

    if (!form.title.trim()) next.title = "Title is required.";
    if (!form.description.trim()) next.description = "Description is required.";

    const priceNum = parseFloat(form.price);
    if (form.price === "" || isNaN(priceNum) || priceNum < 0) {
      next.price = "Price must be a non-negative number.";
    }
    if (form.promo !== "") {
      const promoNum = parseFloat(form.promo);
      if (isNaN(promoNum) || promoNum < 0) {
        next.promo = "Promo price must be a non-negative number.";
      } else if (!isNaN(priceNum) && promoNum > priceNum) {
        next.promo = "Promo price must be ≤ the regular price.";
      }
    }
    if (!form.categoryId) next.categoryId = "Category is required.";

    const hasImageChanges =
      imageDraft.length !== (product.images ?? []).length ||
      imageDraft.some((image, index) => image.file || image.originalIndex !== index);
    if (errors.images && !hasImageChanges) next.images = errors.images;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── submit ──────────────────────────────────────────────────────────────────
  async function uploadImagesToCloudinary(images) {
    if (images.length === 0) return [];

    const tokenResponse = await apiClient.post(
      "/products/upload/request-tokens",
      {
        files: images.map(({ file }) => ({
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        })),
      }
    );
    const tokens = tokenResponse.data.data;

    if (!Array.isArray(tokens) || tokens.length !== images.length) {
      throw new Error("The server returned invalid image upload tokens.");
    }

    return Promise.all(
      images.map(async (image, index) => {
        const { publicId, signature, timestamp, apiKey, cloudName } = tokens[index];
        const formData = new FormData();
        formData.append("file", image.file);
        formData.append("public_id", publicId);
        formData.append("signature", signature);
        formData.append("timestamp", String(timestamp));
        formData.append("api_key", apiKey);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body: formData }
        );
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            body?.error?.message ?? `Failed to upload "${image.file.name}".`
          );
        }

        const data = await response.json();
        return {
          publicId: data.public_id ?? publicId,
          version: data.version,
          signature: data.signature,
          ...(image.originalUrl ? { replaceImage: image.originalUrl } : {}),
        };
      })
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = buildPayload();
    const pendingImages = imageDraft.filter((image) => image.file);

    // Detect whether anything actually changed so we can skip the network
    // round-trip when the user clicks Save without touching anything.
    const currentStockEntries = buildStockEntries();
    const originalStockEntries = (product.stock ?? [])
      .filter((s) => {
        // Only keep original entries that are still part of the current color×size matrix
        const colorInForm = form.selectedColors.some(
          (c) => c.hex.replace("#", "").toUpperCase() === s.colorHex.toUpperCase()
        );
        const sizeInForm = form.sizes.includes(s.size);
        return colorInForm && sizeInForm;
      })
      .map((s) => ({ colorHex: s.colorHex.toUpperCase(), size: s.size, stock: s.stock }));

    const stockChanged =
      JSON.stringify(
        [...currentStockEntries].sort((a, b) =>
          `${a.colorHex}|${a.size}`.localeCompare(`${b.colorHex}|${b.size}`)
        )
      ) !==
      JSON.stringify(
        [...originalStockEntries].sort((a, b) =>
          `${a.colorHex}|${a.size}`.localeCompare(`${b.colorHex}|${b.size}`)
        )
      );

    const nothingChanged =
      pendingImages.length === 0 &&
      !payload.imageRemovals &&
      !stockChanged &&
      form.title.trim()       === product.title &&
      form.description.trim() === product.description &&
      normalisePrice(form.price.trim()) === normalisePrice(String(product.price)) &&
      (form.promo.trim() === "" ? null : normalisePrice(form.promo.trim())) ===
        (product.promo == null ? null : normalisePrice(String(product.promo))) &&
      parseInt(form.categoryId, 10) === product.categoryId &&
      JSON.stringify(form.selectedColors.map((c) => c.name || c.hex)) === JSON.stringify(product.colors) &&
      JSON.stringify([...form.sizes].sort()) === JSON.stringify([...product.sizes].sort());

    if (nothingChanged) {
      closeAfterSave();
      return;
    }

    try {
      if (pendingImages.length > 0) {
        setIsUploading(true);
        payload.imageUploads = await uploadImagesToCloudinary(pendingImages);
        setIsUploading(false);
      }

      update(
        { id: product.id, data: payload },
        {
          onSuccess: closeAfterSave,
          onError: (err) => {
            setErrors((prev) => ({
              ...prev,
              form: err?.message ?? "Failed to update product. Please try again.",
            }));
          },
        }
      );
    } catch (err) {
      setIsUploading(false);
      setErrors((previous) => ({
        ...previous,
        images: err?.message ?? "Image upload failed. Please try again.",
      }));
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the fields below. Only changed values will be saved.
          </DialogDescription>
        </DialogHeader>

        <form
          id={`edit-product-form-${product.id}`}
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4 py-2"
        >
          {/* ── Images ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label>Images</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {imageDraft.length} / {MAX_PRODUCT_IMAGES}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {imageDraft.map((image, index) => (
                  <div
                    key={image.originalUrl ?? image.preview}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-input bg-muted/30 shadow-sm"
                  >
                    <img
                      src={image.preview}
                      alt={image.file?.name ?? `Product image ${index + 1}`}
                      className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 transition-colors duration-150 group-hover:bg-black/35 group-focus-within:bg-black/35" />
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        disabled={isBusy}
                        aria-label={`Replace product image ${index + 1}`}
                        title="Replace image"
                        onClick={() => imageInputRefs.current[index]?.click()}
                        className="size-8 rounded-full border border-white/30 bg-background/95 text-foreground shadow-md backdrop-blur hover:bg-background"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        disabled={isBusy}
                        aria-label={`Delete product image ${index + 1}`}
                        title="Delete image"
                        onClick={() => removeImage(index)}
                        className="size-8 rounded-full border border-white/30 bg-background/95 text-destructive shadow-md backdrop-blur hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                    {image.file && (
                      <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full border border-white/20 bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm backdrop-blur">
                        {image.file.name}
                      </span>
                    )}
                    <input
                      ref={(element) => {
                        imageInputRefs.current[index] = element;
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      tabIndex={-1}
                      aria-hidden="true"
                      disabled={isBusy}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) replaceImage(index, file);
                        event.target.value = "";
                      }}
                    />
                  </div>
                ))}

            {imageDraft.length < MAX_PRODUCT_IMAGES && (
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                aria-label="Add product images"
                title="Add images"
                onClick={() => addImagesInputRef.current?.click()}
                className="group/add h-auto aspect-square w-full flex-col gap-2 rounded-lg border-dashed border-2 bg-muted/10 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
              >
                <span className="flex size-9 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors group-hover/add:border-primary/30 group-hover/add:text-primary">
                  <Plus className="size-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-medium">Add image</span>
              </Button>
            )}
            </div>

            <input
              ref={addImagesInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              disabled={isBusy}
              onChange={(event) => {
                addImages(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />

            <p className="text-[11px] text-muted-foreground">
              JPEG, PNG, WebP, or GIF · up to 5 MB per image · maximum {MAX_PRODUCT_IMAGES} images
            </p>
            {errors.images && (
              <p role="alert" className="text-xs text-destructive">
                {errors.images}
              </p>
            )}
          </div>

          {/* ── Title ──────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`ep-title-${product.id}`}>
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`ep-title-${product.id}`}
              type="text"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              disabled={isPending}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? `ep-title-err-${product.id}` : undefined}
              autoComplete="off"
            />
            {errors.title && (
              <p id={`ep-title-err-${product.id}`} role="alert" className="text-xs text-destructive">
                {errors.title}
              </p>
            )}
          </div>

          {/* ── Description ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`ep-desc-${product.id}`}>
              Description <span className="text-destructive">*</span>
            </Label>
            <textarea
              id={`ep-desc-${product.id}`}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              disabled={isPending}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? `ep-desc-err-${product.id}` : undefined}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {errors.description && (
              <p id={`ep-desc-err-${product.id}`} role="alert" className="text-xs text-destructive">
                {errors.description}
              </p>
            )}
          </div>

          {/* ── Price + Promo ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`ep-price-${product.id}`}>
                Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`ep-price-${product.id}`}
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                disabled={isPending}
                aria-invalid={!!errors.price}
                aria-describedby={errors.price ? `ep-price-err-${product.id}` : undefined}
              />
              {errors.price && (
                <p id={`ep-price-err-${product.id}`} role="alert" className="text-xs text-destructive">
                  {errors.price}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`ep-promo-${product.id}`}>
                Promo Price{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id={`ep-promo-${product.id}`}
                type="number"
                min="0"
                step="0.01"
                value={form.promo}
                onChange={(e) => setField("promo", e.target.value)}
                disabled={isPending}
                aria-invalid={!!errors.promo}
                aria-describedby={errors.promo ? `ep-promo-err-${product.id}` : undefined}
              />
              {errors.promo && (
                <p id={`ep-promo-err-${product.id}`} role="alert" className="text-xs text-destructive">
                  {errors.promo}
                </p>
              )}
            </div>
          </div>

          {/* ── Category ───────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`ep-category-${product.id}`}>
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              key={categoriesLoaded ? "loaded" : "loading"}
              value={form.categoryId}
              onValueChange={(val) => setField("categoryId", val)}
              disabled={isPending}
            >
              <SelectTrigger
                id={`ep-category-${product.id}`}
                aria-invalid={!!errors.categoryId}
                aria-describedby={errors.categoryId ? `ep-cat-err-${product.id}` : undefined}
              >
                <SelectValue placeholder="Select a category…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p id={`ep-cat-err-${product.id}`} role="alert" className="text-xs text-destructive">
                {errors.categoryId}
              </p>
            )}
          </div>

          {/* ── Colors ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Label>
                Colors{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              {form.selectedColors.length > 0 && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {form.selectedColors.length} selected
                </span>
              )}
            </div>

            {/* ── Card ── */}
            <div className="rounded-lg border border-input bg-muted/20 p-4 flex flex-col gap-4">
              {/* ── Preset swatches ── */}
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(({ hex, label }) => {
                    const key = hex.toUpperCase();
                    const isSelected = form.selectedColors.some((c) => c.hex === key);
                    const light = isLightHex(hex);
                    return (
                      <button
                        key={hex}
                        type="button"
                        title={label}
                        aria-label={`${label} — ${isSelected ? "remove" : "add"}`}
                        aria-pressed={isSelected}
                        disabled={isPending}
                        onClick={() => togglePresetColor(hex, label)}
                        style={{ backgroundColor: hex }}
                        className={[
                          "relative size-8 rounded-full transition-all duration-150 shrink-0",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          "disabled:pointer-events-none disabled:opacity-40",
                          isSelected
                            ? light
                              ? "ring-2 ring-offset-2 ring-black scale-110 shadow-md"
                              : "ring-2 ring-offset-2 ring-primary scale-110 shadow-md"
                            : light
                              ? "border border-border/70 hover:scale-110 hover:shadow-sm"
                              : "hover:scale-110 hover:shadow-sm",
                        ].join(" ")}
                      >
                        {isSelected && (
                          <span
                            className={[
                              "absolute inset-0 flex items-center justify-center text-[10px] font-black",
                              light ? "text-black" : "text-white",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Divider ── */}
              <div className="h-px bg-border/60" />

              {/* ── Custom color picker ── */}
              <div className="flex flex-col gap-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Custom color
                </p>

                {/* Row: swatch + hex badge */}
                <div className="flex items-center gap-3">
                  {/* Color wheel swatch */}
                  <div className="relative shrink-0">
                    <div
                      className="size-11 rounded-xl border-2 border-input shadow-sm cursor-pointer transition-transform hover:scale-105"
                      style={{ backgroundColor: pickerHex }}
                      aria-hidden="true"
                    />
                    <input
                      type="color"
                      value={pickerHex}
                      onChange={(e) => setPickerHex(e.target.value)}
                      disabled={isPending}
                      aria-label="Open color wheel"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:pointer-events-none"
                    />
                  </div>

                  {/* Info stack */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-mono font-medium text-foreground">
                      {pickerHex.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Click swatch to change
                    </span>
                  </div>
                </div>

                {/* Name input row */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`ep-custom-color-name-${product.id}`}
                    className="text-xs font-medium text-foreground"
                  >
                    Color name{" "}
                    <span className="font-normal text-muted-foreground">
                      — give it a name or leave blank to use the hex code
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id={`ep-custom-color-name-${product.id}`}
                      type="text"
                      placeholder={`e.g. "Dusty Rose" or leave blank`}
                      value={pickerName}
                      onChange={(e) => setPickerName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addPickerColor();
                        }
                      }}
                      disabled={isPending}
                      className="h-9 text-sm flex-1"
                      autoComplete="off"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={
                        isPending ||
                        form.selectedColors.some(
                          (c) => c.hex === pickerHex.toUpperCase()
                        )
                      }
                      onClick={addPickerColor}
                      className="shrink-0 h-9 px-4 gap-1.5"
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Selected color chips ── */}
            {form.selectedColors.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Selected — click a name to rename it
                </p>
                <div className="flex flex-wrap gap-2">
                  {form.selectedColors.map(({ hex, name }) => {
                    const light = isLightHex(hex);
                    const isUnnamed = name === hex.toUpperCase();
                    return (
                      <div
                        key={hex}
                        className={[
                          "group flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full border bg-background shadow-sm text-xs font-medium",
                          isUnnamed
                            ? "border-amber-400/60 ring-1 ring-amber-400/40"
                            : "border-border",
                        ].join(" ")}
                      >
                        {/* Color dot */}
                        <span
                          className={[
                            "inline-flex shrink-0 size-4 rounded-full border",
                            light ? "border-border" : "border-transparent",
                          ].join(" ")}
                          style={{ backgroundColor: hex }}
                          aria-hidden="true"
                        />

                        {/* Inline editable name */}
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => renameColor(hex, e.target.value)}
                          disabled={isPending}
                          aria-label={`Rename color ${name}`}
                          title={
                            isUnnamed
                              ? "This color has no name — click to rename"
                              : undefined
                          }
                          placeholder="Name…"
                          className={[
                            "bg-transparent border-none outline-none text-xs disabled:pointer-events-none",
                            "focus:underline focus:underline-offset-2 cursor-text",
                            isUnnamed
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-foreground",
                          ].join(" ")}
                          style={{ width: `${Math.max(name.length + 1, 7)}ch` }}
                        />

                        {/* Remove button */}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => removeColor(hex)}
                          aria-label={`Remove ${name}`}
                          className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:pointer-events-none ml-0.5"
                        >
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Hint if any chip is unnamed */}
                {form.selectedColors.some(
                  (c) => c.name === c.hex.toUpperCase()
                ) && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <span aria-hidden="true">⚠</span>
                    Some colors have no name — click the highlighted chip to rename them.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Sizes ──────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label>Sizes</Label>
            <div className="flex flex-wrap gap-2">
              {CLOTHING_SIZES.map((size) => {
                const checked = form.sizes.includes(size);
                return (
                  <label
                    key={size}
                    className={[
                      "flex items-center justify-center w-10 h-10 rounded-md border text-sm font-medium cursor-pointer select-none transition-colors",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-foreground hover:bg-muted",
                      isPending ? "opacity-50 pointer-events-none" : "",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleSize(size)}
                      disabled={isPending}
                      aria-label={`Size ${size}`}
                    />
                    {size}
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Stock Grid ─────────────────────────────────────────────── */}
          {form.selectedColors.length > 0 && form.sizes.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label>
                  Stock{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    — units per color &amp; size
                  </span>
                </Label>
              </div>

              {/* Responsive scrollable wrapper */}
              <div className="overflow-x-auto rounded-lg border border-input">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-input">
                      {/* Top-left corner cell */}
                      <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                        Color \ Size
                      </th>
                      {form.sizes.map((size) => (
                        <th
                          key={size}
                          className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground font-mono whitespace-nowrap"
                        >
                          {size}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.selectedColors.map(({ hex, name }, rowIndex) => {
                      const colorHex = hex.replace("#", "").toUpperCase();
                      return (
                        <tr
                          key={hex}
                          className={rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20"}
                        >
                          {/* Color label cell */}
                          <td className="sticky left-0 z-10 px-3 py-2 whitespace-nowrap border-r border-input"
                              style={{ backgroundColor: rowIndex % 2 === 0 ? undefined : "hsl(var(--muted) / 0.2)" }}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-flex size-4 shrink-0 rounded-full border border-border/60"
                                style={{ backgroundColor: hex }}
                                aria-hidden="true"
                              />
                              <span className="text-xs font-medium text-foreground max-w-[80px] truncate" title={name}>
                                {name}
                              </span>
                            </div>
                          </td>

                          {/* One input per size */}
                          {form.sizes.map((size) => (
                            <td key={size} className="px-2 py-1.5 text-center border-r border-input/50 last:border-r-0">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={getStockCell(colorHex, size)}
                                onChange={(e) => setStockCell(colorHex, size, e.target.value)}
                                disabled={isPending}
                                aria-label={`Stock for ${name} size ${size}`}
                                className="h-8 w-16 text-center text-sm tabular-nums px-1 mx-auto"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Enter the number of available units for each color &amp; size combination. Set to 0 to mark as out of stock.
              </p>
            </div>
          ) : (
            /* Guidance when no colors or sizes are selected yet */
            (form.selectedColors.length > 0 || form.sizes.length > 0) && (
              <div className="rounded-lg border border-dashed border-input bg-muted/10 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {form.selectedColors.length === 0
                    ? "Add at least one color above to manage stock."
                    : "Select at least one size above to manage stock."}
                </p>
              </div>
            )
          )}

          {/* ── Form-level error ───────────────────────────────────────── */}
          {errors.form && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {errors.form}
            </p>
          )}
        </form>

        <DialogFooter className="gap-2 pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form={`edit-product-form-${product.id}`}
            disabled={isPending || !isDirty}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {isUploading ? "Uploading…" : isUpdating ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ProductRow ───────────────────────────────────────────────────────────────
// A single row in the products table.
//
// Behaviour:
//   • Shows thumbnail (first image or placeholder), title, price/promo,
//     category name, truncated colors + sizes badges.
//   • ✏ Edit opens an EditProductDialog pre-filled with current data.
//   • 🗑 Delete triggers the delete mutation with optimistic spinner.
// ─────────────────────────────────────────────────────────────────────────────
function ProductRow({ product, categoryMap = {} }) {
  const [editOpen, setEditOpen] = useState(false);

  const { mutate: remove, isPending: isDeleting } = useDeleteProduct();
  // Pull categories from the shared React Query cache — zero extra network calls.
  const { data: categoriesData } = useGetCategories();

  function handleDelete() {
    remove(product.id);
  }

  // ── thumbnail ──────────────────────────────────────────────────────────────
  const thumbnail = product.images?.[0] ?? null;
  // Resolve category name from the live cache, then fall back to parent-enriched value
  const categories = categoriesData?.data ?? [];
  const categoryName =
    categories.find((c) => c.id === product.categoryId)?.name ??
    categoryMap[product.categoryId] ??
    product.categoryName ??
    "—";

  // ── truncated badges helpers ───────────────────────────────────────────────
  const visibleColors = product.colors.slice(0, MAX_BADGES);
  const extraColors = product.colors.length - MAX_BADGES;

  const visibleSizes = product.sizes.slice(0, MAX_BADGES);
  const extraSizes = product.sizes.length - MAX_BADGES;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <TableRow>
      {/* ID */}
      <TableCell className="w-16 pl-6 text-muted-foreground font-mono text-xs select-none">
        #{product.id}
      </TableCell>

      {/* Image */}
      <TableCell className="w-14">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={product.title}
            className="size-10 rounded-md object-cover border border-border"
          />
        ) : (
          <div
            className="size-10 rounded-md bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs"
            aria-label="No image"
          >
            —
          </div>
        )}
      </TableCell>

      {/* Title */}
      <TableCell className="max-w-[180px]">
        <span className="text-sm font-medium line-clamp-1">{product.title}</span>
      </TableCell>

      {/* Price / Promo */}
      <TableCell className="whitespace-nowrap">
        {product.promo ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold line-through text-muted-foreground">{product.price}</span>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">{product.promo}</span>
          </div>
        ) : (
          <span className="text-sm font-bold">{product.price}</span>
        )}
      </TableCell>

      {/* Category */}
      <TableCell>
        <Badge variant="secondary" className="font-mono text-xs">
          {categoryName}
        </Badge>
      </TableCell>

      {/* Colors */}
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {visibleColors.map((color) => (
            <Badge key={color} variant="outline" className="text-xs capitalize">
              {color}
            </Badge>
          ))}
          {extraColors > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              +{extraColors}
            </Badge>
          )}
          {product.colors.length === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </TableCell>

      {/* Sizes */}
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {visibleSizes.map((size) => (
            <Badge key={size} variant="outline" className="text-xs font-mono">
              {size}
            </Badge>
          ))}
          {extraSizes > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              +{extraSizes}
            </Badge>
          )}
          {product.sizes.length === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="w-24 pr-6 text-right">
        <div className="flex items-center justify-end gap-1">
          {/* Edit button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditOpen(true)}
            disabled={isDeleting}
            aria-label={`Edit product ${product.title}`}
            title="Edit"
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Button>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={`Delete product ${product.title}`}
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

        {/* Edit dialog — rendered here so it stays co-located with the row */}
        <EditProductDialog
          product={product}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      </TableCell>
    </TableRow>
  );
}

// ─── ProductTable ─────────────────────────────────────────────────────────────
// Renders the full shadcn/ui Table with one ProductRow per product.
// Pagination lives in <tfoot> — visually connected to the data rows.
// ─────────────────────────────────────────────────────────────────────────────

// ─── TablePagination ─────────────────────────────────────────────────────────
function TablePagination({ page, totalPages, total, limit, onPageChange }) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const pages = [];
  const delta = 1;
  const left = Math.max(1, page - delta);
  const right = Math.min(totalPages, page + delta);
  if (left > 1) { pages.push(1); if (left > 2) pages.push("…"); }
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages) { if (right < totalPages - 1) pages.push("…"); pages.push(totalPages); }

  return (
    <tfoot>
      <tr className="border-t border-border bg-muted/30">
        <td colSpan={8} className="px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Result count */}
            <p className="text-xs text-muted-foreground tabular-nums shrink-0">
              {total === 0
                ? "No results"
                : `${from}–${to} of ${total} products`}
            </p>

            {/* Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="size-3.5" />
                </button>

                {/* Page numbers */}
                {pages.map((p, i) =>
                  p === "…" ? (
                    <span
                      key={`el-${i}`}
                      className="flex size-7 items-center justify-center text-xs text-muted-foreground select-none"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => onPageChange(p)}
                      aria-current={p === page ? "page" : undefined}
                      className={[
                        "inline-flex size-7 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                        p === page
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      {p}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                  className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    </tfoot>
  );
}

function ProductTable({ products, categories = [], page, totalPages, total, limit, onPageChange }) {
  // Build an id→name lookup so ProductRow can resolve the category name at render
  // time rather than depending solely on the pre-enriched value from the parent.
  const categoryMap = React.useMemo(() => {
    const map = {};
    for (const cat of categories) map[cat.id] = cat.name;
    return map;
  }, [categories]);

  if (!products || products.length === 0) {
    return (
      <div className="border-t border-dashed border-border bg-muted/20 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No products found. Try adjusting your search or filters.
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
          <TableHead className="w-14 text-xs uppercase tracking-wider text-muted-foreground">
            Image
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Title
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Price / Promo
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Category
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Colors
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Sizes
          </TableHead>
          <TableHead className="w-24 pr-6 text-right text-xs uppercase tracking-wider text-muted-foreground">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {products.map((product) => (
          <ProductRow key={product.id} product={product} categoryMap={categoryMap} />
        ))}
      </TableBody>

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={onPageChange}
      />
    </Table>
  );
}

export default ProductTable;
