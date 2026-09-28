import Image from 'next/image';
import Link from 'next/link';

const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [
      { label: 'How it works', href: '#how' },
      { label: 'Features', href: '#features' },
      { label: 'Newsletter', href: '#newsletter' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Log in', href: '/auth/login' },
      { label: 'Create account', href: '/auth/signup' },
    ],
  },
];

export function FooterSection() {
  return (
    <footer className="border-t border-line bg-panel/40">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <Image src="/prepspace-logo.png" alt="" width={28} height={28} className="rounded-lg" />
            <span className="font-display text-lg font-bold tracking-tight text-fg">PrepSpace</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-fg-3">Train like it is real. Land what you deserve.</p>
        </div>

        <nav aria-label="Footer" className="flex gap-16">
          {FOOTER_LINKS.map(group => (
            <div key={group.heading}>
              <div className="text-sm font-semibold text-fg">{group.heading}</div>
              <ul className="mt-3 space-y-2">
                {group.links.map(l => (
                  <li key={l.label}>
                    {l.href.startsWith('#') ? (
                      <a href={l.href} className="text-sm text-fg-3 transition-colors hover:text-fg">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-sm text-fg-3 transition-colors hover:text-fg">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-[1200px] px-4 py-5 text-[13px] text-fg-3 sm:px-6">© {new Date().getFullYear()} PrepSpace</div>
      </div>
    </footer>
  );
}
