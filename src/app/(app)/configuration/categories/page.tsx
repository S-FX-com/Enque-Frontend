import { Suspense } from 'react';
import { CategoriesClientContent } from './categories-client';
import { CategoriesSkeleton } from './categories-skeleton';
export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesSkeleton />}>
      <CategoriesClientContent />
    </Suspense>
  );
}