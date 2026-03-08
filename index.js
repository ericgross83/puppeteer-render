require('dotenv').config();
const express = require('express');
const { scrapeHomeday } = require('./scrapers/homeday');
const { scrapeCheck24 } = require('./scrapers/check24');
const { scrapeImmoScout } = require('./scrapers/immoscout');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/valuation', async (req, res) => {
    // API-Key Check
    if (req.headers['x-api-key'] !== process.env.API_KEY) {
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

    // Alle Scraper gleichzeitig starten
    const results = await Promise.allSettled([
        scrapeHomeday(input),
        scrapeCheck24(input),
        scrapeImmoScout(input)
    ]);

    const data = {
        homeday: results[0].status === 'fulfilled' ? results[0].value : { success: false },
        check24: results[1].status === 'fulfilled' ? results[1].value : { success: false },
        immoscout: results[2].status === 'fulfilled' ? results[2].value : { success: false }
    };

    // Durchschnittsberechnung (nur erfolgreiche Werte)
    const validPrices = [
        data.homeday.price,
        data.check24.price,
        data.immoscout.totalValue
    ].filter(p => p > 0);

    const avgPrice = validPrices.length > 0 
        ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length) 
        : 0;

    res.json({
        metadata: input,
        averagePrice: avgPrice,
        details: data,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => console.log(`🚀 API läuft auf Port ${PORT}`));