import { defineConfig } from 'cypress';

export default defineConfig({
    projectId: 't2rgkz',
    includeShadowDom: true,
    e2e: {
        // We've imported your old cypress plugins here.
        // You may want to clean this up later by importing these.
        // setupNodeEvents(on, config) {
        //     return require('./cypress/plugins/index.сjs')(on, config)
        // },
        specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}'
    }
});
