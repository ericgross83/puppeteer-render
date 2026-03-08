const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ 
        headless: false, 
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Fingerprint-Tarnung (GPU & WebGL)
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.';
            if (parameter === 37446) return 'Intel(R) Iris(R) Xe Graphics';
            return getParameter.apply(this, arguments);
        };
    });

    try {
        // --- 1. Session aufwärmen (Wichtig für AWS WAF) ---
        console.log('🕵️‍♂️ Phase 1: Reputation aufbauen (Google)...');
        await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));

        // --- 2. Anflug auf ImmoScout24 ---
        console.log('🚀 Navigiere zu ImmoScout24...');
        await page.goto('https://www.immobilienscout24.de/immobilienbewertung/', { waitUntil: 'networkidle2' });

        // --- 3. Cookie Banner (Shadow DOM Fix) ---
        console.log('🍪 Akzeptiere Cookies...');
        await page.waitForSelector('#usercentrics-root', { timeout: 10000 });
        const acceptButton = await page.evaluateHandle(() => {
            const root = document.querySelector('#usercentrics-root');
            return root ? root.shadowRoot.querySelector('button[data-testid="uc-accept-all-button"]') : null;
        });

        if (acceptButton.asElement()) {
            const box = await acceptButton.asElement().boundingBox();
            if (box) {
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                console.log('✅ Cookies erledigt.');
            }
        }
        await new Promise(r => setTimeout(r, 2000));

        // --- 4. Login-Prozess starten ---
        console.log('👤 Klicke auf "Anmelden"...');
        const loginTrigger = '.topnavigation__sso-login__loggedout';
        await page.waitForSelector(loginTrigger, { visible: true });
        await page.click(loginTrigger);

        // --- 5. E-Mail eingeben (mit "Human Typing") ---
        console.log('📧 Gebe E-Mail ein...');
        const emailInput = 'input#username';
        await page.waitForSelector(emailInput, { visible: true, timeout: 15000 });
        
        // Tippe die E-Mail langsam ein (100ms Verzögerung pro Buchstabe)
        await page.type(emailInput, 'DEINE_EMAIL@BEISPIEL.DE', { delay: 100 });

        // --- 6. Klick auf Weiter ---
        // Oft ist das ein Button mit Typ "submit" oder eine ID wie "login_forward"
        console.log('➡️ Bestätige E-Mail...');
        await page.keyboard.press('Enter'); // Sicherster Weg, um den "Weiter"-Button zu triggern

        await new Promise(r => setTimeout(r, 3000));

        // Hier prüfen wir, ob das Passwortfeld erscheint oder ein Captcha blockt
        if (await page.$('.amzn-captcha-modal')) {
            console.log('🛑 CAPTCHA erkannt nach E-Mail-Eingabe!');
        } else {
            console.log('🔑 Warte auf Passwortfeld...');
            // Im nächsten Schritt brauchen wir den Selektor für das Passwortfeld
        }

    } catch (err) {
        console.log('❌ Fehler:', err.message);
    }

    console.log('⏸️ Browser zur Inspektion offen...');
    await new Promise(r => setTimeout(r, 60000));
    await browser.close();
})();