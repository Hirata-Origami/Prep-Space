'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

export default function GroupDashboardPage() {
  const { id } = useParams();
  const router = useRouter();

  const [group, setGroup] = useState<any>(null);
  const [groupRoadmaps, setGroupRoadmaps] = useState<any[]>([]); // New state
  const [members, setMembers] = useState<any[]>([]);
  const [myRole, setMyRole] = useState<'admin' | 'member' | 'visitor'>('visitor');
  const [loading, setLoading] = useState(true);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Roadmap assign state
  const [allRoadmaps, setAllRoadmaps] = useState<any[]>([]);
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(false);

  const fetchGroupData = async () => {
    try {
      const res = await fetch(`/api/groups/${id}`);
      if (res.ok) {
        const data = await res.json();
        setGroup(data.group);
        setGroupRoadmaps(data.roadmaps || []); // Set roadmaps list
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
  };

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
  }, [id]);

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
        toast.success('Member invited successfully!');
        setInviteEmail('');
        fetchGroupData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to invite member');
      }
    } catch (e: any) {
      toast.error(e.message);
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
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
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
    } catch (e: any) {
      toast.error(e.message);
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
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading group dashboard…</div>;
  }

  if (!group) return null;

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <Link href="/groups" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', marginBottom: '24px', fontWeight: 600 }}>
        ← Back to Groups
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>{group.name}</h1>
            <span className="badge badge-mint">{group.access_type}</span>
          </div>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>{group.description}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Members Section */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Members ({members.length})</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage group participants</p>
          </div>

          {myRole === 'admin' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="email" 
                placeholder="Invite member by email..." 
                className="input" 
                style={{ flex: 1 }}
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
              <button className="btn-primary" onClick={handleInvite} disabled={inviting || !inviteEmail}>
                {inviting ? 'Inviting...' : 'Invite'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                    {m.full_name?.[0] || m.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.full_name || 'User'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`badge ${m.role === 'admin' ? 'badge-violet' : 'badge-muted'}`} style={{ fontSize: '11px' }}>{m.role}</span>
                  
                  {myRole === 'admin' && m.role !== 'admin' && (
                    <div className="dropdown">
                      <select onChange={(e) => {
                        if (e.target.value === 'make_admin') handleMakeAdmin(m.id);
                        if (e.target.value === 'remove') handleRemoveMember(m.id);
                        e.target.value = '';
                      }} style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', cursor: 'pointer', outline: 'none', appearance: 'none' }}>
                        <option value="">⚙️</option>
                        <option value="make_admin">Make Admin</option>
                        <option value="remove">Remove User</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap & Resources Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Group Roadmaps ({groupRoadmaps.length})</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {groupRoadmaps.length > 0 ? groupRoadmaps.map(r => (
                <div key={r.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{r.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Target: {r.target_role || 'General'}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href={`/roadmap/${r.id}`} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '13px', paddingTop: '8px', paddingBottom: '8px', textDecoration: 'none', textAlign: 'center' }}>
                      View
                    </Link>
                    {myRole === 'admin' && (
                      <button onClick={() => handleAssignRoadmap(r.id, 'remove')} className="btn-secondary" style={{ color: '#FF4D6A', borderColor: 'rgba(255,77,106,0.2)' }}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                  No active roadmaps assigned to this group.
                </div>
              )}
            </div>

            {myRole === 'admin' && (
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Add Roadmap</label>
                <select 
                  className="input" 
                  value="" 
                  onChange={(e) => handleAssignRoadmap(e.target.value, 'add')}
                  disabled={loadingRoadmaps}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Select Roadmap to Add --</option>
                  {allRoadmaps
                    .filter(r => !groupRoadmaps.find(gr => gr.id === r.id))
                    .map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
