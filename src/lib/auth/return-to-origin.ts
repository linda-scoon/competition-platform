const DEFAULT_RETURN_TO = "/dashboard";

export function normalizeReturnTo(rawValue: string | null | undefined): string {
  if (!rawValue) {
    return DEFAULT_RETURN_TO;
  }

  if (!rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return DEFAULT_RETURN_TO;
  }

  return rawValue;
}
