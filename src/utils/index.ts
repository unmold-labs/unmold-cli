import { unmold } from "./config";

export function checkAuth(): void {
  if (!unmold.api.token) {
    throw new Error(
      "Authentication token is missing. Run 'unmold login' or set UNMOLD_API_TOKEN.",
    );
  }
}

export function authenticatedRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  checkAuth();

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${unmold.api.token}`,
  };

  return fetch(`${unmold.api.url}${path}`, { ...options, headers });
}
