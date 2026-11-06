export interface  addCategoryRequest {
    name: string;

}

export interface addCategoryResponse {
success: boolean;
data: {
    id: number;
    name: string;
}

}

export interface getCategoriesResponse {
    success: boolean;
    data: {
        id: number;
        name: string;
    }[]
}

export interface getCategoryResponse {
    success: boolean;
    data: {
        id: number;
        name: string;
    }
}

export interface updateCategoryRequest {
    name: string;
}

export interface updateCategoryResponse {
    success: boolean;
    data: {
        id: number;
        name: string;
    }
}


export interface deleteCategoryResponse {
    success: boolean;
    message: string;
}

