const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const searchStreet = "Nackenheimer Weg 7b";
const searchZip = "12099";
const searchCity = "Berlin";
const targetAddress = `${searchStreet}, ${searchZip} ${searchCity}`;

(async () => {
    // headless: false -> Du siehst den Browser aufploppen und den Bot tippen!
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--window-size=1920,1080'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1440, height: 900 });

    console.log('\n🔵 --- Starte ImmoScout24 Scraping (LOKALER TEST) ---');

    try {
        await page.goto('https://atlas.immobilienscout24.de/', { waitUntil: 'domcontentloaded' });

        // Cookie Banner wegklicken
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.evaluate(() => {
                const ucRoot = document.querySelector('#usercentrics-root');
                if (ucRoot && ucRoot.shadowRoot) {
                    const acceptBtn = ucRoot.shadowRoot.querySelector('button[data-testid="uc-accept-all-button"]');
                    if (acceptBtn) acceptBtn.click();
                }
            });
            console.log('🍪 Cookie-Banner verarbeitet.');
        } catch (err) { console.log('🍪 Kein Cookie-Banner gefunden oder blockiert nicht.'); }

        // Adresseingabe
        console.log(`🏠 Gebe Adresse ein: ${targetAddress}`);
        const searchInputSelector = '#search-input';
        await page.waitForSelector(searchInputSelector);
        await page.click(searchInputSelector, { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type(searchInputSelector, targetAddress, { delay: 100 });

        // Dropdown
        const suggestionsSelector = 'div[data-qa="suggestions"]';
        await page.waitForSelector(suggestionsSelector, { visible: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        const specificSuggestion = `${suggestionsSelector} ::-p-text(${targetAddress})`;
        try {
            await page.waitForSelector(specificSuggestion, { timeout: 3000 });
            await page.click(specificSuggestion);
            console.log('🖱️ Adresse aus Dropdown ausgewählt.');
        } catch (err) {
            console.log('⚠️ Spezifischer Dropdown-Eintrag nicht gefunden, drücke Enter.');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
        }

        // Submit
        const submitBtnSelector = 'button[data-qa="submit-search"]';
        await page.waitForSelector(submitBtnSelector);

        console.log('🚀 Starte Suche...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click(submitBtnSelector)
        ]);

        // Preis auslesen
        const priceSelector = '.PricePerMeter__pricePerMeterLarge';
        await page.waitForSelector(priceSelector, { timeout: 10000 });
        const rawPrice = await page.$eval(priceSelector, element => element.textContent);
        const cleanImmoPrice = rawPrice.replace('€', '').trim();

        console.log(`\n✅ [ImmoScout] BÄM! Preis gefunden: ${cleanImmoPrice} €/m²\n`);

    } catch (err) {
        console.log('\n❌ [ImmoScout] Fehler aufgetreten:', err.message);
    }

    // Ich lasse den Browser hier absichtlich 10 Sekunden offen, damit du das Ergebnis sehen kannst, bevor er schließt
    await new Promise(resolve => setTimeout(resolve, 10000));
    // await browser.close();
})();