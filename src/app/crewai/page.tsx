import { Suspense } from 'react';
import CrewAIPage from './crew-ai-client';

function CrewAILoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-12 h-12 mb-4">
          <div className="absolute inset-0 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-amber-100 font-semibold">Loading...</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<CrewAILoading />}>
      <CrewAIPage />
    </Suspense>
  );
}
