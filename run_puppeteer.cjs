const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  const browserErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      browserErrors.push(msg.text() + " args: " + msg.args().map(a => a._remoteObject?.description).join(' '));
    }
  });
  page.on('pageerror', err => {
    browserErrors.push(err.message + "\n" + err.stack);
  });

  // Login sequence
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle0' });
  await page.type('#email', 'admin@erp.com');
  await page.type('#password', 'admin123');
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // Clear errors to focus on settings
  browserErrors.length = 0;
  
  await page.goto('http://localhost:8080/settings', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  require('fs').writeFileSync('react_error.txt', browserErrors.join('\n\n'));
  await browser.close();
})();
