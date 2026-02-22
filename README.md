# TradeUp Site

This project is configured to deploy on Railway as a Node.js web service.

## Run locally

1. Install dependencies (none required beyond Node, but this creates lockfile if needed):
	- `npm install`
2. Start the server:
	- `npm start`
3. Open:
	- `http://localhost:3000`

The server automatically uses Railway's `PORT` environment variable in production.

## Deploy to Railway

1. Push this project to GitHub.
2. In Railway, click **New Project** → **Deploy from GitHub repo**.
3. Select this repository.
4. Railway will detect Node.js and run `npm start` (configured in `railway.json`).
5. After deploy finishes, open the generated Railway domain.

## Included deployment files

- `package.json` with `start` script
- `server.js` static file server
- `railway.json` with Railway start command
