# Wir nutzen das offizielle Puppeteer-Image als Basis
FROM ghcr.io/puppeteer/puppeteer:latest

# Arbeitsverzeichnis im Container festlegen
WORKDIR /usr/src/app

# Package-Dateien kopieren und Abhängigkeiten installieren
COPY package*.json ./
RUN npm ci

# Den restlichen Code kopieren
COPY . .

# Startbefehl für Railway
CMD [ "node", "index.js" ]