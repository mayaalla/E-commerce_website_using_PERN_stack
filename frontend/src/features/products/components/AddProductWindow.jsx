import { ImagePlus, Loader2, Plus, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useGetCategories } from "@/features/categories";
import { useAddProduct } from "@/features/products";
import { apiClient } from "@/lib/api-client";

// ─── Constants ────────────────────────────────────────────────────────────────
const CLOTHING_SIZES = ["34", "36", "38", "40", "42", "44", "46", "48"];
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 8;

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Initial form state ───────────────────────────────────────────────────────
/**
 * selectedColors: Array of { hex: string, name: string }
 *   hex  — always upper-case, e.g. "#FF0000"
 *   name — human-readable label, e.g. "Red" or a custom name the admin typed
 *
 * stockEntries: Array of { size, colorHex, stock }
 *   Managed dynamically when sizes are toggled.
 */
const INITIAL_FORM = {
	title: "",
	description: "",
	price: "",
	promo: "",
	categoryId: "",
	selectedColors: /** @type {{ hex: string; name: string }[]} */ ([]),
	sizes: /** @type {string[]} */ ([]),
	/** @type {{ size: string; colorHex: string; stock: string }[]} */
	stockEntries: [],
};

// ─── AddProductWindow ──────────────────────────────────────────────────────────
// Dialog-based "Add Product" form.
//
// Upload flow:
//   1. User picks images → stored locally with Object URL previews.
//   2. On submit:
//        a. POST /products/upload/request-tokens  → [{ uploadUrl, token, publicId }]
//        b. Upload each file to Cloudinary (parallel)
//        c. Collect { publicId, version, signature } from each Cloudinary response
//        d. POST /products with the imageUploads array
// ─────────────────────────────────────────────────────────────────────────────
function AddProductWindow() {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState(INITIAL_FORM);
	const [errors, setErrors] = useState(
		/** @type {Record<string, string>} */ ({}),
	);
	/** Tracks the value of the hex-picker input (not yet committed) */
	const [pickerHex, setPickerHex] = useState("#e11d48");
	/** Optional custom name the admin types before hitting "Add" */
	const [pickerName, setPickerName] = useState("");

	// imageFiles: { file: File, preview: string }[]
	const [imageFiles, setImageFiles] = useState([]);
	const [isUploading, setIsUploading] = useState(false);

	const fileInputRef = useRef(/** @type {HTMLInputElement|null} */ (null));

	const { mutate, isPending } = useAddProduct();
	const { data: categoriesData } = useGetCategories();
	const categories = categoriesData?.data ?? [];

	const isBusy = isPending || isUploading;

	// ── Helpers ────────────────────────────────────────────────────────────────
	function resetForm() {
		setForm(INITIAL_FORM);
		setErrors({});
		setPickerHex("#e11d48");
		setPickerName("");
		// Revoke preview URLs to free memory
		setImageFiles((prev) => {
			prev.forEach((img) => URL.revokeObjectURL(img.preview));
			return [];
		});
		setIsUploading(false);
	}

	/** Update a single stock row identified by size+colorHex */
	function setStockValue(size, colorHex, value) {
		setForm((prev) => ({
			...prev,
			stockEntries: prev.stockEntries.map((e) =>
				e.size === size && e.colorHex === colorHex
					? { ...e, stock: value }
					: e,
			),
		}));
	}

	function handleOpenChange(next) {
		setOpen(next);
		if (!next) resetForm();
	}

	function setField(field, value) {
		setForm((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
	}

	function toggleSize(size) {
		setForm((prev) => {
			const hasSize = prev.sizes.includes(size);
			const newSizes = hasSize
				? prev.sizes.filter((s) => s !== size)
				: [...prev.sizes, size];

			// When removing a size, strip its stock entries.
			// When adding, add one stock row per selected color (or one blank row if no colors yet).
			let newStock;
			if (hasSize) {
				newStock = prev.stockEntries.filter((e) => e.size !== size);
			} else {
				const colorRows =
					prev.selectedColors.length > 0
						? prev.selectedColors.map((c) => ({
								size,
								colorHex: c.hex.replace("#", ""),
								stock: "",
							}))
						: [{ size, colorHex: "", stock: "" }];
				newStock = [...prev.stockEntries, ...colorRows];
			}
			return { ...prev, sizes: newSizes, stockEntries: newStock };
		});
	}

	// ── Color helpers ──────────────────────────────────────────────────────────
	/**
	 * Toggle a preset color (with its known label).
	 * If it's already selected → remove it (and strip its stock rows).
	 * If not → add { hex, name: preset label } (and add stock rows for each selected size).
	 */
	function togglePresetColor(hex, label) {
		const key = hex.toUpperCase();
		setForm((prev) => {
			const already = prev.selectedColors.some((c) => c.hex === key);
			if (already) {
				return {
					...prev,
					selectedColors: prev.selectedColors.filter((c) => c.hex !== key),
					stockEntries: prev.stockEntries.filter(
						(e) => e.colorHex !== key.replace("#", ""),
					),
				};
			}
			const colorHex = key.replace("#", "");
			const newRows = prev.sizes.map((size) => ({ size, colorHex, stock: "" }));
			return {
				...prev,
				selectedColors: [...prev.selectedColors, { hex: key, name: label }],
				stockEntries: [...prev.stockEntries, ...newRows],
			};
		});
	}

	/**
	 * Commit the custom hex-picker value.
	 * Uses pickerName if provided, otherwise falls back to the hex string.
	 */
	function addPickerColor() {
		const key = pickerHex.toUpperCase();
		const name = pickerName.trim() || key;
		setForm((prev) => {
			if (prev.selectedColors.some((c) => c.hex === key)) return prev;
			const colorHex = key.replace("#", "");
			const newRows = prev.sizes.map((size) => ({ size, colorHex, stock: "" }));
			return {
				...prev,
				selectedColors: [...prev.selectedColors, { hex: key, name }],
				stockEntries: [...prev.stockEntries, ...newRows],
			};
		});
		setPickerName("");
	}

	/** Remove a color by its hex key */
	function removeColor(hex) {
		const key = hex.toUpperCase();
		const colorHex = key.replace("#", "");
		setForm((prev) => ({
			...prev,
			selectedColors: prev.selectedColors.filter((c) => c.hex !== key),
			stockEntries: prev.stockEntries.filter((e) => e.colorHex !== colorHex),
		}));
	}

	/** Inline-rename a selected color chip */
	function renameColor(hex, newName) {
		const key = hex.toUpperCase();
		setForm((prev) => ({
			...prev,
			selectedColors: prev.selectedColors.map((c) =>
				c.hex === key ? { ...c, name: newName } : c,
			),
		}));
	}

	// ── Image picking ──────────────────────────────────────────────────────────
	function addFiles(rawFiles) {
		const fileErrors = [];
		const valid = [];

		for (const file of rawFiles) {
			if (!ALLOWED_TYPES.includes(file.type)) {
				fileErrors.push(`"${file.name}" — unsupported type.`);
				continue;
			}
			if (file.size > MAX_FILE_SIZE) {
				fileErrors.push(`"${file.name}" — exceeds the 5 MB limit.`);
				continue;
			}
			valid.push(file);
		}

		setImageFiles((prev) => {
			const remaining = MAX_FILES - prev.length;
			if (remaining <= 0) {
				setErrors((e) => ({
					...e,
					images: `Max ${MAX_FILES} images allowed.`,
				}));
				return prev;
			}
			const toAdd = valid.slice(0, remaining);
			if (valid.length > remaining)
				fileErrors.push(
					`Only ${remaining} more image(s) could be added (max ${MAX_FILES}).`,
				);

			const entries = toAdd.map((file) => ({
				file,
				preview: URL.createObjectURL(file),
			}));
			return [...prev, ...entries];
		});

		if (fileErrors.length)
			setErrors((e) => ({ ...e, images: fileErrors.join(" ") }));
		else setErrors((e) => ({ ...e, images: "" }));
	}

	function handleFileInputChange(e) {
		addFiles(Array.from(e.target.files || []));
		// Reset so the same file can be re-selected after removal
		e.target.value = "";
	}

	function removeImage(index) {
		setImageFiles((prev) => {
			URL.revokeObjectURL(prev[index].preview);
			return prev.filter((_, i) => i !== index);
		});
	}

	// ── Drag-and-drop ──────────────────────────────────────────────────────────
	function handleDrop(e) {
		e.preventDefault();
		addFiles(Array.from(e.dataTransfer.files));
	}
	function handleDragOver(e) {
		e.preventDefault();
	}

	// ── Cloudinary upload ──────────────────────────────────────────────────────
	async function uploadImagesToCloudinary(files) {
		if (!files.length) return [];

		// 1. Get signed upload tokens from our backend
		// Backend returns: [{ publicId, signature, timestamp, apiKey, cloudName }]
		const tokenRes = await apiClient.post("/products/upload/request-tokens", {
			files: files.map((f) => ({
				fileName: f.name,
				mimeType: f.type,
				size: f.size,
			})),
		});

		const tokens = tokenRes.data.data; // [{ publicId, signature, timestamp, apiKey, cloudName }]

		// 2. Upload every file to Cloudinary in parallel
		const results = await Promise.all(
			files.map(async (file, i) => {
				const { publicId, signature, timestamp, apiKey, cloudName } = tokens[i];

				// Build the Cloudinary signed-upload URL using the cloudName from the token
				const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

				const formData = new FormData();
				formData.append("file", file);
				formData.append("public_id", publicId);
				formData.append("signature", signature);
				formData.append("timestamp", String(timestamp));
				formData.append("api_key", apiKey);

				const res = await fetch(uploadUrl, { method: "POST", body: formData });
				if (!res.ok) {
					const body = await res.json().catch(() => ({}));
					throw new Error(
						body?.error?.message ?? `Failed to upload "${file.name}".`,
					);
				}

				const data = await res.json();

				return {
					publicId: data.public_id ?? publicId,
					version: data.version,
					signature: data.signature,
				};
			}),
		);

		return results;
	}

	// ── Validation ─────────────────────────────────────────────────────────────
	function validate() {
		const next = {};

		if (!form.title.trim()) next.title = "Title is required.";
		if (!form.description.trim()) next.description = "Description is required.";

		const priceNum = parseFloat(form.price);
		if (form.price === "" || Number.isNaN(priceNum) || priceNum < 0)
			next.price = "Price must be a non-negative number.";

		if (form.promo !== "") {
			const promoNum = parseFloat(form.promo);
			if (Number.isNaN(promoNum) || promoNum < 0)
				next.promo = "Promo price must be a non-negative number.";
			else if (!Number.isNaN(priceNum) && promoNum > priceNum)
				next.promo = "Promo price must be ≤ the regular price.";
		}

		if (!form.categoryId) next.categoryId = "Category is required.";

		setErrors(next);
		return Object.keys(next).length === 0;
	}

	// ── Submit ─────────────────────────────────────────────────────────────────
	async function handleSubmit(e) {
		e.preventDefault();
		if (!validate()) return;

		try {
			setIsUploading(true);
			const imageUploads = await uploadImagesToCloudinary(
				imageFiles.map((img) => img.file),
			);
			setIsUploading(false);

			// Send color names (or hex as fallback) to the backend
			const colors = form.selectedColors.map((c) => c.name || c.hex);

			// Build stockEntries — only include rows that have both colorHex and stock set
			const stockEntries = form.stockEntries
				.filter((e) => e.colorHex && e.stock !== "")
				.map((e) => ({
					colorHex: e.colorHex.replace("#", "").toUpperCase(),
					size: e.size,
					stock: parseInt(e.stock, 10),
				}));

			const payload = {
				title: form.title.trim(),
				description: form.description.trim(),
				price: form.price.trim(),
				colors,
				sizes: form.sizes,
				categoryId: parseInt(form.categoryId, 10),
				...(form.promo !== "" ? { promo: form.promo.trim() } : {}),
				...(imageUploads.length > 0 ? { imageUploads } : {}),
				...(stockEntries.length > 0 ? { stockEntries } : {}),
			};

			mutate(payload, {
				onSuccess: () => {
					handleOpenChange(false);
				},
				onError: (err) => {
					setErrors((prev) => ({
						...prev,
						form: err?.message ?? "Failed to add product. Please try again.",
					}));
				},
			});
		} catch (err) {
			setIsUploading(false);
			setErrors((prev) => ({
				...prev,
				images: err?.message ?? "Image upload failed. Please try again.",
			}));
		}
	}

	// ── Status label for the submit button ────────────────────────────────────
	const submitLabel = isUploading
		? "Uploading images…"
		: isPending
			? "Creating…"
			: "Add Product";

	// ── render ─────────────────────────────────────────────────────────────────
	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button
					className="gap-1.5 shrink-0"
					aria-label="Open add product dialog"
				>
					<Plus className="size-4" aria-hidden="true" />
					Add Product
				</Button>
			</DialogTrigger>

			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add Product</DialogTitle>
					<DialogDescription>
						Fill in the details below to create a new product.
					</DialogDescription>
				</DialogHeader>

				<form
					id="add-product-form"
					onSubmit={handleSubmit}
					noValidate
					className="flex flex-col gap-4 py-2"
				>
					{/* ── Title ──────────────────────────────────────────────────── */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="ap-title">
							Title <span className="text-destructive">*</span>
						</Label>
						<Input
							id="ap-title"
							type="text"
							placeholder="e.g. Classic Linen Shirt"
							value={form.title}
							onChange={(e) => setField("title", e.target.value)}
							disabled={isBusy}
							aria-invalid={!!errors.title}
							aria-describedby={errors.title ? "ap-title-err" : undefined}
							autoComplete="off"
						/>
						{errors.title && (
							<p
								id="ap-title-err"
								role="alert"
								className="text-xs text-destructive"
							>
								{errors.title}
							</p>
						)}
					</div>

					{/* ── Images ─────────────────────────────────────────────────── */}
					<div className="flex flex-col gap-1.5">
						<Label>
							Images{" "}
							<span className="text-xs font-normal text-muted-foreground">
								(up to {MAX_FILES} · max 5 MB · JPEG, PNG, WebP, GIF)
							</span>
						</Label>

						{/* Thumbnail grid — shown once at least one image is picked */}
						{imageFiles.length > 0 && (
							<div className="flex flex-wrap gap-2">
								{imageFiles.map((img, i) => (
									<div
										key={i}
										className="relative size-20 rounded-md overflow-hidden border border-border group shrink-0"
									>
										<img
											src={img.preview}
											alt={`Preview ${i + 1}`}
											className="size-full object-cover"
										/>
										{/* Remove overlay */}
										<button
											type="button"
											onClick={() => removeImage(i)}
											disabled={isBusy}
											aria-label={`Remove image ${i + 1}`}
											className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity disabled:pointer-events-none"
										>
											<X className="size-4 text-white" aria-hidden="true" />
										</button>
									</div>
								))}

								{/* "+ add more" tile — only while under the limit */}
								{imageFiles.length < MAX_FILES && (
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										disabled={isBusy}
										aria-label="Add more images"
										className="size-20 rounded-md border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/60 transition-colors disabled:pointer-events-none disabled:opacity-50 shrink-0"
									>
										<ImagePlus className="size-5" aria-hidden="true" />
										<span className="text-[10px]">Add more</span>
									</button>
								)}
							</div>
						)}

						{/* Drop-zone — only shown before any image is picked */}
						{imageFiles.length === 0 && (
							<div
								role="button"
								tabIndex={isBusy ? -1 : 0}
								onClick={() => !isBusy && fileInputRef.current?.click()}
								onKeyDown={(e) =>
									e.key === "Enter" && !isBusy && fileInputRef.current?.click()
								}
								onDrop={handleDrop}
								onDragOver={handleDragOver}
								aria-label="Upload images — click or drag and drop"
								className={[
									"flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 py-8 cursor-pointer hover:bg-muted/60 transition-colors text-muted-foreground",
									isBusy ? "pointer-events-none opacity-50" : "",
								].join(" ")}
							>
								<Upload className="size-7" aria-hidden="true" />
								<p className="text-sm font-medium">
									Click or drag & drop images here
								</p>
								<p className="text-xs">
									JPEG · PNG · WebP · GIF — max 5 MB each
								</p>
							</div>
						)}

						{/* Hidden native file input */}
						<input
							ref={fileInputRef}
							type="file"
							accept={ALLOWED_TYPES.join(",")}
							multiple
							className="sr-only"
							onChange={handleFileInputChange}
							disabled={isBusy}
							aria-hidden="true"
							tabIndex={-1}
						/>

						{errors.images && (
							<p role="alert" className="text-xs text-destructive">
								{errors.images}
							</p>
						)}
					</div>

					{/* ── Description ────────────────────────────────────────────── */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="ap-description">
							Description <span className="text-destructive">*</span>
						</Label>
						<textarea
							id="ap-description"
							placeholder="Describe the product…"
							value={form.description}
							onChange={(e) => setField("description", e.target.value)}
							disabled={isBusy}
							aria-invalid={!!errors.description}
							aria-describedby={errors.description ? "ap-desc-err" : undefined}
							className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						/>
						{errors.description && (
							<p
								id="ap-desc-err"
								role="alert"
								className="text-xs text-destructive"
							>
								{errors.description}
							</p>
						)}
					</div>

					{/* ── Price + Promo ───────────────────────────────────────────── */}
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="ap-price">
								Price <span className="text-destructive">*</span>
							</Label>
							<Input
								id="ap-price"
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
								value={form.price}
								onChange={(e) => setField("price", e.target.value)}
								disabled={isBusy}
								aria-invalid={!!errors.price}
								aria-describedby={errors.price ? "ap-price-err" : undefined}
							/>
							{errors.price && (
								<p
									id="ap-price-err"
									role="alert"
									className="text-xs text-destructive"
								>
									{errors.price}
								</p>
							)}
						</div>

						<div className="flex flex-col gap-1.5">
							<Label htmlFor="ap-promo">
								Promo Price{" "}
								<span className="text-muted-foreground text-xs">
									(optional)
								</span>
							</Label>
							<Input
								id="ap-promo"
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
								value={form.promo}
								onChange={(e) => setField("promo", e.target.value)}
								disabled={isBusy}
								aria-invalid={!!errors.promo}
								aria-describedby={errors.promo ? "ap-promo-err" : undefined}
							/>
							{errors.promo && (
								<p
									id="ap-promo-err"
									role="alert"
									className="text-xs text-destructive"
								>
									{errors.promo}
								</p>
							)}
						</div>
					</div>

					{/* ── Category ───────────────────────────────────────────────── */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="ap-category">
							Category <span className="text-destructive">*</span>
						</Label>
						<Select
							value={form.categoryId}
							onValueChange={(val) => setField("categoryId", val)}
							disabled={isBusy}
						>
							<SelectTrigger
								id="ap-category"
								aria-invalid={!!errors.categoryId}
								aria-describedby={errors.categoryId ? "ap-cat-err" : undefined}
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
							<p
								id="ap-cat-err"
								role="alert"
								className="text-xs text-destructive"
							>
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
										const isSelected = form.selectedColors.some(
											(c) => c.hex === key,
										);
										const light = isLightHex(hex);
										return (
											<button
												key={hex}
												type="button"
												title={label}
												aria-label={`${label} — ${isSelected ? "remove" : "add"}`}
												aria-pressed={isSelected}
												disabled={isBusy}
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
											disabled={isBusy}
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
										htmlFor="ap-custom-color-name"
										className="text-xs font-medium text-foreground"
									>
										Color name{" "}
										<span className="font-normal text-muted-foreground">
											— give it a name or leave blank to use the hex code
										</span>
									</label>
									<div className="flex gap-2">
										<Input
											id="ap-custom-color-name"
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
											disabled={isBusy}
											className="h-9 text-sm flex-1"
											autoComplete="off"
										/>
										<Button
											type="button"
											variant="secondary"
											size="sm"
											disabled={
												isBusy ||
												form.selectedColors.some(
													(c) => c.hex === pickerHex.toUpperCase(),
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
										// flag colors whose name is still the raw hex (unnamed custom colors)
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
													disabled={isBusy}
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
													disabled={isBusy}
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
									(c) => c.name === c.hex.toUpperCase(),
								) && (
									<p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
										<span aria-hidden="true">⚠</span>
										Some colors have no name — click the highlighted chip to
										rename them.
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
											isBusy ? "opacity-50 pointer-events-none" : "",
										].join(" ")}
									>
										<input
											type="checkbox"
											className="sr-only"
											checked={checked}
											onChange={() => toggleSize(size)}
											disabled={isBusy}
											aria-label={`Size ${size}`}
										/>
										{size}
									</label>
								);
							})}
						</div>
					</div>


					{/* ── Stock per size ───────────────────────────────────────────── */}
					{form.sizes.length > 0 && (
						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<Label>
									Stock{" "}
									<span className="text-xs font-normal text-muted-foreground">
										(per size &amp; color)
									</span>
								</Label>
							</div>

							<div className="rounded-lg border border-input bg-muted/20 overflow-hidden">
								{/* Table header */}
								<div className="grid grid-cols-[64px_1fr_100px] border-b border-input bg-muted/40 px-3 py-2">
									<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
										Size
									</span>
									<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
										Color
									</span>
									<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest text-right">
										Stock
									</span>
								</div>

								{/* Rows grouped by size */}
								<div className="divide-y divide-border/60">
									{form.sizes.map((size) => {
										const sizeRows = form.stockEntries.filter((e) => e.size === size);
										const displayRows =
											sizeRows.length > 0
												? sizeRows
												: [{ size, colorHex: "", stock: "" }];

										return displayRows.map((entry, rowIdx) => {
											const isFirst = rowIdx === 0;
											const colorObj = form.selectedColors.find(
												(c) =>
													c.hex.replace("#", "").toUpperCase() ===
													entry.colorHex.toUpperCase(),
											);
											const isLightColor = colorObj ? isLightHex(colorObj.hex) : false;

											return (
												<div
													key={`${size}-${entry.colorHex || rowIdx}`}
													className="grid grid-cols-[64px_1fr_100px] items-center px-3 py-2.5"
												>
													{/* Size badge — first row only */}
													<div className="flex items-center">
														{isFirst ? (
															<span className="inline-flex items-center justify-center w-10 h-8 rounded-md border border-primary bg-primary/10 text-primary text-sm font-semibold select-none">
																{size}
															</span>
														) : (
															<span className="w-10" aria-hidden="true" />
														)}
													</div>

													{/* Color display */}
													<div className="flex items-center gap-2 pr-3">
														{entry.colorHex ? (
															<div className="flex items-center gap-2">
																<span
																	className={[
																		"shrink-0 inline-flex size-5 rounded-full border",
																		isLightColor ? "border-border" : "border-transparent",
																	].join(" ")}
																	style={{ backgroundColor: `#${entry.colorHex}` }}
																	aria-hidden="true"
																/>
																<span className="text-sm text-foreground">
																	{colorObj?.name ?? `#${entry.colorHex}`}
																</span>
															</div>
														) : (
															<span className="text-xs text-muted-foreground italic">
																No colors selected
															</span>
														)}
													</div>

													{/* Stock input */}
													<div className="flex justify-end">
														<Input
															type="number"
															min="0"
															step="1"
															placeholder="0"
															value={entry.stock}
															disabled={isBusy}
															aria-label={`Stock for size ${size}${entry.colorHex ? ` color #${entry.colorHex}` : ""}`}
															onChange={(e) =>
																setStockValue(size, entry.colorHex, e.target.value)
															}
															className="h-8 w-24 text-right text-sm"
														/>
													</div>
												</div>
											);
										});
									})}
								</div>
							</div>
						</div>
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
						<Button type="button" variant="outline" disabled={isBusy}>
							Cancel
						</Button>
					</DialogClose>
					<Button
						type="submit"
						form="add-product-form"
						disabled={isBusy}
						className="gap-1.5"
					>
						{isBusy ? (
							<Loader2 className="size-4 animate-spin" aria-hidden="true" />
						) : (
							<Plus className="size-4" aria-hidden="true" />
						)}
						{submitLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default AddProductWindow;
