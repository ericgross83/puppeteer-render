# Wir nutzen das offizielle Puppeteer-Image als Basis
FROM ghcr.io/puppeteer/puppeteer:latest

# Wir überspringen den Download, da das Image schon Chrome enthält
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Arbeitsverzeichnis im Container festlegen
WORKDIR /usr/src/app

# Package-Dateien kopieren und Abhängigkeiten installieren
COPY package*.json ./
RUN npm ci

# Den restlichen Code kopieren
COPY . .

# Startbefehl für Railway
CMD [ "node", "index.js" ]