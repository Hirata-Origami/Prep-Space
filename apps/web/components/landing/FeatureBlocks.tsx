import { Wave } from '@/components/ui/Wave';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Controls';

const ROADMAP = [
  { name: 'Distributed systems basics', pct: 100 },
  { name: 'Caching and consistency', pct: 60 },
  { name: 'Rate limiting and queues', pct: 15 },
];

const COMPANIES = ['Backend, Meta', 'Frontend, Stripe', 'Data, Airbnb', 'ML, Google'];

function Panel({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <article className="flex flex-col rounded-panel border border-line bg-panel p-6">
      <h3 className="text-xl font-semibold tracking-tight text-fg">{title}</h3>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-fg-2">{body}</p>
      <div className="mt-6 flex-1 rounded-control border border-line bg-canvas p-4">{children}</div>
    </article>
  );
}

export function FeatureBlocks() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:py-24">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">Built around how interviews actually go</h2>
          <p className="mt-3 text-base text-fg-2">Not flashcards. A plan, a live conversation, and proof of what to fix.</p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Panel
            title="A roadmap that follows the job description"
            body="Upload a posting or pick a role. Modules reorder as you close gaps, so you always know what to study next."
          >
            <ul className="space-y-3.5">
              {ROADMAP.map(r => (
                <li key={r.name}>
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="text-fg">{r.name}</span>
                    <span className="font-mono text-fg-3">{r.pct}%</span>
                  </div>
                  <Progress value={r.pct} label={r.name} tone={r.pct === 100 ? 'good' : 'signal'} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Voice interviews that feel like a recruiter screen"
            body="Typing your answers is not the same as saying them. Talk to Alex in real time and get pushed on the gaps."
          >
            <div className="flex items-center gap-3 text-[13px] text-fg-2">
              <span className="live-dot" aria-hidden />
              Alex is listening
            </div>
            <Wave bars={40} live className="mt-3 h-12 w-full justify-between" />
          </Panel>

          <Panel
            title="Practice for the company you are targeting"
            body="Mock rounds follow each company's format and known patterns. Turn on strict mode to feel real interview-day pressure."
          >
            <div className="flex flex-wrap gap-2">
              {COMPANIES.map(c => (
                <Badge key={c} tone="neutral" className="px-3 py-1 text-[13px] font-medium">
                  {c}
                </Badge>
              ))}
            </div>
          </Panel>

          <Panel
            title="Every score comes with the audio to back it up"
            body="Click a weak spot in your report and hear exactly what you said, next to what a strong answer sounds like."
          >
            <ul className="space-y-2 text-[13px]">
              {[
                { t: '02:14', text: 'No complexity analysis given', tone: 'bad' as const },
                { t: '05:41', text: 'Clear trade-off between Redis and local cache', tone: 'good' as const },
                { t: '08:03', text: 'Answer ran long: 340 words', tone: 'live' as const },
              ].map(m => (
                <li key={m.t} className="flex items-center gap-3">
                  <span className="font-mono text-fg-3">{m.t}</span>
                  <span className="flex-1 text-fg">{m.text}</span>
                  <Badge tone={m.tone}>{m.tone === 'good' ? 'Strong' : m.tone === 'bad' ? 'Missed' : 'Trim'}</Badge>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </section>
  );
}
