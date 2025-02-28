/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'craigslist-blue': '#007bff',
        'craigslist-gray': '#f8f9fa',
      },
    },
  },
  plugins: [],
}
