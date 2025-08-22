
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { getDb } from '@/lib/firebase';

export default function withAuth<P extends object>(Component: React.ComponentType<P & { userId: string }>) {
  const AuthComponent = (props: P) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    
    useEffect(() => {
      // Ensure Firebase is initialized before using any auth functions
      getDb(); 
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setUser(user);
        } else {
          router.replace('/login');
        }
        setLoading(false);
      });

      return () => unsubscribe();
    }, [router]);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="w-12 h-12 animate-spin" />
        </div>
      );
    }

    if (!user) {
      return null; // or a redirect component
    }

    return <Component {...props} userId={user.uid} />;
  };

  AuthComponent.displayName = `withAuth(${Component.displayName || Component.name || 'Component'})`;
  
  return AuthComponent;
}
