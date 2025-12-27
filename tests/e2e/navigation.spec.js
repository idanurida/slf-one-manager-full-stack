
const { test, expect } = require('@playwright/test');

test.describe('Navigation & Protection Tests', () => {

    test('Accessing dashboard without auth should redirect to login', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForURL('**/login**');
    });

    test('Accessing superadmin without auth should redirect to login', async ({ page }) => {
        await page.goto('/dashboard/superadmin');
        await page.waitForURL('**/login**');
    });

    test('Accessing inspector without auth should redirect to login', async ({ page }) => {
        await page.goto('/dashboard/inspector');
        await page.waitForURL('**/login**');
    });

    test('Forgot password page exists', async ({ page }) => {
        await page.goto('/forgot-password');
        await expect(page.getByText('Lupa Password?')).toBeVisible();
    });

});

