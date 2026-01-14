"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Upload, Download, FolderOpen, CheckCircle2, XCircle, Clock } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { db, resetDatabase, clearDatabase, exportDatabase, importDatabase, isEncryptedBackup } from "@/lib/db";
import { setLastBackupDate, getLastBackupDescription } from "@/lib/backupReminder";
import { BackupPasswordDialog } from "@/components/BackupPasswordDialog";
import { format } from "date-fns";
import type { AppSettings, AutoBackupFrequency } from "@/lib/types";
import { useAutomaticBackup } from "@/hooks/useAutomaticBackup";

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
  const [autoBackupPassword, setAutoBackupPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Automatic backup hook
  const {
    isSupported,
    backupSettings,
    lastError,
    selectBackupDirectory,
    performBackup,
    updateSettings,
  } = useAutomaticBackup();

  // Sync password from database when backupSettings loads
  React.useEffect(() => {
    if (backupSettings?.encryptionPassword) {
      setAutoBackupPassword(backupSettings.encryptionPassword);
    }
  }, [backupSettings?.encryptionPassword]);

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
        <CardContent>
          <Accordion type="multiple" defaultValue={[]} className="w-full">
            <AccordionItem value="auto-backup">
              <AccordionTrigger>Automatisk backup til PC</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {!isSupported ? (
                  <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ Automatisk backup til lokal mappe er ikke støttet i denne nettleseren. 
                      Bruk Chrome eller Edge for å aktivere denne funksjonen.
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                      Du kan fortsatt bruke manuell backup (eksporter) nedenfor.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Appen kan automatisk lagre backup-filer til en mappe på PC-en din. 
                      Du velger mappe én gang, og appen lagrer regelmessig sikkerhetskopier der.
                    </p>

                    {/* Directory selection */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium">Backup-mappe</Label>
                        {backupSettings?.directoryName && (
                          <span className="text-xs font-mono text-muted-foreground">{backupSettings.directoryName}</span>
                        )}
                      </div>
                      <Button 
                        onClick={async () => {
                          const success = await selectBackupDirectory();
                          if (success) {
                            toast({
                              title: "Mappe valgt",
                              description: "Automatisk backup er konfigurert"
                            });
                          }
                        }}
                        variant="outline" 
                        size="sm"
                        className="w-full"
                      >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        {backupSettings?.directoryName ? 'Endre mappe' : 'Velg mappe'}
                      </Button>
                    </div>

                    {/* Settings grid - more compact */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Enable/Disable automatic backup */}
                      <div className="flex items-center justify-between p-3 border rounded-lg col-span-2">
                        <Label htmlFor="auto-backup-enabled" className="font-medium cursor-pointer">
                          Aktiver automatisk backup
                        </Label>
                        <Switch
                          id="auto-backup-enabled"
                          checked={backupSettings?.enabled ?? false}
                          disabled={!backupSettings?.directoryName}
                          onCheckedChange={(checked) => updateSettings({ enabled: checked })}
                        />
                      </div>

                      {/* Backup frequency */}
                      <div className="p-3 border rounded-lg">
                        <Label htmlFor="auto-backup-frequency" className="text-sm font-medium mb-2 block">
                          Backup-frekvens
                        </Label>
                        <select
                          id="auto-backup-frequency"
                          value={backupSettings?.frequency ?? 'daily'}
                          onChange={(e) => updateSettings({ frequency: e.target.value as AutoBackupFrequency })}
                          className="w-full px-2 py-1 text-sm border rounded-md dark:bg-gray-800"
                          disabled={!backupSettings?.directoryName}
                        >
                          <option value="hourly">Hver time</option>
                          <option value="daily">Daglig</option>
                          <option value="weekly">Ukentlig</option>
                          <option value="disabled">Bare manuelt</option>
                        </select>
                      </div>

                      {/* Max backups to keep */}
                      <div className="p-3 border rounded-lg">
                        <Label htmlFor="max-backups" className="text-sm font-medium mb-2 block">
                          Antall backups å beholde
                        </Label>
                        <select
                          id="max-backups"
                          value={backupSettings?.maxBackupsToKeep ?? 10}
                          onChange={(e) => updateSettings({ maxBackupsToKeep: parseInt(e.target.value) })}
                          className="w-full px-2 py-1 text-sm border rounded-md dark:bg-gray-800"
                          disabled={!backupSettings?.directoryName}
                        >
                          <option value={5}>5 siste</option>
                          <option value={10}>10 siste</option>
                          <option value={20}>20 siste</option>
                          <option value={50}>50 siste</option>
                          <option value={0}>Ubegrenset</option>
                        </select>
                      </div>
                    </div>

                    {/* Encryption settings */}
                    <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto-backup-encrypt" className="font-medium cursor-pointer">
                          🔒 Krypter automatiske backups
                        </Label>
                        <Switch
                          id="auto-backup-encrypt"
                          checked={backupSettings?.useEncryption ?? false}
                          onCheckedChange={(checked) => {
                            updateSettings({ useEncryption: checked });
                            if (!checked) {
                              setAutoBackupPassword('');
                              updateSettings({ encryptionPassword: undefined });
                            }
                          }}
                          disabled={!backupSettings?.directoryName}
                        />
                      </div>
                      {backupSettings?.useEncryption && (
                        <div className="space-y-1">
                          <Label htmlFor="auto-backup-password" className="text-sm">
                            Krypteringspassord
                          </Label>
                          <input
                            id="auto-backup-password"
                            type="password"
                            value={autoBackupPassword}
                            onChange={(e) => {
                              setAutoBackupPassword(e.target.value);
                              updateSettings({ encryptionPassword: e.target.value });
                            }}
                            placeholder="Skriv inn passord"
                            className="w-full px-3 py-2 text-sm border rounded-md dark:bg-gray-800"
                          />
                          <p className="text-xs text-blue-800 dark:text-blue-200">
                            ⚠️ Passordet lagres i nettleseren. Glem det ikke!
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Backup status and test button combined */}
                    <div className="space-y-2">
                      {backupSettings?.lastBackupDate && (
                        <div className="p-2 border rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            {backupSettings.lastBackupStatus === 'success' ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-xs">Siste backup: {format(new Date(backupSettings.lastBackupDate), 'dd.MM.yyyy HH:mm')}</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="text-xs">Feil ved siste backup</span>
                              </>
                            )}
                          </div>
                          {backupSettings.lastBackupError && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {backupSettings.lastBackupError}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Error display */}
                      {lastError && (
                        <div className="p-2 border rounded-lg bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                          <p className="text-xs text-red-800 dark:text-red-200">
                            ⚠️ {lastError}
                          </p>
                        </div>
                      )}

                      {/* Test backup button */}
                      <Button 
                        onClick={async () => {
                          if (backupSettings?.useEncryption && !autoBackupPassword) {
                            toast({
                              title: "Passord mangler",
                              description: "Skriv inn krypteringspassord først",
                              variant: "destructive"
                            });
                            return;
                          }
                          const success = await performBackup();
                          if (success) {
                            toast({
                              title: "Backup fullført",
                              description: "En backup er lagret i den valgte mappen"
                            });
                          } else {
                            toast({
                              title: "Backup feilet",
                              description: lastError || "Ukjent feil",
                              variant: "destructive"
                            });
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={!backupSettings?.directoryName}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Test backup nå
                      </Button>
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="backup">
              <AccordionTrigger>Backup og Gjenoppretting</AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  Last ned en backup-fil av all data, eller gjenopprett fra en tidligere backup.
                </p>

                {/* Encryption toggle */}
                <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
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
                <div className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="backup-reminder" className="font-medium">
                      Backup-påminnelse
                    </Label>
                    <select
                      id="backup-reminder"
                      // Default to weekly (7 days) when the setting is not present
                      value={settings.backupReminderDays ?? 7}
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
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="clear">
              <AccordionTrigger>Tøm database for ny start</AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
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
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="demo" className="border-b-0">
              <AccordionTrigger>Fyll med demodata</AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </>
  );
}
