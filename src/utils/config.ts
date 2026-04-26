export const unmold = Object.freeze({
  api: {
    url: "https://api.unmold.dev",
    token: process.env.UNMOLD_API_TOKEN || "",
    uploadSizeLimitMB: 20,
  },
});
