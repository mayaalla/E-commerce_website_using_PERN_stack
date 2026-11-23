import type { ClothingSize, ProductColor, StockEntry } from "./schemas";

export type {
  ClothingSize,
  CreateProductResponse,
  DeleteProductResponse,
  GetProductResponse,
  GetProductStockResponse,
  GetProductsByCategoryResponse,
  GetProductsResponse,
  Product,
  ProductColor,
  ProductStock,
  ProductStockWithColor,
  StockEntry,
  UploadResponseTokens,
  UpdateProductResponse,
} from "./schemas";

// ─── Upload tokens ────────────────────────────────────────────────────────────
export interface UploadRequestTokens {
  files: {
    fileName: string;
    mimeType: string;
    size: number;
  }[];
}

export interface ImageUploadConfirmation {
  publicId: string;
  version: number;
  signature: string;
  replaceImage?: string;
}

// ─── CRUD request types ───────────────────────────────────────────────────────
export interface CreateProductRequest {
  title: string;
  description: string;
  price: string;
  colors: ProductColor[];
  sizes: ClothingSize[];
  promo?: string;
  categoryId: number;
  imageUploads?: Omit<ImageUploadConfirmation, "replaceImage">[];
  stockEntries?: StockEntry[];
}

export interface UpdateProductRequest {
  title?: string;
  description?: string;
  price?: string;
  colors?: ProductColor[];
  sizes?: ClothingSize[];
  promo?: string | null;
  categoryId?: number;
  imageUploads?: ImageUploadConfirmation[];
  imageRemovals?: string[];
  /** When provided, replaces the entire stock grid atomically. */
  stockEntries?: StockEntry[];
}

// ─── Products query params ────────────────────────────────────────────────────
export interface ProductsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  size?: ClothingSize;
  color?: string;
  priceMin?: number;
  priceMax?: number;
  hasPromo?: boolean;
  sortBy?: "id" | "title" | "price" | "promo" | "categoryId";
  sortOrder?: "asc" | "desc";
}
