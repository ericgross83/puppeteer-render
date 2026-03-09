// logger.js

const debugLog = (prefix, message, data = null) => {
    // Prüft, ob in Railway (oder lokal in der .env) DEBUG_MODE=true gesetzt ist
    if (process.env.DEBUG_MODE === 'true') {
        
        // Kleiner Trick: Wenn du ein Objekt (wie JSON-Daten) übergibst, 
        // wird es hier schön formatiert, statt nur "[object Object]" anzuzeigen.
        if (data) {
            console.log(`🐛 [${prefix}] ${message}`);
            console.dir(data, { depth: null, colors: true }); 
        } else {
            console.log(`🐛 [${prefix}] ${message}`);
        }
    }
};

// Und hier ist der Export, an den du absolut richtig gedacht hast!
module.exports = { debugLog };