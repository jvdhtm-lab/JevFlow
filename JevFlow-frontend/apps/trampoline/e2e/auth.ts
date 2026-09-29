import { expect, type Page } from '@playwright/test';

export const e2eEmail = process.env.E2E_USER_EMAIL ?? 'root@local.com';
export const e2ePassword = process.env.E2E_USER_PASSWORD ?? 'admin';

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(e2eEmail);
  await page.getByLabel('Password').fill(e2ePassword);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  // Wait for the dashboard heading so the next navigation is not interrupted
  // by any post-login redirects.
  await expect(page.getByText('JevFlow Dashboard')).toBeVisible();
}

let counter = 0;
/** Unique, greppable name for records created by tests. */
export function uniqueName(prefix: string): string {
  counter += 1;
  return `${prefix} ${Date.now()}-${counter}`;
}

/** Guard used by navigation/load tests: fail if the ErrorBoundary tripped. */
export async function expectNoRenderError(page: Page): Promise<void> {
  await expect(page.getByText('Render error')).toHaveCount(0);
}
