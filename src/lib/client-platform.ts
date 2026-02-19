export const WEB_CLIENT_PLATFORM = "web";
export const MOBILE_CLIENT_PLATFORM = "mobile";

export type ClientPlatform = typeof WEB_CLIENT_PLATFORM | typeof MOBILE_CLIENT_PLATFORM;

type WindowWithCapacitor = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
};

export function detectClientPlatform(): ClientPlatform {
  if (typeof window === "undefined") {
    return WEB_CLIENT_PLATFORM;
  }

  const capacitor = (window as WindowWithCapacitor).Capacitor;
  if (typeof capacitor?.isNativePlatform === "function" && capacitor.isNativePlatform()) {
    return MOBILE_CLIENT_PLATFORM;
  }

  return WEB_CLIENT_PLATFORM;
}
