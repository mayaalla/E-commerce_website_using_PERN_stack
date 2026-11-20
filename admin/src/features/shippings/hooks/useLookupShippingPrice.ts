import { useMutation } from "@tanstack/react-query";
import lookupShippingPrice from "../api/lookupShippingPrice";
import type { ShippingPriceLookupParams, ShippingPriceLookupResponse } from "../types";

export function useLookupShippingPrice() {
  return useMutation<ShippingPriceLookupResponse, Error, ShippingPriceLookupParams>({
    mutationFn: lookupShippingPrice,
  });
}
