// scrapers/homeday.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const scrapeHomeday = async (data) => {
    const { street, zip, city, livingSpace } = data;
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--single-process',
                '--no-zygote',
                '--window-size=1920,1080'
            ],
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1440, height: 900 });

        const addressQuery = `${street}, ${zip}`.replace(/ /g, '+');
        const homedayUrl = `https://www.homeday.de/de/preisatlas/${city.toLowerCase()}/${addressQuery}?map_layer=standard&marketing_type=sell&property_type=apartment`;

        console.log(homedayUrl);
        

        console.log(`[Homeday] Navigiere zu: ${homedayUrl}`);
        await page.goto(homedayUrl, { waitUntil: 'networkidle2' });

        const addressSelector = '.address-side';
        await page.waitForSelector(addressSelector, { timeout: 10000 });
        const scrapedAddress = await page.$eval(addressSelector, el => el.textContent.trim().replace(/\s+/g, ' '));

        const priceSelector = '.price-block__price__average';
        await page.waitForSelector(priceSelector, { timeout: 10000 });
        const rawPrice = await page.$eval(priceSelector, el => el.textContent);

        const cleanPrice = rawPrice.replace(/[^0-9]/g, '');

        console.log(`[Homeday] Erfolgreich: ${cleanPrice} €/m²`);

        const pricePerSqm = parseInt(cleanPrice, 10);

        return {
            success: true,
            platform: "homeday",
            pricePerSqm: pricePerSqm,
            // WICHTIG: Das hier braucht die index.js für die Berechnung!
            totalPrice: pricePerSqm * livingSpace,
            verifiedAddress: scrapedAddress
        };

    } catch (error) {
        console.error('[Homeday] Fehler:', error.message);
        return {
            success: false,
            platform: "homeday",
            errorType: "SCRAPE_FAILED",
            message: error.message
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

// GANZ WICHTIG: Wir exportieren die Funktion, damit index.js sie nutzen kann!
module.exports = { scrapeHomeday };