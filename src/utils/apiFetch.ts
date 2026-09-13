import { getToken, removeToken, setToken } from './authStorage';
import { getApiUrl } from './apiUrl';

interface ApiFetchOptions extends RequestInit {
  retry?: boolean;
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${getApiUrl()}/api/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.token) {
      await setToken(data.token);
      return data.token;
    }
    return null;
  } catch (err) {
    console.error('Refresh token failed:', err);
    return null;
  }
}

export async function apiFetch(
  url: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    // If it's a network request failure (transient Wi-Fi/socket drop) and we haven't retried yet, retry once after 500ms
    if (!options.retry) {
      if (__DEV__) {
        console.warn(`[apiFetch] Network request to ${url} failed, retrying in 500ms...`, err?.message);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return apiFetch(url, { ...options, retry: true });
    }
    throw err;
  }

  if (res.ok) return res;

  let data: { code?: string } | null = null;
  try {
    data = await res.clone().json();
  } catch {}

  // Token expired retry
  if (data?.code === 'TOKEN_EXPIRED' && !options.retry) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      await removeToken();
      throw new Error('Session expired');
    }
    return apiFetch(url, { ...options, retry: true });
  }

  return res;
}
