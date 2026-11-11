// Wilayas
// Algeria has 58 wilayas identified by a 2-digit code (e.g. "16" for Algiers).

// POST /wilayas
// Request Body

// {
//   "code": "16",
//   "name": "Alger"
// }

// code must be exactly 2 digits.

// Response 201

// { "success": true, "data": { "code": "16", "name": "Alger" } }

// GET /wilayas
// Response 200 — array of { code, name } objects.

// GET /wilayas/:code
// Params: code — 2-digit string (e.g. 16)

// Response 200 — single wilaya. 404 if not found.

// PUT /wilayas/:code
// Request Body — { "code"?: "string", "name"?: "string" } (all optional)

// Response 200 — updated wilaya. 404 if not found.

// DELETE /wilayas/:code
// Response 200 — deleted wilaya. 404 if not found.


export interface addWilayaRequest {
    code: string; // 2-digit string
    name: string;
}

export interface addWilayaResponse {
    success: boolean;
    data: {
        code: string;
        name: string;
    };
}

export interface getAllWilayasResponse {
    success: boolean;
    data: {
        code: string;
        name: string;
    }[];
}

export interface getWilayaResponse {
    success: boolean;
    data: {
        code: string;
        name: string;
    };
}

export interface updateWilayaRequest {
    code?: string; // optional 2-digit string
    name?: string; // optional
}

export interface updateWilayaResponse {
    success: boolean;
    data: {
        code: string;
        name: string;
    };
}

export interface deleteWilayaResponse {
    success: boolean;
}
