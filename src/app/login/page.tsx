
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "@/auth/msal";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";

const MsalLoginButton = () => {
    const { instance } = useMsal();
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            await instance.loginPopup(loginRequest);
            router.push('/');
        } catch (error) {
            console.error(error);
            // Optionally: show an error message to the user
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Logg inn med Microsoft
        </Button>
    );
}

export default function LoginPage() {
    const isAuthenticated = useIsAuthenticated();
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/');
        } else {
            setIsCheckingAuth(false);
        }
    }, [isAuthenticated, router]);

    if (isCheckingAuth) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Logg inn</CardTitle>
                    <CardDescription>
                        Bruk din skolekonto fra Microsoft for å logge inn.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <MsalLoginButton />
                    </div>
                    <div className="mt-6 text-center text-xs text-muted-foreground">
                        Ved å logge inn godtar du at appen lagrer en enkelt databasefil i din personlige OneDrive for å synkronisere data.
                    </div>
                    <Separator className="my-4" />
                     <div className="text-center text-sm">
                        <Link href="/privacy" className="underline hover:text-primary">
                            Personvernerklæring
                        </Link>
                        <span className="mx-2 text-muted-foreground">·</span>
                         <Link href="/changelog" className="underline hover:text-primary">
                            Hva er nytt?
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
