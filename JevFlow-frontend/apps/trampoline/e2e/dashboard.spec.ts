import { test, expect } from '@playwright/test';
import { loginAsAdmin, expectNoRenderError } from './auth';

test.describe('dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('renders KPI cards and panels', async ({ page }) => {
    await expect(page.getByText('JevFlow Dashboard')).toBeVisible();
    await expect(page.getByTestId('kpi-decision-maps')).toBeVisible();
    await expect(page.getByTestId('kpi-runs')).toBeVisible();
    await expect(page.getByTestId('kpi-pending-approvals')).toBeVisible();
    await expect(page.getByTestId('kpi-hooks')).toBeVisible();
    await expect(page.getByText('Recent runs')).toBeVisible();
    await expectNoRenderError(page);
  });

  test('dashboard KPIs are clickable', async ({ page }) => {
    await page.getByTestId('kpi-decision-maps').click();
    await expect(page).toHaveURL(/\/maps\/?$/);
  });
});
