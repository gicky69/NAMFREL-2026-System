/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#190075",
          light: "#3b1aa8",
          dark: "#10004d",
        },
        accent: "#f59e0b",
        danger: "#dc2626",
        success: "#16a34a",
        warning: "#ea580c",
        neutral: "#64748b",
      },
    },
  },
  plugins: [],
  
};
