'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import { useGroups } from '@/lib/hooks/useGroups';

const TABS = ['My Groups', 'Discover', 'Create'];

export default function GroupsPage() {
  const [tab, setTab] = useState('My Groups');
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [accessType, setAccessType] = useState<'shared' | 'public'>('shared');
  const [submitting, setSubmitting] = useState(false);

  const { groups, isLoading: loadingMy, mutate: mutateMy } = useGroups('my');
  const { groups: discoverGroups, isLoading: loadingDiscover, mutate: mutateDiscover } = useGroups('discover');

  const isLoading = tab === 'My Groups' ? loadingMy : loadingDiscover;

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
        toast.success('Group created!');
        mutateMy();
        setTab('My Groups');
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
        toast.success('Joined group!');
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


  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Groups & Collaborative Roadmaps</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Study together, compete on leaderboards, hit deadlines as a cohort</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '28px' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 24px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)', color: tab === t ? 'var(--accent-primary)' : 'var(--text-muted)', borderBottom: `2px solid ${tab === t ? 'var(--accent-primary)' : 'transparent'}`, transition: 'all 0.2s' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'My Groups' && (
        isLoading && groups.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading groups…</div>
        ) : groups.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}></div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>No groups yet</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '380px', lineHeight: 1.7, marginBottom: '20px' }}>Join or create a study group to prep together, share roadmaps, and compete on leaderboards.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setTab('Create')} className="btn-primary" style={{ fontSize: '14px', padding: '10px 22px' }}>Create Group</button>
              <button onClick={() => setTab('Discover')} className="btn-secondary" style={{ fontSize: '14px', padding: '10px 22px' }}>Browse Groups</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {groups.map(g => (
              <div key={g.id} className="card card-interactive" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{g.name}</h3>
                  <span className="badge badge-mint" style={{ fontSize: '10px' }}>{g.access_type}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>{g.description || 'Collaborative study space.'}</div>
                <Link href={`/groups/${g.id}`} className="btn-primary" style={{ display: 'flex', width: '100%', justifyContent: 'center', fontSize: '13px', padding: '8px', textDecoration: 'none' }}>Open Dashboard</Link>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'Discover' && (
        isLoading && discoverGroups.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Discovering groups…</div>
        ) : (
          <div>
            <div style={{ marginBottom: '20px' }}> 
              <input type="text" placeholder="Search public groups by name or role…" className="input" style={{ maxWidth: '460px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {discoverGroups.map(g => (
                <div key={g.id} className="card card-interactive" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{g.name}</h3>
                    <span className="badge badge-muted" style={{ fontSize: '10px' }}>{g.access_type}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>{g.description || 'Public study group.'}</div>
                  <button onClick={() => handleJoin(g.id)} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '13px', padding: '8px' }}>Join Group</button>
                </div>
              ))}
              {discoverGroups.length === 0 && (
                <div style={{ gridColumn: 'span 3', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No other public groups found yet. Create one!</div>
              )}
            </div>
          </div>
        )
      )}

      {tab === 'Create' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: '580px' }}>
          <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Group Name</label>
              <input className="input" placeholder="e.g. FAANG Prep Crew 2026" value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Access Type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { id: 'shared', icon: '', label: 'Shared (Invite Only)', desc: 'Up to 50 members, admin features, deadlines', limit: '50 members' },
                  { id: 'public', icon: '', label: 'Public', desc: 'Anyone can join, read-only admin view', limit: 'Unlimited' },
                ].map(a => (
                  <div key={a.id} onClick={() => setAccessType(a.id as typeof accessType)}
                    style={{ display: 'flex', gap: '12px', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${accessType === a.id ? 'var(--accent-primary)' : 'var(--border)'}`, background: accessType === a.id ? 'rgba(77,255,160,0.04)' : 'var(--bg-elevated)', cursor: 'pointer' }}>
                    <span style={{ fontSize: '20px' }}>{a.icon}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{a.label}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.desc} · {a.limit}</div>
                    </div>
                    {accessType === a.id && <span style={{ marginLeft: 'auto', color: 'var(--accent-primary)' }}></span>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Description (optional)</label>
              <textarea className="input" placeholder="What is this group about?" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'none' }} />
            </div>
            <button onClick={handleCreate} disabled={submitting} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Creating…' : ' Create Group'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
