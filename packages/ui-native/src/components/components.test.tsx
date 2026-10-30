import { PortalHost } from '@rn-primitives/portal';
import { render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './dialog';
import { Input } from './input';
import { Label } from './label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Text } from './text';

describe('cn', () => {
  it('lets later Tailwind classes win', () => {
    expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4');
  });
});

describe('Button', () => {
  it('renders the default variant with token classes', async () => {
    await render(
      <Button>
        <Text>Save</Text>
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Save' }).props.className).toContain('bg-primary');
    expect(screen.getByText('Save').props.className).toContain('text-primary-foreground');
  });

  it('uses the destructive foreground token, not raw white', async () => {
    await render(
      <Button variant="destructive">
        <Text>Delete</Text>
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Delete' }).props.className).toContain(
      'bg-destructive',
    );
    expect(screen.getByText('Delete').props.className).toContain('text-destructive-foreground');
  });

  it('applies the outline variant and icon size', async () => {
    await render(
      <Button variant="outline" size="icon" accessibilityLabel="Share">
        <Text>S</Text>
      </Button>,
    );
    const className: string = screen.getByRole('button', { name: 'Share' }).props.className;
    expect(className).toContain('border-border');
    expect(className).toContain('h-10 w-10');
    expect(className).not.toContain('bg-primary');
  });

  it('calls onPress, and not when disabled', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    const { rerender } = await render(
      <Button onPress={onPress}>
        <Text>Go</Text>
      </Button>,
    );
    await user.press(screen.getByRole('button', { name: 'Go' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(
      <Button onPress={onPress} disabled>
        <Text>Go</Text>
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toBeDisabled();
    await user.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('Label and Input', () => {
  it('associates the label with the input', async () => {
    const user = userEvent.setup();
    await render(
      <>
        <Label nativeID="city">City</Label>
        <Input aria-labelledby="city" />
      </>,
    );
    const input = screen.getByLabelText('City');
    await user.type(input, 'Surat');
    expect(input).toHaveDisplayValue('Surat');
  });
});

describe('Dialog', () => {
  it('opens with its title and description, and closes from the close button', async () => {
    const user = userEvent.setup();
    await render(
      <>
        <Dialog>
          <DialogTrigger>
            <Text>Open</Text>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Contact supplier</DialogTitle>
            <DialogDescription>Send an enquiry</DialogDescription>
          </DialogContent>
        </Dialog>
        <PortalHost />
      </>,
    );
    expect(screen.queryByText('Contact supplier')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('Contact supplier')).toBeOnTheScreen();
    expect(screen.getByText('Send an enquiry')).toBeOnTheScreen();

    await user.press(screen.getByText('Close'));
    expect(screen.queryByText('Contact supplier')).not.toBeOnTheScreen();
  });
});

describe('Tabs', () => {
  function ListingTabs() {
    const [value, setValue] = useState('products');
    return (
      <Tabs value={value} onValueChange={setValue}>
        <TabsList>
          <TabsTrigger value="products">
            <Text>Products</Text>
          </TabsTrigger>
          <TabsTrigger value="services">
            <Text>Services</Text>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <Text>Product list</Text>
        </TabsContent>
        <TabsContent value="services">
          <Text>Service list</Text>
        </TabsContent>
      </Tabs>
    );
  }

  it('switches panels', async () => {
    const user = userEvent.setup();
    await render(<ListingTabs />);
    expect(screen.getByText('Product list')).toBeOnTheScreen();
    expect(screen.queryByText('Service list')).not.toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Products' })).toBeSelected();

    await user.press(screen.getByRole('tab', { name: 'Services' }));
    expect(screen.getByText('Service list')).toBeOnTheScreen();
    expect(screen.queryByText('Product list')).not.toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Services' })).toBeSelected();
  });
});
