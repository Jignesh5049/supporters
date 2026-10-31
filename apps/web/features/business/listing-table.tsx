'use client';

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
} from '@supporters/ui-web/components/alert-dialog';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { useMutation } from '@tanstack/react-query';
import { ExternalLink, ImageOff, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { errorMessage } from '@/lib/api/errors';
import { type ListingKind, deleteListing } from './business-api';

/** A row as the server prepares it: plain strings only. */
export interface ListingRow {
  id: string;
  title: string;
  imageUrl: string | null;
  category: string;
  priceText: string;
  status: 'draft' | 'published' | 'archived';
  publicHref: string;
}

const STATUS_LABELS: Record<ListingRow['status'], string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

export function ListingTable({ kind, rows }: { kind: ListingKind; rows: ListingRow[] }) {
  const router = useRouter();
  const { showToast } = useApp();
  const noun = kind === 'products' ? 'product' : 'service';
  const remove = useMutation({
    mutationFn: (id: string) => deleteListing(kind, id),
    onSuccess: () => {
      showToast(`The ${noun} is deleted.`, 'info');
      router.refresh();
    },
    onError: (error) => showToast(errorMessage(error), 'error'),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-caption">
        <thead>
          <tr className="border-b border-border font-semibold tracking-wider text-muted-foreground uppercase">
            <th scope="col" className="pb-3">
              {kind === 'products' ? 'Product' : 'Service'}
            </th>
            <th scope="col" className="pb-3">
              Category
            </th>
            <th scope="col" className="pb-3">
              Price
            </th>
            <th scope="col" className="pb-3">
              Status
            </th>
            <th scope="col" className="pb-3 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-muted">
              <td className="py-3.5 font-bold text-foreground">
                <div className="flex items-center gap-3">
                  <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-muted-foreground">
                    {row.imageUrl ? (
                      <Image
                        src={row.imageUrl}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <ImageOff className="size-4" aria-hidden />
                    )}
                  </span>
                  <span className="line-clamp-1 max-w-xs">{row.title}</span>
                </div>
              </td>
              <td className="py-3.5 text-muted-foreground">{row.category}</td>
              <td className="py-3.5 font-bold text-primary">{row.priceText}</td>
              <td className="py-3.5">
                <Badge variant={row.status === 'published' ? 'default' : 'secondary'}>
                  {STATUS_LABELS[row.status]}
                </Badge>
              </td>
              <td className="py-3.5">
                <div className="flex items-center justify-end gap-1">
                  {row.status === 'published' && (
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link href={row.publicHref} aria-label={`View ${row.title} public page`}>
                        <ExternalLink />
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link
                      href={`/business/${kind}/${row.id}/edit`}
                      aria-label={`Edit ${row.title}`}
                    >
                      <Pencil />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        aria-label={`Delete ${row.title}`}
                        disabled={remove.isPending}
                      >
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this {noun}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          &ldquo;{row.title}&rdquo; will be removed from your catalog and search. To
                          hide it for now instead, set it to Draft or Archived.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => remove.mutate(row.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
