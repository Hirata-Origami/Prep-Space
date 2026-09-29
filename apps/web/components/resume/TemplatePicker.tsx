'use client';

import type { ResumeTemplateId } from '@/lib/hooks/useResume';
import { TEMPLATE_META } from '@/lib/resume/templates';
import { cn } from '@/lib/cn';

/** A tiny wireframe of each layout so the choice is visible, not just named. */
function Thumb({ id }: { id: ResumeTemplateId }) {
  const bar = (w: string, strong = false) => (
    <span className={cn('block h-[3px] rounded-full', strong ? 'bg-fg-2' : 'bg-fg-3/40')} style={{ width: w }} />
  );
  const serif = id === 'classic-single' || id === 'executive-serif';
  const accent = id === 'modern-two-column' || id === 'accent-single';
  const centered = serif;

  return (
    <div aria-hidden className="flex h-[76px] w-[56px] shrink-0 flex-col gap-[3px] rounded-[3px] border border-line-strong bg-white p-1.5 shadow-sm">
      <div className={cn('flex flex-col gap-[2px]', centered ? 'items-center' : 'items-start')}>
        <span className={cn('block h-[4px] rounded-full', accent ? 'bg-[#00A6C0]' : 'bg-[#2E2E2F]')} style={{ width: centered ? '60%' : '70%' }} />
        <span className="block h-[2px] w-[85%] rounded-full bg-[#B4B7B9]" />
      </div>
      {id === 'modern-two-column' ? (
        <div className="mt-0.5 grid flex-1 grid-cols-[1.9fr_1fr] gap-1">
          <div className="flex flex-col gap-[2px]">{['90%', '70%', '85%', '60%', '80%', '75%'].map((w, i) => <span key={i} className="block h-[2px] rounded-full bg-[#B4B7B9]" style={{ width: w }} />)}</div>
          <div className="flex flex-col gap-[2px]">{['100%', '80%', '90%', '70%'].map((w, i) => <span key={i} className="block h-[2px] rounded-full bg-[#00A6C0]/60" style={{ width: w }} />)}</div>
        </div>
      ) : (
        <div className="mt-0.5 flex flex-1 flex-col gap-[2px]">
          {[bar('40%', true), bar('100%'), bar('92%'), bar('40%', true), bar('96%'), bar('88%'), bar('40%', true), bar('94%')].map((b, i) => <div key={i}>{b}</div>)}
        </div>
      )}
    </div>
  );
}

interface TemplatePickerProps {
  value: ResumeTemplateId;
  onChange: (id: ResumeTemplateId) => void;
}

export function TemplatePicker({ value, onChange }: TemplatePickerProps) {
  return (
    <div role="radiogroup" aria-label="Resume template" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {TEMPLATE_META.map(t => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(t.id)}
            className={cn(
              'flex items-start gap-3 rounded-panel border p-3 text-left transition-colors',
              active ? 'border-signal bg-signal/10' : 'border-line bg-panel hover:border-line-strong hover:bg-raised'
            )}
          >
            <Thumb id={t.id} />
            <span className="min-w-0">
              <span className={cn('block text-sm font-semibold', active ? 'text-signal' : 'text-fg')}>{t.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-fg-3">{t.description}</span>
              <span className="mt-1.5 block text-[12px] text-fg-3">{t.columns === 2 ? 'Two columns' : 'Single column'} · {t.font}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
