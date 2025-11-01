"use client";

import * as React from "react";
import type { AppSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ReportSettingsProps {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

export default function ReportSettings({ settings, onSettingsChange }: ReportSettingsProps) {
  const handleReportSettingChange = (setting: keyof AppSettings['reportSettings'], value: any) => {
    onSettingsChange({
      ...settings,
      reportSettings: { ...settings.reportSettings, [setting]: value }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rapporter</CardTitle>
        <CardDescription>Innstillinger for ukesmelding og elevrapporter</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={[]} className="w-full">
          <AccordionItem value="weekly">
            <AccordionTrigger>Ukesmelding</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div>
                <h4 className="mb-2 font-medium text-sm">Innhold</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label htmlFor="report-homework" className="font-medium">Inkluder lekse-status</Label>
                    <Switch
                      id="report-homework"
                      checked={settings.reportSettings.includeHomework}
                      onCheckedChange={(checked) => handleReportSettingChange('includeHomework', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label htmlFor="report-ipad" className="font-medium">Inkluder iPad-status</Label>
                    <Switch
                      id="report-ipad"
                      checked={settings.reportSettings.includeIpad}
                      onCheckedChange={(checked) => handleReportSettingChange('includeIpad', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label htmlFor="report-remarks" className="font-medium">Inkluder anmerkninger</Label>
                    <Switch
                      id="report-remarks"
                      checked={settings.reportSettings.includeRemarks}
                      onCheckedChange={(checked) => handleReportSettingChange('includeRemarks', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label htmlFor="report-tests" className="font-medium">Inkluder prøveresultater</Label>
                    <Switch
                      id="report-tests"
                      checked={settings.reportSettings.includeTests}
                      onCheckedChange={(checked) => handleReportSettingChange('includeTests', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label htmlFor="report-positive" className="font-medium">Send ros ved prikkfri uke</Label>
                    <Switch
                      id="report-positive"
                      checked={settings.reportSettings.includePositiveFeedback}
                      onCheckedChange={(checked) => handleReportSettingChange('includePositiveFeedback', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label htmlFor="includeSecretAgent" className="font-medium">🕵️ Hemmelig Agent i ukesmelding</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Inkluder godkjente agent-oppdrag i ukesmeldingen</p>
                    </div>
                    <Switch
                      id="includeSecretAgent"
                      checked={settings.reportSettings.includeSecretAgent ?? false}
                      onCheckedChange={(value) => handleReportSettingChange('includeSecretAgent', value)}
                    />
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="mb-2 font-medium text-sm">Tekstmal</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="greeting">Hilsen</Label>
                    <Input id="greeting" value={settings.reportSettings.greeting} onChange={(e) => handleReportSettingChange('greeting', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="closing">Avslutning</Label>
                    <Input id="closing" value={settings.reportSettings.closing} onChange={(e) => handleReportSettingChange('closing', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="teacherName">Ditt navn (for signatur)</Label>
                    <Input id="teacherName" value={settings.reportSettings.teacherName} onChange={(e) => handleReportSettingChange('teacherName', e.target.value)} />
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <Label htmlFor="positiveFeedbackMessage">Ros: Prikkfri uke</Label>
                    <Textarea id="positiveFeedbackMessage" value={settings.reportSettings.positiveFeedbackMessage} onChange={(e) => handleReportSettingChange('positiveFeedbackMessage', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="positiveFeedbackHomework">Ros: Kun lekser</Label>
                    <Textarea id="positiveFeedbackHomework" value={settings.reportSettings.positiveFeedbackHomework} onChange={(e) => handleReportSettingChange('positiveFeedbackHomework', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="positiveFeedbackIpad">Ros: Kun iPad</Label>
                    <Textarea id="positiveFeedbackIpad" value={settings.reportSettings.positiveFeedbackIpad} onChange={(e) => handleReportSettingChange('positiveFeedbackIpad', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="positiveFeedbackBoth">Ros: Både lekser og iPad</Label>
                    <Textarea id="positiveFeedbackBoth" value={settings.reportSettings.positiveFeedbackBoth} onChange={(e) => handleReportSettingChange('positiveFeedbackBoth', e.target.value)} />
                  </div>
                  {(settings.reportSettings.includeSecretAgent ?? false) && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <Label htmlFor="secretAgentMessage">Hemmelig Agent tekst</Label>
                        <Textarea
                          id="secretAgentMessage"
                          placeholder="F.eks. 'Fullførte rollen som hemmelig agent med følgende oppdrag: [OPPDRAG]'"
                          value={settings.reportSettings.secretAgentMessage || ''}
                          onChange={(e) => handleReportSettingChange('secretAgentMessage', e.target.value)}
                          rows={3}
                        />
                        <p className="text-xs text-gray-500">Bruk [OPPDRAG] for å inkludere oppdraget</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">💡 Kun godkjente oppdrag (status "passed") inkluderes i ukesmeldingen</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="student-reports" className="border-b-0">
            <AccordionTrigger>Elevrapport</AccordionTrigger>
            <AccordionContent className="space-y-2 pt-4">
              <p className="text-sm text-muted-foreground mb-3">Velg hvilket innhold som skal inkluderes i den detaljerte elevrapporten.</p>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="report-s-homework" className="font-medium">Inkluder lekser</Label>
                <Switch
                  id="report-s-homework"
                  checked={settings.reportSettings.includeHomeworkInReport}
                  onCheckedChange={(checked) => handleReportSettingChange('includeHomeworkInReport', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="report-s-ipad" className="font-medium">Inkluder iPad-ansvar</Label>
                <Switch
                  id="report-s-ipad"
                  checked={settings.reportSettings.includeIpadInReport}
                  onCheckedChange={(checked) => handleReportSettingChange('includeIpadInReport', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="report-s-hourly" className="font-medium">Inkluder innsats i timen</Label>
                <Switch
                  id="report-s-hourly"
                  checked={settings.reportSettings.includeHourlyCheckInReport}
                  onCheckedChange={(checked) => handleReportSettingChange('includeHourlyCheckInReport', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="report-s-remarks" className="font-medium">Inkluder anmerkninger/logg</Label>
                <Switch
                  id="report-s-remarks"
                  checked={settings.reportSettings.includeRemarksInReport}
                  onCheckedChange={(checked) => handleReportSettingChange('includeRemarksInReport', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="report-s-tests" className="font-medium">Inkluder prøveresultater</Label>
                <Switch
                  id="report-s-tests"
                  checked={settings.reportSettings.includeTestsInReport}
                  onCheckedChange={(checked) => handleReportSettingChange('includeTestsInReport', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="report-s-goals" className="font-medium">Inkluder læringsmål</Label>
                <Switch
                  id="report-s-goals"
                  checked={settings.reportSettings.includeLearningGoalsInReport}
                  onCheckedChange={(checked) => handleReportSettingChange('includeLearningGoalsInReport', checked)}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
