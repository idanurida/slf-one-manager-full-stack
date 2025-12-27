const { chromium } = require('@playwright/test');
const path = require('path');

async function takeScreenshot() {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Navigating to login...');
        await page.goto('http://localhost:3000/login');

        console.log('Logging in...');
        await page.getByLabel('Alamat Email').fill('admin_lead@test.com');
        await page.getByLabel('Kata Sandi').fill('Password123!');
        await page.getByRole('button', { name: 'Masuk' }).click();

        await page.waitForURL('**/dashboard/admin-lead');

        console.log('Navigating to projects/new...');
        await page.goto('http://localhost:3000/dashboard/admin-lead/projects/new');

        // Wait for page to settle
        await page.waitForTimeout(10000);

        const screenshotPath = path.resolve('project-new-debug.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log('✅ Screenshot saved to:', screenshotPath);

        const bodyText = await page.innerText('body');
        console.log('Body Text snippet:', bodyText.slice(0, 200));

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await browser.close();
    }
}

takeScreenshot();
