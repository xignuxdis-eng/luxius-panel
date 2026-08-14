const { chromium } = require('@playwright/test');

(async () => {
  console.log('Starting Playwright test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for all console logs
  page.on('console', msg => console.log(`PAGE LOG [${msg.type()}]: ${msg.text()}`));
  
  // Handle dialogs (alerts)
  page.on('dialog', async dialog => {
    console.log(`DIALOG: ${dialog.message()}`);
    await dialog.accept();
  });

  try {
    // Determine URL to test (github pages or localhost)
    await page.goto('https://xignuxdis-eng.github.io/luxius-panel/', { waitUntil: 'networkidle' });
    console.log('Navigated to site');
    
    // Login if needed (github pages might require it depending on state, but let's see if we can bypass or if it's auto)
    await page.waitForTimeout(2000);
    
    await page.click('.main-content').catch(() => console.log('Could not click .main-content'));
    
    console.log('Clicking Nuevo Pedido...');
    await page.hover('text=+ Nuevo Pedido');
    await page.click('text=+ Nuevo Pedido');
    await page.waitForTimeout(1000);

    // Selects
    await page.click('select[name="clienteId"]');
    await page.selectOption('select[name="clienteId"]', '1');
    
    console.log('Selecting Material VV...');
    await page.click('select[name="material"]');
    await page.selectOption('select[name="material"]', 'VV');
    
    console.log('Uploading file...');
    // Use an existing test PDF on the system
    const pdfPath = 'F:\\XignuX Print Den\\test_multipage.pdf';
    await page.setInputFiles('input[type="file"]', pdfPath);
    
    await page.waitForTimeout(2000);
    
    console.log('Clicking EXPLOTAR PDF...');
    // Use partial text match because the number of pages might vary
    await page.click('button:has-text("EXPLOTAR PDF")').catch(async () => {
        console.log('Could not find EXPLOTAR PDF by text, trying alternative selector');
        await page.click('text=EXPLOTAR PDF');
    });
    
    // Wait for explosion to finish
    console.log('Waiting for explosion...');
    await page.waitForTimeout(5000);
    
    // Try to save
    console.log('Clicking Cargar items...');
    await page.click('button:has-text("Cargar")').catch(async () => {
        await page.click('text=Cargar');
    });
    
    await page.waitForTimeout(3000);
    console.log('Test completed successfully');
  } catch (e) {
    console.error('Test failed:', e);
  } finally {
    await browser.close();
  }
})();
