"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface BackupPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'export' | 'import';
  onConfirm: (password: string) => void;
  isEncrypted?: boolean; // For import: is the file encrypted?
}

export function BackupPasswordDialog({
  open,
  onOpenChange,
  mode,
  onConfirm,
  isEncrypted = false,
}: BackupPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!password) {
      setError('Vennligst skriv inn et passord');
      return;
    }

    if (mode === 'export') {
      if (password.length < 8) {
        setError('Passordet må være minst 8 tegn langt');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passordene stemmer ikke overens');
        return;
      }
    }

    onConfirm(password);
    handleClose();
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
    onOpenChange(false);
  };

  const getPasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 1) return { strength: 1, label: 'Svakt', color: 'bg-red-500' };
    if (strength <= 3) return { strength: 2, label: 'Middels', color: 'bg-yellow-500' };
    return { strength: 3, label: 'Sterkt', color: 'bg-green-500' };
  };

  const passwordStrength = mode === 'export' && password ? getPasswordStrength(password) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {mode === 'export' ? 'Krypter backup' : 'Dekrypter backup'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'export'
              ? 'Oppgi et passord for å kryptere backupen din. Husk passordet – det kan ikke gjenopprettes!'
              : isEncrypted
              ? 'Denne backupen er kryptert. Oppgi passordet for å fortsette.'
              : 'Denne backupen er ikke kryptert. Du kan importere uten passord.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password input */}
          <div className="space-y-2">
            <Label htmlFor="password">
              {mode === 'export' ? 'Passord' : 'Oppgi passord'}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'export' ? 'Minst 8 tegn' : 'Skriv inn passord'}
                className="pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength indicator */}
            {passwordStrength && mode === 'export' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Passordstyrke:</span>
                  <span className={`font-medium ${
                    passwordStrength.strength === 1 ? 'text-red-600' :
                    passwordStrength.strength === 2 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.strength / 3) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm password (only for export) */}
          {mode === 'export' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bekreft passord</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Skriv inn passordet på nytt"
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info box */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {mode === 'export' ? (
                <>
                  <strong>Viktig:</strong> Passordet lagres ikke i appen. Hvis du glemmer det, kan du ikke gjenopprette backupen.
                </>
              ) : (
                <>
                  Backupen er kryptert med AES-256. Oppgi riktig passord for å dekryptere.
                </>
              )}
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Avbryt
            </Button>
            <Button type="submit">
              {mode === 'export' ? 'Krypter og last ned' : 'Dekrypter og importer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
