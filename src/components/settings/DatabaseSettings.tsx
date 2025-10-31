"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { db, resetDatabase, clearDatabase, exportDatabase, importDatabase, isEncryptedBackup } from "@/lib/db";
import { setLastBackupDate, getLastBackupDescription } from "@/lib/backupReminder";
import { BackupPasswordDialog } from "@/components/BackupPasswordDialog";
import { format } from "date-fns";
import type { AppSettings } from "@/lib/types";

interface DatabaseSettingsProps {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

export default function DatabaseSettings({ settings, onSettingsChange }: DatabaseSettingsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [encryptBackup, setEncryptBackup] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordDialogMode, setPasswordDialogMode] = useState<'export' | 'import'>('export');
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleResetDatabase = async () => {
    setIsProcessing(true);
    try {
      await resetDatabase();
      toast({
        title: "Database nullstilt og fylt!",
        description: "Databasen er fylt med fersk demodata.",
      });
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast({
        title: "Feil ved nullstilling",
        description: "Kunne ikke nullstille databasen. Sjekk konsollen for feil.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearDatabase = async () => {
    setIsProcessing(true);
    try {
      await clearDatabase();
      toast({
        title: "Database tømt!",
        description: "All data er slettet. Du kan nå legge inn din egen data.",
      });
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast({
        title: "Feil ved tømming",
        description: "Kunne ikke tømme databasen.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (encryptBackup) {
      setPasswordDialogMode('export');
      setShowPasswordDialog(true);
    } else {
      await performExport();
    }
  };

  const performExport = async (password?: string) => {
    try {
      const data = await exportDatabase(password);
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = format(new Date(), 'yyyy-MM-dd');
      const filename = password
        ? `klasseflyt_backup_encrypted_${date}.json`
        : `klasseflyt_backup_${date}.json`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastBackupDate();

      const lockIcon = password ? ' 🔒' : '';
      toast({
        title: "Database eksportert" + lockIcon,
        description: password
          ? "En kryptert backup-fil er lastet ned."
          : "En backup-fil er lastet ned."
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({ title: "Eksport feilet", description: "Kunne ikke eksportere databasen.", variant: "destructive" });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File is not readable");
        const data = JSON.parse(text);

        if (isEncryptedBackup(data)) {
          setPendingImportData(data);
          setPasswordDialogMode('import');
          setShowPasswordDialog(true);
        } else {
          await performImport(data);
        }
      } catch (error) {
        console.error("Import failed:", error);
        toast({ title: "Import feilet", description: "Filen er ugyldig eller korrupt.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const performImport = async (data: any, password?: string) => {
    try {
      await importDatabase(data, password);
      toast({ title: "Database importert!", description: "Siden vil nå lastes på nytt." });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error("Import failed:", error);
      const message = error?.message || "Filen er ugyldig eller korrupt.";
      toast({ title: "Import feilet", description: message, variant: "destructive" });
    }
  };

  const handlePasswordConfirm = async (password: string) => {
    if (passwordDialogMode === 'export') {
      await performExport(password);
    } else {
      await performImport(pendingImportData, password);
      setPendingImportData(null);
    }
  };

  return (
    <>
      <BackupPasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        mode={passwordDialogMode}
        onConfirm={handlePasswordConfirm}
        isEncrypted={passwordDialogMode === 'import' && isEncryptedBackup(pendingImportData)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Database</CardTitle>
          <CardDescription>Handlinger for å administrere appens lokale data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold">Backup og Gjenoppretting</h4>
            <p className="mb-2 text-sm text-muted-foreground">
              Last ned en backup-fil av all data, eller gjenopprett fra en tidligere backup.
            </p>

            {/* Encryption toggle */}
            <div className="flex items-center justify-between p-3 mb-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="flex items-center gap-2">
                <Label htmlFor="encrypt-backup" className="font-medium cursor-pointer">
                  🔒 Krypter backup (anbefalt)
                </Label>
              </div>
              <Switch
                id="encrypt-backup"
                checked={encryptBackup}
                onCheckedChange={setEncryptBackup}
              />
            </div>

            {/* Backup reminder settings */}
            <div className="p-3 mb-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="backup-reminder" className="font-medium">
                  Backup-påminnelse
                </Label>
                <select
                  id="backup-reminder"
                  value={settings.backupReminderDays || 0}
                  onChange={(e) => {
                    const days = parseInt(e.target.value);
                    onSettingsChange({
                      ...settings,
                      backupReminderDays: days
                    });
                  }}
                  className="px-3 py-1 border rounded-md dark:bg-gray-800"
                >
                  <option value={0}>Av</option>
                  <option value={1}>Daglig</option>
                  <option value={7}>Ukentlig (7 dager)</option>
                  <option value={14}>Hver 14. dag</option>
                  <option value={30}>Månedlig (30 dager)</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Siste backup: <strong>{getLastBackupDescription()}</strong>
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline" className="w-full">
                <Download className="mr-2" /> Eksporter {encryptBackup && '🔒'}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Upload className="mr-2" /> Importer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      <AlertTriangle className="inline-block mr-2 text-yellow-500" /> Overskrive all data?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Dette vil permanent slette all nåværende data i appen og erstatte den med innholdet fra backup-filen. Handlingen kan ikke angres.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction onClick={() => fileInputRef.current?.click()}>
                      Ja, fortsett
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                className="hidden"
                accept=".json"
              />
            </div>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold">Tøm database for ny start</h4>
            <p className="mb-2 text-sm text-muted-foreground">
              Dette sletter all eksisterende data (elever, lekser, anmerkninger etc.) slik at du kan starte med blanke ark. Handlingen kan ikke angres.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isProcessing}>
                  {isProcessing ? 'Jobber...' : 'Tøm all data'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <AlertTriangle className="inline-block mr-2 text-yellow-500" />Er du helt sikker?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Dette vil permanent slette all data i appen. Handlingen kan ikke angres.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearDatabase}>Ja, slett alt</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold">Fyll med demodata</h4>
            <p className="mb-2 text-sm text-muted-foreground">
              Dette er for testing. Handlingen sletter først all data, og fyller deretter databasen med et sett med fiktive elever og data.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isProcessing}>
                  {isProcessing ? 'Jobber...' : 'Nullstill og fyll med demodata'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <AlertTriangle className="inline-block mr-2 text-yellow-500" />Er du helt sikker?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Dette vil permanent slette all nåværende data og erstatte den med demodata.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetDatabase}>Ja, nullstill og fyll på nytt</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
