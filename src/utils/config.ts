import { readStoredTokenSync } from "./token";

const storedToken = readStoredTokenSync();

export const unmold = Object.freeze({
  api: {
    url: process.env.UNMOLD_API_URL || "https://api.unmold.dev",
    token: process.env.UNMOLD_API_TOKEN || storedToken || "",
    uploadSizeLimitMB: 20,
  },
});
