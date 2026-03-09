// Zuerst die Test-Umgebung konfigurieren
process.env.HEADLESS_SCRAPE = 'false'; // Das sorgt dafür, dass Puppeteer sichtbar startet

const { scrapeCheck24 } = require('../scrapers/check24');
const { scrapeHomeday } = require('../scrapers/homeday');
const { scrapeImmoScout } = require('../scrapers/immoscout');
const { testProperty } = require('./test_config');

async function testDrive() {
    console.log("Starte Sicht-Test für Check24...");
    const resultHomeday = await scrapeHomeday(testProperty);
    console.log("Ergebnis:", resultHomeday);

    console.log("Starte Sicht-Test für Check24...");
    const resultCheck24 = await scrapeCheck24(testProperty);
    console.log("Ergebnis:", resultCheck24);

    console.log("Starte Sicht-Test für Check24...");
    const resultImmoscout = await scrapeImmoScout(testProperty);
    console.log("Ergebnis:", resultImmoscout);
}

testDrive();