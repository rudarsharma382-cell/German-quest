import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const pressStart2P = localFont({
  src: '../../public/fonts/PressStart2P-Regular.ttf',
  variable: '--font-press-start',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'German Quest: Deutschstadt',
  description: 'A 2D pixel-art educational RPG that teaches German',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${pressStart2P.variable} font-pixel h-full w-full`}>
      <body className="bg-slate-900 text-slate-100 h-full w-full overflow-hidden select-none fixed inset-0">
        {children}
      </body>
    </html>
  );
}
