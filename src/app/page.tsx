import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkOverview from "@/components/HomeworkOverview";
import DailyChecklist from "@/components/DailyChecklist";
import Reports from "@/components/Reports";
import Admin from "@/components/Admin";
import { BookOpenCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center h-16 px-4 border-b bg-background sm:px-6">
        <div className="flex items-center gap-2 text-primary-foreground">
          <BookOpenCheck className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground font-headline">Leksehjelperen</h1>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:w-auto sm:inline-flex">
            <TabsTrigger value="overview">Lekseoversikt</TabsTrigger>
            <TabsTrigger value="daily">Daglig Sjekk</TabsTrigger>
            <TabsTrigger value="reports">Rapporter</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <HomeworkOverview />
          </TabsContent>
          <TabsContent value="daily">
            <DailyChecklist />
          </TabsContent>
          <TabsContent value="reports">
             <Reports />
          </TabsContent>
          <TabsContent value="admin">
            <Admin />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
