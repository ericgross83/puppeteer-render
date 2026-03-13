// tests/scrape_duo_words_test.js
const path = require('path');

// 1. DER ÜBERSETZER: Liest die Datei und füllt process.env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { scrapeDuolingoWords } = require('../scrapers/duo_words'); // Pfad zu deiner Datei anpassen

(async () => {
    console.log('🚀 Starte lokalen Test für Duolingo Scraper...');
    console.log(`Eingeloggt als: ${process.env.DUOLINGO_EMAIL}`);

    try {
        // Lokaler Test: Wir setzen headless auf false, damit du siehst, was passiert
        const words = await scrapeDuolingoWords(false); 

        console.log('\n✅ Test erfolgreich!');
        console.log(`Anzahl gefundener Wörter: ${words.length}`);
        
        if (words.length > 0) {
            console.log('Vorschau (erste 3 Wörter):');
            console.table(words.slice(0, 3));
        }

    } catch (error) {
        console.error('\n❌ Fehler beim Testen:');
        console.error(error.message);
    }
})();