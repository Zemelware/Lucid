import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lucid.dreamscape",
  appName: "Lucid",
  webDir: ".next-build",
  server: {
    androidScheme: "https",
  },
};

export default config;
