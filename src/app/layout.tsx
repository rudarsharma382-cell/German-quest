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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${pressStart2P.variable} font-pixel`}>
      <body className="bg-slate-900 text-slate-100 h-screen w-screen overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
