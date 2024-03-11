import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({
    defaultViewport: null,
    devtools: true,
    headless: false,
    slowMo: 250,
  });

  const page = await browser.newPage();
  const jsonString = fs.readFileSync('iphone-list.json');
  const urls = JSON.parse(jsonString);
  let skus = [];
  let _urls = [];

  page.on('framenavigated', frame => {
    // Capture the new URL and add it to the array
    const newURL = frame.url();
    _urls.push(newURL);
  });

  for (const urlData of urls) {
    const url = urlData.url;

    await page.goto(url);
    try {
      await page.waitForSelector('.product-detail', { timeout: 40000 });
    } catch (error) {
      console.log('Timeout exceeded while waiting for .product-detail');
      continue;
    }

    await page.evaluate(() => {
      const productDetail = document.querySelector('.product-detail');
      if (productDetail) {
        productDetail.scrollIntoView();
      } else {
        console.log('.product-detail element not found.');
      }
    });

    const sections = await page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll('.product-detail .mb-s.pb-xs.md-pb-0'));
      return sections.map(section => {
        const title = section.querySelector('div:first-child').textContent.trim();
        const values = Array.from(section.querySelectorAll('.selector')).map(value => value.textContent.trim());
        return { title, values };
      });
    });

    const possibilities = [];
    function onlyUnique(value, index, array) {
      return array.indexOf(value) === index;
    }
    function getCombinations(sections, index, combination) {
      if (index === sections.length) {
        possibilities.push(combination.join(', '));
        return;
      }
      for (const value of sections[index].values) {
        getCombinations(sections, index + 1, [...combination, value]);
      }
    }
    getCombinations(sections, 0, []);

    for (const possibility of possibilities) {
      const sku = await page.evaluate((possibility) => {
        possibility.split(',').forEach((pos) => {
          const div = [...document.querySelectorAll(".product-detail .selector")].find(d => d.textContent.trim() == pos.trim())
          if (div) div.click();  
        })
      }, possibility);
    }

    skus = _urls.map((u) => {
      const match = u.match(/id=([^\&]+)/)
      return match ? match[1] : null
    }).filter(onlyUnique)
  }
  
  fs.appendFileSync('skus.txt', skus.join('\n') + '\n');
  await browser.close();
})();
