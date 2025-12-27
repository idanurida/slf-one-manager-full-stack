const { test, expect } = require('@playwright/test');

test.describe('Project Management Workflow (Admin Lead)', () => {
    test('Admin Lead should be able to create a new project', async ({ page }) => {
        page.on('console', msg => {
            const text = msg.text();
            if (text.startsWith('DEBUG') || text.startsWith('BROWSER')) {
                console.log(`[BROWSER]: ${text}`);
            }
        });
        page.on('pageerror', err => console.log(`[BROWSER ERROR]: ${err.message}`));

        console.log('--- START TEST ---');

        // 1. Login
        await page.goto('/login');
        await page.fill('#email', 'admin_lead@test.com');
        await page.fill('#password', 'Password123!');
        await page.click('button:has-text("Masuk")');

        await page.waitForURL('**/dashboard/admin-lead', { timeout: 30000 });
        console.log('✅ Auth success');

        // 2. Navigate
        await page.click('text=Proyek Baru');
        await page.waitForURL('**/dashboard/admin-lead/projects/new', { timeout: 30000 });
        console.log('✅ On New Project page');

        // 3. Step 0: Basic Info
        await page.waitForSelector('#name', { timeout: 30000 });
        console.log('Filling Step 0');
        await page.fill('#name', 'E2E Test Proyek ' + Date.now());

        // Category Select - match placeholder or current value
        await page.getByRole('combobox').nth(0).click();
        await page.waitForSelector('[role="option"]', { timeout: 5000 });
        await page.click('[role="option"]:has-text("SLF")');

        // Type Select
        await page.waitForTimeout(1000);
        await page.getByRole('combobox').nth(1).click();
        await page.waitForSelector('[role="option"]', { timeout: 5000 });
        await page.click('[role="option"]:has-text("Permohonan Baru")');

        await page.fill('#location', 'Jl. Sudirman No 1');
        await page.fill('#city', 'Jakarta Pusat');

        await page.click('button:has-text("Langkah Berikutnya")');
        console.log('✅ Step 0 Done');

        // 4. Step 1: Client
        console.log('Waiting for Step 1...');
        await page.waitForSelector('text=Kepemilikan Proyek', { timeout: 30000 });
        const clientTrigger = page.getByRole('combobox').filter({ hasText: /Hubungkan Dengan Database Klien|Pilih Klien/i });
        await clientTrigger.click();
        await page.waitForSelector('[role="option"]', { timeout: 5000 });
        await page.click('[role="option"]:nth-child(1)');
        await page.click('button:has-text("Langkah Berikutnya")');
        console.log('✅ Step 1 Done');

        // 5. Step 2: Timeline
        console.log('Waiting for Step 2...');
        await page.waitForSelector('text=Alur Kerja Timeline', { timeout: 30000 });
        await page.click('button:has-text("Langkah Berikutnya")');
        console.log('✅ Step 2 Done');

        // 6. Step 3: Team
        console.log('Waiting for Step 3...');
        await page.waitForSelector('text=Infrastruktur Tim', { timeout: 30000 });

        // Lead
        console.log('Selecting Lead...');
        await page.getByRole('combobox').filter({ hasText: /Project Lead/i }).click();
        await page.waitForSelector('[role="option"]', { timeout: 5000 });
        await page.click('[role="option"]:nth-child(1)');

        // Admin
        console.log('Selecting Admin...');
        await page.getByRole('combobox').filter({ hasText: /Admin Team/i }).click();
        await page.waitForSelector('[role="option"]', { timeout: 5000 });
        await page.click('[role="option"]:nth-child(1)');

        // Inspector
        console.log('Selecting Inspector...');
        await page.getByRole('combobox').filter({ hasText: /Inspe[ck]tor/i }).click();
        await page.waitForSelector('[role="option"]', { timeout: 5000 });
        await page.click('[role="option"]:nth-child(1)');

        await page.click('button:has-text("Langkah Berikutnya")');
        console.log('✅ Step 3 Done');

        // 7. Step 4: Confirmation
        console.log('Waiting for Step 4...');
        await page.waitForSelector('text=Review Akhir', { timeout: 30000 });
        await page.click('button:has-text("Luncurkan Proyek")');
        console.log('✅ Form Submitted');

        // 8. Verification
        console.log('Verifying success redirect...');
        await page.waitForURL('**/dashboard/admin-lead/projects/*', { timeout: 60000 });
        await expect(page.getByText('Proyek berhasil dibuat!')).toBeVisible();
        console.log('--- TEST PASSED ---');
    });
});
