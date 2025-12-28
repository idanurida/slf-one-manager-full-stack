
const { test, expect } = require('@playwright/test');

test.describe('Registration Flow', () => {

    test('User should be able to register successfully', async ({ page }) => {
        // 1. Navigate to Register Page
        await page.goto('/register');
        await expect(page.getByText('Buat Akun Baru', { exact: true })).toBeVisible();

        // --- STEP 1: Basic Info ---
        const uniqueId = Date.now();
        const email = `inspector_${uniqueId}@test.com`;
        const name = `Test Inspector ${uniqueId}`;

        await page.getByPlaceholder('Masukkan nama lengkap').fill(name);
        await page.getByPlaceholder('nama@perusahaan.com').fill(email);

        // Select Role: Inspector using ID
        await page.click('button#role');
        await page.getByText('Inspector', { exact: true }).click();

        // Wait for specialization select to appear
        await expect(page.locator('label[for="specialization"]')).toBeVisible();

        // Select Specialization using ID
        await page.click('button#specialization');
        await page.getByText('Arsitektur').first().click();

        // Click "Lanjutkan"
        await page.getByRole('button', { name: 'Lanjutkan' }).click();

        // --- STEP 2: Password ---
        // Wait for password field to be visible
        await expect(page.getByPlaceholder('Buat password')).toBeVisible();

        await page.getByPlaceholder('Buat password').fill('password123');
        await page.getByPlaceholder('Ulangi password').fill('password123');

        // Click "Daftar Sekarang"
        await page.getByRole('button', { name: 'Daftar Sekarang' }).click();

        // --- STEP 3: Verify Success ---
        // Expect "Registrasi Berhasil!"
        await expect(page.getByText('Registrasi Berhasil!')).toBeVisible({ timeout: 15000 });

        // Verify redirection happens or specific elements exist
        // The page shows "Verifikasi Email" status
        await expect(page.getByText('Verifikasi Email')).toBeVisible();
    });
});
