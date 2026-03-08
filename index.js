require('dotenv').config();
const express = require('express');
const { scrapeHomeday } = require('./scrapers/homeday');
const { scrapeCheck24 } = require('./scrapers/check24');
const { scrapeImmoScout } = require('./scrapers/immoscout');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/valuation', async (req, res) => {
    if (req.headers['x-api-key'] !== process.env.MY_API_KEY) {
        return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    const input = {
        street: req.query.street || "Petersburger Straße",
        houseNumber: req.query.houseNumber || "39",
        zip: req.query.zip || "10249",
        city: req.query.city || "Berlin",
        livingSpace: parseInt(req.query.livingSpace) || 60,
        rooms: parseInt(req.query.rooms) || 2
    };

    console.log(`🔎 Vollständige Marktanalyse für: ${input.street} ${input.houseNumber}`);

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

app.listen(PORT, () => console.log(`🚀 API aktiv auf Port ${PORT}`));