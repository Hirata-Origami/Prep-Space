'use client';

import * as Menu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/cn';

export const Dropdown = Menu.Root;
export const DropdownTrigger = Menu.Trigger;

export function DropdownContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        className={cn(
          'z-[150] min-w-56 overflow-hidden rounded-panel border border-line-strong bg-panel p-1 shadow-[var(--shadow-float)]',
          className
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

export function DropdownItem({
  className,
  tone = 'default',
  ...props
}: React.ComponentProps<typeof Menu.Item> & { tone?: 'default' | 'danger' }) {
  return (
    <Menu.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-control px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-raised',
        tone === 'danger' ? 'text-bad' : 'text-fg',
        className
      )}
      {...props}
    />
  );
}

export function DropdownLabel({ className, ...props }: React.ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn('px-2.5 py-2 text-xs text-fg-3', className)} {...props} />;
}

export function DropdownSeparator({ className, ...props }: React.ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn('my-1 h-px bg-line', className)} {...props} />;
}
