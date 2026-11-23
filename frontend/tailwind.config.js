/** @type {import('tailwindcss').Config} */
// Tokens tomados de DESIGN.md (tema Papel).
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4ECE6',
        surface: '#FBF7F3',
        sunken: '#EBDFD7',
        band: '#EDE0D8',
        stone: '#E3D6CC',
        'stone-strong': '#7F7365',
        ink: '#1E1916',
        'ink-soft': '#574C44',
        olive: '#66613F',
        'olive-deep': '#524E33',
        'on-olive': '#FBF8EE',
        'olive-tint': '#E6E4D0',
        terracotta: '#B85D3B',
        'terracotta-deep': '#9A4527',
        'on-terracotta': '#FBF6EF',
        'terracotta-tint': '#F3DFD4',
        'terracotta-ink': '#7E3418',
        sage: '#6B7A68',
        'sage-tint': '#E3E8DF',
        'sage-ink': '#3D4A3B',
        'honey-tint': '#F3E8C9',
        'honey-ink': '#6B4E00',
        cherry: '#9E2A3A',
        'cherry-deep': '#85212F',
        'on-cherry': '#FFF7F5',
        'cherry-tint': '#F5DEDF',
        'cherry-ink': '#8A2230',
        'neutral-tint': '#E9E3D8',
        'neutral-ink': '#54493F',
      },
      fontFamily: {
        serif: ['"Instrument Serif"', '"Iowan Old Style"', 'Georgia', 'serif'],
        sans: ['Figtree', 'system-ui', '"Segoe UI"', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
      },
    },
  },
  plugins: [],
};
