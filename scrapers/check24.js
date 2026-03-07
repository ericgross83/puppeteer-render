const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const scrapeCheck24 = async (data) => {
    const { 
        street, houseNumber, zip, city = "Berlin",
        livingSpace = '60', yearOfConstruction = 1990, rooms = '2' 
    } = data;

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process']
        });

        const page = await browser.newPage();
        
        // 1. Nur kurz die Seite laden für frische Cookies/Session
        console.log(`[Check24] Initialisiere Session...`);
        await page.goto('https://www.check24.de/baufinanzierung/immobilienbewertung/', { waitUntil: 'domcontentloaded' });

        // 2. DEN API-CALL DIREKT ABFEUERN (Kein Tippen mehr!)
        console.log(`[Check24] Sende Direkt-Anfrage für ${street}...`);
        
        const iframeUrl = await page.evaluate(async (payload) => {
            const response = await fetch('https://baufinanzierung.check24.de/baufinanzierung/immobilienbewertung/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            return result.priceHubbleIframeUrl;
        }, {
            propertyType: 1,
            address: { street, houseNumber, postalCode: zip, location: city },
            yearOfConstruction: parseInt(yearOfConstruction),
            totalLivingSpace: livingSpace.toString(),
            condition: 2,
            furnishing: 2,
            roomsCount: rooms.toString(),
            bathroomsCount: 1,
            garagesCount: 0,
            parkingSpacesCount: 0,
            purpose: 1,
            purposePeriod: 0
        });

        if (!iframeUrl) throw new Error("Keine Iframe-URL erhalten");

        // 3. Direkt zum Preis-Dossier springen
        console.log(`[Check24] Dossier erhalten, extrahiere Endpreis...`);
        await page.goto(iframeUrl, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.valuation__section__value', { timeout: 10000 });

        // Kurze Pause für Animation
        await new Promise(r => setTimeout(r, 1000));

        const valuation = await page.evaluate(() => {
            const clean = (s) => parseInt(s?.replace(/[^0-9]/g, '') || '0', 10);
            const main = document.querySelector('.valuation__section_main');
            const spanne = Array.from(document.querySelectorAll('.valuation__section_main')).find(s => s.textContent.includes('-'));
            
            return {
                total: clean(main?.querySelector('.valuation__section__value')?.textContent),
                sqm: clean(main?.querySelector('.valuation__section__value_sqm')?.textContent),
                min: clean(spanne?.querySelector('.valuation__section__value')?.textContent.split('-')[0]),
                max: clean(spanne?.querySelector('.valuation__section__value')?.textContent.split('-')[1])
            };
        });

        return { success: true, platform: "check24", ...valuation };

    } catch (error) {
        return { success: false, platform: "check24", error: error.message };
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { scrapeCheck24 };