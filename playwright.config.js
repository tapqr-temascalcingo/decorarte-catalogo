import { defineConfig, devices } from '@playwright/test';

const PUERTO = 8090;

export default defineConfig({
  testDir: 'tests/navegador',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PUERTO}/` },
  webServer: {
    command: 'node tests/servidor.js',
    env: { PUERTO: String(PUERTO) },
    url: `http://localhost:${PUERTO}/`,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'] }, testIgnore: /capturas/ },
    { name: 'iphone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' }, testMatch: /catalogo/ },
    {
      name: 'capturas',
      testMatch: /capturas/,
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
  ],
});
