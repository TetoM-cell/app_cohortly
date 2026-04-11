'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

import { Skeleton } from '@/components/ui/skeleton';

import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/home');
      } else {
        router.replace('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FDFCFB]">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ 
            opacity: [0.3, 1, 0.3],
            scale: [0.98, 1.01, 0.98]
          }}
          transition={{ 
            duration: 2.2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="flex flex-col items-center gap-2"
        >
          <h1 className="text-2xl font-bold tracking-tighter text-black" style={{ textShadow: "0 0 40px rgba(0,0,0,0.05)" }}>
            Loading Cohortly...
          </h1>
          <div className="h-[2px] w-32 bg-gray-100 rounded-full overflow-hidden relative">
            <motion.div 
              className="absolute inset-y-0 left-0 bg-black"
              initial={{ width: "0%", left: "0%" }}
              animate={{ 
                width: ["15%", "35%", "15%"],
                left: ["0%", "70%", "0%"]
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
