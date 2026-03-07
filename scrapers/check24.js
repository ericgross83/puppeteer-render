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

        // 2. DEN API-CALL VIA NODE-CONTEXT ABFEUERN (Master-Plan B)
        console.log(`[Check24] Extrahiere Session-Cookies...`);

        // Wir holen uns die echten Cookies direkt aus dem Browser-System
        const cookies = await page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        console.log(`[Check24] Sende Direkt-Anfrage via Node-Fetch...`);

        // Wir feuern den Request jetzt von Node.js aus, 
        // geben uns aber exakt als der Browser aus, der gerade offen ist.
        const response = await page.evaluate(async (payload) => {
            // Wir nutzen hier doch wieder evaluate, aber mit einem Trick: 
            // Wir senden den Request an den Server, aber wir fangen den Fehler nicht ein, 
            // sondern lassen Puppeteer die Netzwerkschicht direkt steuern.
            const r = await fetch('https://baufinanzierung.check24.de/baufinanzierung/immobilienbewertung/session', {
                method: 'POST',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'content-type': 'application/json',
                    // Der Browser setzt Origin und Referer hier automatisch richtig
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