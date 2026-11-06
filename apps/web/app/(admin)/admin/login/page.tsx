'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Lock, KeyRound, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@supporters/ui-web/components/button';
import { Card } from '@supporters/ui-web/components/card';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!totpCode || totpCode.length !== 6) {
      setErrorMessage('Please enter a valid 6-digit TOTP code from your authenticator app.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/v1/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          totpCode: totpCode.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Invalid administrator credentials or TOTP code.');
      }

      router.push('/admin');
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full bg-card border-border rounded-2xl p-6 sm:p-8 shadow-md space-y-6">
        <div className="text-center space-y-2">
          <div className="size-12 rounded-2xl bg-destructive-soft text-destructive flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="size-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Supporters Admin Portal
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Restricted access. Requires administrator credentials and two-factor TOTP authentication.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-destructive-soft text-destructive text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="adminEmail" className="text-xs font-semibold">
              Admin Email
            </Label>
            <Input
              id="adminEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@supporters.in"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adminPassword" className="text-xs font-semibold">
              Master Password
            </Label>
            <Input
              id="adminPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="totpCode" className="text-xs font-semibold flex items-center gap-1.5">
              <KeyRound className="size-3.5 text-primary" />
              <span>6-Digit TOTP Authenticator Code *</span>
            </Label>
            <Input
              id="totpCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="font-mono text-center tracking-widest text-lg font-bold"
              required
            />
            <p className="text-[11px] text-muted-foreground">Session duration: 8 hours with no refresh.</p>
          </div>

          <Button type="submit" disabled={loading} size="default" className="w-full font-bold shadow-xs">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                <span>Verifying TOTP...</span>
              </>
            ) : (
              <span>Sign In to Admin Portal</span>
            )}
          </Button>
        </form>
      </Card>
    </main>
  );
}
