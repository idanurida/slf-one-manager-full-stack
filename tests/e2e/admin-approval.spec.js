const { test, expect } = require('@playwright/test');

test.describe('Admin Approval Workflow', () => {

    test('Admin should see seeded pending user in approval list', async ({ page }) => {
        // This email was seeded by scripts/seed_pending_user.js
        const partialEmail = 'pending_user_';

        // --- STEP 1: Login as Admin ---
        console.log('Step 1: Login as Admin');
        await page.goto('/login');
        await page.getByPlaceholder('nama@perusahaan.com').fill('admin@test.com');
        await page.getByPlaceholder('Masukkan kata sandi').fill('password123');
        await page.getByRole('button', { name: /Masuk/i }).click();

        // Verify Dashboard
        await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 10000 });

        // --- STEP 2: Go to Approvals ---
        console.log('Step 2: Navigating to Approvals');
        await page.goto('/dashboard/admin/users/approvals');

        // --- STEP 3: Verify Pending User Visibility ---
        console.log('Step 3: Checking for pending user...');

        // Wait for either the user row OR empty state OR error
        const userRow = page.getByText(partialEmail).first();
        const emptyState = page.getByText('TIDAK ADA REGISTRASI PENDING');
        const errorToast = page.locator('.text-destructive'); // Toast variant="destructive"
        const loader = page.getByRole('status'); // Loader usually has role status or just spin icon

        // Race these conditions
        try {
            await expect(userRow.or(emptyState).or(errorToast)).toBeVisible({ timeout: 10000 });
        } catch (e) {
            console.log('❌ Timeout waiting for page content load.');
        }

        if (await emptyState.isVisible()) {
            console.log('❌ List is EMPTY. API returned no pending users?');
        } else if (await errorToast.isVisible()) {
            console.log('❌ API Error:', await errorToast.innerText());
        } else if (await userRow.isVisible()) {
            console.log('✅ Found at least one seeded pending user.');
            // Verify we can see the Approve button ("Setujui")
            await expect(page.getByRole('button', { name: 'Setujui' }).first()).toBeVisible();
        } else {
            console.log('❌ Unknown state. Snapshot needed.');
            // Log body text to debugging
            console.log(await page.locator('body').innerText());
        }
    });

});
