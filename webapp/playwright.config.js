import { defineConfig, devices } from '@playwright/test';
import { createServer } from 'net';

const TEST_HOST = '127.0.0.1';

const tryListenOn = (host, port) =>
  new Promise((resolve) => {
    const srv = createServer();
    srv.unref();
    srv.once('error', () => resolve(null));
    srv.listen(port, host, () => {
      const actual = srv.address().port;
      srv.close(() => resolve(actual));
    });
  });

const pickPort = async (preferred) => {
  // Require both IPv4 and IPv6 loopback to be free on the preferred port,
  // otherwise localhost may resolve to whichever stack is occupied by another app.
  const ipv4 = await tryListenOn('127.0.0.1', preferred);
  const ipv6 = await tryListenOn('::1', preferred);
  if (ipv4 !== null && ipv6 !== null) return preferred;
  return tryListenOn('127.0.0.1', 0);
};

const resolvePorts = async () => {
  // Workers re-evaluate this config in forked processes; cache the resolved
  // ports in env so they all agree with the orchestrator that started webServer.
  if (process.env.LBB_TEST_RESOLVED_PORT && process.env.LBB_TEST_RESOLVED_API_PORT) {
    return {
      client: parseInt(process.env.LBB_TEST_RESOLVED_PORT, 10),
      api: parseInt(process.env.LBB_TEST_RESOLVED_API_PORT, 10),
    };
  }
  const client = await pickPort(parseInt(process.env.LBB_TEST_PORT, 10) || 5173);
  const api = await pickPort(parseInt(process.env.LBB_TEST_API_PORT, 10) || 3000);
  process.env.LBB_TEST_RESOLVED_PORT = String(client);
  process.env.LBB_TEST_RESOLVED_API_PORT = String(api);
  return { client, api };
};

const { client: clientPort, api: apiPort } = await resolvePorts();

const baseURL = `http://${TEST_HOST}:${clientPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `VITE_DEV_PORT=${clientPort} VITE_DEV_API_PORT=${apiPort} VITE_DEV_HOST=${TEST_HOST} PORT=${apiPort} npm run dev:mock`,
    url: baseURL,
    reuseExistingServer: !process.env.CI && clientPort === 5173 && apiPort === 3000,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
