/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pink: { DEFAULT: "#FF0050" },
        purple: { DEFAULT: "#7C3AED" },
      },
    },
  },
  plugins: [],
};
