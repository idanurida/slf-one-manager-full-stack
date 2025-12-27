const { test, expect } = require('@playwright/test');

test.describe('Inspector Photogeotagging Checklist', () => {
    const inspectionId = '17acbf0d-4f85-4924-aa5b-4b0bdcf3f8cb';
    const inspectorEmail = 'inspector.struktur@slf.com';
    const password = 'testpassword123';

    test.beforeEach(async ({ page, context }) => {
        // Increase default timeout for this hook
        test.setTimeout(90000);

        // Grant geolocation permissions
        await context.grantPermissions(['geolocation'], { origin: 'http://localhost:3000' });

        // Set mocked geolocation
        await context.setGeolocation({
            latitude: -6.2088,
            longitude: 106.8456
        });

        // Login
        console.log('Navigating to login...');
        await page.goto('/login', { waitUntil: 'commit' });

        console.log('Waiting for login form to appear...');
        await page.waitForSelector('#email', { timeout: 60000 });
        await page.fill('#email', inspectorEmail);
        await page.fill('#password', password);
        await page.click('button[type="submit"]');

        // Wait for redirect to dashboard
        console.log('Waiting for redirection to dashboard...');
        await page.waitForURL('**/dashboard/inspector', { timeout: 60000 });
    });

    test('should be able to capture a geotagged photo for a checklist item', async ({ page }) => {
        test.setTimeout(120000);

        // Navigate to checklist
        console.log('Navigating to checklist...');
        await page.goto(`/dashboard/inspector/inspections/${inspectionId}/checklist`, { waitUntil: 'networkidle' });

        // Wait for content to load
        await page.waitForSelector('text=Monitoring Checklist', { timeout: 45000 });

        // Select "TATA BANGUNAN" category
        console.log('Selecting category...');
        const categoryBtn = page.locator('button').filter({ hasText: /TATA[_ ]BANGUNAN/i }).first();
        await categoryBtn.click();

        // Find the "Fungsi Bangunan Gedung" item and click "Ambil Foto"
        console.log('Opening camera dialog...');
        const itemCard = page.locator('div.group', { hasText: 'Fungsi Bangunan Gedung' }).first();
        await itemCard.scrollIntoViewIfNeeded();
        await itemCard.locator('button', { hasText: 'Ambil Foto' }).click();

        // Verify Camera Dialog opens
        await expect(page.locator('text=Visual Evidence')).toBeVisible();

        // The CameraGeotagging component is rendered in the dialog
        // It might show "Mencari GPS..." then "GPS Aktif: ±...m"
        // Wait for GPS active status
        await expect(page.locator('text=GPS Aktif')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=106.8456')).toBeVisible();

        // Simulate photo selection (since we can't easily trigger the camera shutter in headless)
        // We click "Manual" then "Pilih File" in the component's manual mode
        // Wait for Manual button and click
        const manualBtn = page.locator('button', { hasText: 'Manual' });
        await manualBtn.waitFor({ state: 'visible', timeout: 10000 });
        await manualBtn.click({ force: true });

        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('button:has-text("Pilih File / Galeri")');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles('tests/fixtures/test-image.jpg');

        // After selection, it should go to preview mode
        await expect(page.locator('text=Keterangan (Caption)')).toBeVisible();

        // Fill caption
        await page.fill('input[placeholder*="Contoh: Retakan"]', 'Test photo for photogeotagging E2E');

        // Save the photo
        await page.click('button:has-text("Setuju & Simpan")');

        // Verify success toast/badge
        await expect(page.locator('text=1 Foto Tersimpan')).toBeVisible({ timeout: 15000 });

        // Close camera dialog
        await page.click('button:has-text("Close Camera")');

        // Final check: the record should exist in DB (optional since we verified UI state change)
        // But let's verify the button text changed back in the main view
        await expect(itemCard.locator('button:has-text("1 Foto Tersimpan")')).toBeVisible();
    });
});
