
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import AuthForm from "@/components/AuthForm";
import { getDb } from "@/lib/firebase";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  getDb(); // Ensure Firebase is initialized

  const handleLogin = async (email: string, password: string) => {
    setError(null);
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Innlogging vellykket", description: "Velkommen tilbake!" });
      router.push("/");
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/invalid-credential') {
        setError("Ugyldig e-post eller passord.");
      } else {
        setError("En ukjent feil oppstod. Prøv igjen.");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <AuthForm
        mode="login"
        onSubmit={handleLogin}
        error={error}
      />
    </div>
  );
}
