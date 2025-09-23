// lib/types.ts

export type ThemeConfig = {
  mode: 'light' | 'dark' | 'custom';
  /** Použité len pri mode === 'custom' */
  bgColor?: string;    // napr. "#ffffff"
  textColor?: string;  // napr. "#111111"
};

export type SiteContent = {
  logoUrl: string | null;
  carousel: string[]; // presne stringové URL
  text: string;
  /** Nepovinné pre spätnú kompatibilitu so staršími JSON */
  theme?: ThemeConfig;
};
