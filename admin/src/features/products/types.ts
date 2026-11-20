// ─── Product entity ───────────────────────────────────────────────────────────
export type Product = {
  id: number;
  title: string;
  description: string;
  price: string;
  promo: string | null;
  images: string[];
  colors: string[];
  sizes: string[];
  categoryId: number;
  deletedAt: string | null;
  stock: ProductStock[];
};

// ─── Clothing sizes enum ──────────────────────────────────────────────────────
export type ClothingSize = "34" | "36" | "38" | "40" | "42" | "44" | "46" | "48";

// ─── Stock ────────────────────────────────────────────────────────────────────
export interface StockEntry {
  colorHex: string; // 6 hex digits without # (e.g. "FF0000")
  size: ClothingSize;
  stock: number;
}

export interface ProductStock {
  id: number;
  productId: number;
  colorHex: string;
  size: ClothingSize;
  stock: number;
}

// ─── Upload tokens ─────────────────────────────────────────────────────────────
export interface UploadRequestTokens {
  files: {
    fileName: string;
    mimeType: string;
    size: number;
  }[];
}

export interface UploadResponseTokens {
  success: boolean;
  data: {
    uploadUrl: string;
    token: string;
    publicId: string;
  }[];
}

// ─── CRUD request / response types ───────────────────────────────────────────
export interface CreateProductRequest {
  title: string;
  description: string;
  price: string;
  colors: string[];
  sizes: string[];
  promo?: string;
  categoryId: number;
  imageUploads?: string[];
  stockEntries?: StockEntry[];
}

export interface CreateProductResponse {
  success: boolean;
  data: Product;
}

export interface GetProductResponse {
  success: boolean;
  data: Product;
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

export interface GetProductsResponse {
  success: boolean;
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetProductsByCategoryResponse {
  success: boolean;
  data: Product[];
}

export interface UpdateProductRequest {
  title?: string;
  description?: string;
  price?: string;
  colors?: string[];
  sizes?: string[];
  promo?: string | null;
  categoryId?: number;
  imageUploads?: {
    publicId: string;
    version: number;
    signature: string;
    replaceImage?: string;
  }[];
  imageRemovals?: string[];
  /** When provided, replaces the entire stock grid atomically (delete-all then re-insert). */
  stockEntries?: StockEntry[];
}

export interface UpdateProductResponse {
  success: boolean;
  data: Product;
}

export interface DeleteProductResponse {
  success: boolean;
}
