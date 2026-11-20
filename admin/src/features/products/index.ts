export { useAddProduct } from "./hooks/useAddProduct";
export { useGetProducts } from "./hooks/useGetProducts";
export { useGetProduct } from "./hooks/useGetProduct";
export { useUpdateProduct } from "./hooks/useUpdateProduct";
export { useDeleteProduct } from "./hooks/useDeleteProduct";

export { productsQueryKey } from "./hooks/useGetProducts";
export { productQueryKey } from "./hooks/useGetProduct";

export type {
    Product,
    ClothingSize,
    ProductsQueryParams,
    UploadRequestTokens,
    UploadResponseTokens,
    CreateProductRequest,
    CreateProductResponse,
    GetProductResponse,
    GetProductsResponse,
    GetProductsByCategoryResponse,
    UpdateProductRequest,
    UpdateProductResponse,
    DeleteProductResponse,
} from "./types";
