import type { ReactNode } from 'react';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '900'],
  style: ['normal', 'italic'],
});

export const metadata = {
  title: 'ParentConnect AI',
  description:
    'Helping Rwandan parents become their teenagers’ most trusted source on growing up — private coaching, conversation scripts, and community support, in Kinyarwanda first.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
