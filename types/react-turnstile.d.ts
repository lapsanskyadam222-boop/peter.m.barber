// types/react-turnstile.d.ts
declare module "react-turnstile" {
  import * as React from "react";

  export interface TurnstileProps {
    sitekey: string;
    onSuccess?: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
    // vo widgete nechávame voľné options (Cloudflare si ich parsuje sám)
    options?: Record<string, any>;
    className?: string;
  }

  const Turnstile: React.FC<TurnstileProps>;
  export default Turnstile;
}
