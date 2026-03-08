const fs = require('fs');

async function gottModusAbfrage() {
    try {
        // 1. Deine frisch kopierten Cookies laden
        const rawCookies = JSON.parse(fs.readFileSync('./is24_cookies.json', 'utf8'));
        
        // Wir bauen den Cookie-String, den der Server erwartet
        const cookieHeader = rawCookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        // Wir suchen deinen XSRF-Token aus der Liste
        const xsrfToken = rawCookies.find(c => c.name === 'XSRF-TOKEN')?.value;

        console.log('📡 Starte Direktanfrage an die Datenbank...');

        const response = await fetch('https://my-property.immobilienscout24.de/property-hub/valuation/sell?startDate=2023-02-01&endDate=2027-03-01', {
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
                    zipcode: "10249",
                    city: "Berlin",
                    houseNumber: "39",
                    street: "Petersburger Straße"
                },
                numberOfRooms: 2,
                livingArea: 60
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Server sagt Nein (${response.status}):`, errorText);
            return;
        }

        const data = await response.json();
        
        console.log('\n🏆 GEWONNEN! Hier sind deine Daten:');
        console.log('------------------------------------');
        console.log(`Aktueller Marktwert: ${data.value.toLocaleString()} €`);
        console.log(`Spanne: ${data.valueMin.toLocaleString()} € - ${data.valueMax.toLocaleString()} €`);
        console.log(`Datenpunkte in der Zeitreihe: ${data.timeseries.length}`);
        console.log('------------------------------------');

    } catch (err) {
        console.error('❌ Technischer Fehler:', err.message);
    }
}

gottModusAbfrage();