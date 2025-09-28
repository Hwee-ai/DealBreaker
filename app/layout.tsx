import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DealBreaker',
  description: 'Contract evaluation with Azure OpenAI (Edge streaming)'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
