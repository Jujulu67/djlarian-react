'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ImagesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/configuration#images');
  }, [router]);
  return null;
}
