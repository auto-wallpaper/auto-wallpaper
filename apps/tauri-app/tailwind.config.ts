import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

import baseConfig from "@acme/tailwind-config/web";

export default {
  // We need to append the path to the UI package to the content array so that
  // those classes are included correctly.
  content: [...baseConfig.content, "../../packages/ui/**/*.{ts,tsx}"],
  presets: [baseConfig],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
        mono: ["var(--font-geist-mono)", ...fontFamily.mono],
      },
      keyframes: {
        spinningStroke: {
          from: {
            strokeDasharray: "500 100",
            strokeDashoffset: "0",
          },
          to: {
            strokeDasharray: "500 100",
            strokeDashoffset: "1237.8245849609375",
          }
        }
      },
      animation: {
        "spinning-stroke": "spinningStroke 2s infinite linear"
      }
    },
  },
} satisfies Config;
