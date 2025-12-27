const { test, expect } = require('@playwright/test');

test.describe('Reporting Workflow', () => {
    const inspectionId = '17acbf0d-4f85-4924-aa5b-4b0bdcf3f8cb';
    const reportTitle = `E2E Report ${Date.now()}`;

    test('Full Reporting Flow: Inspector -> Admin Team -> Project Lead', async ({ page, context }) => {
        test.setTimeout(180000); // 3 minutes

        // Create a fresh state
        await context.clearCookies();

        page.on('console', msg => {
            console.log(`[BROWSER]: ${msg.text()}`);
        });

        // --- STEP 1: Inspector Submits Report ---
        console.log('Step 1: Inspector submitting report');
        await page.goto('/login', { waitUntil: 'commit' });
        await page.waitForSelector('#email', { timeout: 60000 });

        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        // We don't reload here, just rely on subsequent navigation if needed
        // or just proceed with fill which should work if login page is clean

        await page.fill('#email', 'inspector.struktur@slf.com');
        await page.fill('#password', 'testpassword123');
        await page.click('button:has-text("Masuk")');

        console.log('Waiting for redirect...');
        // Wait for URL to NOT be /login
        await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 60000 });
        console.log(`Current URL: ${page.url()}`);

        if (page.url().includes('awaiting-approval')) {
            console.error('❌ User is stuck in awaiting-approval!');
            throw new Error('User stuck in awaiting-approval');
        }

        console.log('✅ Logged in (or redirected)');

        await page.goto(`/dashboard/inspector/reports/new?inspectionId=${inspectionId}`);
        await page.waitForSelector('#title', { timeout: 30000 });
        console.log('Filling report data...');
        await page.fill('#title', reportTitle);
        await page.fill('#findings', 'Temuan E2E: Struktur bangunan dalam kondisi baik namun perlu pengecatan ulang.');
        await page.fill('#recommendations', 'Rekomendasi E2E: Lakukan pengecatan ulang pada dinding sisi utara.');

        console.log('Submitting report...');
        await page.click('button:has-text("Review & Submit")');
        await page.click('button:has-text("Submit ke Admin")');

        await page.waitForURL('**/dashboard/inspector/reports/*', { timeout: 60000 });
        console.log('✅ Inspector submitted report');

        // Cleanup
        await context.clearCookies();
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

        // --- STEP 2: Admin Team Verifies Report ---
        console.log('Step 2: Admin Team verifying report');
        await page.goto('/login');
        await page.fill('#email', 'admin-team@slf.com');
        await page.fill('#password', 'testpassword123');
        await page.click('button:has-text("Masuk")');
        await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 60000 });
        console.log(`Current URL Admin Team: ${page.url()}`);

        await page.goto('/dashboard/admin-team/reports');
        await page.fill('input[placeholder*="Cari Laporan"]', reportTitle);
        await page.waitForTimeout(2000);

        console.log('Looking for Verify button...');
        const verifyBtn = page.getByRole('button', { name: 'Verifikasi berkas' }).first();
        await expect(verifyBtn).toBeVisible({ timeout: 20000 });
        await verifyBtn.click();

        console.log('Confirming verification...');
        await page.click('button:has-text("Konfirmasi verifikasi")');
        await page.waitForTimeout(2000);
        console.log('✅ Admin Team verified report');

        // Cleanup
        await context.clearCookies();
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

        // --- STEP 3: Project Lead Approves Report ---
        console.log('Step 3: Project Lead approving report');
        await page.goto('/login');
        await page.fill('#email', 'project_lead@test.com');
        await page.fill('#password', 'testpassword123');
        await page.click('button:has-text("Masuk")');
        await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 60000 });
        console.log(`Current URL Project Lead: ${page.url()}`);

        await page.goto('/dashboard/project-lead/reports');
        await page.fill('input[placeholder*="Cari laporan"]', reportTitle);
        await page.waitForTimeout(2000);

        console.log('Looking for Approve button...');
        const approveBtn = page.getByRole('button', { name: 'Setujui' }).first();
        await expect(approveBtn).toBeVisible({ timeout: 20000 });
        await approveBtn.click();

        console.log('Confirming approval...');
        await page.click('button:has-text("Ya, setujui")');
        await page.waitForTimeout(2000);

        await expect(page.getByText('Disetujui')).toBeVisible({ timeout: 20000 });
        console.log('✅ Project Lead approved report');
        console.log('--- ALL STEPS PASSED ---');
    });
});
