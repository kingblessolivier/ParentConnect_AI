import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata = {
  title: 'ParentConnect AI — Staff Console',
  description: 'Admin, clinical review, and child-protection consoles (staff only).',
};

// Applied before hydration so the chosen theme renders on first paint — no
// flash of the wrong theme. Falls back to the OS preference (handled by CSS)
// when nothing has been chosen yet.
const THEME_INIT = `
(function () {
  try {
    var stored = localStorage.getItem('pc_theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <div className="layout">
          <Sidebar />
          <main className="main">
            <TopBar />
            <div className="content">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
