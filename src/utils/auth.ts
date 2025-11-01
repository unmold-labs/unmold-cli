import { authenticatedRequest } from "./index";

export interface IUserProfile {
  name: string;
  email: string;
}

export async function getUserProfile(): Promise<IUserProfile> {
  const response = await authenticatedRequest("/users/v1/current");

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`);
  }

  const data = await response.json();
  return { name: data.name, email: data.email };
}
