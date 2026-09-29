'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import * as RadixTabs from '@radix-ui/react-tabs';
import { useUser } from '@/lib/hooks/useUser';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AlertCircle, CheckCircle2, KeyRound, LogOut, Moon, Palette, Shield, Sun, User as UserIcon } from 'lucide-react';
import { Avatar, Button, Card, Field, Input, PageHeader, Switch } from '@/components/ui';
import { cn } from '@/lib/cn';

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'key', label: 'AI API key', icon: KeyRound },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'privacy', label: 'Privacy', icon: Shield },
] as const;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('profile');
  const [saving, setSaving] = useState(false);
  const [validatingKey, setValidatingKey] = useState(false);
  const { theme, setTheme } = useTheme();
  const currentTheme = theme === 'light' ? 'light' : 'dark';
  const { user, mutate } = useUser();

  const [formData, setFormData] = useState({
    target_role: '',
    target_company: '',
  });

  // Gemini key state
  const [geminiKey, setGeminiKey] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        target_role: user.target_role ?? '',
        target_company: user.target_company ?? '',
      });
      // Do not populate input with masked key string; placeholder & badge indicate active status
      setGeminiKey('');
    }
  }, [user]);

  const handleThemeChange = (choice: 'dark' | 'light') => {
    setTheme(choice);
    toast.success(`Theme switched to ${choice === 'dark' ? 'Dark' : 'Light'}`);
  };

  const handleValidateKey = async () => {
    const keyToTest = geminiKey.trim();
    if (!keyToTest && !user?.has_gemini_key) {
      toast.error('Enter an API key first to validate.');
      return;
    }

    if (keyToTest && (keyToTest.includes('•') || /[^\x00-\x7F]/.test(keyToTest))) {
      toast.error('Please enter a fresh, unmasked API key starting with AIza...');
      return;
    }

    setValidatingKey(true);
    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyToTest || undefined }),
      });
      const data = await res.json();

      if (data.valid) {
        toast.success(data.message || 'Gemini API key is valid and working');
      } else {
        toast.error(`Key validation failed: ${data.error || 'Invalid key'}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Validation request failed');
    } finally {
      setValidatingKey(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = { ...formData };
      if (activeTab === 'key' && geminiKey) {
        payload.gemini_api_key = geminiKey;
      }

      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save');
      await mutate();
      toast.success('Settings saved');
      if (activeTab === 'key') setGeminiKey('');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const hasKey = !!user?.has_gemini_key;

  return (
    <div className="page-container" style={{ maxWidth: 920 }}>
      <PageHeader title="Settings" description="Your account, appearance and AI configuration." />

      <RadixTabs.Root value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="grid gap-6 md:grid-cols-[210px_minmax(0,1fr)]">
        <RadixTabs.List aria-label="Settings sections" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {TABS.map(({ id, label, icon: Icon }) => (
            <RadixTabs.Trigger
              key={id}
              value={id}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-control px-3 py-2.5 text-left text-sm font-medium transition-colors',
                activeTab === id ? 'bg-raised text-fg' : 'text-fg-3 hover:bg-raised/60 hover:text-fg'
              )}
            >
              <Icon size={16} className={activeTab === id ? 'text-signal' : ''} aria-hidden />
              <span>{label}</span>
              {id === 'key' && !hasKey && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-live" aria-label="Needs attention" />}
            </RadixTabs.Trigger>
          ))}
          <div className="my-2 hidden h-px bg-line md:block" aria-hidden />
          <button
            type="button"
            onClick={handleSignOut}
            className="flex shrink-0 items-center gap-2.5 rounded-control px-3 py-2.5 text-left text-sm font-medium text-bad transition-colors hover:bg-bad/10"
          >
            <LogOut size={16} aria-hidden /> Sign out
          </button>
        </RadixTabs.List>

        <Card className="min-w-0 p-5 sm:p-7">
          <RadixTabs.Content value="profile" className="space-y-6 outline-none">
            <div>
              <h2 className="text-lg font-semibold text-fg">Profile</h2>
              <p className="text-[13px] text-fg-3">Your career targets tune questions and roadmaps.</p>
            </div>
            <div className="flex items-center gap-4">
              <Avatar name={user?.full_name ?? 'User'} size={56} />
              <div>
                <div className="text-base font-semibold text-fg">{user?.full_name ?? 'User'}</div>
                <div className="text-[13px] text-fg-3"><span className="font-mono">{(user?.xp ?? 0).toLocaleString()}</span> XP · Level {user?.level || 'novice'}</div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Target role">
                {a => <Input {...a} value={formData.target_role} onChange={e => setFormData(p => ({ ...p, target_role: e.target.value }))} placeholder="Senior Frontend Engineer" />}
              </Field>
              <Field label="Target company">
                {a => <Input {...a} value={formData.target_company} onChange={e => setFormData(p => ({ ...p, target_company: e.target.value }))} placeholder="Google, Stripe" />}
              </Field>
            </div>
            <div className="flex justify-end border-t border-line pt-5">
              <Button onClick={handleSave} loading={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </RadixTabs.Content>

          <RadixTabs.Content value="key" className="space-y-6 outline-none">
            <div>
              <h2 className="text-lg font-semibold text-fg">Gemini API key</h2>
              <p className="text-[13px] text-fg-3">Used for roadmap generation, live voice interviews and feedback scoring.</p>
            </div>

            <div
              role="status"
              className={cn('flex items-start gap-3 rounded-panel border p-4', hasKey ? 'border-good/25 bg-good/10' : 'border-live/30 bg-live/10')}
            >
              {hasKey ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-good" aria-hidden /> : <AlertCircle size={20} className="mt-0.5 shrink-0 text-live" aria-hidden />}
              <div>
                <div className={cn('text-sm font-semibold', hasKey ? 'text-good' : 'text-live')}>{hasKey ? 'Your key is active' : 'No key saved'}</div>
                <div className="text-[13px] text-fg-2">
                  {hasKey ? 'It is stored securely and used for your AI requests.' : 'Add a key to unlock custom roadmaps and live mock interviews.'}
                </div>
              </div>
            </div>

            <div>
              <Field
                label={hasKey ? 'Replace key' : 'Add key'}
                hint="Get a free key at aistudio.google.com/app/apikey."
              >
                {a => (
                  <Input
                    {...a}
                    type="password"
                    autoComplete="off"
                    placeholder={hasKey ? 'A key is saved. Paste a new one to replace it.' : 'Paste your key (starts with AIza)'}
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                  />
                )}
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={handleValidateKey} loading={validatingKey} disabled={!geminiKey.trim() && !hasKey}>
                  {geminiKey.trim() ? 'Validate key' : 'Test saved key'}
                </Button>
                <Button onClick={handleSave} loading={saving} disabled={!geminiKey.trim() || geminiKey.includes('•')}>
                  {saving ? 'Saving…' : 'Save key'}
                </Button>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center px-2 text-sm font-medium text-signal hover:underline">
                  Open Google AI Studio
                </a>
              </div>
            </div>

            <p className="rounded-control border border-line bg-raised px-4 py-3 text-[13px] leading-relaxed text-fg-2">
              <strong className="text-fg">Secure storage.</strong> Your key is stored in your private profile row behind row-level security and is never sent to other users.
            </p>
          </RadixTabs.Content>

          <RadixTabs.Content value="appearance" className="space-y-5 outline-none">
            <div>
              <h2 className="text-lg font-semibold text-fg">Appearance</h2>
              <p className="text-[13px] text-fg-3">Choose the theme you practise in.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Theme">
              {[
                { id: 'dark' as const, label: 'Dark', desc: 'Low-glare ink theme for long practice sessions', swatch: '#0A0E1A', edge: '#2A3350', Icon: Moon },
                { id: 'light' as const, label: 'Light', desc: 'Bright paper theme for daylight', swatch: '#F5F6FB', edge: '#C6CBE0', Icon: Sun },
              ].map(t => {
                const selected = currentTheme === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleThemeChange(t.id)}
                    className={cn('flex items-center gap-3.5 rounded-panel border p-4 text-left transition-colors', selected ? 'border-signal bg-signal/10' : 'border-line bg-raised hover:border-line-strong')}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border" style={{ background: t.swatch, borderColor: t.edge }} aria-hidden>
                      <t.Icon size={16} color={t.id === 'dark' ? '#8B99FF' : '#3F51E0'} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm font-semibold', selected ? 'text-signal' : 'text-fg')}>{t.label}</span>
                      <span className="block text-xs text-fg-3">{t.desc}</span>
                    </span>
                    {selected && <CheckCircle2 size={18} className="shrink-0 text-signal" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </RadixTabs.Content>

          <RadixTabs.Content value="privacy" className="space-y-5 outline-none">
            <EmailPreference />
            <div>
              <h2 className="text-lg font-semibold text-fg">Privacy and data</h2>
              <p className="text-[13px] text-fg-3">What other people can see about your practice.</p>
            </div>
            {[
              { label: 'Appear on the global leaderboard', desc: 'Your name and XP are visible to other users.' },
              { label: 'Share roadmap activity in groups', desc: 'Group members can see your module completions.' },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-center gap-4 rounded-panel border border-line bg-raised p-4">
                <div className="flex-1">
                  <div className="text-sm font-medium text-fg">{label}</div>
                  <div className="text-xs text-fg-3">{desc}</div>
                </div>
                <Switch checked disabled aria-label={label} />
              </div>
            ))}
            <p className="text-[13px] text-fg-3">These options are on for everyone for now. Controls to change them are not available yet.</p>
          </RadixTabs.Content>
        </Card>
      </RadixTabs.Root>
    </div>
  );
}
/** Weekly digest and daily tip on or off. Shows a plain notice until the database has the column. */
function EmailPreference() {
  const [state, setState] = useState<{ enabled: boolean; available: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/user/email-preferences')
      .then(r => r.json())
      .then(j => alive && setState(j.error ? null : j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const toggle = async (enabled: boolean) => {
    setBusy(true);
    try {
      const res = await fetch('/api/user/email-preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setState(s => (s ? { ...s, enabled } : s));
      toast.success(enabled ? 'Weekly and daily emails are on' : 'Weekly and daily emails are off');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not update your email settings');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-fg">Email</h2>
        <p className="text-[13px] text-fg-3">Choose what lands in your inbox.</p>
      </div>
      <div className="flex items-center gap-4 rounded-panel border border-line bg-raised p-4">
        <div className="flex-1">
          <div className="text-sm font-medium text-fg">Weekly summary and daily tip</div>
          <div className="text-xs text-fg-3">Your week in numbers on Mondays and one interview tip a day. Emails that tell you a report is ready are always sent.</div>
        </div>
        <Switch checked={state?.enabled ?? true} disabled={!state || !state.available || busy} onCheckedChange={toggle} aria-label="Weekly summary and daily tip" />
      </div>
      {state && !state.available && <p className="text-[13px] text-fg-3">This needs a database update. Run <code className="font-mono text-fg-2">supabase/migrations/005_email_preferences.sql</code>.</p>}
    </div>
  );
}
