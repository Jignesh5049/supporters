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
  ArrowRight
} from 'lucide-react';

export default function WithdrawMoneyPage() {
  const router = useRouter();
  const { walletData, requestWithdrawal, showToast } = useApp();

  // Configurable minimum withdrawal rule
  const MIN_WITHDRAWAL_AMOUNT = 100;

  const [step, setStep] = useState<'form' | 'review' | 'success'>('form');
  const [amount, setAmount] = useState<string>('200');
  const [method, setMethod] = useState<'UPI' | 'Bank Account'>('UPI');

  // UPI Form
  const [upiId, setUpiId] = useState('jignesh@okaxis');

  // Bank Form
  const [accountHolderName, setAccountHolderName] = useState('Jignesh Patel');
  const [accountNumber, setAccountNumber] = useState('5010042891234');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('5010042891234');
  const [ifscCode, setIfscCode] = useState('HDFC0000428');
  const [bankName, setBankName] = useState('HDFC Bank');

  // Error feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedRefId, setSubmittedRefId] = useState<string>('');

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
        `Withdrawal amount (₹${numAmount}) exceeds your available balance (₹${walletData.availableBalance}).`
      );
      return;
    }

    if (method === 'UPI') {
      if (!upiId.trim() || !upiId.includes('@')) {
        setErrorMessage('Please provide a valid UPI ID (e.g. mobile@upi, username@okhdfcbank).');
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
        setErrorMessage('Account numbers do not match.');
        return;
      }
      if (!ifscCode.trim() || ifscCode.length < 5) {
        setErrorMessage('Please enter a valid IFSC code.');
        return;
      }
      if (!bankName.trim()) {
        setErrorMessage('Please enter your bank name.');
        return;
      }
    }

    setStep('review');
  };

  const handleConfirmWithdrawal = () => {
    const result = requestWithdrawal({
      amount: numAmount,
      method,
      upiId: method === 'UPI' ? upiId.trim() : undefined,
      accountHolderName: method === 'Bank Account' ? accountHolderName.trim() : undefined,
      accountNumber: method === 'Bank Account' ? accountNumber.trim() : undefined,
      ifscCode: method === 'Bank Account' ? ifscCode.trim().toUpperCase() : undefined,
      bankName: method === 'Bank Account' ? bankName.trim() : undefined,
    });

    if (result.success) {
      const generatedRef = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedRefId(generatedRef);
      setStep('success');
      showToast('Withdrawal request initiated successfully!', 'success');
    } else {
      setErrorMessage(result.message);
      setStep('form');
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex items-center gap-3">
        <Link
          href="/wallet"
          className="p-2 text-[#667085] hover:text-[#111111] hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-[#111111]">Withdraw Money</h1>
          <p className="text-xs text-[#667085]">
            Transfer your wallet balance to your linked bank account or UPI
          </p>
        </div>
      </div>

      {/* Available Balance Reminder Card */}
      <div className="bg-[#2E3192]/5 border border-[#2E3192]/20 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2E3192] text-white flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
              Available Balance
            </span>
            <span className="text-xl font-black text-[#2E3192] font-mono">
              ₹{walletData.availableBalance.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
          Ready for Payout
        </span>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: FORM */}
      {step === 'form' && (
        <form onSubmit={handleValidateAndReview} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-5">
          {/* Amount input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#111111] uppercase tracking-wider block">
              Withdrawal Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-[#667085]">
                ₹
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                max={walletData.availableBalance}
                className="w-full pl-9 pr-4 py-3 text-lg font-bold font-mono bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] focus:ring-2 focus:ring-[#2E3192]/10 transition-all outline-none"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#667085] pt-0.5">
              <span>Minimum withdrawal: ₹{MIN_WITHDRAWAL_AMOUNT}</span>
              <button
                type="button"
                onClick={() => setAmount(walletData.availableBalance.toString())}
                className="text-[#2E3192] font-bold hover:underline"
              >
                Withdraw All (₹{walletData.availableBalance})
              </button>
            </div>
          </div>

          {/* Method Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#111111] uppercase tracking-wider block">
              Select Payout Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod('UPI')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  method === 'UPI'
                    ? 'border-[#2E3192] bg-[#2E3192]/5 text-[#2E3192] font-bold shadow-2xs'
                    : 'border-gray-200 hover:bg-gray-50 text-[#667085]'
                }`}
              >
                <Smartphone className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-xs font-bold">Instant UPI</p>
                  <p className="text-[10px] text-gray-500">Google Pay, PhonePe, Paytm</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod('Bank Account')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  method === 'Bank Account'
                    ? 'border-[#2E3192] bg-[#2E3192]/5 text-[#2E3192] font-bold shadow-2xs'
                    : 'border-gray-200 hover:bg-gray-50 text-[#667085]'
                }`}
              >
                <Building className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-xs font-bold">Bank Transfer</p>
                  <p className="text-[10px] text-gray-500">NEFT / IMPS via IFSC</p>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Method Details */}
          {method === 'UPI' ? (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="text-xs font-bold text-[#111111] block">UPI ID / VPA</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@okaxis"
                className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
              />
              <p className="text-[11px] text-[#667085]">
                Ensure your UPI ID is linked to your active bank account.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="Full name as in bank passbook"
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#111111] block mb-1">
                    Account Number
                  </label>
                  <input
                    type="password"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter account number"
                    className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#111111] block mb-1">
                    Confirm Account Number
                  </label>
                  <input
                    type="text"
                    value={confirmAccountNumber}
                    onChange={(e) => setConfirmAccountNumber(e.target.value)}
                    placeholder="Re-enter account number"
                    className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#111111] block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="HDFC0000123"
                    className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#111111] block mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="HDFC Bank"
                    className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={walletData.availableBalance < MIN_WITHDRAWAL_AMOUNT}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors"
          >
            Review Withdrawal Request
          </button>
        </form>
      )}

      {/* STEP 2: REVIEW */}
      {step === 'review' && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-5">
          <div className="text-center pb-3 border-b border-gray-100">
            <span className="text-xs font-bold uppercase tracking-wider text-[#667085] block">
              Confirm Withdrawal
            </span>
            <p className="text-3xl font-black text-[#111111] font-mono mt-1">
              ₹{numAmount.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-[#667085] mt-0.5">Disbursement via {method}</p>
          </div>

          <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#667085]">Method:</span>
              <span className="font-bold text-[#111111]">{method}</span>
            </div>
            {method === 'UPI' ? (
              <div className="flex justify-between">
                <span className="text-[#667085]">UPI Address:</span>
                <span className="font-mono font-bold text-[#111111]">{upiId}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Account Holder:</span>
                  <span className="font-bold text-[#111111]">{accountHolderName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Account Number:</span>
                  <span className="font-mono font-bold text-[#111111]">
                    ••••••••{accountNumber.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Bank & IFSC:</span>
                  <span className="font-bold text-[#111111]">
                    {bankName} ({ifscCode})
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-[#667085]">Remaining Balance:</span>
              <span className="font-mono font-bold text-emerald-600">
                ₹{(walletData.availableBalance - numAmount).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-800">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              This is a mock frontend preview. Submitting will register your request in local state
              and queue it for backend disbursement verification. Real money has not been debited.
            </span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep('form')}
              className="flex-1 py-3 px-4 text-xs font-bold text-[#667085] bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Back to Edit
            </button>
            <button
              type="button"
              onClick={handleConfirmWithdrawal}
              className="flex-1 py-3 px-4 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl shadow-xs transition-colors"
            >
              Submit Request
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS CONFIRMATION */}
      {step === 'success' && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-[#111111]">Withdrawal Request Submitted</h2>
            <p className="text-xs text-[#667085] max-w-sm mx-auto">
              Your request for ₹{numAmount} has been registered. Our payment processing service will
              verify the transfer within 24-48 business hours.
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-4 max-w-xs mx-auto text-xs space-y-1">
            <p className="text-[#667085]">Tracking Reference ID</p>
            <p className="font-mono font-bold text-sm text-[#2E3192]">{submittedRefId}</p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/wallet"
              className="px-6 py-2.5 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl transition-colors"
            >
              Back to Wallet Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
