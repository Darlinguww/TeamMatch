/** URL base del backend (REST + Socket.io), sin sufijo /api. */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (raw === 'false' || raw === '0') {
    return '';
  }
  if (typeof raw === 'string' && raw.trim()) {
    let url = raw.trim().replace(/\/$/, '');
    if (url.endsWith('/api')) {
      url = url.slice(0, -4);
    }
    return url;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

/** true si hay backend configurado o proxy Vite en el navegador. */
export function isApiEnabled(): boolean {
  return getApiBaseUrl().length > 0;
}
