import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    defaultViewport: null,
    devtools: true,
    headless: false,
    slowMo: 250, // fpr slowing the puppeteer pace
  });

  const page = await browser.newPage();
  
  await page.goto('https://uk.webuy.com/product-detail?id=sappi14pr128gsbunlb&categoryName=phones-iphone&superCatName=phones&title=apple-iphone-14-pro-128gb-space-black-unlocked-b&queryID=094880363955d5956df9c6ab3f6d7fd7&position=1');
  await page.waitForSelector('.product-detail');
  
  await page.waitForSelector('#onetrust-banner-sdk');
  await page.click('#onetrust-accept-btn-handler');

  await page.evaluate(() => {
    const productDetail = document.querySelector('.product-detail');
    productDetail.scrollIntoView();
  });
  
  const possibilities = [];
  const sections = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll('.product-detail .mb-s.pb-xs.md-pb-0'));
    return sections.map(section => {
      const title = section.querySelector('div:first-child').textContent.trim();
      const values = Array.from(section.querySelectorAll('.selector')).map(value => value.textContent.trim());
      return { title, values };
    });
  });
  
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
  
  let SKUs = [];
  for (const possibility of possibilities) {
    SKUs.push(
      await page.evaluate((possibility) => {
        possibility.split(',').forEach((pos) => {
          const div = [...document.querySelectorAll(".product-detail .selector")].find(d => d.textContent.trim() == pos.trim())
          if (div) div.click();  
        })

        let searchQuery = new URLSearchParams(window.location.search);
        return searchQuery.get("id");
      }, possibility)
    );
  }

  SKUs = SKUs.filter(onlyUnique)
  
  // outcome
  console.log(possibilities);
  console.log(SKUs);
  
  await browser.close();

})();
