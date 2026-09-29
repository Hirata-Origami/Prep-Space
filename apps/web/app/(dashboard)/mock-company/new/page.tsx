'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, Upload } from 'lucide-react';
import { Badge, Button, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

interface GeneratedCompany {
  name: string;
  logo_emoji: string;
  industry: string;
  size: string;
  difficulty_rating: number;
  interview_culture: string;
  rounds: string[];
  round_topics?: Record<string, string[]>;
  known_patterns: string[];
}

const SUGGESTIONS = ['Zepto', 'Zomato', 'Razorpay', 'Figma', 'Linear', 'Notion', 'Vercel', 'Anthropic'];

export default function NewCompanyPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('Software Engineer');
  const [jd, setJd] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Mid-level');
  const [comments, setComments] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsingJd, setParsingJd] = useState(false);
  const [generatedCompany, setGeneratedCompany] = useState<GeneratedCompany | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingJd(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/roadmaps/parse', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse file');

      setJd(data.text);
      toast.success('Job description extracted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setParsingJd(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!companyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/mock-companies/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          role,
          jd,
          experience_level: experienceLevel,
          comments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGeneratedCompany(data.company);
      setStep('preview');
      toast.success('Company profile generated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedCompany) return;
    setSaving(true);
    try {
      const res = await fetch('/api/mock-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedCompany),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success('Company added');
      router.push('/mock-company');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 760 }}>
      <Link href="/mock-company" className="mb-5 inline-flex items-center gap-1.5 rounded-control text-sm text-fg-3 transition-colors hover:text-fg">
        <ArrowLeft size={15} aria-hidden /> Companies
      </Link>

      <PageHeader
        title="Add a company"
        description="AI researches known interview patterns for any company and adds them for everyone to practise."
      />

      {step === 'form' && (
        <Card className="space-y-5 p-5 sm:p-6">
          <div>
            <Field label="Company name">
              {a => <Input {...a} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Figma, Notion, Stripe, Zepto" />}
            </Field>
            <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Suggestions">
              {SUGGESTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCompanyName(c)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    companyName === c ? 'border-signal bg-signal/10 text-signal' : 'border-line bg-raised text-fg-2 hover:border-line-strong'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role">{a => <Input {...a} value={role} onChange={e => setRole(e.target.value)} placeholder="Software Engineer" />}</Field>
            <Field label="Experience level">
              {a => (
                <Select {...a} value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
                  <option>New Grad</option>
                  <option>Junior</option>
                  <option>Mid-level</option>
                  <option>Senior</option>
                  <option>Staff / Principal</option>
                </Select>
              )}
            </Field>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="jd" className="text-[13px] font-medium text-fg">Job description <span className="font-normal text-fg-3">(optional)</span></label>
              <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} loading={parsingJd}>
                <Upload size={13} aria-hidden /> {parsingJd ? 'Extracting…' : 'Upload PDF or DOCX'}
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.docx,.txt" className="sr-only" tabIndex={-1} aria-hidden />
            </div>
            <Textarea id="jd" value={jd} onChange={e => setJd(e.target.value)} rows={5} placeholder="Paste the job description for more accurate rounds." />
          </div>

          <Field label="Special focus areas (optional)">
            {a => <Input {...a} value={comments} onChange={e => setComments(e.target.value)} placeholder="Distributed systems, frontend performance" />}
          </Field>

          <p className="rounded-control border border-line bg-raised px-3.5 py-3 text-[13px] text-fg-2">
            PrepSpace will research known interview patterns at <strong className="text-fg">{companyName || 'this company'}</strong> and build a round-by-round format with topics for each round.
          </p>

          <Button size="lg" className="w-full" onClick={handleGenerate} loading={generating} disabled={!companyName.trim()}>
            {!generating && <Sparkles size={16} aria-hidden />}
            {generating ? 'Researching interview patterns…' : 'Generate company profile'}
          </Button>
        </Card>
      )}

      {step === 'preview' && generatedCompany && (
        <div>
          <div className="mb-5 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setStep('form')}><ArrowLeft size={15} aria-hidden /> Regenerate</Button>
            <Button onClick={handleSave} loading={saving}>{saving ? 'Saving…' : 'Add to PrepSpace'}</Button>
          </div>

          <Card className="space-y-6 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-5xl leading-none" aria-hidden>{generatedCompany.logo_emoji}</span>
              <div>
                <h2 className="font-display text-2xl font-semibold text-fg">{generatedCompany.name}</h2>
                <div className="text-sm text-fg-3">
                  {generatedCompany.industry} · {generatedCompany.size} · Difficulty{' '}
                  <strong className={cn('font-mono', generatedCompany.difficulty_rating >= 9 ? 'text-bad' : 'text-live')}>{generatedCompany.difficulty_rating}/10</strong>
                </div>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-fg-2">{generatedCompany.interview_culture}</p>

            <ol className="space-y-3">
              {(generatedCompany.rounds || []).map((roundName: string, i) => {
                const topics = generatedCompany.round_topics?.[roundName] || [];
                return (
                  <li key={roundName} className="rounded-panel border border-line bg-raised p-4">
                    <div className="mb-2 flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line-strong font-mono text-xs text-fg-2" aria-hidden>{i + 1}</span>
                      <span className="text-[15px] font-semibold text-fg">{roundName}</span>
                    </div>
                    {topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {topics.map((t: string) => <Badge key={t} tone="violet">{t}</Badge>)}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>

            {generatedCompany.known_patterns?.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-fg">Known patterns</h3>
                <ul className="space-y-1.5 text-sm text-fg-2">
                  {generatedCompany.known_patterns.map((p: string, i: number) => (
                    <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-signal" aria-hidden />{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
