// tests/master_test.js
const path = require('path');
// Lädt die .env aus dem Root-Verzeichnis
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { scrapeHomeday } = require('../scrapers/homeday');
const { scrapeCheck24 } = require('../scrapers/check24');
const { scrapeImmoScout } = require('../scrapers/immoscout');

// Einheitliche Testdaten für alle Scraper
const testInput = {
    street: "Petersburger Straße",
    houseNumber: "39",
    zip: "10249",
    city: "Berlin",
    livingSpace: 60,
    rooms: 2,
    yearOfConstruction: 1900,
    bathrooms: 1
};

(async () => {
    console.log('🚀 STARTE MASTER-VERGLEICHS-TEST');
    console.log('-----------------------------------');
    console.log(`Objekt: ${testInput.street} ${testInput.houseNumber}, ${testInput.zip} ${testInput.city}`);
    console.log(`Fläche: ${testInput.livingSpace} m² | Zimmer: ${testInput.rooms}`);
    console.log('-----------------------------------\n');

    console.log('⏳ Scraper werden parallel gestartet (das dauert ca. 30-60s)...');

    // Wir starten alle Scraper gleichzeitig
    const results = await Promise.allSettled([
        scrapeHomeday(testInput, true),  // true = headless für Geschwindigkeit
        scrapeCheck24(testInput, true),
        scrapeImmoScout(testInput)
    ]);

    // Daten aufbereiten
    const report = {
        homeday: results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason },
        check24: results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason },
        immoscout: results[2].status === 'fulfilled' ? results[2].value : { success: false, error: results[2].reason }
    };

    console.log('\n📊 VERGLEICHS-BERICHT:');
    console.log('===================================');

    const tableData = [
        {
            Plattform: 'Homeday',
            Status: report.homeday.success ? '✅ OK' : '❌ FEHLER',
            '€ / m²': report.homeday.pricePerSqm ? `${report.homeday.pricePerSqm} €` : '-',
            Gesamtwert: report.homeday.totalPrice ? `${report.homeday.totalPrice.toLocaleString()} €` : '-',
            Info: report.homeday.error || 'Alles OK'
        },
        {
            Plattform: 'Check24',
            Status: report.check24.success ? '✅ OK' : '❌ FEHLER',
            '€ / m²': report.check24.pricePerSqm ? `${report.check24.pricePerSqm} €` : '-',
            Gesamtwert: report.check24.priceTotal ? `${report.check24.priceTotal.toLocaleString()} €` : '-',
            Info: report.check24.error || 'Alles OK'
        },
        {
            Plattform: 'ImmoScout24',
            Status: report.immoscout.success ? '✅ OK' : '❌ FEHLER',
            '€ / m²': report.immoscout.pricePerSqm ? `${report.immoscout.pricePerSqm} €` : '-',
            Gesamtwert: report.immoscout.totalValue ? `${report.immoscout.totalValue.toLocaleString()} €` : '-',
            Info: report.immoscout.error || 'Alles OK'
        }
    ];

    console.table(tableData);

    // Durchschnittsberechnung (nur erfolgreiche)
    const validPrices = [
        report.homeday.totalPrice,
        report.check24.priceTotal,
        report.immoscout.totalValue
    ].filter(v => v > 0);

    if (validPrices.length > 0) {
        const avg = Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length);
        console.log('-----------------------------------');
        console.log(`💰 DURCHSCHNITTLICHER MARKTWERT: ${avg.toLocaleString()} €`);
        console.log('-----------------------------------');
    } else {
        console.log('\n⚠️ Keine validen Daten für eine Durchschnittsberechnung gefunden.');
    }

})();