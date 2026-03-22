import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base:     '#080C14',
          surface:  '#0E1421',
          elevated: '#131D2E',
          card:     '#111827',
        },
        accent: {
          primary:  '#4DFFA0',
          violet:   '#7B61FF',
          amber:    '#FFB547',
          red:      '#FF4D6A',
          cyan:     '#00D4FF',
        },
        text: {
          primary:   '#F0F4FF',
          secondary: '#B8C4E0',
          muted:     '#6B7A99',
        },
      },
      fontFamily: {
        display: ['DM Sans', 'system-ui', 'sans-serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.5s ease forwards',
        'slide-up':   'slideUp 0.6s cubic-bezier(0.22,1,0.36,1) forwards',
        'pulse-mint': 'pulseMint 2s ease infinite',
        'marquee':    'marquee 40s linear infinite',
        'shimmer':    'shimmer 4s linear infinite',
        'float':      'float 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(40px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseMint: { '0%,100%': { boxShadow: '0 0 0 0 rgba(77,255,160,0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(77,255,160,0)' } },
        marquee:   { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        shimmer:   { '0%': { backgroundPosition: '-200% center' }, '100%': { backgroundPosition: '200% center' } },
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'glow-mint':   '0 0 30px rgba(77,255,160,0.15), 0 0 60px rgba(77,255,160,0.05)',
        'glow-violet': '0 0 30px rgba(123,97,255,0.15), 0 0 60px rgba(123,97,255,0.05)',
        'glow-amber':  '0 0 30px rgba(255,181,71,0.15)',
      },
      backgroundImage: {
        'gradient-mint':   'linear-gradient(135deg, #4DFFA0, #00D4FF)',
        'gradient-violet': 'linear-gradient(135deg, #7B61FF, #C961FF)',
        'gradient-amber':  'linear-gradient(135deg, #FFB547, #FF8C47)',
        'gradient-dark':   'linear-gradient(180deg, #080C14 0%, #0E1421 100%)',
      },
      screens: {
        xs: '475px',
      },
    },
  },
  plugins: [],
};

export default config;
