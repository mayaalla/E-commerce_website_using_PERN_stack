// ─── Wilaya Hooks ────────────────────────────────────────────────────────────
export { useGetWilayas, WilayasQueryKey } from "./hooks/useGetWilayas";
export { useGetWilaya, WilayaQueryKey } from "./hooks/useGetWilaya";
export { useAddWilaya } from "./hooks/useAddWilaya";
export { useUpdateWilaya } from "./hooks/useUpdateWilaya";
export { useDeleteWilaya } from "./hooks/useDeleteWilaya";

// ─── Query Key Types ────────────────────────────────────────────────────────
export type { WilayasQueryKey as WilayasQueryKeyType } from "./hooks/useGetWilayas";
export type { WilayaQueryKey as WilayaQueryKeyType } from "./hooks/useGetWilaya";

// ─── Types ──────────────────────────────────────────────────────────────────
export type {
  addWilayaRequest,
  addWilayaResponse,
  getAllWilayasResponse,
  getWilayaResponse,
  updateWilayaRequest,
  updateWilayaResponse,
  deleteWilayaResponse,
} from "./types";
