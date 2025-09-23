import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Web – logo, carousel, text',
  description: 'Jednoduchý mobilný web s logom, carouselom a textom',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sk">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;800&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* Farby telu berieme z CSS premenných, ktoré nastaví stránka. */}
      <body
        className="min-h-dvh antialiased font-sans"
        style={{
          backgroundColor: 'var(--page-bg, #ffffff)',
          color: 'var(--page-fg, #111111)',
        }}
      >
        {/* Centrovanie/rámik – zachované */}
        <div className="mx-auto w-full max-w-screen-sm p-4">
          {children}
        </div>
      </body>
    </html>
  );
}
