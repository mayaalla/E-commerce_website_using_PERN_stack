const API_URL = import.meta.env.VITE_API_URL as string | undefined;
if (!API_URL) throw new Error('VITE_API_URL is missing. Copy .env.example to .env');

export const env = { API_URL };