// Read from runtime injection first, fall back to build-time value
const getApiUrl = (): string => {
  // Runtime injection via entrypoint.sh (Docker/Helm)
  if (typeof window !== 'undefined' && (window as any).__ENV__?.VITE_API_URL) {
    return (window as any).__ENV__.VITE_API_URL;
  }
  // Build-time value (local dev)
  return import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
};

export const API_URL = getApiUrl();
