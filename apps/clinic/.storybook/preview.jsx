import React from "react";
import "../src/styles/index.css";
import "../src/styles/theme.css";
import { ThemeProvider } from "../src/contexts/ThemeContext";

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#F8FAFC" },
        { name: "dark", value: "#0B0E14" },
      ],
    },
    a11y: {
      element: "#storybook-root",
      config: {},
      options: {},
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.backgrounds?.value === "#0B0E14" ? "dark" : "light";
      
      React.useEffect(() => {
        const root = document.documentElement;
        if (theme === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }, [theme]);

      return (
        <ThemeProvider>
          <div className="p-6 bg-background text-text-primary min-h-[200px] transition-colors duration-200">
            <Story />
          </div>
        </ThemeProvider>
      );
    },
  ],
};

export default preview;
