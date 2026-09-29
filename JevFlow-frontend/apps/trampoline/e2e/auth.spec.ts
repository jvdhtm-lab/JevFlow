import { test, expect } from '@playwright/test';
import { e2eEmail, loginAsAdmin } from './auth';

test.describe('auth', () => {
  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(e2eEmail);
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await expect(page.getByText('JevFlow Dashboard')).toBeVisible();
  });

  test('invalid credentials show an error and stay on login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(e2eEmail);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Login failed')).toBeVisible();
  });

  test('logout returns to login page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByLabel('account of current user').click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('login immediately after logout works', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByLabel('account of current user').click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel('Email').fill(e2eEmail);
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await expect(page.getByText('JevFlow Dashboard')).toBeVisible();
  });
});
