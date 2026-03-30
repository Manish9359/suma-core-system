const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    logs.push({ type: 'pageerror', text: err.message });
  });

  await page.goto('http://localhost:8080/settings', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));
  
  fs.writeFileSync('browser_logs.json', JSON.stringify(logs, null, 2), 'utf8');
  await browser.close();
})();
