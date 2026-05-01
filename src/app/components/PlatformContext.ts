export function getPlatformContext(headers) {
  const platform = headers.get("x-platform");

  if (platform !== "mobile" && platform !== "web") {
    throw new Error("Invalid platform");
  }

  return {
    platform,
    isMobile: platform === "mobile",
    isWeb: platform === "web",
  };
}
