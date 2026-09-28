const STEPS = [
  {
    title: 'Set your target',
    body: 'Tell us the role and company, or paste a job description. PrepSpace builds a roadmap around the gaps between you and the posting.',
  },
  {
    title: 'Talk it through with Alex',
    body: 'Start a live voice interview or ask for a tutoring session on any topic. Interrupt, think out loud, and answer the way you would on the day.',
  },
  {
    title: 'Review the evidence',
    body: 'Every score in your report links to the moment you said it. Replay it, see what was missing, and take the next drill straight from the report.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-t border-line bg-panel/40">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:py-24">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">From job description to a scored answer in one sitting</h2>
          <p className="mt-3 text-base text-fg-2">Three steps, in order. Each one feeds the next.</p>
        </div>

        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-panel border border-line bg-panel p-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong font-mono text-sm text-fg-2" aria-hidden>
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-fg">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-fg-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
