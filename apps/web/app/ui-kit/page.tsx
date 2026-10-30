import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback } from '@supporters/ui-web/components/avatar';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@supporters/ui-web/components/card';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import { Separator } from '@supporters/ui-web/components/separator';
import { Skeleton } from '@supporters/ui-web/components/skeleton';
import { Textarea } from '@supporters/ui-web/components/textarea';

export const metadata = { title: 'UI kit', robots: { index: false, follow: false } };

const VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const;

/** Developer preview of @supporters/ui-web on the design tokens. Not available in production. */
export default function UiKitPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <h1 className="text-title-lg font-bold">UI kit</h1>

      <section className="space-y-3">
        <h2 className="text-title-sm font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-title-sm font-semibold">Form</h2>
        <div className="grid gap-2">
          <Label htmlFor="ui-kit-name">Business name</Label>
          <Input id="ui-kit-name" placeholder="Sharma Textiles" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ui-kit-about">About</Label>
          <Textarea id="ui-kit-about" placeholder="What you make or sell" />
        </div>
      </section>

      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Avatar>
            <AvatarFallback>ST</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>Sharma Textiles</CardTitle>
            <CardDescription>Surat, Gujarat</CardDescription>
          </div>
          <Badge className="ml-auto bg-info text-info-foreground">Verified</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    </main>
  );
}
