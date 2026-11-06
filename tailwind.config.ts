import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['var(--font-press-start)', 'monospace', 'Courier New'],
      },
      colors: {
        retro: {
          dark: '#1a1c23',
          paper: '#f6f6d4',
          wood: '#8b5a2b',
          gold: '#facc15',
          goldDark: '#ca8a04',
          ruby: '#dc2626',
          emerald: '#16a34a',
          sky: '#38bdf8',
          border: '#0f172a',
        },
      },
      boxShadow: {
        'pixel': '4px 4px 0px 0px #000000',
        'pixel-sm': '2px 2px 0px 0px #000000',
        'pixel-lg': '6px 6px 0px 0px #000000',
        'pixel-hover': '5px 5px 0px 0px #000000',
        'pixel-pressed': '1px 1px 0px 0px #000000',
        'pixel-inset': 'inset 3px 3px 0px 0px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};

export default config;

