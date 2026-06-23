import { unmold } from "./config";
import { readStoredToken } from "./token";

let cachedToken: string | null = null;

async function getAuthToken(): Promise<string> {
  if (process.env.UNMOLD_API_TOKEN) {
    return process.env.UNMOLD_API_TOKEN;
  }

  if (cachedToken !== null) {
    return cachedToken;
  }

  cachedToken = await readStoredToken();
  return cachedToken;
}

export function resetAuthTokenCache(): void {
  cachedToken = null;
}

export async function checkAuth(): Promise<string> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error(
      "Authentication token is missing. Run 'unmold login' or set UNMOLD_API_TOKEN.",
    );
  }

  return token;
}

export async function authenticatedRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await checkAuth();

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  return fetch(`${unmold.api.url}${path}`, { ...options, headers });
}

export async function optionalAuthenticatedRequest(
  path: string,
  options: RequestInit = {},
): Promise<{ response: Response; isAuthenticated: boolean }> {
  const token = await getAuthToken();
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${unmold.api.url}${path}`, {
    ...options,
    headers,
  });

  return {
    response,
    isAuthenticated: !!token,
  };
}
