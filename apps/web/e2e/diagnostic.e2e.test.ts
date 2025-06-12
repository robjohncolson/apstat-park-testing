import { test, expect } from '@playwright/test';

test.describe('Diagnostic Tests', () => {
  test('should load the application with MSW enabled and show mocked content', async ({ page }) => {
    // Navigate to the app with MSW enabled
    await page.goto('/?msw=true');
    
    // Wait for MSW to start and username to be generated
    await page.waitForTimeout(3000);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/diagnostic-msw-screenshot.png' });
    
    // Log the page title and URL
    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());
    
    // Log all text content on the page
    const bodyText = await page.locator('body').textContent();
    console.log('Page content:', bodyText);
    
    // Check if the page loaded at all
    await expect(page.locator('body')).toBeVisible();
    
    // Look for MSW-specific content
    const hasMockedUsername = await page.getByText('mocked-user-123').count() > 0;
    console.log('Has mocked username (MSW working):', hasMockedUsername);
    
    // Check if there are any buttons on the page
    const buttons = await page.locator('button').count();
    console.log('Number of buttons:', buttons);
    
    if (buttons > 0) {
      for (let i = 0; i < buttons; i++) {
        const buttonText = await page.locator('button').nth(i).textContent();
        console.log(`Button ${i}:`, buttonText);
      }
    }
    
    // Check for console messages that might indicate MSW status
    page.on('console', msg => {
      if (msg.text().includes('MSW') || msg.text().includes('worker')) {
        console.log('MSW-related console message:', msg.text());
      }
    });
  });
  
  test('should compare MSW vs non-MSW behavior', async ({ page }) => {
    console.log('=== Testing WITHOUT MSW ===');
    
    // First, test without MSW
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const nonMswButtons = await page.locator('button').count();
    const nonMswContent = await page.locator('body').textContent();
    
    console.log('Non-MSW buttons:', nonMswButtons);
    console.log('Non-MSW has mocked-user-123:', nonMswContent?.includes('mocked-user-123'));
    
    if (nonMswButtons > 0) {
      const firstButtonText = await page.locator('button').first().textContent();
      console.log('Non-MSW first button:', firstButtonText);
    }
    
    console.log('=== Testing WITH MSW ===');
    
    // Now test with MSW
    await page.goto('/?msw=true');
    await page.waitForTimeout(3000);
    
    const mswButtons = await page.locator('button').count();
    const mswContent = await page.locator('body').textContent();
    
    console.log('MSW buttons:', mswButtons);
    console.log('MSW has mocked-user-123:', mswContent?.includes('mocked-user-123'));
    
    if (mswButtons > 0) {
      const firstButtonText = await page.locator('button').first().textContent();
      console.log('MSW first button:', firstButtonText);
    }
    
    // The key test: MSW should show mocked-user-123, non-MSW should not
    const mswWorking = mswContent?.includes('mocked-user-123') && !nonMswContent?.includes('mocked-user-123');
    console.log('MSW is working correctly:', mswWorking);
  });
}); 