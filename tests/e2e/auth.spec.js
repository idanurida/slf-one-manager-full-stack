
const { test, expect } = require('@playwright/test');

test.describe('Authentication Page Smoke Tests', () => {

    test('Login page should load correctly', async ({ page }) => {
        await page.goto('/login');
        // Wait for loader to disappear
        await expect(page.getByText('Memuat...')).not.toBeVisible();

        await expect(page).toHaveTitle(/Masuk ke Sistem/i);
        // Heading might be h3 or div in CardTitle, so getByRole might be strict. Relaxing to getByText for title.
        await expect(page.getByText('Masuk ke Sistem', { exact: true })).toBeVisible();

        // Using placeholders as they are explicit in the source
        await expect(page.getByPlaceholder('nama@perusahaan.com')).toBeVisible();
        await expect(page.getByPlaceholder('Masukkan kata sandi')).toBeVisible();
    });

    test('Registration page should load correctly', async ({ page }) => {
        await page.goto('/register');
        // Register page might not have specific title set, or it loads dynamically.
        // Checking for key elements is enough for smoke test.
        await expect(page.getByText('Buat Akun Baru', { exact: true })).toBeVisible();
        await expect(page.getByPlaceholder('Masukkan nama lengkap')).toBeVisible();
    });

    test('Login button should be disabled with empty fields', async ({ page }) => {
        await page.goto('/login');
        await expect(page.getByText('Memuat...')).not.toBeVisible();
        await expect(page.getByRole('button', { name: /Masuk/i })).toBeDisabled();
    });

});
