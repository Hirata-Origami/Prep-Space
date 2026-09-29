'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Map, MoreHorizontal, ShieldCheck, UserMinus } from 'lucide-react';
import {
  Avatar, Badge, Button, ButtonLink, Card, Dropdown, DropdownContent, DropdownItem, DropdownTrigger, EmptyState, Input, Modal, Select, Skeleton,
} from '@/components/ui';

interface GroupInfo {
  id: string;
  name: string;
  access_type: string;
  description: string;
}

interface GroupRoadmap {
  id: string;
  title: string;
  target_role?: string;
}

interface GroupMember {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'member' | 'visitor';
}

interface PendingConfirm {
  title: string;
  description: string;
  action: string;
  run: () => void;
}

export default function GroupDashboardPage() {
  const { id } = useParams();
  const router = useRouter();

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [groupRoadmaps, setGroupRoadmaps] = useState<GroupRoadmap[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [myRole, setMyRole] = useState<'admin' | 'member' | 'visitor'>('visitor');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<PendingConfirm | null>(null);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Roadmap assign state
  const [allRoadmaps, setAllRoadmaps] = useState<GroupRoadmap[]>([]);
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(false);

  const fetchGroupData = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${id}`);
      if (res.ok) {
        const data = await res.json();
        setGroup(data.group);
        setGroupRoadmaps(data.roadmaps || []);
        setMembers(data.members || []);
        setMyRole(data.myRole);
      } else {
        toast.error('Failed to load group');
        router.push('/groups');
      }
    } catch (e) {
      console.error(e);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchAllRoadmaps = async () => {
    setLoadingRoadmaps(true);
    try {
      const res = await fetch('/api/roadmaps');
      if (res.ok) {
        const data = await res.json();
        setAllRoadmaps(data.roadmaps || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRoadmaps(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchGroupData();
    }
  }, [id, fetchGroupData]);

  useEffect(() => {
    if (myRole === 'admin') {
      fetchAllRoadmaps();
    }
  }, [myRole]);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/groups/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });
      if (res.ok) {
        toast.success('Member invited');
        setInviteEmail('');
        fetchGroupData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to invite member');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setInviting(false);
    }
  };

  const handleMakeAdmin = async (userId: string) => {
    try {
      const res = await fetch(`/api/groups/${id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role: 'admin' }),
      });
      if (res.ok) {
        toast.success('Role updated');
        fetchGroupData();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/groups/${id}/members?user_id=${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Member removed');
        fetchGroupData();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleLeaveGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${id}/members`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('You have left the group');
        router.push('/groups');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to leave group');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleAssignRoadmap = async (roadmapId: string, action: 'add' | 'remove') => {
    if (!roadmapId) return;
    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmap_id: roadmapId, action }),
      });
      if (res.ok) {
        toast.success(action === 'add' ? 'Roadmap added to group' : 'Roadmap removed from group');
        fetchGroupData();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="page-container" aria-busy="true" aria-label="Loading group">
        <Skeleton className="mb-3 h-9 w-72 max-w-full" />
        <Skeleton className="mb-6 h-4 w-96 max-w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-72 rounded-panel" />
          <Skeleton className="h-72 rounded-panel" />
        </div>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="page-container" style={{ maxWidth: 1040 }}>
      <Link href="/groups" className="mb-5 inline-flex items-center gap-1.5 rounded-control text-sm text-fg-3 transition-colors hover:text-fg">
        <ArrowLeft size={15} aria-hidden /> Groups
      </Link>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-fg sm:text-[32px]">{group.name}</h1>
            <Badge tone={group.access_type === 'public' ? 'good' : 'neutral'} className="capitalize">{group.access_type}</Badge>
          </div>
          {group.description && <p className="mt-1.5 max-w-2xl text-[15px] text-fg-2">{group.description}</p>}
        </div>
        {myRole !== 'admin' && (
          <Button
            variant="danger"
            onClick={() => setConfirming({
              title: 'Leave this group?',
              description: 'You will lose access to its shared roadmaps. You can rejoin later if the group allows it.',
              action: 'Leave group',
              run: handleLeaveGroup,
            })}
          >
            Leave group
          </Button>
        )}
      </header>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-fg">Members <span className="font-mono text-fg-3">({members.length})</span></h2>
            <p className="text-[13px] text-fg-3">People studying together in this group.</p>
          </div>

          {myRole === 'admin' && (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={e => { e.preventDefault(); handleInvite(); }}
            >
              <Input
                type="email"
                aria-label="Invite by email"
                placeholder="Invite by email"
                className="min-w-[160px] flex-1"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
              <Button type="submit" loading={inviting} disabled={!inviteEmail}>Invite</Button>
            </form>
          )}

          <ul className="divide-y divide-line rounded-panel border border-line">
            {members.map(m => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={m.full_name || m.email} size={32} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-fg">{m.full_name || 'User'}</div>
                    <div className="truncate text-xs text-fg-3">{m.email}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge tone={m.role === 'admin' ? 'violet' : 'neutral'} className="capitalize">{m.role}</Badge>
                  {myRole === 'admin' && m.role !== 'admin' && (
                    <Dropdown>
                      <DropdownTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Manage ${m.full_name || m.email}`}><MoreHorizontal size={16} /></Button>
                      </DropdownTrigger>
                      <DropdownContent align="end" className="min-w-44">
                        <DropdownItem onSelect={() => handleMakeAdmin(m.id)}><ShieldCheck size={15} aria-hidden /> Make admin</DropdownItem>
                        <DropdownItem
                          tone="danger"
                          onSelect={() => setConfirming({
                            title: `Remove ${m.full_name || m.email}?`,
                            description: 'They will lose access to this group and its roadmaps.',
                            action: 'Remove member',
                            run: () => handleRemoveMember(m.id),
                          })}
                        >
                          <UserMinus size={15} aria-hidden /> Remove
                        </DropdownItem>
                      </DropdownContent>
                    </Dropdown>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-fg">Roadmaps <span className="font-mono text-fg-3">({groupRoadmaps.length})</span></h2>
            <p className="text-[13px] text-fg-3">Shared study plans for the whole group.</p>
          </div>

          {groupRoadmaps.length > 0 ? (
            <ul className="space-y-2.5">
              {groupRoadmaps.map(r => (
                <li key={r.id} className="rounded-panel border border-line bg-raised p-4">
                  <div className="text-sm font-semibold text-fg">{r.title}</div>
                  <div className="mb-3 text-xs text-fg-3">Target: {r.target_role || 'General'}</div>
                  <div className="flex gap-2">
                    <ButtonLink href={`/roadmap/${r.id}`} variant="secondary" size="sm" className="flex-1">View</ButtonLink>
                    {myRole === 'admin' && (
                      <Button size="sm" variant="danger" onClick={() => handleAssignRoadmap(r.id, 'remove')}>Remove</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Map size={18} aria-hidden />} title="No roadmaps assigned" description={myRole === 'admin' ? 'Add one of your roadmaps below.' : 'An admin can assign a roadmap to this group.'} className="py-8" />
          )}

          {myRole === 'admin' && (
            <div className="border-t border-line pt-5">
              <label htmlFor="add-roadmap" className="mb-1.5 block text-[13px] font-medium text-fg">Add a roadmap</label>
              <Select
                id="add-roadmap"
                value=""
                onChange={e => handleAssignRoadmap(e.target.value, 'add')}
                disabled={loadingRoadmaps}
              >
                <option value="">Select a roadmap</option>
                {allRoadmaps
                  .filter(r => !groupRoadmaps.find(gr => gr.id === r.id))
                  .map(r => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
              </Select>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={confirming !== null}
        onOpenChange={open => { if (!open) setConfirming(null); }}
        title={confirming?.title ?? ''}
        description={confirming?.description}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { confirming?.run(); setConfirming(null); }}>{confirming?.action}</Button>
          </>
        }
      >
        <p className="text-sm text-fg-2">This cannot be undone from here.</p>
      </Modal>
    </div>
  );
}
