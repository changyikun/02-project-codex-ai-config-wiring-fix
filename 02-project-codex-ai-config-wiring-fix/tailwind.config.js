/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        goldGlow: {
          '0%, 100%': {
            filter:
              'drop-shadow(0 0 10px rgba(245, 194, 72, 0.35)) drop-shadow(0 0 22px rgba(245, 194, 72, 0.18))',
            opacity: '0.94',
          },
          '50%': {
            filter:
              'drop-shadow(0 0 16px rgba(245, 194, 72, 0.56)) drop-shadow(0 0 34px rgba(245, 194, 72, 0.32))',
            opacity: '1',
          },
        },
      },
      animation: {
        goldGlow: 'goldGlow 5.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
