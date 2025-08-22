
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import AuthForm from "@/components/AuthForm";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth();

  const handleSignup = async (email: string, password: string) => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: "Registrering vellykket", description: "Velkommen! Du blir nå sendt til innloggingssiden." });
      router.push("/login");
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setError("Denne e-postadressen er allerede i bruk.");
      } else if (error.code === 'auth/weak-password') {
        setError("Passordet er for svakt. Det må være minst 6 tegn.");
      } else {
        setError("En ukjent feil oppstod. Prøv igjen.");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <AuthForm
        mode="signup"
        onSubmit={handleSignup}
        error={error}
      />
    </div>
  );
}
