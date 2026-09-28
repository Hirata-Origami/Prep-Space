'use client';

import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/cn';

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn('tabs-scrollable border-b border-line', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        '-mb-px shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-fg-3 transition-colors hover:text-fg data-[state=active]:border-signal data-[state=active]:text-fg',
        className
      )}
      {...props}
    />
  );
}

export const TabsContent = RadixTabs.Content;
