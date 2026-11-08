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
};

// ─── Clothing sizes enum ──────────────────────────────────────────────────────
export type ClothingSize = "34" | "36" | "38" | "40" | "42" | "44" | "46" | "48";

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
}

export interface CreateProductResponse {
  success: boolean;
  data: Product;
}

export interface GetProductResponse {
  success: boolean;
  data: Product;
}

export interface GetProductsResponse {
  success: boolean;
  data: Product[];
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
  imageUploads?: string[];
}

export interface UpdateProductResponse {
  success: boolean;
  data: Product;
}

export interface DeleteProductResponse {
  success: boolean;
}
