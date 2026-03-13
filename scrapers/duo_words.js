const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Dein exakter Payload für die Duolingo-API
const duolingoPayload = { "lastTotalLexemeCount": 0, "progressedSkills": [{ "finishedLevels": 1, "finishedSessions": 4, "skillId": { "id": "057a0c44acfeb75183e4613ad7cecc66" } }, { "finishedLevels": 1, "finishedSessions": 4, "skillId": { "id": "da0e5e9f9a1bda91a5545bdd235a3d97" } }, { "finishedLevels": 1, "finishedSessions": 4, "skillId": { "id": "98a9f9bf574023906def8a1b0611a7b4" } }, { "finishedLevels": 1, "finishedSessions": 5, "skillId": { "id": "4750ac85783d91bd0f4156d5736654d7" } }, { "finishedLevels": 1, "finishedSessions": 5, "skillId": { "id": "b799b04632c29f80da6a6f13d4559b1e" } }, { "finishedLevels": 1, "finishedSessions": 5, "skillId": { "id": "8fdcecc3837e895210d8f95e140a2e2c" } }, { "finishedLevels": 1, "finishedSessions": 5, "skillId": { "id": "0cdb721b324ce429c287b6fd264d3241" } }, { "finishedLevels": 1, "finishedSessions": 5, "skillId": { "id": "302b17013e81c5852e090044f21a111a" } }, { "finishedLevels": 1, "finishedSessions": 5, "skillId": { "id": "8b3de230e53f37b87439fc886ca13696" } }, { "finishedLevels": 1, "finishedSessions": 5, "skillId": { "id": "5aeccf75be73ea3df21f609cc320f7fd" } }, { "finishedLevels": 1, "finishedSessions": 5, "skillId": { "id": "feb1f834819f9d8c53c58d800c89f801" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "dcc0f4c70a7c9ee4fac7f7c2ec5e54be" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "78685bc20b70d31a1af1cd5bde6e9618" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "46abf75d8f2d16ad841ae59e5baeb8a6" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "38436b220895accb6667b926aa3db20c" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "8d184c28e65a866714a9815b2bb165dc" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "a7dd839e8e948a63a5d1c5d25170e765" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "a3eceff297563e35f8340ac7a177dced" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "82c783b41be92ca4e74bb6d51a5b5c6d" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "2301642287cdfaef94edb236ebb2e159" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "5fc68ffcbd97894ca54e33a4d0dff10c" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "b1ef9564ac869dd2f07b52f8aea79c1f" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "93d139f05ee44592f81f6eaeff593e8f" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "9fe5a0fc91247188494e6088a95c46c1" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "9e6b6d5af85f15cee3ce69ab0df95bb7" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "741dfbc43dcec53a18f371595918b4e4" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "fbcbe0dc09b6f63c0644fa2497c6d0eb" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "b592547ac3155d625d4a3385db641fd3" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "2ab41defe20a69e5cfc34e10288648fe" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "d87912110c72cf34b9982658d8cfb15c" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "80b1e78703bb76d0487bfe506464efee" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "0fae3b87f8cb708a8c79d877305d88a9" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "cb7e821ba24b0aaf2f43bc2c141fb582" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "547d60bd42d5ee9345048f2f619e9f95" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "e7a37dc464f57387f6f9196b9f0b8439" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "f71604e0c81ed73e85ca1ec3f94af0e8" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "3a23bb11308c53a53bb4090dbfe29d2b" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "82557fcdafacb0370d0dd257bf45c6f1" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "98a1452d46b9985084e12476c0d3028a" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "a0e1c2ab6f9058e9cec50b5561e3cd18" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "aa9e382056ba6f9713f40885ab448fb3" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "149abad363d80c79021065c39ee51083" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "0f9f1c85da4bbf48d6abd7c6008a90bc" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "931a5b67b7c8697bdeb7c651259e35d1" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "9b735e1fcd1771f4c23584d9446ea4da" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "9db641338461ce507f8a5a024267e7e2" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "1133d78b14d16150cfd86aa5de074fcc" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "e20d7a8af790cd2c3a1459ed4920fd5e" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "f379c1b98516a0fc5e5e2374f534182f" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "59ea70811ce285066c0bd3aba3e6a588" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "bb6c94b1fbfd4903b7b4764ee67f8314" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "bf3646c7b3345bf2a4ad44a66d915a09" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "dbeba874faee144f54977081de99187b" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "20bbe841193ac4d628f6405813b7ee06" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "569ae36e9f9400dfce672a5aa3f67799" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "6f4e3120bb2799abd37b6941cd183ce3" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "71bcbcba02848a19b2ee9a0f611ac77c" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "ed863d3bc4a1e97727280582ac162fbc" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "dc9546c6d19c6792b37b40ccdac67d95" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "eda414840faa333bb374da35f8b6891f" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "8d3afa1e9591e0440e937527cbfc1b4a" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "015f4af9a36ab7c8fe1258744505b608" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "e58697ee3f687afcd523b194ad208f31" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "1ecc0b80b7466c3d7b7cad7256330388" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "8fdf66ea36da08b887a64fd2d07cf9e6" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "852c00274e004d2d4539a4aec27b9b59" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "ef759fda22d0001a0af9ca857da2243c" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "5e001e2680c086a91179bc21834fdb9a" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "47122b7b0fee2960b38dda77a59cc6ab" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "6a8d087b5621ba86298396d8f5430304" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "6ae39f80f6fffa6b262fa4895089d722" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "c0c6ab819523f2d3cbfe409cd628f69b" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "2eba3b386fe4a180782fb9ab67e13118" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "244263e9cac7f3d300881f2713f81b76" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "885fa77267d9c75b6e5c579266b6db5f" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "a4d68370f95794387909dad6a45fcd5e" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "cd24c8e2996450f6a003024bd0574f26" } }, { "finishedLevels": 1, "finishedSessions": 6, "skillId": { "id": "cc06e794795c041a95c31e1b64e29989" } }] };

async function scrapeDuolingoWords(headless = true) {
    const email = process.env.DUOLINGO_EMAIL; // Nutze deine .env Namen
    const password = process.env.DUOLINGO_PASSWORD;
    const userId = process.env.DUOLINGO_USER_ID;

    const browser = await puppeteer.launch({
        headless: headless, // WICHTIG für Railway
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(90000);
    page.setDefaultTimeout(90000);
    let allWords = [];

    try {
        // --- LOGIN PROZESS ---
        await page.goto('https://www.duolingo.com/', { waitUntil: 'networkidle2', timeout: 90000 });

        // Cookie Banner
        try {
            await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 4000 });
            await page.click('#onetrust-accept-btn-handler');
        } catch (e) { }

        // Login Modal öffnen und Daten eingeben
        await page.waitForSelector('button[data-test="have-account"]');
        await page.click('button[data-test="have-account"]');

        await page.waitForSelector('input[data-test="email-input"]');
        await page.type('input[data-test="email-input"]', email, { delay: 50 });
        await page.type('input[data-test="password-input"]', password, { delay: 50 });

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 }),
            page.click('button[data-test="register-button"]')
        ]);

        // Token aus den Cookies extrahieren
        const cookies = await page.cookies();
        const jwtCookie = cookies.find(c => c.name === 'jwt_token');
        if (!jwtCookie) throw new Error('JWT Token nicht gefunden!');
        const bearerToken = jwtCookie.value;

        // --- API SCHLEIFE (PAGINATION) ---
        let startIndex = 0;
        const limit = 50;
        let hasMore = true;

        while (hasMore) {
            const apiUrl = `https://www.duolingo.com/2017-06-30/users/${userId}/courses/es/de/learned-lexemes?limit=${limit}&sortBy=LEARNED_DATE&startIndex=${startIndex}`;

            const apiResponse = await page.evaluate(async (url, token, payload) => {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json; charset=UTF-8',
                        'authorization': `Bearer ${token}`,
                        'content-type': 'application/json; charset=UTF-8',
                        'x-requested-with': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(payload)
                });
                return await res.json();
            }, apiUrl, bearerToken, duolingoPayload);

            if (apiResponse.learnedLexemes && apiResponse.learnedLexemes.length > 0) {
                allWords.push(...apiResponse.learnedLexemes);
                startIndex = apiResponse.pagination.nextStartIndex;
                const total = apiResponse.pagination.totalLexemes;

                if (!startIndex || allWords.length >= total) hasMore = false;
            } else {
                hasMore = false;
            }
        }

        // Mapping für dein System
        return allWords.map(word => ({
            text: word.text,
            translations: word.translations,
            audioURL: word.audioURL,
            shelf: 1,
            lastReviewed: null
        }));

    } finally {
        await browser.close();
    }
}

module.exports = { scrapeDuolingoWords };