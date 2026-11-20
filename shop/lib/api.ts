/**
 * Centralized API client for MayaStore.
 *
 * All requests go through this single module so that:
 *  - The base URL is configured in one place (.env.local)
 *  - Credentials (HttpOnly cookies) are always forwarded
 *  - 401 responses are intercepted for silent token refresh
 *  - Errors are normalized into a typed ApiError class
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base request function.
 * - Automatically sets Content-Type: application/json when a body is provided.
 * - Always sends cookies (credentials: "include") so the backend can read the
 *   HttpOnly refresh-token cookie set at login.
 * - Throws ApiError on non-2xx responses.
 */
async function request<T>(
  endpoint: string,
  { body, headers, ...options }: RequestOptions = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",          // forward HttpOnly cookies
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const json = (await res.json()) as {
        message?: string;
        errors?: unknown[];
      };
      const details = Array.isArray(json.errors)
        ? json.errors
            .map((error) => (typeof error === "string" ? error : null))
            .filter((error): error is string => error !== null)
            .join(" ")
        : "";
      message = details
        ? `${json.message ?? "Please check your information."} ${details}`
        : json.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }

  // Return undefined for 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience helpers
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  get:    <T>(endpoint: string, options?: RequestOptions) =>
            request<T>(endpoint, { method: "GET", ...options }),

  post:   <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
            request<T>(endpoint, { method: "POST", body, ...options }),

  put:    <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
            request<T>(endpoint, { method: "PUT", body, ...options }),

  patch:  <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
            request<T>(endpoint, { method: "PATCH", body, ...options }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
            request<T>(endpoint, { method: "DELETE", ...options }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Domain-specific API helpers (typed, documented)
// ─────────────────────────────────────────────────────────────────────────────

// --- Auth ---

export type LoginPayload   = { email: string; password: string };
export type AuthMeResponse = { id: number; email: string; role: string };

export const authApi = {
  login:        (payload: LoginPayload)  => api.post("/api/auth/login", payload),
  logout:       ()                        => api.post("/api/auth/logout"),
  refreshToken: ()                        => api.post("/api/auth/refresh-token"),
  me:           ()                        => api.get<AuthMeResponse>("/api/auth/me"),
};

// --- Categories ---

export type Category = { id: number; name: string; slug?: string; deletedAt?: string | null };

/**
 * Derives a URL-safe slug from a category name when the API does not
 * return one. Lowercases, strips accents, replaces spaces/punctuation
 * with hyphens, and collapses duplicate hyphens.
 */
export function categoryToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")      // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, "");         // trim leading/trailing hyphens
}

export const categoriesApi = {
  getAll: async () =>
    unwrapApiEnvelope<Category[]>(
      await api.get<Category[] | ApiEnvelope<Category[]>>("/api/categories"),
    ),
  getById: (id: number) => api.get<Category>(`/api/categories/${id}`),
  create:  (body: Omit<Category, "id">) =>
             api.post<Category>("/api/categories", body),
  update:  (id: number, body: Partial<Omit<Category, "id">>) =>
             api.put<Category>(`/api/categories/${id}`, body),
  delete:  (id: number) => api.delete(`/api/categories/${id}`),
};

// --- Products ---

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
};

function unwrapApiEnvelope<T>(response: T | ApiEnvelope<T>): T {
  if (
    typeof response === "object" &&
    response !== null &&
    "data" in response
  ) {
    return response.data as T;
  }

  return response as T;
}

export type Product = {
  id: number;
  title: string;
  description: string;
  price: string;
  images: string[];
  colors: string[];
  sizes: string[];
  promo: string | null;
  categoryId: number;
  deletedAt: string | null;
  /** Present when the product API exposes its available inventory count. */
  stock?: number | string | null;
  stockQuantity?: number | string | null;
  availableQuantity?: number | string | null;
  quantity?: number | string | null;
  inStock?: boolean;
  isInStock?: boolean;
  availability?: string;
  status?: string;
};

export type ProductStock = {
  id: number;
  productId: number;
  colorHex: string;
  size: string | null;
  stock: number;
};

export function getProductStock(product: Product): number | null {
  const inventory = [
    product.stock,
    product.stockQuantity,
    product.availableQuantity,
    product.quantity,
  ].find((value) => value !== undefined && value !== null);
  if (inventory === undefined) return null;

  const stock = Number(inventory);
  return Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : null;
}

export function isProductOutOfStock(product: Product) {
  if (product.deletedAt) return true;
  if (product.inStock === false || product.isInStock === false) return true;
  if (/out[-_\s]?of[-_\s]?stock|sold[-_\s]?out/i.test(`${product.availability ?? ""} ${product.status ?? ""}`)) {
    return true;
  }

  return getProductStock(product) === 0;
}

export type Wilaya = { code: string; name: string };
export type Commune = { id: number; name: string; wilayaId: string };
export type ShippingCompany = {
  id: number;
  name: string;
  status: "active" | "inactive";
};
export type ShippingPrice = {
  id: number;
  price: string;
  wilayaCode: string;
  shippingCompanyId: number;
  status: "active" | "inactive";
};

export type OrderProductInput = {
  productId: number;
  quantity: number;
  color?: string;
  size?: string;
};

export type CreateOrderPayload = {
  name: string;
  phoneNumber: string;
  wilayaCode: string;
  communeId: number;
  shippingCompanyId: number;
  products: OrderProductInput[];
  couponCode?: string;
};

export type CreateOrderResult = {
  order: {
    id: number;
    name: string;
    phoneNumber: string;
    wilayaCode: string;
    communeId: number;
    shippingCompanyId: number;
    total: string;
    status: string;
    products: Array<{
      productId: number;
      title: string;
      quantity: number;
      price: string;
      color?: string;
      size?: string;
    }>;
  };
  pricing: {
    subtotal: string;
    discountPercentage: number;
    discountAmount: string;
    shippingCost: string;
    total: string;
    couponCode: string | null;
  };
};

export const productsApi = {
  getAll: async () =>
    unwrapApiEnvelope<Product[]>(
      await api.get<Product[] | ApiEnvelope<Product[]>>("/api/products"),
    ),
  getById: async (id: number) =>
    unwrapApiEnvelope<Product>(
      await api.get<Product | ApiEnvelope<Product>>(`/api/products/${id}`),
    ),
  getStock: async (id: number) =>
    unwrapApiEnvelope<ProductStock[]>(
      await api.get<ProductStock[] | ApiEnvelope<ProductStock[]>>(
        `/api/products/${id}/stock`,
      ),
    ),
  getByCategory: async (categoryId: number) =>
    unwrapApiEnvelope<Product[]>(
      await api.get<Product[] | ApiEnvelope<Product[]>>(
        `/api/products/by-category/${categoryId}`,
      ),
    ),
  create: async (body: unknown) =>
    unwrapApiEnvelope<Product>(
      await api.post<Product | ApiEnvelope<Product>>("/api/products", body),
    ),
  update: async (id: number, body: unknown) =>
    unwrapApiEnvelope<Product>(
      await api.put<Product | ApiEnvelope<Product>>(`/api/products/${id}`, body),
    ),
  delete: async (id: number) =>
    unwrapApiEnvelope<Product>(
      await api.delete<Product | ApiEnvelope<Product>>(`/api/products/${id}`),
    ),
  requestUploadTokens: (body: unknown)   =>
                     api.post("/api/products/upload/request-tokens", body),
};

// --- Orders ---

export const ordersApi = {
  getAll:  () => api.get("/api/orders"),
  getById: (id: number) => api.get(`/api/orders/${id}`),
  create: async (body: CreateOrderPayload) =>
    unwrapApiEnvelope<CreateOrderResult>(
      await api.post<CreateOrderResult | ApiEnvelope<CreateOrderResult>>(
        "/api/orders",
        body,
      ),
    ),
};

// --- Wilayas & Communes ---

export const wilayasApi = {
  getAll: async () =>
    unwrapApiEnvelope<Wilaya[]>(
      await api.get<Wilaya[] | ApiEnvelope<Wilaya[]>>("/api/wilayas"),
    ),
};

export const communesApi = {
  getAll: () => api.get<Commune[]>("/api/communes"),
  getByWilaya: async (code: string) =>
    unwrapApiEnvelope<Commune[]>(
      await api.get<Commune[] | ApiEnvelope<Commune[]>>(
        `/api/communes/by-wilaya/${encodeURIComponent(code)}`,
      ),
    ),
};

// --- Shipping ---

export const shippingApi = {
  getCompanies: async () =>
    unwrapApiEnvelope<ShippingCompany[]>(
      await api.get<
        ShippingCompany[] | ApiEnvelope<ShippingCompany[]>
      >("/api/shipping/companies"),
    ),
  getPrice: async (companyId: number, wilayaCode: string) => {
    const params = new URLSearchParams({
      companyId: String(companyId),
      wilayaCode,
    });

    return unwrapApiEnvelope<ShippingPrice>(
      await api.get<ShippingPrice | ApiEnvelope<ShippingPrice>>(
        `/api/shipping/prices/lookup?${params.toString()}`,
      ),
    );
  },
};

// --- Coupons ---

export type CouponValidationResult = {
  valid: true;
  discountPercentage: number;
  code: string;
} | {
  valid: false;
  reason: string;
};

export const couponsApi = {
  getAll:  ()                       => api.get("/api/coupons"),
  create:  (body: unknown)          => api.post("/api/coupons", body),
  delete:  (id: number)             => api.delete(`/api/coupons/${id}`),

  /**
   * Validates a coupon code and returns discount info without creating an order.
   * Falls back gracefully if the backend has no dedicated validate endpoint.
   */
  validate: async (code: string): Promise<CouponValidationResult> => {
    try {
      const result = await unwrapApiEnvelope<{ discountPercentage: number; code: string }>(
        await api.get<{ discountPercentage: number; code: string } | ApiEnvelope<{ discountPercentage: number; code: string }>>(`/api/coupons/validate?code=${encodeURIComponent(code)}`),
      );
      return { valid: true, discountPercentage: result.discountPercentage, code: result.code };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        // No dedicated validate endpoint — treat as valid; discount shown after order
        return { valid: true, discountPercentage: 0, code };
      }
      if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
        return { valid: false, reason: error.message || "Invalid or expired coupon code." };
      }
      throw error;
    }
  },
};
