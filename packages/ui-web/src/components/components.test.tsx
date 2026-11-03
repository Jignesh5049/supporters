import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './dialog';
import { Input } from './input';
import { Label } from './label';
import { NativeSelect, NativeSelectOption } from './native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

describe('cn', () => {
  it('lets later Tailwind classes win', () => {
    expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4');
  });
});

describe('Button', () => {
  it('renders the default variant with token classes', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
    expect(button).toHaveAttribute('data-variant', 'default');
  });

  it('uses the destructive foreground token, not raw white', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass(
      'text-destructive-foreground',
    );
  });

  it('calls onClick, and not when disabled', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders as its child with asChild', () => {
    render(
      <Button asChild>
        <a href="/discover">Discover</a>
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Discover' })).toHaveClass('bg-primary');
  });
});

describe('Label and Input', () => {
  it('associates the label with the input', async () => {
    render(
      <>
        <Label htmlFor="city">City</Label>
        <Input id="city" />
      </>,
    );
    const input = screen.getByLabelText('City');
    await userEvent.type(input, 'Surat');
    expect(input).toHaveValue('Surat');
  });
});

describe('Dialog', () => {
  it('opens with an accessible name and description, and closes on Escape', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Contact supplier</DialogTitle>
          <DialogDescription>Send an enquiry</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog', { name: 'Contact supplier' });
    expect(dialog).toHaveAccessibleDescription('Send an enquiry');

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Tabs', () => {
  it('switches panels', async () => {
    render(
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>
        <TabsContent value="products">Product list</TabsContent>
        <TabsContent value="services">Service list</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Product list');
    await userEvent.click(screen.getByRole('tab', { name: 'Services' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Service list');
  });
});

describe('NativeSelect', () => {
  it('is a labelled native select that reports invalid state', () => {
    render(
      <>
        <Label htmlFor="city">City</Label>
        <NativeSelect id="city" aria-invalid defaultValue="b">
          <NativeSelectOption value="a">Ahmedabad</NativeSelectOption>
          <NativeSelectOption value="b">Surat</NativeSelectOption>
        </NativeSelect>
      </>,
    );
    const select = screen.getByRole('combobox', { name: 'City' });
    expect(select).toHaveValue('b');
    expect(select).toHaveClass('aria-invalid:border-destructive');
  });
});

describe('Checkbox', () => {
  it('toggles with a click and is announced as a checkbox', async () => {
    const onCheckedChange = vi.fn();
    render(
      <>
        <Checkbox id="public" onCheckedChange={onCheckedChange} />
        <Label htmlFor="public">Show contact details</Label>
      </>,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show contact details' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
