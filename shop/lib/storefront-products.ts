import { cacheLife, cacheTag } from "next/cache";

import { productsApi } from "@/lib/api";

export async function getStorefrontProducts() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  cacheTag("products");

  return productsApi.getAllPages();
}

export async function getStorefrontProduct(id: number) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  cacheTag("products");

  return productsApi.getById(id);
}

export async function getStorefrontProductStock(id: number) {
  return productsApi.getStock(id);
}
