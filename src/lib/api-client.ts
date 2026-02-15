import { isRecord } from "@/lib/validation";

export function readApiErrorMessage(value: unknown, fallback: string): string {
  if (isRecord(value) && typeof value.error === "string" && value.error.trim().length > 0) {
    return value.error;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error?: unknown }).error === "string"
  ) {
    const message = (value as { error?: string }).error ?? "";
    if (message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}

