'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
        <AlertCircle className="h-10 w-10 text-black/40" />
        <p className="text-sm font-medium text-black/60 leading-relaxed">
          {error.message || "An unexpected error occurred"}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => reset()}
          >
            Reload
          </Button>
          <Button size="sm" asChild>
            <a href="https://getcohortly.vercel.app/">
              Back to home
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
