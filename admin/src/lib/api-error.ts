import axios from 'axios';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number | null,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    if (!error.response) return new ApiError('Network error. Is the server running?', null);

    const { status, data } = error.response;

    // Backend validation: { errors: ["price: must be >= 0", ...] }
    if (Array.isArray(data?.errors)) {
      const fieldErrors = Object.fromEntries(
        (data.errors as string[]).map((e) => {
          const i = e.indexOf(':');
          return i === -1 ? ['root', e] : [e.slice(0, i).trim(), e.slice(i + 1).trim()];
        }),
      );
      return new ApiError('Please fix the highlighted fields', status, fieldErrors);
    }

    // Generic: { message: "..." }
    return new ApiError(data?.message ?? 'Something went wrong', status);
  }

  return new ApiError('Unexpected error', null);
}