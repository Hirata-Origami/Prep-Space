import { ButtonLink } from '@/components/ui/Button';
import { Wave } from '@/components/ui/Wave';

const SCORES = [
  { label: 'Clarity', value: 82 },
  { label: 'Structure', value: 74 },
  { label: 'Technical depth', value: 68 },
];

/** A labelled sample of the real product: the one animated moment on the page. */
function SampleSession() {
  return (
    <div
      className="overflow-hidden rounded-hero border border-line-strong bg-panel shadow-[var(--shadow-float)]"
      role="img"
      aria-label="Sample interview session: live waveform, transcript excerpt and a scorecard"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2.5 text-sm font-medium text-fg">
          <span className="live-dot" aria-hidden />
          Live with Alex
        </div>
        <span className="font-mono text-sm text-fg-3">12:41</span>
      </div>

      <div className="px-5 pb-2 pt-5">
        <Wave bars={44} live className="h-14 w-full justify-between" />
      </div>

      <div className="space-y-3 px-5 pb-5 pt-3 text-[14px] leading-relaxed">
        <p className="text-fg-3">
          <span className="font-semibold text-fg-2">Alex</span> How would you design a rate limiter for a public API?
        </p>
        <p className="rounded-control border border-line bg-raised px-3.5 py-3 text-fg">
          I would start with a token bucket per API key, kept in Redis so limits hold across instances…
        </p>
      </div>

      <div className="border-t border-line bg-raised/50 px-5 py-4">
        <div className="mb-3 text-[13px] font-medium text-fg-2">Scorecard</div>
        <ul className="space-y-2.5">
          {SCORES.map((s, i) => (
            <li key={s.label} className="flex items-center gap-3 text-[13px]">
              <span className="w-32 shrink-0 text-fg-2">{s.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full origin-left rounded-full bg-signal"
                  style={{ width: `${s.value}%`, animation: `grow 1.1s cubic-bezier(0.22,1,0.36,1) ${0.5 + i * 0.18}s both` }}
                />
              </span>
              <span className="w-8 text-right font-mono text-fg">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 sm:pt-32 lg:pt-36">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28">
        <div>
          <h1 className="font-display text-[42px] font-bold leading-[1.04] tracking-[-0.03em] text-fg sm:text-[56px] lg:text-[64px]">
            Practice the interview out loud before the real one.
          </h1>
          <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-fg-2">
            PrepSpace runs live voice interviews with an AI interviewer, then scores every answer and plays back the exact moments that cost you points.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/auth/signup" size="lg">
              Start free
            </ButtonLink>
            <ButtonLink href="#how" variant="secondary" size="lg">
              See how it works
            </ButtonLink>
          </div>
          <p className="mt-5 text-sm text-fg-3">Free during beta. Sign in with Google, bring your own Gemini key.</p>
        </div>

        <SampleSession />
      </div>
    </section>
  );
}
