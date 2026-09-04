/**
 * @type {import('tailwindcss').Config}
 *
 * Design tokens — the single source of visual truth. Every hex, radius,
 * shadow, and duration a component picks from must come from here.
 *
 * Naming: the brand accent is purple, not gold. `brand-primary-*` are the
 * real names; `brand-gold-*` are kept as aliases pointing at the same
 * colors so ~200 existing usages don't break mid-redesign. Batch 14 does
 * the mechanical rename and deletes the aliases.
 */
const brand = {
  // Purple accent — used sparingly (primary CTA, active state, one KPI
  // per screen). If you're reaching for it, ask if the neutral would do.
  primary: '#C06FEF',
  'primary-soft': '#D084FF',
  'primary-deep': '#9B59B6',
  'primary-glow': 'rgba(192, 111, 239, 0.18)',
};

export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          ...brand,
          // Legacy aliases — kept while Batch 1-13 migrate; removed in Batch 14.
          gold: brand.primary,
          'gold-soft': brand['primary-soft'],
          'gold-deep': brand['primary-deep'],
          'gold-glow': brand['primary-glow'],
        },
        surface: {
          // Light theme — cool neutrals with a subtle violet tint.
          cream: '#F5F3FA',      // page bg (light)
          ivory: '#FFFFFF',      // card bg (light)
          mist: '#E7E4EF',       // subtle divider (light)
          charcoal: '#1B1526',   // primary text (light)
          slate: '#5C5670',      // secondary text (light) — WCAG AA on cream
          // Dark theme — cool violet-black stack.
          night: '#0D0A15',      // page bg (dark)
          coal: '#171223',       // card bg (dark)
          dust: '#221B33',       // input bg (dark)
          fog: '#2E2640',        // subtle divider (dark)
          ash: '#CFC8E0',        // secondary text (dark)
          bone: '#F7F5FC',       // primary text (dark)
        },
        // Semantic states — same on both themes. Chosen for WCAG AA on
        // both page grounds. Use these for status pills, toasts, and
        // any "did the thing succeed" affordance; never the raw Tailwind
        // colors (red-500/green-500/etc) — they'll drift.
        state: {
          success:      '#10B981',
          'success-bg': 'rgba(16, 185, 129, 0.15)',
          warning:      '#F59E0B',
          'warning-bg': 'rgba(245, 158, 11, 0.15)',
          danger:       '#EF4444',
          'danger-bg':  'rgba(239, 68, 68, 0.15)',
          info:         '#3B82F6',
          'info-bg':    'rgba(59, 130, 246, 0.15)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        // Editorial serif for the big landing / invitation moments — one
        // font, used in a handful of specific places, not everywhere.
        display: ['"Fraunces"', '"Plus Jakarta Sans"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Small utility scale for UI text (labels, chips, dense tables).
        // The big display sizes (5xl/6xl/7xl) intentionally fall through
        // to Tailwind's defaults so hero copy has room to breathe.
        '2xs': ['10px', { lineHeight: '1', letterSpacing: '0.08em' }],
        xs:   ['11px', { lineHeight: '1.15' }],
        sm:   ['12px', { lineHeight: '1.3' }],
        base: ['13px', { lineHeight: '1.4' }],
        md:   ['14px', { lineHeight: '1.4' }],
        lg:   ['15px', { lineHeight: '1.3' }],
        xl:   ['16px', { lineHeight: '1.25' }],
        '2xl':['19px', { lineHeight: '1.2' }],
        '3xl':['22px', { lineHeight: '1.15' }],
        '4xl':['28px', { lineHeight: '1.1' }],
      },
      // Radius scale — chosen for a cohesive family of curves.
      // Cards use 2xl (18px), inputs xl (14px), pills full.
      borderRadius: {
        xs: '4px', sm: '6px', md: '10px', lg: '12px', xl: '14px', '2xl': '18px', '3xl': '24px',
      },
      backgroundImage: {
        // Purple brand gradient — used exactly one place per screen
        // (the primary CTA, or a hero band). Never as a background wash.
        'gradient-primary':      'linear-gradient(135deg, #D084FF 0%, #C06FEF 60%, #9B59B6 100%)',
        'gradient-primary-soft': 'linear-gradient(135deg, #EED4FF 0%, #C06FEF 100%)',
        // Legacy aliases (see brand.gold note above).
        'gradient-gold':      'linear-gradient(135deg, #D084FF 0%, #C06FEF 60%, #9B59B6 100%)',
        'gradient-gold-soft': 'linear-gradient(135deg, #EED4FF 0%, #C06FEF 100%)',
        'gradient-brand':     'linear-gradient(135deg, #C06FEF 0%, #FF8E53 100%)',
      },
      boxShadow: {
        // Elevation ladder — pick by "how much does this thing float?"
        // NOT by "how much do I want the reader to notice it?" Emphasis
        // is a color decision, elevation is a physical one.
        'elev-1':  '0 1px 2px rgba(31, 30, 26, 0.06)',
        'elev-2':  '0 1px 2px rgba(31, 30, 26, 0.06), 0 4px 8px rgba(31, 30, 26, 0.04)',
        'elev-3':  '0 2px 4px rgba(31, 30, 26, 0.06), 0 8px 16px rgba(31, 30, 26, 0.06), 0 16px 40px rgba(31, 30, 26, 0.08)',
        'elev-4':  '0 4px 8px rgba(31, 30, 26, 0.08), 0 16px 32px rgba(31, 30, 26, 0.10), 0 32px 80px rgba(31, 30, 26, 0.14)',
        'primary-soft': '0 5px 15px 2px rgba(155, 89, 182, 0.15)',
        'primary-glow': '0 0 24px rgba(192, 111, 239, 0.32)',
        // Legacy aliases.
        card:    '0 1px 2px rgba(31, 30, 26, 0.06), 0 4px 8px rgba(31, 30, 26, 0.04), 0 12px 32px rgba(31, 30, 26, 0.08)',
        'card-lg': '0 2px 4px rgba(31, 30, 26, 0.06), 0 12px 24px rgba(31, 30, 26, 0.08), 0 24px 64px rgba(31, 30, 26, 0.12)',
        'gold-soft': '0 5px 15px 2px rgba(155, 89, 182, 0.15)',
        'gold-glow': '0 0 24px rgba(192, 111, 239, 0.32)',
      },
      // Motion tokens — every transition duration and curve comes from
      // one of these. Add a new one only if the existing set genuinely
      // doesn't cover the case.
      transitionDuration: {
        instant: '80ms',
        fast:    '150ms',
        base:    '200ms',
        slow:    '300ms',
        slower:  '450ms',
      },
      transitionTimingFunction: {
        // Emphasized easing — slow start, quick landing. For entering elements.
        'ease-in-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        // Standard easing — for hover/focus state changes.
        'ease-out-quart':   'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      animation: {
        'fade-in':    'fadeIn 200ms cubic-bezier(0.25, 1, 0.5, 1)',
        'slide-up':   'slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in':   'scaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-primary': 'pulsePrimary 2.4s ease-in-out infinite',
        'pulse-gold':    'pulsePrimary 2.4s ease-in-out infinite', // legacy alias
        shimmer:      'shimmer 1.6s linear infinite',
      },
      keyframes: {
        fadeIn:   { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp:      { '0%': { transform: 'translateY(14px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        slideDown:    { '0%': { transform: 'translateY(-14px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        slideInRight: { '0%': { transform: 'translateX(24px)', opacity: 0 }, '100%': { transform: 'translateX(0)', opacity: 1 } },
        scaleIn:      { '0%': { transform: 'scale(0.96)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        pulsePrimary: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(192, 111, 239, 0.4)' },
          '50%':      { boxShadow: '0 0 0 10px rgba(192, 111, 239, 0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
