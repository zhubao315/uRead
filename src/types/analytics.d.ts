export {};

declare global {
  interface Window {
    ZHUBAO?: {
      pageview: () => void;
      track: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}
