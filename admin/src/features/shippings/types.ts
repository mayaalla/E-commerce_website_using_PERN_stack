// ─── Shipping Company Status ──────────────────────────────────────────────────
export type ShippingCompanyStatus = "active" | "inactive";

// ─── Shipping Wilaya Status ───────────────────────────────────────────────────
export type ShippingWilayaStatus = "active" | "inactive";

// ─── Shipping Company (returned by the API) ───────────────────────────────────
export interface ShippingCompany {
  id: number;
  name: string;
  status: ShippingCompanyStatus;
  deletedAt: string | null; // "YYYY-MM-DD" or null
}

// ─── Shipping Price (returned by the API) ─────────────────────────────────────
export interface ShippingPrice {
  id: number;
  price: string; // e.g. "350.00"
  wilayaCode: string; // 2-digit wilaya code e.g. "16"
  shippingCompanyId: number;
  status: ShippingWilayaStatus;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHIPPING COMPANIES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /shipping/companies ─────────────────────────────────────────────────
export interface CreateShippingCompanyRequest {
  name: string;
  apiKey: string; // min 16 chars, hashed server-side, never returned
}

export interface CreateShippingCompanyResponse {
  success: boolean;
  data: ShippingCompany;
}

// ─── GET /shipping/companies ──────────────────────────────────────────────────
export interface GetShippingCompaniesResponse {
  success: boolean;
  data: ShippingCompany[];
}

// ─── GET /shipping/companies/:id ──────────────────────────────────────────────
export interface GetShippingCompanyResponse {
  success: boolean;
  data: ShippingCompany;
}

// ─── GET /shipping/companies/:id/prices ───────────────────────────────────────
export interface GetShippingCompanyPricesResponse {
  success: boolean;
  data: ShippingPrice[];
}

// ─── PUT /shipping/companies/:id ──────────────────────────────────────────────
export interface UpdateShippingCompanyRequest {
  name?: string;
  apiKey?: string;
}

export interface UpdateShippingCompanyResponse {
  success: boolean;
  data: ShippingCompany;
}

// ─── DELETE /shipping/companies/:id ───────────────────────────────────────────
export interface DeleteShippingCompanyResponse {
  success: boolean;
  data: ShippingCompany;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHIPPING PRICES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /shipping/prices ────────────────────────────────────────────────────
export interface CreateShippingPriceRequest {
  price: string; // non-negative, ≤2 decimals e.g. "350.00"
  wilayaCode: string; // 2-digit code e.g. "16"
  shippingCompanyId: number;
}

export interface CreateShippingPriceResponse {
  success: boolean;
  data: ShippingPrice;
}

// ─── GET /shipping/prices ─────────────────────────────────────────────────────
export interface GetShippingPricesResponse {
  success: boolean;
  data: ShippingPrice[];
}

// ─── GET /shipping/prices/:id ─────────────────────────────────────────────────
export interface GetShippingPriceResponse {
  success: boolean;
  data: ShippingPrice;
}

// ─── GET /shipping/prices/lookup ──────────────────────────────────────────────
export interface ShippingPriceLookupParams {
  companyId?: number;
  companyName?: string;
  wilayaCode?: string;
  wilayaName?: string;
}

export interface ShippingPriceLookupResponse {
  success: boolean;
  data: ShippingPrice;
}

// ─── PUT /shipping/prices/:id ─────────────────────────────────────────────────
export interface UpdateShippingPriceRequest {
  price?: string;
  wilayaCode?: string;
  shippingCompanyId?: number;
}

export interface UpdateShippingPriceResponse {
  success: boolean;
  data: ShippingPrice;
}

// ─── DELETE /shipping/prices/:id ──────────────────────────────────────────────
export interface DeleteShippingPriceResponse {
  success: boolean;
  data: ShippingPrice;
}
