const puppeteer = require("puppeteer");

const scrapeLogic = async (res) => {
    let browser; // Die Variable muss nach ganz oben, damit 'finally' sie kennt
    
    try {
        // Wir übergeben die Argumente für den Linux-Server
        browser = await puppeteer.launch({
            args: [
                "--disable-setuid-sandbox",
                "--no-sandbox",
                "--single-process",
                "--no-zygote"
            ],
        });
        
        const page = await browser.newPage();

        // Navigate the page to a URL.
        await page.goto('https://developer.chrome.com/');

        // Set screen size.
        await page.setViewport({ width: 1080, height: 1024 });

        // Open the search menu using the keyboard.
        await page.keyboard.press('/');

        // Type into search box using accessible input name.
        await page.locator('::-p-aria(Search)').fill('automate beyond recorder');

        // Wait and click on first result.
        await page.locator('.devsite-result-item-link').click();

        // Locate the full title with a unique string.
        const textSelector = await page
            .locator('::-p-text(Customize and automate)')
            .waitHandle();
        const fullTitle = await textSelector?.evaluate(el => el.textContent);

        // Print the full title.
        const logStatement = `The title of this blog post is ${fullTitle}`;
        console.log(logStatement);

        res.send(fullTitle);
    } catch (error) {
        console.error(error);
        res.send(`Something went wrong while running Puppeteer: ${error}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

module.exports = { scrapeLogic };