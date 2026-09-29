'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Globe, Lock, Plus, Search, Users } from 'lucide-react';
import { useGroups } from '@/lib/hooks/useGroups';
import {
  Badge, Button, ButtonLink, Card, EmptyState, ErrorState, Field, Input, PageHeader, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, Textarea,
} from '@/components/ui';
import { cn } from '@/lib/cn';

const ACCESS_OPTIONS = [
  { id: 'shared', icon: Lock, label: 'Shared (invite only)', desc: 'Up to 50 members, with admin tools and deadlines' },
  { id: 'public', icon: Globe, label: 'Public', desc: 'Anyone can join, unlimited members' },
] as const;

export default function GroupsPage() {
  const [tab, setTab] = useState('my');
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [accessType, setAccessType] = useState<'shared' | 'public'>('shared');
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');

  const { groups, isLoading: loadingMy, isError: errorMy, mutate: mutateMy } = useGroups('my');
  const { groups: discoverGroups, isLoading: loadingDiscover, mutate: mutateDiscover } = useGroups('discover');

  const handleCreate = async () => {
    if (!groupName) return toast.error('Group name is required');
    setSubmitting(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, description, access_type: accessType }),
      });
      if (res.ok) {
        toast.success('Group created');
        mutateMy();
        setTab('my');
        setGroupName('');
        setDescription('');
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create group');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (groupId: string) => {
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId }),
      });
      if (res.ok) {
        toast.success('Joined group');
        mutateMy();
        mutateDiscover();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to join');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const filteredDiscover = discoverGroups.filter(g =>
    `${g.name} ${g.description ?? ''}`.toLowerCase().includes(query.toLowerCase())
  );

  const cards = (list: typeof groups, mode: 'open' | 'join') => (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map(g => (
        <li key={g.id}>
          <Card className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-fg">{g.name}</h2>
              <Badge tone={g.access_type === 'public' ? 'good' : 'neutral'} className="shrink-0 capitalize">{g.access_type}</Badge>
            </div>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-fg-2">{g.description || (mode === 'open' ? 'Collaborative study space.' : 'Public study group.')}</p>
            <div className="mt-4">
              {mode === 'open' ? (
                <ButtonLink href={`/groups/${g.id}`} className="w-full">Open group</ButtonLink>
              ) : (
                <Button variant="secondary" className="w-full" onClick={() => handleJoin(g.id)}>Join group</Button>
              )}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="page-container">
      <PageHeader
        title="Groups"
        description="Study together, share roadmaps, and keep each other to deadlines."
        action={<Button onClick={() => setTab('create')}><Plus size={16} aria-hidden /> Create group</Button>}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Groups" className="mb-6">
          <TabsTrigger value="my">My groups</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="create">Create</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="outline-none">
          {loadingMy && groups.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading groups">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-36 rounded-panel" />)}
            </div>
          ) : errorMy ? (
            <ErrorState title="Could not load your groups" onRetry={() => mutateMy()} />
          ) : groups.length === 0 ? (
            <EmptyState
              icon={<Users size={20} aria-hidden />}
              title="You are not in a group yet"
              description="Join a public group or create your own to prepare with others."
              action={
                <div className="flex gap-2">
                  <Button onClick={() => setTab('create')}>Create a group</Button>
                  <Button variant="secondary" onClick={() => setTab('discover')}>Browse groups</Button>
                </div>
              }
            />
          ) : cards(groups, 'open')}
        </TabsContent>

        <TabsContent value="discover" className="outline-none">
          <div className="relative mb-5 max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" aria-hidden />
            <Input type="search" aria-label="Search public groups" placeholder="Search public groups" value={query} onChange={e => setQuery(e.target.value)} className="pl-9" />
          </div>
          {loadingDiscover && discoverGroups.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading groups">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-36 rounded-panel" />)}
            </div>
          ) : filteredDiscover.length === 0 ? (
            <EmptyState
              icon={<Globe size={20} aria-hidden />}
              title={query ? 'No groups match your search' : 'No public groups yet'}
              description={query ? 'Try a different word.' : 'Be the first: create a public group.'}
              action={query ? undefined : <Button onClick={() => setTab('create')}>Create a group</Button>}
            />
          ) : cards(filteredDiscover, 'join')}
        </TabsContent>

        <TabsContent value="create" className="outline-none">
          <Card className="max-w-xl space-y-5">
            <Field label="Group name">
              {a => <Input {...a} placeholder="FAANG Prep Crew 2026" value={groupName} onChange={e => setGroupName(e.target.value)} />}
            </Field>

            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-fg">Access</legend>
              <div className="space-y-2" role="radiogroup" aria-label="Access type">
                {ACCESS_OPTIONS.map(a => {
                  const active = accessType === a.id;
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setAccessType(a.id)}
                      className={cn('flex w-full items-start gap-3 rounded-control border p-3 text-left transition-colors', active ? 'border-signal bg-signal/10' : 'border-line bg-raised hover:border-line-strong')}
                    >
                      <Icon size={17} className={cn('mt-0.5 shrink-0', active ? 'text-signal' : 'text-fg-3')} aria-hidden />
                      <span>
                        <span className="block text-sm font-medium text-fg">{a.label}</span>
                        <span className="block text-xs text-fg-3">{a.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Field label="Description (optional)">
              {a => <Textarea {...a} rows={3} placeholder="What is this group about?" value={description} onChange={e => setDescription(e.target.value)} />}
            </Field>

            <Button size="lg" className="w-full" onClick={handleCreate} loading={submitting}>
              {submitting ? 'Creating…' : 'Create group'}
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
