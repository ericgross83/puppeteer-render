const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    // Sichtbarer Browser für den lokalen Test
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--window-size=1920,1080'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 🛑 WIR HABEN HIER DIE FAKE-HEADERS UND DEN USER-AGENT KOMPLETT ENTFERNT! 
    // Das Stealth-Plugin generiert jetzt einen sauberen, passenden Fingerabdruck.

    console.log('\n🟢 --- Starte Check24 Scraping (BEREINIGTER TEST) ---');

    try {
        await page.goto('https://www.check24.de/baufinanzierung/immobilienbewertung/', { waitUntil: 'domcontentloaded' });
        console.log('1️⃣  Navigiert zu Check24...');

        // --- Check24 Cookie Banner ---
        try {
            console.log('🍪 Prüfe auf Check24 Cookie-Banner...');
            await new Promise(r => setTimeout(r, 2000)); // Kurz warten, bis das Banner voll da ist

            const clickedText = await page.evaluate(() => {
                // Wir schnappen uns alle Elemente mit dieser Klasse
                const buttons = Array.from(document.querySelectorAll('.c24-cookie-consent-button, .c24-cookie-consent-buttonlink'));

                // Wir suchen nach Wörtern, die uns weiterbringen
                const targetTexts = ['geht klar', 'auswahl speichern', 'akzeptieren', 'zustimmen'];

                for (const btn of buttons) {
                    const text = btn.textContent.toLowerCase().trim();
                    // Wenn der Text eines unserer Zielwörter enthält -> Klick!
                    if (targetTexts.some(t => text.includes(t))) {
                        btn.click();
                        return text; // Gibt den geklickten Text für unsere Konsole zurück
                    }
                }
                return null;
            });

            if (clickedText) {
                console.log(`🍪 Banner weggeklickt! (Erfolgreich geklickt auf: "${clickedText}")`);
                await new Promise(r => setTimeout(r, 1500)); // Warten auf die Animation
            } else {
                console.log('🍪 Kein passender Cookie-Button gefunden (vielleicht schon weg).');
            }
        } catch (err) {
            console.log('🍪 Fehler beim Cookie-Handling:', err.message);
        }

        // --- 1. Immobilientyp ---
        console.log('2️⃣  Wähle "Eigentumswohnung"...');
        const typSelector = 'input[name="propertyType"][value="1"]';
        await page.waitForSelector(typSelector, { state: 'attached' });
        // Wir klicken das Eltern-Label an, da das Radio-Feld selbst oft unsichtbar ist
        await page.evaluate((sel) => {
            const radio = document.querySelector(sel);
            if (radio && radio.closest('label')) radio.closest('label').click();
        }, typSelector);
        await new Promise(r => setTimeout(r, 500));

        // --- 2. Weiter klicken ---
        console.log('3️⃣  Klicke auf "zur Immobilienbewertung"...');
        const check24SubmitBtn = 'button::-p-text(zur Immobilienbewertung)';
        await page.waitForSelector(check24SubmitBtn, { visible: true });
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click(check24SubmitBtn)
        ]);

        console.log('✅ Auf der Formular-Seite angekommen!');

        // --- 3. Formular ausfüllen ---
        console.log('4️⃣  Fülle das Formular aus...');
        await page.waitForSelector('form[qa-ref="property-evaluation-form"]', { visible: true });

        // PLZ
        await page.type('[qa-ref="property-evaluation-location"] input', '12099', { delay: 100 });
        await new Promise(r => setTimeout(r, 1000));

        // Straße
        const streetInput = '[qa-ref="property-evaluation-street"] input';
        await page.waitForSelector(streetInput, { visible: true });
        await page.click(streetInput, { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await new Promise(r => setTimeout(r, 500));
        await page.type(streetInput, 'Nackenheimer Weg', { delay: 150 });
        await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 500));

        // Restliche Felder
        await page.type('[qa-ref="property-evaluation-house-number"] input', '7b', { delay: 100 });
        await page.type('[qa-ref="property-evaluation-total-living-space"] input', '40', { delay: 50 });
        await page.type('[qa-ref="property-evaluation-year-of-construction"] input', '1990', { delay: 50 });

        await page.select('[qa-ref="property-evaluation-condition"] select', '2');
        await page.select('[qa-ref="property-evaluation-furnishing"] select', '2');
        await page.select('[qa-ref="property-evaluation-garages-count"] select', '1');
        await page.select('[qa-ref="property-evaluation-parking-space-count"] select', '1');

        await page.type('[qa-ref="property-evaluation-rooms-count"] input', '3', { delay: 50 });
        await page.select('[qa-ref="property-evaluation-bathrooms-count"] select', '1');

        await page.click('[qa-ref="property-evaluation-purpose-0"]');
        const periodRadio = '[qa-ref="property-evaluation-purpose-period-0"]';
        await page.waitForSelector(periodRadio, { visible: true });
        await page.click(periodRadio);

        console.log('📝 Formular fertig! Warte auf Submit-Button...');

        // --- 4. Absenden ---
        const submitBtn = '[qa-ref="property-evaluation-submit-button"]';
        await page.waitForFunction((btnSelector) => {
            const btn = document.querySelector(btnSelector);
            return btn && !btn.disabled;
        }, {}, submitBtn);

        console.log('🚀 Klicke auf "Immobilienwert schätzen"...');
        await page.click(submitBtn);

        // --- 5. DER PLOTTWIST: IFRAME LINK KLAUEN ---
        console.log('🕵️‍♂️ Suche nach dem geheimen PriceHubble-iframe...');
        const iframeSelector = 'iframe[qa-ref="property-evaluation-iframe"]';

        // Wir warten bis zu 20 Sekunden, bis Check24 das iFrame geladen hat
        await page.waitForSelector(iframeSelector, { timeout: 20000 });

        // Wir ziehen uns den Link aus dem src-Attribut
        const iframeUrl = await page.$eval(iframeSelector, el => el.src);
        console.log('\n🔗 Geheimer Dossier-Link gefunden:');
        console.log(iframeUrl + '\n');

        // --- 6. CHECK24 VERLASSEN ---
        console.log('🏃‍♂️ Verlasse Check24 und lade das reine Dossier...');
        await page.goto(iframeUrl, { waitUntil: 'networkidle2' });

        console.log('🎉 BÄM! Wir sind auf der PriceHubble Seite!');

    } catch (err) {
        console.log('\n❌ [Check24] Fehler aufgetreten:', err.message);
    }

    console.log('⏸️  Browser bleibt noch 30 Sekunden offen zur Inspektion...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    // await browser.close();
})();