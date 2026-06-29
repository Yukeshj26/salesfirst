import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SalesArc — AI Follow-up CRM',
  description: 'AI-powered CRM for founders and early sales teams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, fontFamily: "'Inter', system-ui, sans-serif", background: '#f8f9fa', color: '#1f2937' }}>
        {children}
      </body>
    </html>
  );
}
