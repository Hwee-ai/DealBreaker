import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DealBreaker Dashboard',
  description: 'Overview Dashboard & Insight Engine (auto-updated from Excel)'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{margin:0}}>{children}</body>
    </html>
  );
}
