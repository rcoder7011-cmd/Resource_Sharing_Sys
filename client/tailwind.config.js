/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          card: 'var(--bg-card)',
          cardSubtle: 'var(--bg-card-subtle)',
          cardHover: 'var(--bg-card-hover)',
          input: 'var(--bg-input)',
          text: 'var(--text-primary)',
          textSecondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          border: 'var(--border-color)',
          borderSubtle: 'var(--border-subtle)',
          borderHover: 'var(--border-hover)',
        },
      },
    },
  },
  plugins: [],
}
