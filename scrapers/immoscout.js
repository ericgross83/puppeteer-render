const path = require('path');
const fs = require('fs');

// Wir definieren den Pfad, aber wir PRÜFEN ihn erst in der Funktion!
const cookiePath = path.resolve(__dirname, './is24_cookies.json');

const scrapeImmoScout = async (input) => {
    try {
        // 1. Cookies und Sicherheits-Token laden
        if (!fs.existsSync(cookiePath)) {
            // Wir werfen hier den Fehler, damit nur dieser Scraper abbricht, nicht der Server!
            return { success: false, platform: 'ImmoScout24', error: "is24_cookies.json fehlt auf dem Server." };
        }

        const rawCookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
        const cookieHeader = rawCookies.map(c => `${c.name}=${c.value}`).join('; ');
        const xsrfToken = rawCookies.find(c => c.name === 'XSRF-TOKEN')?.value;

        // ... Rest des Codes bleibt gleich, nutze fetch wie gewohnt ...
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
                address: { zipcode: input.zip, city: input.city, houseNumber: input.houseNumber, street: input.street },
                numberOfRooms: parseInt(input.rooms),
                livingArea: parseInt(input.livingSpace)
            })
        });

        if (!response.ok) return { success: false, platform: 'ImmoScout24', status: response.status };

        const data = await response.json();
        return {
            success: true,
            platform: 'ImmoScout24',
            totalValue: data.value,
            pricePerSqm: Math.round(data.value / input.livingSpace),
            range: `${data.valueMin.toLocaleString('de-DE')}€ - ${data.valueMax.toLocaleString('de-DE')}€`
        };

    } catch (err) {
        return { success: false, platform: 'ImmoScout24', error: err.message };
    }
};

module.exports = { scrapeImmoScout };