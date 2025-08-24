
"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

interface AuthFormProps {
  mode: "login" | "signup";
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
}

export default function AuthForm({ mode, onSubmit, error }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onSubmit(email, password);
    setIsLoading(false);
  };

  const isLogin = mode === "login";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{isLogin ? "Logg inn" : "Registrer deg"}</CardTitle>
        <CardDescription>
          {isLogin
            ? "Skriv inn e-post og passord for å fortsette."
            : "Opprett en ny konto for å komme i gang."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-post</Label>
            <Input
              id="email"
              type="email"
              placeholder="din@epost.no"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passord</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLogin ? "Logg inn" : "Registrer konto"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          {isLogin ? (
            <>
              Har du ikke konto?{" "}
              <Link href="/signup" className="underline">
                Registrer deg
              </Link>
            </>
          ) : (
            <>
              Har du allerede en konto?{" "}
              <Link href="/login" className="underline">
                Logg inn
              </Link>
            </>
          )}
        </div>
        <div className="mt-6 text-center text-xs text-muted-foreground">
          Ved å logge inn eller registrere deg, godtar du vilkårene i vår{" "}
          <Link href="/privacy" className="underline">
            Personvernerklæring
          </Link>
          .
        </div>
      </CardContent>
    </Card>
  );
}
