const LOCAL_APP_HOSTS = new Set(['localhost', '127.0.0.1']);
const LOCAL_FRONTEND_PORTS = new Set(['4173', '5173']);
const LOCAL_API_PORT = '8787';

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/u, '');

const buildLocalApiOrigin = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  const { protocol, hostname, port } = window.location;
  if (!LOCAL_APP_HOSTS.has(hostname) || !LOCAL_FRONTEND_PORTS.has(port)) {
    return '';
  }

  return `${protocol}//${hostname}:${LOCAL_API_PORT}`;
};

export const resolveApiBaseUrl = (): string => {
  const configuredOrigin = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? '');
  const localApiOrigin = buildLocalApiOrigin();

  if (!configuredOrigin) {
    return localApiOrigin;
  }

  if (typeof window === 'undefined') {
    return configuredOrigin;
  }

  try {
    const resolvedUrl = new URL(configuredOrigin, window.location.origin);
    const normalizedOrigin = trimTrailingSlash(resolvedUrl.origin);
    if (LOCAL_APP_HOSTS.has(resolvedUrl.hostname) && LOCAL_FRONTEND_PORTS.has(resolvedUrl.port)) {
      return localApiOrigin || normalizedOrigin;
    }
    return normalizedOrigin;
  } catch {
    return localApiOrigin || configuredOrigin;
  }
};

export const API_BASE_URL = resolveApiBaseUrl();

export const buildApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
