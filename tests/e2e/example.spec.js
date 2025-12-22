const { test, expect } = require('@playwright/test');

test('has title', async ({ page }) => {
    await page.goto('/login');

    // Check if the page title contains "SLF ONE" or relevant app name
    // Adjust this based on your actual metadata
    await expect(page).toHaveTitle(/SLF ONE|Login/i);
});

test('login page has inputs', async ({ page }) => {
    await page.goto('/login');

    // Expect email and password fields to be visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Expect login button to be visible
    await expect(page.getByRole('button', { name: /masuk|login|sign in/i })).toBeVisible();
});
