import { unmold } from "./config";
import { readStoredToken } from "./token";

async function getAuthToken(): Promise<string> {
  if (process.env.UNMOLD_API_TOKEN) {
    return process.env.UNMOLD_API_TOKEN;
  }

  return await readStoredToken();
}

export function resetAuthTokenCache(): void {
  // Kept for compatibility; token reads are no longer cached.
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
