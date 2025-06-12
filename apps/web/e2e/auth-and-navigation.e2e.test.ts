import { test, expect } from '@playwright/test';

test.describe('Full User Journey (Happy Path)', () => {
  test('should allow a user to log in, view the dashboard, and see the leaderboard', async ({ page }) => {
    // --- 1. Start at the Login Page with MSW enabled ---
    await page.goto('/?msw=true');

    // Wait for MSW to be ready and username to be generated
    await page.waitForTimeout(2000);

    // Assert that we are on the login page and the initial username is generated.
    // MSW will intercept the /api/generate-username call and return "mocked-user-123".
    await expect(page.getByText('Continue as mocked-user-123')).toBeVisible();

    // --- 2. Log In ---
    // Click the login button. The page will call the login function, which
    // makes a POST to /api/users/get-or-create. MSW will intercept this.
    await page.getByRole('button', { name: /Continue as mocked-user-123/ }).click();

    // --- 3. View the Dashboard ---
    // Assert that navigation to the dashboard was successful.
    await expect(page).toHaveURL('/dashboard');
    
    // Check for a key element on the dashboard to confirm it loaded.
    await expect(page.getByRole('heading', { name: /Welcome, mocked-user-123/ })).toBeVisible();
    await expect(page.getByText('Your journey to mastering AP Statistics starts here.')).toBeVisible();

    // --- 4. Navigate to Leaderboard ---
    // Find and click the leaderboard link.
    await page.getByRole('link', { name: '🏆 Leaderboard' }).click();

    // --- 5. View the Leaderboard ---
    // Assert that we are on the leaderboard page.
    await expect(page).toHaveURL('/leaderboard');

    // Check that the leaderboard loaded correctly by looking for data from our MSW handler.
    // Our MSW handler for /api/leaderboard returns "MSW-Champion" as the top user.
    await expect(page.getByRole('heading', { name: '🏆 Leaderboard' })).toBeVisible();
    await expect(page.getByText('MSW-Champion')).toBeVisible();
    await expect(page.getByText('TestMaster')).toBeVisible();
    
    // Verify the current user appears in the leaderboard
    await expect(page.getByText('mocked-user-123')).toBeVisible();
  });

  test('should handle username generation and custom username input', async ({ page }) => {
    // --- 1. Start at Login Page with MSW enabled ---
    await page.goto('/?msw=true');
    
    // Wait for MSW to be ready and username to be generated
    await page.waitForTimeout(2000);
    await expect(page.getByText('Continue as mocked-user-123')).toBeVisible();
    
    // --- 2. Generate New Username ---
    // Click the "Generate New" button to get a different username
    await page.getByRole('button', { name: /Generate New/ }).click();
    
    // Wait for the new username to be generated
    await page.waitForTimeout(1000);
    
    // MSW should return the same mocked username for consistency
    await expect(page.getByText('Continue as mocked-user-123')).toBeVisible();
    
    // --- 3. Use Custom Username ---
    // Switch to custom username input
    await page.getByRole('button', { name: /Continue with Custom Name/ }).click();
    
    // Enter a custom username
    const customUsername = 'E2E-TestUser';
    await page.getByPlaceholder('Enter your username').fill(customUsername);
    
    // Login with custom username
    await page.getByRole('button', { name: /Login/ }).click();
    
    // --- 4. Verify Dashboard with Custom Username ---
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome, ${customUsername}`) })).toBeVisible();
  });

  test('should navigate back from leaderboard to dashboard', async ({ page }) => {
    // --- 1. Complete login flow with MSW enabled ---
    await page.goto('/?msw=true');
    
    // Wait for MSW to be ready
    await page.waitForTimeout(2000);
    await expect(page.getByText('Continue as mocked-user-123')).toBeVisible();
    await page.getByRole('button', { name: /Continue as mocked-user-123/ }).click();
    await expect(page).toHaveURL('/dashboard');
    
    // --- 2. Go to leaderboard ---
    await page.getByRole('link', { name: '🏆 Leaderboard' }).click();
    await expect(page).toHaveURL('/leaderboard');
    
    // --- 3. Navigate back to dashboard ---
    await page.getByRole('link', { name: '← Back to Dashboard' }).click();
    await expect(page).toHaveURL('/dashboard');
    
    // Verify we're back on the dashboard
    await expect(page.getByRole('heading', { name: /Welcome, mocked-user-123/ })).toBeVisible();
  });
}); 