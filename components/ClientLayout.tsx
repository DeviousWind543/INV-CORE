// components/ClientLayout.tsx
'use client';

import BackButtonHandler from './BackButtonHandler';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackButtonHandler />
      {children}
    </>
  );
}