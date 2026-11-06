'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  ArrowLeft,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building,
  Smartphone,
  Info,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@supporters/ui-web/components/button';
import { Card } from '@supporters/ui-web/components/card';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';

export default function WithdrawMoneyPage() {
  const router = useRouter();
  const { walletData, requestWithdrawal, showToast } = useApp();

  const MIN_WITHDRAWAL_AMOUNT = 100;

  const [step, setStep] = useState<'form' | 'review' | 'success'>('form');
  const [amount, setAmount] = useState<string>('500');
  const [method, setMethod] = useState<'UPI' | 'Bank Account'>('UPI');

  // Form inputs
  const [upiId, setUpiId] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedRefId, setSubmittedRefId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const numAmount = parseFloat(amount) || 0;

  const handleValidateAndReview = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid withdrawal amount greater than ₹0.');
      return;
    }

    if (numAmount < MIN_WITHDRAWAL_AMOUNT) {
      setErrorMessage(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL_AMOUNT}.`);
      return;
    }

    if (numAmount > walletData.availableBalance) {
      setErrorMessage(
        `Withdrawal amount (₹${numAmount}) exceeds your available balance (₹${walletData.availableBalance}).`,
      );
      return;
    }

    if (method === 'UPI') {
      if (!upiId.trim() || !upiId.includes('@')) {
        setErrorMessage('Please provide a valid UPI ID (e.g. mobile@upi, name@okhdfcbank).');
        return;
      }
    } else {
      if (!accountHolderName.trim()) {
        setErrorMessage('Please enter the bank account holder name.');
        return;
      }
      if (!accountNumber.trim() || accountNumber.length < 8) {
        setErrorMessage('Please provide a valid account number.');
        return;
      }
      if (accountNumber !== confirmAccountNumber) {
        setErrorMessage('Bank account numbers do not match.');
        return;
      }
      if (!ifscCode.trim() || ifscCode.trim().length !== 11) {
        setErrorMessage('Please enter a valid 11-character bank IFSC code.');
        return;
      }
    }

    setStep('review');
  };

  const handleConfirmPayout = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      requestWithdrawal({
        amount: numAmount,
        method,
        upiId: method === 'UPI' ? upiId.trim() : undefined,
        accountHolderName: method === 'Bank Account' ? accountHolderName.trim() : undefined,
        accountNumber: method === 'Bank Account' ? accountNumber.trim() : undefined,
        ifscCode: method === 'Bank Account' ? ifscCode.trim() : undefined,
      });

      const refId = `WTH-${Date.now().toString().slice(-6)}`;
      setSubmittedRefId(refId);
      setStep('success');
      showToast(`Withdrawal request for ₹${numAmount} submitted!`, 'success');
    } catch {
      setErrorMessage('Failed to submit withdrawal request. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Link href="/wallet">
            <ArrowLeft className="size-3.5" />
            <span>Back to Wallet</span>
          </Link>
        </Button>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-black text-foreground tracking-tight">Withdraw Money</h1>
        <p className="text-xs text-muted-foreground">
          Transfer your available referral earnings and reward bonuses directly to your verified bank account or UPI handle.
        </p>
      </div>

      {step === 'form' && (
        <Card className="p-6 sm:p-8 bg-card border-border rounded-2xl shadow-xs space-y-6">
          <div className="p-4 bg-muted/50 border border-border rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Current Balance
              </span>
              <p className="text-xl font-black text-foreground font-mono">
                ₹{walletData.availableBalance.toLocaleString('en-IN')}
              </p>
            </div>
            <ShieldCheck className="size-5 text-primary" />
          </div>

          {errorMessage && (
            <div className="p-3 bg-destructive-soft text-destructive text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleValidateAndReview} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="wAmount" className="text-xs font-semibold">
                Withdrawal Amount (₹ INR) *
              </Label>
              <Input
                id="wAmount"
                type="number"
                min={MIN_WITHDRAWAL_AMOUNT}
                max={walletData.availableBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">Minimum withdrawal: ₹{MIN_WITHDRAWAL_AMOUNT}</p>
            </div>

            {/* Payout Method Tabs */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Select Transfer Destination</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod('UPI')}
                  className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    method === 'UPI'
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Smartphone className="size-4" />
                  <span>UPI ID</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('Bank Account')}
                  className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    method === 'Bank Account'
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Building className="size-4" />
                  <span>Bank Account</span>
                </button>
              </div>
            </div>

            {/* UPI Details */}
            {method === 'UPI' && (
              <div className="space-y-1.5">
                <Label htmlFor="upiId" className="text-xs font-semibold">
                  UPI Virtual Payment Address (VPA) *
                </Label>
                <Input
                  id="upiId"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. yourname@okhdfcbank"
                  required
                />
              </div>
            )}

            {/* Bank Details */}
            {method === 'Bank Account' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="accName" className="text-xs font-semibold">
                    Account Holder Name *
                  </Label>
                  <Input
                    id="accName"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="As registered in bank"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="accNum" className="text-xs font-semibold">
                      Account Number *
                    </Label>
                    <Input
                      id="accNum"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="accConf" className="text-xs font-semibold">
                      Confirm Account Number *
                    </Label>
                    <Input
                      id="accConf"
                      value={confirmAccountNumber}
                      onChange={(e) => setConfirmAccountNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ifsc" className="text-xs font-semibold">
                    Bank IFSC Code *
                  </Label>
                  <Input
                    id="ifsc"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0000123"
                    maxLength={11}
                    required
                  />
                </div>
              </div>
            )}

            <Button type="submit" size="default" className="w-full font-bold shadow-xs">
              Review Transfer
            </Button>
          </form>
        </Card>
      )}

      {step === 'review' && (
        <Card className="p-6 sm:p-8 bg-card border-border rounded-2xl shadow-xs space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-bold text-foreground">Confirm Payout Details</h2>
            <p className="text-xs text-muted-foreground">Please review recipient account information before transferring.</p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payout Amount:</span>
              <span className="font-bold text-foreground font-mono">₹{numAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payout Method:</span>
              <span className="font-semibold text-foreground">{method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Destination:</span>
              <span className="font-bold text-primary font-mono">
                {method === 'UPI' ? upiId : `${accountNumber} (${ifscCode})`}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground">Processing Fee:</span>
              <span className="font-bold text-success">₹0 (Free)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="default" className="flex-1" onClick={() => setStep('form')}>
              Modify
            </Button>
            <Button
              size="default"
              className="flex-1 font-bold shadow-xs"
              onClick={handleConfirmPayout}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Confirm & Payout</span>
              )}
            </Button>
          </div>
        </Card>
      )}

      {step === 'success' && (
        <Card className="p-8 text-center bg-card border-border rounded-2xl shadow-xs space-y-4">
          <CheckCircle2 className="size-12 text-success mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Withdrawal Request Initiated</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your request for <strong className="text-foreground">₹{numAmount.toLocaleString('en-IN')}</strong> has been submitted. Reference ID: <span className="font-mono text-primary font-bold">{submittedRefId}</span>. Funds typically reflect within 2-4 banking hours.
          </p>
          <div className="pt-2">
            <Button asChild size="default">
              <Link href="/wallet">Return to Wallet</Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
