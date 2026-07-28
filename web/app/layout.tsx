import type { ReactNode } from 'react';
import './globals.css';
import { Sidebar } from '../components/Sidebar';

export const metadata = {
  title: 'ParentConnect AI — Staff Console',
  description: 'Admin, clinical review, and child-protection consoles (staff only).',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          <Sidebar />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
