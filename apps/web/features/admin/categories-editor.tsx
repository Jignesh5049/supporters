'use client';

import { ADMIN_LIMITS, type AdminCategory } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import { NativeSelect, NativeSelectOption } from '@supporters/ui-web/components/native-select';
import { Skeleton } from '@supporters/ui-web/components/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { errorMessage } from '@/lib/api/errors';
import { adminApi, adminKeys } from './admin-api';

/** `Corrugated Boxes` → `corrugated-boxes`, as a starting point for the slug. */
export const slugFromName = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, ADMIN_LIMITS.categoryName.max);

/** Category editing: add, rename, reorder, deactivate; delete only when unused. */
export function CategoriesEditor() {
  const query = useQuery({ queryKey: adminKeys.categories, queryFn: adminApi.categories });
  const categories = query.data?.data ?? [];
  if (query.isPending) return <Skeleton className="h-64 w-full" />;
  if (query.isError) {
    return (
      <p role="alert" className="text-caption text-destructive">
        {errorMessage(query.error)}
      </p>
    );
  }
  return (
    <div className="space-y-6">
      <NewCategory parents={categories.filter((category) => category.parentId === null)} />
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
      </ul>
    </div>
  );
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminKeys.categories });
}

function NewCategory({ parents }: { parents: AdminCategory[] }) {
  const { showToast } = useApp();
  const invalidate = useInvalidate();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const ids = { name: useId(), slug: useId(), parent: useId() };
  const create = useMutation({
    mutationFn: () =>
      adminApi.createCategory({
        name: name.trim(),
        slug: slug || slugFromName(name),
        parentId: parentId || null,
        position: 0,
        isActive: true,
      }),
    onSuccess: () => {
      showToast('Category added');
      setName('');
      setSlug('');
      void invalidate();
    },
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  return (
    <form
      className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4 sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={ids.name}>Name</Label>
        <Input
          id={ids.name}
          value={name}
          maxLength={ADMIN_LIMITS.categoryName.max}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={ids.slug}>Slug</Label>
        <Input
          id={ids.slug}
          value={slug}
          placeholder={slugFromName(name)}
          onChange={(event) => setSlug(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={ids.parent}>Parent</Label>
        <NativeSelect
          id={ids.parent}
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
        >
          <NativeSelectOption value="">None (top level)</NativeSelectOption>
          {parents.map((parent) => (
            <NativeSelectOption key={parent.id} value={parent.id}>
              {parent.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <Button
        type="submit"
        disabled={name.trim().length < ADMIN_LIMITS.categoryName.min || create.isPending}
      >
        Add category
      </Button>
    </form>
  );
}

function CategoryRow({ category }: { category: AdminCategory }) {
  const { showToast } = useApp();
  const invalidate = useInvalidate();
  const [name, setName] = useState(category.name);
  const [position, setPosition] = useState(String(category.position));
  const ids = { name: useId(), position: useId() };
  const onError = (error: unknown) => showToast(errorMessage(error), 'error');
  const update = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.updateCategory>[1]) =>
      adminApi.updateCategory(category.id, body),
    onSuccess: () => {
      showToast('Category saved');
      void invalidate();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => adminApi.deleteCategory(category.id),
    onSuccess: () => {
      showToast('Category deleted');
      void invalidate();
    },
    onError,
  });
  const { usage } = category;
  const isUnused = usage.subcategories + usage.businesses + usage.listings === 0;
  const isChanged = name.trim() !== category.name || Number(position) !== category.position;

  return (
    <li className={`flex flex-wrap items-end gap-3 p-4 ${category.parentId ? 'pl-10' : ''}`}>
      <div className="min-w-48 flex-1 space-y-1.5">
        <Label htmlFor={ids.name}>{category.parentId ? 'Subcategory' : 'Category'}</Label>
        <Input id={ids.name} value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="w-24 space-y-1.5">
        <Label htmlFor={ids.position}>Position</Label>
        <Input
          id={ids.position}
          inputMode="numeric"
          value={position}
          onChange={(event) => setPosition(event.target.value.replace(/\D/g, ''))}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 pb-1 text-caption text-muted-foreground">
        <span className="font-mono">{category.slug}</span>
        {!category.isActive && <Badge variant="secondary">inactive</Badge>}
        <span>
          {usage.businesses} businesses · {usage.listings} listings
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={!isChanged || update.isPending}
          onClick={() => update.mutate({ name: name.trim(), position: Number(position) })}
        >
          Save
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={update.isPending}
          onClick={() => update.mutate({ isActive: !category.isActive })}
        >
          {category.isActive ? 'Deactivate' : 'Activate'}
        </Button>
        {isUnused && (
          <Button
            type="button"
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`Delete ${category.name}?`)) remove.mutate();
            }}
          >
            Delete
          </Button>
        )}
      </div>
    </li>
  );
}
