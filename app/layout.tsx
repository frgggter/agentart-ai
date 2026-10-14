import React from 'react';
import './globals.css';

export const metadata = {
  title: 'AgentArt AI - Autonomous AI Art Director',
  description: 'Powered by NVIDIA Nemotron & Nebius Token Factory',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
