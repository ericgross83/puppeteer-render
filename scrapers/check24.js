// scrapers/check24.js
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

        // 1. Session auf der korrekten Subdomain initialisieren (Same-Origin-Fix)
        console.log(`[Check24] Initialisiere Session auf Subdomain...`);
        await page.goto('https://baufinanzierung.check24.de/baufinanzierung/immobilienbewertung/', { waitUntil: 'domcontentloaded' });

        // 2. API-Call direkt abfeuern
        console.log(`[Check24] Sende Direkt-Anfrage für ${street}...`);
        const response = await page.evaluate(async (payload) => {
            const r = await fetch('https://baufinanzierung.check24.de/baufinanzierung/immobilienbewertung/session', {
                method: 'POST',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'content-type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            return await r.json();
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
            purposePeriod: 0,
            urlAppform: "/baufinanzierung/immobilienbewertung/create-appform-init-url"
        });

        const iframeUrl = response.priceHubbleIframeUrl;
        if (!iframeUrl) throw new Error("Keine Dossier-URL in der API-Antwort.");

        // 3. Zum Dossier springen und extrahieren
        console.log(`[Check24] Springe direkt zum Dossier...`);
        await page.goto(iframeUrl, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.valuation__section__value', { timeout: 15000 });
        
        // Kurzer Moment für die Animation der Zahlen
        await new Promise(r => setTimeout(r, 1500));

        const extracted = await page.evaluate(() => {
            const clean = (s) => {
                if (!s) return null;
                const match = s.replace(/\./g, '').match(/\d+/);
                return match ? parseInt(match[0], 10) : null;
            };

            const sections = Array.from(document.querySelectorAll('.valuation__section_main'));
            const main = sections.find(s => s.textContent.includes('Marktwert') && !s.textContent.includes('spanne'));
            const spanne = sections.find(s => s.textContent.includes('Marktwertspanne'));

            const valText = main?.querySelector('.valuation__section__value')?.textContent || "";
            const sqmText = main?.querySelector('.valuation__section__value_sqm')?.textContent || "";
            const rangeText = spanne?.querySelector('.valuation__section__value')?.textContent || "";

            return {
                priceTotal: clean(valText),
                pricePerSqm: clean(sqmText),
                min: clean(rangeText.split('-')[0]),
                max: clean(rangeText.split('-')[1])
            };
        });

        console.log(`[Check24] Done: ${extracted.priceTotal} €`);

        return { 
            success: true, 
            platform: "check24", 
            pricePerSqm: extracted.pricePerSqm,
            priceTotal: extracted.priceTotal,
            priceRange: { min: extracted.min, max: extracted.max }
        };

    } catch (error) {
        console.error(`[Check24] Error: ${error.message}`);
        return { success: false, platform: "check24", error: error.message };
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { scrapeCheck24 };