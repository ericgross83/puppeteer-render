// index.js
const express = require('express');

// HIER importieren wir unsere ausgelagerte Logik!
const { scrapeHomeday } = require('./scrapers/homeday');

const app = express();
const PORT = process.env.PORT || 8080;
const API_KEY = process.env.MY_API_KEY;

app.use(express.json());

// Der Türsteher
const authenticate = (req, res, next) => {
    if (!API_KEY) {
        console.warn("⚠️ Kein MY_API_KEY definiert. Endpunkt ist ungeschützt!");
        return next();
    }

    const userKey = req.headers['x-api-key'];
    if (userKey && userKey === API_KEY) {
        next(); 
    } else {
        res.status(401).json({ success: false, message: "Zugriff verweigert: Ungültiger API-Key." });
    }
};

// Unser Endpunkt
app.post('/api/v1/estimations/homeday', authenticate, async (req, res) => {
    const { street, zip, city } = req.body;

    if (!street || !zip || !city) {
        return res.status(400).json({ 
            success: false, 
            message: "Bitte 'street', 'zip' und 'city' im JSON-Body mitsenden." 
        });
    }

    // Hier rufen wir das externe Skript auf
    const result = await scrapeHomeday(street, zip, city);

    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(500).json(result);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server läuft auf Port ${PORT}`);
});