const { test, expect } = require('@playwright/test');

test.describe('Admin Role Login & Redirection', () => {

    test('Superadmin should login and redirect to /dashboard/superadmin', async ({ page }) => {
        // 1. Go to Login
        await page.goto('/login');

        // 2. Fill Credentials (seeded)
        await page.getByPlaceholder('nama@perusahaan.com').fill('superadmin@test.com');
        await page.getByPlaceholder('Masukkan kata sandi').fill('password123');

        // 3. Submit
        await page.getByRole('button', { name: /Masuk/i }).click();

        // Debug: Check for error message
        const errorAlert = page.locator('.text-destructive');
        if (await errorAlert.isVisible()) {
            console.log('❌ Superadmin Login Error:', await errorAlert.innerText());
        }

        // 4. Expect Redirection
        await expect(page).toHaveURL(/\/dashboard\/superadmin/, { timeout: 10000 });
    });

    test('Admin should login and redirect to /dashboard/admin', async ({ page }) => {
        // 1. Go to Login
        await page.goto('/login');

        // 2. Fill Credentials (seeded)
        await page.getByPlaceholder('nama@perusahaan.com').fill('admin@test.com');
        await page.getByPlaceholder('Masukkan kata sandi').fill('password123');

        // 3. Submit
        await page.getByRole('button', { name: /Masuk/i }).click();

        // 4. Expect Redirection
        await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 10000 });
    });

});
