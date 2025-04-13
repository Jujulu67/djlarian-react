import React from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
  modal: React.ReactNode;
}

export default function AdminLayout({ children, modal }: AdminLayoutProps) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
