
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Placeholder for MSAL button
const MsalLoginButton = () => {
    // Logic to handle Microsoft Login will be added here.
    return (
        <Button className="w-full" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Laster Microsoft innlogging...
        </Button>
    )
}


export default function LoginPage() {

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
        </CardContent>
       </Card>
    </div>
  );
}
