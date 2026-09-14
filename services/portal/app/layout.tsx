import React from 'react';
import '@/index.css';
import AppShell from '@/components/layout/AppShell';

export const metadata = {
  title: 'InsightIQ',
  description: 'AI-Powered Business Intelligence',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
