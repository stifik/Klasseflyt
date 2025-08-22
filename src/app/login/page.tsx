
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth();

  const handleLogin = async (email: string, password: string) => {
    setError(null);
    try {
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
