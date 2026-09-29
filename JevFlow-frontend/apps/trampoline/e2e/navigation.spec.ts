import { test, expect } from '@playwright/test';
import { loginAsAdmin, expectNoRenderError } from './auth';

const routes = [
  { label: 'Dashboard', path: '/dashboard', heading: 'JevFlow Dashboard' },
  { label: 'Integrations', path: '/integrations' },
  { label: 'Decision Maps', path: '/maps' },
  { label: 'Runs', path: '/runs' },
  { label: 'Approvals', path: '/approvals' },
  { label: 'Hooks', path: '/webhooks' },
  { label: 'Tools', path: '/tools' },
  { label: 'Users', path: '/users' },
  { label: 'Settings', path: '/settings' },
];

test.describe('navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const route of routes) {
    test(`sidebar navigates to ${route.label}`, async ({ page }) => {
      const sidebar = page.getByLabel('Sidebar navigation');
      await sidebar.getByRole('button', { name: route.label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`\\${route.path}\\/?$`));
      await expectNoRenderError(page);
      if (route.heading) {
        await expect(page.getByText(route.heading)).toBeVisible();
      }
    });
  }
});
