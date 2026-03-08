const path = require('path');
const fs = require('fs');

// In der Funktion:
const cookiePath = path.resolve(__dirname, '../is24_cookies.json');
if (!fs.existsSync(cookiePath)) {
    throw new Error(`Cookies nicht gefunden unter: ${cookiePath}`);
}


/**
 * ImmoScout24 API-Scraper (Direct Fetch Modus)
 * Nutzt gespeicherte Session-Cookies für maximale Stabilität.
 */
const scrapeImmoScout = async (input) => {
    try {
        // 1. Cookies und Sicherheits-Token laden
        if (!fs.existsSync(cookiePath)) {
            throw new Error("is24_cookies.json fehlt! Bitte einmalig manuell erstellen.");
        }

        const rawCookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
        const cookieHeader = rawCookies.map(c => `${c.name}=${c.value}`).join('; ');
        const xsrfToken = rawCookies.find(c => c.name === 'XSRF-TOKEN')?.value;

        // 2. Direktanfrage an den ImmoScout Property-Hub
        const response = await fetch('https://my-property.immobilienscout24.de/property-hub/valuation/sell?startDate=2024-01-01&endDate=2027-03-01', {
            method: 'POST',
            headers: {
                'Cookie': cookieHeader,
                'X-XSRF-TOKEN': xsrfToken,
                'Content-Type': 'application/json',
                'Is24-My-Property-Service-Request-Source': 'HOW',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://www.immobilienscout24.de/'
            },
            body: JSON.stringify({
                type: "APARTMENT",
                address: {
                    zipcode: input.zip,
                    city: input.city,
                    houseNumber: input.houseNumber,
                    street: input.street
                },
                numberOfRooms: parseInt(input.rooms),
                livingArea: parseInt(input.livingSpace)
            })
        });

        // 3. Fehlerbehandlung (z.B. Cookies abgelaufen)
        if (!response.ok) {
            return {
                success: false,
                platform: 'ImmoScout24',
                status: response.status,
                error: response.status === 401 ? "Cookies abgelaufen" : "API Fehler"
            };
        }

        const data = await response.json();

        // 4. Daten aufbereiten und qm-Preis berechnen
        const pricePerSqm = Math.round(data.value / input.livingSpace);

        return {
            success: true,
            platform: 'ImmoScout24',
            totalValue: data.value,
            pricePerSqm: pricePerSqm,
            range: `${data.valueMin.toLocaleString('de-DE')}€ - ${data.valueMax.toLocaleString('de-DE')}€`,
            confidence: data.valueScore
        };

    } catch (err) {
        console.error('❌ ImmoScout-Fehler:', err.message);
        return { success: false, platform: 'ImmoScout24', error: err.message };
    }
};

// Export für die Verwendung in index.js
module.exports = { scrapeImmoScout };