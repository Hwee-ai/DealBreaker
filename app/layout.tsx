import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'DealBreaker Dashboard v7', description: 'Overview & Insights - unified scaffold' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body style={{margin:0}}>{children}</body></html>);
}
