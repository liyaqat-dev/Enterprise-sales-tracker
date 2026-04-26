/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#d4af37',
          dark: '#b8962e',
        },
        charcoal: '#0f1115',
        slateCustom: '#161920',
      },
    },
  },
  plugins: [],
}

