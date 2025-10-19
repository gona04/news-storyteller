import { Suspense } from 'react';
import Storyteller from '@/components/Storyteller';

export default function StorytellerPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
        <Storyteller />
      </Suspense>
    </main>
  );
}