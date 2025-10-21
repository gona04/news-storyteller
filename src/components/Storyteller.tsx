'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function Storyteller() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const urlParam = searchParams.get('url');
    
    if (urlParam) {
      const encodedUrl = encodeURIComponent(urlParam);
      router.replace(`/crewai?news_link=${encodedUrl}`);
    } else {
      router.replace('/crewai');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="inline-block relative w-16 h-16">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-lg opacity-75 animate-pulse"></div>
          <div className="relative w-16 h-16 border-4 border-transparent border-t-blue-400 border-r-cyan-400 rounded-full animate-spin"></div>
        </div>
        <div>
          <p className="text-slate-100 text-lg font-semibold">Redirecting to Crew AI</p>
          <p className="text-slate-400 text-sm mt-2">Transforming your story...</p>
        </div>
      </div>
    </div>
  );
}
