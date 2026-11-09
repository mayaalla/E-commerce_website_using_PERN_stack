// {
//   "name": "Amira Benali",
//   "phoneNumber": "0555123456",
//   "wilayaCode": "16",
//   "communeId": 3,
//   "shippingCompanyId": 1,
//   "products": [
//     {
//       "productId": 10,
//       "quantity": 2,
//       "color": "red",
//       "size": "40"
//     }
//   ],
//   "couponCode": "SUMMER25"
// }


export interface OrderProductRequest {
    name: string;
    phoneNumber: string;
    wilayaCode: string;
    communeId: number;
    shippingCompanyId: number;
    products: {
        productId: number;
        quantity: number;
        color: string;
        size: string;
    }[];
    couponCode?: string;
}

// {
//   "success": true,
//   "data": {
//     "order": {
//       "id": 42,
//       "name": "Amira Benali",
//       "phoneNumber": "0555123456",
//       "wilayaCode": "16",
//       "communeId": 3,
//       "shippingCompanyId": 1,
//       "total": "1049.99",
//       "products": [
//         { "productId": 10, "title": "Red T-Shirt", "quantity": 2, "price": "299.99", "color": "red", "size": "40" }
//       ],
//       "date": "2026-11-08",
//       "hour": "19:34:00",
//       "status": "pending"
//     },
//     "pricing": {
//       "subtotal": "599.98",
//       "discountPercentage": 25,
//       "discountAmount": "150.00",
//       "shippingCost": "600.01",
//       "total": "1049.99",
//       "couponCode": "SUMMER25"
//     }
//   }
// }

export interface OrderProductResponse {
    success: boolean;
    data: {
        order: {
            id: number;
            name: string;
            phoneNumber: string;
            wilayaCode: string;
            communeId: number;
            shippingCompanyId: number;
            total: string;
            products: {
                productId: number;
                title: string;
                quantity: number;
                price: string;
                color: string;
                size: string;
            }[];
            date: string; // ISO date format
            hour: string; // HH:mm:ss format
            status: "pending" | "confirmed" | "shipped" | "returned" | "canceled";
        };
        pricing: {
            subtotal: string;
            discountPercentage?: number; // Optional, only present if a coupon is applied
            discountAmount?: string; // Optional, only present if a coupon is applied
            shippingCost: string;
            total: string;
            couponCode?: string; // Optional, only present if a coupon is applied
        };
    };
}


export interface GetOrdersResponse {
    success: boolean;
    data: {
        orders: {
            id: number;
            name: string;
            phoneNumber: string;
            wilayaCode: string;
            communeId: number;
            shippingCompanyId: number;
            total: string;
            products: {
                productId: number;
                title: string;
                quantity: number;
                price: string;
                color?: string; // Optional, as not all products may have a color
                size?: string; // Optional, as not all products may have a size
            }[];
            date: string; // ISO date format
            hour: string; // HH:mm:ss format
            status: "pending" | "confirmed" | "shipped" | "returned" | "canceled";
        }[];
    };
}

// PATCH /orders/:id/status
// 🔒 Requires: authenticate + authorize("order_update")

// Update an order's status. Orders in a terminal state (canceled, returned) cannot be updated.

// Request Body

// { "status": "shipped" }

// Response 200 — updated order.

export interface UpdateOrderStatusRequest {
    status: "pending" | "confirmed" | "shipped" | "returned" | "canceled";
}

export interface UpdateOrderStatusResponse {
    success: boolean;
    data: {
        order: {
            id: number;
            name: string;
            phoneNumber: string;
            wilayaCode: string;
            communeId: number;
            shippingCompanyId: number;
            total: string;
            products: {
                productId: number;
                title: string;
                quantity: number;
                price: string;
                color?: string; // Optional, as not all products may have a color
                size?: string; // Optional, as not all products may have a size
            }[];
            date: string; // ISO date format
            hour: string; // HH:mm:ss format
            status: "pending" | "confirmed" | "shipped" | "returned" | "canceled";
        };
    };
}


// DELETE /orders/:id
// 🔒 Requires: authenticate + authorize("order_delete")
// Hard-delete an order and return its last snapshot.

// Response 200 — deleted order. 404 if not found.

export interface DeleteOrderResponse {
    success: boolean;
    data: {
        order: {
            id: number;
            name: string;
            phoneNumber: string;
            wilayaCode: string;
            communeId: number;
            shippingCompanyId: number;
            total: string;
            products: {
                productId: number;
                title: string;
                quantity: number;
                price: string;
                color?: string; // Optional, as not all products may have a color
                size?: string; // Optional, as not all products may have a size
            }[];
            date: string; // ISO date format
            hour: string; // HH:mm:ss format
            status: "pending" | "confirmed" | "shipped" | "returned" | "canceled";
        };
    };
}
