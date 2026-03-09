// scrapers/check24.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const scrapeCheck24 = async (data) => {

    console.log({ ...data, message: "[Check24] Initialisiere Scraper..." });

    const {
        street,
        houseNumber,
        zip,
        city,
        livingSpace,
        yearOfConstruction,
        rooms,
        bathrooms,
    } = data;

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--single-process',
                '--no-zygote'
            ]
        });

        const page = await browser.newPage();

        // 1. Menschliches Verhalten simulieren: Aktueller User-Agent & Viewport
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        console.log(`[Check24] Initialisiere Session auf Subdomain...`);
        await page.goto('https://baufinanzierung.check24.de/baufinanzierung/immobilienbewertung/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // --- DER STEALTH-TANZ STARTET HIER ---
        console.log(`[Check24] Führe Maus- und Scrollbewegungen aus (Bot-Tarnung)...`);

        // 1. Zufällige Mausbewegungen (Zahlen = X und Y Koordinaten)
        await page.mouse.move(150 + Math.random() * 100, 200 + Math.random() * 100);
        await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
        await page.mouse.move(450 + Math.random() * 200, 400 + Math.random() * 200);
        await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

        // 2. Ein bisschen nach unten scrollen
        await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
        await new Promise(r => setTimeout(r, 800 + Math.random() * 500));

        // 3. Einen Klick ins Leere machen (aktiviert oft bestimmte Event-Listener der WAF)
        await page.mouse.click(10, 10);
        await new Promise(r => setTimeout(r, 500 + Math.random() * 500));

        // 4. Ein Stückchen wieder hoch scrollen
        await page.evaluate(() => window.scrollBy({ top: -100, behavior: 'smooth' }));
        await new Promise(r => setTimeout(r, 1000));
        // --- DER STEALTH-TANZ ENDET HIER ---

        console.log(`[Check24] Sende getarnte Direkt-Anfrage für ${street}...`);

        // 3. API-Call mit verbesserter Fehlerprüfung
        const response = await page.evaluate(async (payload) => {
            const r = await fetch('https://baufinanzierung.check24.de/baufinanzierung/immobilienbewertung/session', {
                method: 'POST',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'content-type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            // Prüfen, ob wirklich JSON zurückkommt
            const contentType = r.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await r.text();
                // Wenn HTML kommt (<!DOCTYPE), werfen wir einen lesbaren Fehler
                throw new Error(`BOT_BLOCK: Check24 hat die Anfrage abgelehnt (HTML erhalten).`);
            }

            return await r.json();
        }, {
            propertyType: 1,
            address: { street, houseNumber, postalCode: zip, location: city },
            yearOfConstruction: yearOfConstruction,
            totalLivingSpace: livingSpace,
            condition: 2,
            furnishing: 2,
            roomsCount: rooms,
            bathroomsCount: bathrooms,
            garagesCount: 0,
            parkingSpacesCount: 0,
            purpose: 1,
            purposePeriod: 0,
            urlAppform: "/baufinanzierung/immobilienbewertung/create-appform-init-url"
        });

        const iframeUrl = response.priceHubbleIframeUrl;
        if (!iframeUrl) throw new Error("Keine Dossier-URL in der Antwort.");

        // 4. Zum Dossier springen
        console.log(`[Check24] Springe zum Dossier...`);
        await page.goto(iframeUrl, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.valuation__section__value', { timeout: 15000 });

        // Kurzer Moment für die Animation der Zahlen
        await new Promise(r => setTimeout(r, 1000));

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

        return {
            success: true,
            platform: "check24",
            pricePerSqm: extracted.pricePerSqm,
            priceTotal: extracted.priceTotal,
            priceRange: { min: extracted.min, max: extracted.max }
        };

    } catch (error) {
        console.error(`[Check24] Fehler: ${error.message}`);
        return {
            success: false,
            platform: "check24",
            error: error.message
        };
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { scrapeCheck24 };