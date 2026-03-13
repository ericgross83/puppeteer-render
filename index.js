const path = require('path');
const fs = require('fs');
require('dotenv').config();
const express = require('express');

// Scraper-Funktionen importieren
const { scrapeHomeday } = require('./scrapers/homeday');
const { scrapeCheck24 } = require('./scrapers/check24');
const { scrapeImmoScout } = require('./scrapers/immoscout');
const { scrapeDuolingoWords } = require('./scrapers/duo_words');
const { debugLog } = require('./logger');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (apiKey !== process.env.MY_API_KEY) {
        debugLog('AUTH', 'Abgewiesener Zugriff (falscher API-Key)');
        return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    // Alles okay? Dann lass die Anfrage zur nächsten Funktion (next) weiterziehen
    next();
};

app.get('/valuation', authenticate, async (req, res) => {
    debugLog('API', 'Neue Anfrage erhalten', { query: req.query });

    // 1. Parameter auslesen (ohne Fallbacks!)
    const street = req.query.street;
    const houseNumber = req.query.houseNumber;
    const zip = req.query.zip;
    const city = req.query.city;
    const livingSpace = parseInt(req.query.livingSpace);
    const rooms = parseInt(req.query.rooms);
    const yearOfConstruction = parseInt(req.query.yearOfConstruction);
    const bathrooms = parseInt(req.query.bathrooms);

    debugLog('API', 'Roh-Parameter extrahiert', { street, houseNumber, zip, city, livingSpace, rooms, yearOfConstruction, bathrooms });

    // 2. Strikte Validierung (Fail-Fast)
    const missingOrInvalid = [];
    if (!street) missingOrInvalid.push('street');
    if (!houseNumber) missingOrInvalid.push('houseNumber');
    if (!zip) missingOrInvalid.push('zip');
    if (!city) missingOrInvalid.push('city');
    if (!livingSpace || isNaN(livingSpace)) missingOrInvalid.push('livingSpace (Zahl erwartet)');
    if (!rooms || isNaN(rooms)) missingOrInvalid.push('rooms (Zahl erwartet)');
    if (!yearOfConstruction || isNaN(yearOfConstruction)) missingOrInvalid.push('yearOfConstruction (Zahl erwartet)');
    if (!bathrooms || isNaN(bathrooms)) missingOrInvalid.push('bathrooms (Zahl erwartet)');

    // Wenn etwas fehlt, sofort abbrechen und 400 Fehler zurückgeben
    if (missingOrInvalid.length > 0) {
        console.warn(`⚠️ Anfrage abgebrochen. Fehlerhafte Parameter: ${missingOrInvalid.join(', ')}`);
        return res.status(400).json({
            error: 'Fehlende oder ungültige Parameter',
            details: `Für eine präzise Bewertung müssen folgende Parameter zwingend übergeben werden: ${missingOrInvalid.join(', ')}`
        });
    }

    // 3. Wenn alles passt, das Input-Objekt für die Scraper bauen
    const input = {
        street,
        houseNumber,
        zip,
        city,
        livingSpace,
        rooms,
        yearOfConstruction,
        bathrooms
    };

    debugLog('API', 'Vollständige Marktanalyse für:', input);

    const results = await Promise.allSettled([
        scrapeHomeday(input),
        scrapeCheck24(input),
        scrapeImmoScout(input)
    ]);

    // Rohdaten-Zuordnung
    const platformData = {
        homeday: results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason },
        check24: results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason },
        immoscout: results[2].status === 'fulfilled' ? results[2].value : { success: false, error: results[2].reason }
    };

    // --- BERECHNUNG DER DURCHSCHNITTE ---

    // Quadratmeterpreise
    const sqmPrices = [
        platformData.homeday.pricePerSqm,
        platformData.check24.pricePerSqm,
        platformData.immoscout.pricePerSqm
    ].filter(p => p && p > 0);

    // Gesamtwerte
    const totalValues = [
        platformData.homeday.totalPrice,
        platformData.check24.priceTotal,
        platformData.immoscout.totalValue
    ].filter(v => v && v > 0);

    // Preisspannen
    const minPrices = [platformData.check24.priceRange?.min, platformData.immoscout.priceRange?.min].filter(p => p > 0);
    const maxPrices = [platformData.check24.priceRange?.max, platformData.immoscout.priceRange?.max].filter(p => p > 0);

    const avgSqmPrice = sqmPrices.length > 0
        ? Math.round(sqmPrices.reduce((a, b) => a + b, 0) / sqmPrices.length)
        : 0;

    const avgTotalValue = totalValues.length > 0
        ? Math.round(totalValues.reduce((a, b) => a + b, 0) / totalValues.length)
        : 0;

    const avgRange = {
        min: minPrices.length > 0 ? Math.round(minPrices.reduce((a, b) => a + b, 0) / minPrices.length) : 0,
        max: maxPrices.length > 0 ? Math.round(maxPrices.reduce((a, b) => a + b, 0) / maxPrices.length) : 0
    };

    // --- DIE ANTWORT-STRUKTUR ---
    res.json({
        metadata: input,

        // TEIL 1: Die berechnete Zusammenfassung (Der "Cool"-Faktor)
        summary: {
            averagePricePerSqm: avgSqmPrice,
            averageTotalValue: avgTotalValue,
            averageMarketRange: avgRange,
            activeSources: sqmPrices.length
        },

        // TEIL 2: Die detaillierten Quell-Daten (Die "Nachprüfbarkeit")
        sourceDetails: {
            homeday: {
                status: platformData.homeday.success ? "SUCCESS" : "FAILED",
                sqmPrice: platformData.homeday.pricePerSqm || null,
                totalValue: platformData.homeday.totalPrice || null,
                addressFound: platformData.homeday.verifiedAddress || null,
                error: platformData.homeday.error || null
            },
            check24: {
                status: platformData.check24.success ? "SUCCESS" : "FAILED",
                sqmPrice: platformData.check24.pricePerSqm || null,
                totalValue: platformData.check24.priceTotal || null,
                range: platformData.check24.priceRange || null,
                error: platformData.check24.error || null
            },
            immoscout: {
                status: platformData.immoscout.success ? "SUCCESS" : "FAILED",
                sqmPrice: platformData.immoscout.pricePerSqm || null,
                totalValue: platformData.immoscout.totalValue || null,
                range: platformData.immoscout.priceRange || null,
                confidenceScore: platformData.immoscout.confidence || null,
                error: platformData.immoscout.error || null
            }
        },

        timestamp: new Date().toISOString()
    });
});

// --- ENDPOINT: DUOLINGO VOKABELN ---
app.get('/duolingo', authenticate, async (req, res) => {
    debugLog('API', 'Duolingo-Anfrage gestartet');
    
    try {
        const words = await scrapeDuolingoWords(true);
        res.json({
            success: true,
            count: words.length,
            data: words
        });

    } catch (error) {
        debugLog('ERROR', `Scraping fehlgeschlagen: ${error.message}`);

        const screenshotPath = path.resolve(__dirname, 'duolingo_error.png');
        const isDebug = process.env.DEBUG_MODE === 'true'; // Check die Railway-Variable

        setTimeout(() => {
            // FALL 1: Wir sind im Debug-Modus -> Schicke das Bild direkt
            if (isDebug && fs.existsSync(screenshotPath)) {
                res.setHeader('X-Scraper-Error', encodeURIComponent(error.message));
                return res.status(500).sendFile(screenshotPath);
            }

            // FALL 2: Produktion oder kein Bild -> Sauberes JSON
            res.status(500).json({ 
                success: false, 
                error: 'Ein interner Fehler ist aufgetreten.',
                // Details nur mitschicken, wenn Debug an ist
                details: isDebug ? error.message : 'Kontaktieren Sie den Admin.'
            });
        }, 1200);
    }
});

app.get('/debug-screenshot', authenticate, (req, res) => {
    const screenshotPath = path.resolve(__dirname, 'duolingo_error.png');

    if (fs.existsSync(screenshotPath)) {
        res.sendFile(screenshotPath);
    } else {
        res.status(404).send('Kein Screenshot gefunden. Entweder lief alles glatt oder der Server wurde neu gestartet.');
    }
});

// Server starten
app.listen(PORT, () => {
    console.log(`🚀 Railway Server aktiv auf Port ${PORT}`);
    console.log(`📡 Endpoints: /valuation, /duolingo, /debug-screenshot`);
});