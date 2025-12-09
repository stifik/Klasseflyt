'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sparkles, Eye, EyeOff, Loader2, CheckCircle, XCircle, RefreshCw, MessageSquare, Code } from 'lucide-react';
import type { AIMessageSettings as AIMessageSettingsType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  getApiKey, 
  setApiKey, 
  testConnection,
  generatePreview 
} from '@/lib/aiMessageService';

const defaultAISettings: AIMessageSettingsType = {
  enabled: false,
  provider: 'openai',
  messageContext: '',
  tone: 'friendly',
  language: 'norwegian',
  includeTimeOfDay: true,
  includeDayOfWeek: true,
};

export default function AIMessageSettings() {
  const settings = useLiveQuery(() => db.settings.get('userSettings'));
  
  const [aiSettings, setAiSettings] = useState<AIMessageSettingsType>(defaultAISettings);
  const [apiKey, setApiKeyState] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Preview state
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Load settings from DB
  useEffect(() => {
    if (settings?.morningDisplaySettings?.aiMessageSettings) {
      setAiSettings(settings.morningDisplaySettings.aiMessageSettings);
    }
  }, [settings]);

  // Load API key from localStorage
  useEffect(() => {
    const key = getApiKey(aiSettings.provider);
    setApiKeyState(key || '');
  }, [aiSettings.provider]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save API key to localStorage
      if (apiKey) {
        setApiKey(aiSettings.provider, apiKey);
      }

      // Save settings to DB
      const current = await db.settings.get('userSettings');
      if (current && current.morningDisplaySettings) {
        const updatedSettings = {
          ...current.morningDisplaySettings,
          aiMessageSettings: aiSettings,
        };
        await db.settings.update('userSettings', {
          morningDisplaySettings: updatedSettings,
        });
      }

      setTestResult({ success: true, message: 'Innstillinger lagret!' });
      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      console.error('Error saving AI settings:', error);
      setTestResult({ success: false, message: 'Feil ved lagring' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      setTestResult({ success: false, message: 'Legg inn API-nøkkel først' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testConnection(aiSettings.provider, apiKey);
      if (result.success) {
        setTestResult({ success: true, message: 'Tilkobling vellykket!' });
      } else {
        setTestResult({ success: false, message: result.error || 'Tilkobling feilet' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Feil ved testing av tilkobling' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!apiKey) {
      setTestResult({ success: false, message: 'Legg inn API-nøkkel først' });
      return;
    }

    setIsGeneratingPreview(true);
    setPreviewMessage(null);
    setPreviewPrompt(null);
    setTestResult(null);

    try {
      const result = await generatePreview(aiSettings, apiKey);
      if (result.success) {
        setPreviewMessage(result.message);
        setPreviewPrompt(result.prompt);
      } else {
        setTestResult({ success: false, message: result.error || 'Feil ved generering' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Feil ved generering av forhåndsvisning' });
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const updateSetting = <K extends keyof AIMessageSettingsType>(
    key: K, 
    value: AIMessageSettingsType[K]
  ) => {
    setAiSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          KI-genererte velkomstmeldinger
        </CardTitle>
        <CardDescription>
          Bruk KI til å generere unike velkomstmeldinger basert på tid, dag og dine preferanser.
          Du bruker din egen API-nøkkel (BYOK), så du betaler kun for din egen bruk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="ai-enabled">Aktiver KI-meldinger</Label>
            <p className="text-sm text-muted-foreground">
              Når aktivert, genereres velkomstmeldinger automatisk ved hjelp av KI
            </p>
          </div>
          <Switch
            id="ai-enabled"
            checked={aiSettings.enabled}
            onCheckedChange={(checked) => updateSetting('enabled', checked)}
          />
        </div>

        {aiSettings.enabled && (
          <>
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>KI-leverandør</Label>
              <Select
                value={aiSettings.provider}
                onValueChange={(value: 'openai' | 'anthropic') => {
                  updateSetting('provider', value);
                  // Load API key for new provider
                  const key = getApiKey(value);
                  setApiKeyState(key || '');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (GPT-4o-mini)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude Sonnet 4)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="api-key">API-nøkkel</Label>
              <p className="text-sm text-muted-foreground">
                {aiSettings.provider === 'openai' 
                  ? 'Hent nøkkel fra platform.openai.com'
                  : 'Hent nøkkel fra console.anthropic.com'
                }
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="api-key"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKeyState(e.target.value)}
                    placeholder={aiSettings.provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={isTesting || !apiKey}
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Test'
                  )}
                </Button>
              </div>
            </div>

            {/* Message Context */}
            <div className="space-y-2">
              <Label htmlFor="context">Meldingsessens</Label>
              <p className="text-sm text-muted-foreground">
                Beskriv hva slags meldinger du ønsker. F.eks. "Vennlig velkomst til 5. klasse med fokus på læring og trivsel"
              </p>
              <Textarea
                id="context"
                value={aiSettings.messageContext}
                onChange={(e) => updateSetting('messageContext', e.target.value)}
                placeholder="Beskriv essensen av meldingene du ønsker..."
                rows={3}
              />
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select
                value={aiSettings.tone}
                onValueChange={(value: 'friendly' | 'formal' | 'humorous' | 'motivational') => 
                  updateSetting('tone', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Vennlig og varm</SelectItem>
                  <SelectItem value="formal">Formell og profesjonell</SelectItem>
                  <SelectItem value="humorous">Humoristisk og leken</SelectItem>
                  <SelectItem value="motivational">Motiverende og oppmuntrende</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label>Språk</Label>
              <Select
                value={aiSettings.language}
                onValueChange={(value: 'norwegian' | 'english') => 
                  updateSetting('language', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="norwegian">Norsk</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Include Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Inkluder tid på dagen</Label>
                  <p className="text-sm text-muted-foreground">
                    F.eks. "God morgen" vs "God formiddag"
                  </p>
                </div>
                <Switch
                  checked={aiSettings.includeTimeOfDay}
                  onCheckedChange={(checked) => updateSetting('includeTimeOfDay', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Inkluder ukedag</Label>
                  <p className="text-sm text-muted-foreground">
                    F.eks. "Velkommen til en ny mandag!"
                  </p>
                </div>
                <Switch
                  checked={aiSettings.includeDayOfWeek}
                  onCheckedChange={(checked) => updateSetting('includeDayOfWeek', checked)}
                />
              </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Test meldingen din</Label>
                  <p className="text-sm text-muted-foreground">
                    Se hvordan en melding vil se ut med gjeldende innstillinger
                  </p>
                </div>
                <Button 
                  onClick={handleGeneratePreview}
                  disabled={isGeneratingPreview || !apiKey}
                  variant="outline"
                >
                  {isGeneratingPreview ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Genererer...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Generer forhåndsvisning
                    </>
                  )}
                </Button>
              </div>

              {previewMessage && (
                <div className="space-y-2">
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-lg font-medium text-center">{previewMessage}</p>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPrompt(!showPrompt)}
                      className="text-xs text-muted-foreground"
                    >
                      <Code className="h-3 w-3 mr-1" />
                      {showPrompt ? 'Skjul prompt' : 'Vis prompt'}
                    </Button>
                  </div>
                  
                  {showPrompt && previewPrompt && (
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap">
                      {previewPrompt}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Info about time periods */}
            <Alert>
              <RefreshCw className="h-4 w-4" />
              <AlertDescription>
                Meldinger genereres én gang per tidsperiode (fra Tidsbaserte meldinger-innstillingene). 
                Ved bytte av tidsperiode genereres en ny melding automatisk hvis skjermen er aktiv.
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* Test Result */}
        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>{testResult.message}</AlertDescription>
          </Alert>
        )}

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Lagre innstillinger
        </Button>
      </CardContent>
    </Card>
  );
}
