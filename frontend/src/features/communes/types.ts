// Communes
// POST /communes
// Request Body

// {
//   "name": "Hussein Dey",
//   "wilayaId": "16"
// }

// wilayaId is the 2-digit wilaya code.

// Response 201

// { "success": true, "data": { "id": 1, "name": "Hussein Dey", "wilayaId": "16" } }

// GET /communes
// Response 200 — array of commune objects.

// GET /communes/by-wilaya/:code
// Get all communes in a wilaya.

// Params: code — 2-digit wilaya code

// Response 200 — array of commune objects. 404 if wilaya not found.

// GET /communes/:id
// Response 200 — single commune. 404 if not found.

// PUT /communes/:id
// Request Body — { "name"?: "string", "wilayaId"?: "string" } (all optional)

// Response 200 — updated commune. 404 if not found.

// DELETE /communes/:id
// Response 200 — deleted commune.


export interface addCommuneRequest {   
    name: string;
    wilayaId: string;
}

export interface addCommuneResponse {
    success: boolean;
    data: {
        id: number;
        name: string;
        wilayaId: string;
    };
}

export interface getAllCommunesResponse {
    success: boolean;
    data: {
        id: number;
        name: string;
        wilayaId: string;
    }[];
}

export interface getCommuneResponse {
    success: boolean;
    data: {
        id: number;
        name: string;
        wilayaId: string;
    };
}

export interface deleteCommuneResponse {
    success: boolean;
}

export interface updateCommuneRequest {
    name?: string;
    wilayaId?: string;
}

export interface updateCommuneResponse {
    success: boolean;
    data: {
        id: number;
        name: string;
        wilayaId: string;
    };
}