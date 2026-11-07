import React from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
  modal: React.ReactNode;
}

export default function AdminLayout({ children, modal }: Readonly<AdminLayoutProps>) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
