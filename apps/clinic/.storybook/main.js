/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|ts|tsx)",
    "../../../packages/ui/stories/**/*.stories.@(js|jsx|ts|tsx)",
  ],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // Plugin PWA aplikasi (service worker & precache) tidak relevan untuk Storybook dan gagal pada berkas manager > 2 MB.
  viteFinal: async (cfg) => ({
    ...cfg,
    plugins: (cfg.plugins || []).flat(Infinity).filter((p) => !(p && typeof p.name === "string" && p.name.startsWith("vite-plugin-pwa"))),
  }),
};

export default config;
