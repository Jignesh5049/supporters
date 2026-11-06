'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@supporters/ui-web/components/button';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import { Textarea } from '@supporters/ui-web/components/textarea';
import { NativeSelect, NativeSelectOption } from '@supporters/ui-web/components/native-select';
import { Card } from '@supporters/ui-web/components/card';
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function RequirementForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: 'textiles-garments',
    quantity: '100',
    unit: 'pcs',
    deliveryCity: '',
    targetBudget: '',
    urgency: 'standard' as 'immediate' | 'standard' | 'flexible',
  });

  const categories = [
    { id: 'textiles-garments', name: 'Textiles & Garments' },
    { id: 'industrial-machinery', name: 'Industrial Machinery & Tools' },
    { id: 'electronics-electrical', name: 'Electronics & Electrical' },
    { id: 'chemicals-dyes', name: 'Chemicals, Dyes & Solvents' },
    { id: 'building-construction', name: 'Building & Construction' },
    { id: 'packaging-printing', name: 'Packaging & Printing' },
    { id: 'agriculture-food', name: 'Agriculture & Food Products' },
    { id: 'metals-minerals', name: 'Metals, Alloys & Minerals' },
  ];

  const units = ['pcs', 'kg', 'meter', 'ton', 'box', 'set', 'liter'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (formData.title.trim().length < 5) {
      setErrorMessage('Title must be at least 5 characters.');
      return;
    }
    if (formData.description.trim().length < 20) {
      setErrorMessage('Description must be at least 20 characters explaining your specifications.');
      return;
    }
    if (!formData.deliveryCity.trim()) {
      setErrorMessage('Please specify your delivery city.');
      return;
    }
    const qty = parseInt(formData.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMessage('Please enter a valid positive quantity.');
      return;
    }

    setSubmitting(true);

    try {
      const budgetPaise = formData.targetBudget ? Math.round(parseFloat(formData.targetBudget) * 100) : undefined;
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        quantity: qty,
        unit: formData.unit,
        deliveryCity: formData.deliveryCity.trim(),
        targetBudgetPaise: budgetPaise,
        urgency: formData.urgency,
      };

      const res = await fetch('/v1/buyer-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to submit requirement');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/requirements');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while posting your requirement.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto bg-card border-border rounded-2xl space-y-4">
        <CheckCircle2 className="size-12 text-success mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Requirement Posted Successfully!</h2>
        <p className="text-sm text-muted-foreground">
          Your procurement inquiry has been submitted and will be matched with verified suppliers.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8 max-w-2xl mx-auto bg-card border-border rounded-2xl shadow-xs">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <div className="p-3 bg-destructive-soft text-destructive text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-semibold">
            Requirement Title *
          </Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Requirement for 5,000 meters 100% Cotton Poplin Fabric"
            required
            maxLength={120}
          />
          <p className="text-xs text-muted-foreground">Short, descriptive title of the goods or services needed.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-semibold">
              Industry Category *
            </Label>
            <NativeSelect
              id="category"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            >
              {categories.map((cat) => (
                <NativeSelectOption key={cat.id} value={cat.id}>
                  {cat.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgency" className="text-sm font-semibold">
              Procurement Urgency
            </Label>
            <NativeSelect
              id="urgency"
              value={formData.urgency}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
            >
              <NativeSelectOption value="standard">Standard (Within 2-4 weeks)</NativeSelectOption>
              <NativeSelectOption value="immediate">Immediate Need (Within 7 days)</NativeSelectOption>
              <NativeSelectOption value="flexible">Flexible Timeline</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-sm font-semibold">
              Quantity Needed *
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit" className="text-sm font-semibold">
              Unit of Measurement *
            </Label>
            <NativeSelect
              id="unit"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            >
              {units.map((u) => (
                <NativeSelectOption key={u} value={u}>
                  {u}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="deliveryCity" className="text-sm font-semibold">
              Delivery City / Destination *
            </Label>
            <Input
              id="deliveryCity"
              value={formData.deliveryCity}
              onChange={(e) => setFormData({ ...formData, deliveryCity: e.target.value })}
              placeholder="e.g. Surat, Ahmedabad, Mumbai"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget" className="text-sm font-semibold">
              Target Budget (₹ INR, Optional)
            </Label>
            <Input
              id="budget"
              type="number"
              value={formData.targetBudget}
              onChange={(e) => setFormData({ ...formData, targetBudget: e.target.value })}
              placeholder="e.g. 50000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-semibold">
            Detailed Specifications *
          </Label>
          <Textarea
            id="description"
            rows={5}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe quality grades, technical specs, packaging preferences, certifications needed, and delivery terms (min 20 characters)..."
            required
            minLength={20}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">{formData.description.length}/1000 characters</p>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-border">
          <Button variant="ghost" asChild type="button" size="sm">
            <Link href="/requirements" className="gap-1 text-xs">
              <ArrowLeft className="size-3.5" />
              <span>Back to Requirements</span>
            </Link>
          </Button>

          <Button type="submit" disabled={submitting} size="default" className="shadow-xs min-w-32">
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Post Requirement</span>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
