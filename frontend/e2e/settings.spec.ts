import { test, expect } from '@playwright/test';

test.describe('E2E Full Flow: Auth and Workspaces', () => {
  test('should login, navigate to workspaces, and create a workspace', async ({ page }) => {
    // 1. Log in
    await page.goto('/sign-in');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to home, but if it fails, capture the error text
    try {
      await expect(page).toHaveURL(/\/settings\/home/, { timeout: 3000 });
    } catch (e) {
      const errorText = page.locator('.text-destructive');
      if (await errorText.isVisible()) {
        console.error("Login Error UI Text:", await errorText.textContent());
      }
      throw e;
    }

    // 2. Navigate to Workspaces directly to bypass scope switcher logic in E2E
    await page.goto('/settings/workspaces');

    // Wait for network/page load
    await expect(page).toHaveURL(/\/settings\/workspaces/);
    
    // Check page heading (The workspaces page renders an h1 "Workspaces")
    await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible();

    // 3. Create Workspace
    const createBtn = page.getByRole('button', { name: /Create workspace/i });
    await createBtn.click();

    // Fill the name
    // It's a new page. Let's wait for the input.
    const uniqueName = `QA Test Workspace ${Date.now()}`;
    const nameInput = page.getByPlaceholder('Name', { exact: true });
    await expect(nameInput).toBeVisible();
    await nameInput.fill(uniqueName);
    
    // Click submit/save
    const saveBtn = page.getByRole('button', { name: /Save|Create/i });
    await saveBtn.click();

    // Wait for redirect back to workspaces list
    await expect(page).toHaveURL(/\/settings\/workspaces/);

    // Verify the newly created workspace is visible in the table (or wait for it)
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });
  });
});
