require('dotenv').config();
const express = require('express');
const { scrapeHomeday } = require('./scrapers/homeday');
const { scrapeCheck24 } = require('./scrapers/check24');
const { scrapeImmoScout } = require('./scrapers/immoscout');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/valuation', async (req, res) => {
    // 1. API-Key Check (Nutzt deine Railway-Variable MY_API_KEY)
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

    console.log(`🔎 Starte kombinierte Abfrage für: ${input.street} ${input.houseNumber}`);

    // 2. Alle Scraper gleichzeitig starten
    const results = await Promise.allSettled([
        scrapeHomeday(input),
        scrapeCheck24(input),
        scrapeImmoScout(input)
    ]);

    const data = {
        homeday: results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason },
        check24: results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason },
        immoscout: results[2].status === 'fulfilled' ? results[2].value : { success: false, error: results[2].reason }
    };

    // 3. Wir sammeln alle GESAMT-Preise (Wichtig: Keys müssen exakt stimmen!)
    const totalPrices = [
        data.homeday.totalPrice,    // Erwartet 'totalPrice' von Homeday
        data.check24.priceTotal,    // Kommt so von Check24
        data.immoscout.totalValue   // Kommt so von ImmoScout
    ].filter(p => p && p > 0);

    // 4. Durchschnittsberechnung
    const finalAverage = totalPrices.length > 0
        ? Math.round(totalPrices.reduce((a, b) => a + b, 0) / totalPrices.length)
        : 0;

    // 5. Antwort senden
    res.json({
        metadata: input,
        averagePrice: finalAverage, // Hier stand vorher avgPrice (Fehler!)
        totalSourcesFound: totalPrices.length,
        details: data,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => console.log(`🚀 API läuft auf Port ${PORT}`));