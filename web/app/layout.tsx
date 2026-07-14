import type { ReactNode } from 'react';

export const metadata = {
  title: 'ParentConnect AI — Staff Console',
  description: 'Admin, clinical review, and child-protection consoles (staff only).',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
