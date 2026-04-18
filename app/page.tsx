'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError) throw authError;
        
        if (session) {
          router.replace('/home');
        } else {
          router.replace('/login');
        }
      } catch (err: any) {
        setError(err.message || "Failed to connect to authentication service");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      {error ? (
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
          <AlertCircle className="h-10 w-10 text-black/40" />
          <p className="text-sm font-medium text-black/60 leading-relaxed">
            {error}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
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
      ) : (
        <Loader2 className="h-5 w-5 animate-spin text-black/20" />
      )}
    </div>
  );
}
