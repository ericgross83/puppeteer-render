// scrapers/check24.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const scrapeCheck24 = async (data) => {
    // Variablen aus dem API-Call entpacken (mit Standardwerten als Fallback)
    const {
        street,
        houseNumber,
        zip,
        livingSpace = '40',
        yearOfConstruction = '1990',
        rooms = '3'
    } = data;

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true, // WICHTIG: Für Railway muss das auf true stehen!
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--single-process',
                '--no-zygote',
                '--window-size=1920,1080'
            ],
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });

        console.log(`\n[Check24] Starte Scraping für: ${street} ${houseNumber}, ${zip}`);

        // 1. Navigation
        await page.goto('https://www.check24.de/baufinanzierung/immobilienbewertung/', { waitUntil: 'domcontentloaded' });

        // 2. Cookie Banner
        try {
            await new Promise(r => setTimeout(r, 2000));
            const cookieClicked = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('.c24-cookie-consent-button, .c24-cookie-consent-buttonlink'));
                const targetTexts = ['geht klar', 'auswahl speichern', 'akzeptieren', 'zustimmen'];
                for (const btn of buttons) {
                    if (targetTexts.some(t => btn.textContent.toLowerCase().includes(t))) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });
            if (cookieClicked) await new Promise(r => setTimeout(r, 1500));
        } catch (err) { }

        // 3. Typ: Eigentumswohnung
        const typSelector = 'input[name="propertyType"][value="1"]';
        await page.waitForSelector(typSelector, { state: 'attached' });
        await page.evaluate((sel) => {
            const radio = document.querySelector(sel);
            if (radio && radio.closest('label')) radio.closest('label').click();
        }, typSelector);
        await new Promise(r => setTimeout(r, 500));

        // 4. "zur Immobilienbewertung"
        const check24SubmitBtn = 'button::-p-text(zur Immobilienbewertung)';
        await page.waitForSelector(check24SubmitBtn, { visible: true });
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click(check24SubmitBtn)
        ]);

        // 5. Formular ausfüllen
        await page.waitForSelector('form[qa-ref="property-evaluation-form"]', { visible: true });

        await page.type('[qa-ref="property-evaluation-location"] input', zip, { delay: 100 });
        await new Promise(r => setTimeout(r, 1000));

        const streetInput = '[qa-ref="property-evaluation-street"] input';
        await page.waitForSelector(streetInput, { visible: true });
        await page.click(streetInput, { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await new Promise(r => setTimeout(r, 500));
        await page.type(streetInput, street, { delay: 150 });
        await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 500));

        await page.type('[qa-ref="property-evaluation-house-number"] input', houseNumber, { delay: 100 });
        await page.type('[qa-ref="property-evaluation-total-living-space"] input', livingSpace, { delay: 50 });
        await page.type('[qa-ref="property-evaluation-year-of-construction"] input', yearOfConstruction, { delay: 50 });

        await page.select('[qa-ref="property-evaluation-condition"] select', '2');
        await page.select('[qa-ref="property-evaluation-furnishing"] select', '2');
        await page.select('[qa-ref="property-evaluation-garages-count"] select', '1');
        await page.select('[qa-ref="property-evaluation-parking-space-count"] select', '1');

        await page.type('[qa-ref="property-evaluation-rooms-count"] input', rooms, { delay: 50 });
        await page.select('[qa-ref="property-evaluation-bathrooms-count"] select', '1');

        await page.click('[qa-ref="property-evaluation-purpose-0"]');
        const periodRadio = '[qa-ref="property-evaluation-purpose-period-0"]';
        await page.waitForSelector(periodRadio, { visible: true });
        await page.click(periodRadio);

        // 6. Absenden
        const submitBtn = '[qa-ref="property-evaluation-submit-button"]';
        await page.waitForFunction((btnSelector) => {
            const btn = document.querySelector(btnSelector);
            return btn && !btn.disabled;
        }, {}, submitBtn);
        await page.click(submitBtn);

        // 7. iFrame Link klauen und zu PriceHubble springen
        console.log('[Check24] Warte auf PriceHubble-Dossier (Berechnung läuft)...');
        const iframeSelector = 'iframe[qa-ref="property-evaluation-iframe"]';
        await page.waitForSelector(iframeSelector, { timeout: 25000 });

        const iframeUrl = await page.$eval(iframeSelector, el => el.src);
        await page.goto(iframeUrl, { waitUntil: 'networkidle2' });

        // 8. WERTE AUSLESEN (Verbesserte Version)
        console.log('[Check24] Extrahiere Daten aus PriceHubble...');

        // Wir warten, bis das Element da ist
        await page.waitForSelector('.valuation__section__value', { timeout: 15000 });

        // Kleiner Trick: Wir warten kurz, bis die Zahlen-Animation von PriceHubble fertig ist
        await new Promise(r => setTimeout(r, 2000));

        const valuation = await page.evaluate(() => {
            const cleanNum = (str) => {
                if (!str) return null;
                const match = str.replace(/\./g, '').match(/\d+/);
                return match ? parseInt(match[0], 10) : null;
            };

            const sections = Array.from(document.querySelectorAll('.valuation__section_main'));

            // Wir suchen gezielt nach den Texten, um sicherzugehen
            const marktwertSection = sections.find(s => s.textContent.includes('Marktwert'));
            const spanneSection = sections.find(s => s.textContent.includes('Marktwertspanne'));

            const totalText = marktwertSection?.querySelector('.valuation__section__value')?.textContent || '';
            const sqmText = marktwertSection?.querySelector('.valuation__section__value_sqm')?.textContent || '';

            let minPrice = null;
            let maxPrice = null;
            if (spanneSection) {
                const spanneText = spanneSection.querySelector('.valuation__section__value')?.textContent || '';
                const parts = spanneText.split('-');
                if (parts.length === 2) {
                    minPrice = cleanNum(parts[0]);
                    maxPrice = cleanNum(parts[1]);
                }
            }

            return {
                priceTotal: cleanNum(totalText),
                pricePerSqm: cleanNum(sqmText),
                rangeMin: minPrice,
                rangeMax: maxPrice
            };
        });

        console.log(`[Check24] Erfolgreich: ${valuation.pricePerSqm} €/m² (Gesamt: ${valuation.priceTotal} €)`);

        return {
            success: true,
            platform: "check24",
            pricePerSqm: valuation.pricePerSqm,
            priceTotal: valuation.priceTotal,
            priceRange: {
                min: valuation.rangeMin,
                max: valuation.rangeMax
            }
        };

    } catch (error) {
        console.error('[Check24] Fehler:', error.message);
        return {
            success: false,
            platform: "check24",
            errorType: "SCRAPE_FAILED",
            message: error.message
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

module.exports = { scrapeCheck24 };