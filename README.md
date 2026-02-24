# TradeUp Site (React)

This project uses React + Vite for the frontend and a small Node server for Railway hosting.

## Local development

1. Install dependencies:
	- `npm install`
2. Run dev mode:
	- `npm run dev`

## Local production preview

1. Build assets:
	- `npm run build`
2. Serve built files (same runtime entry as Railway):
	- `npm start`
2. Open:
	- `http://localhost:3000`

## Deploy to Railway

1. Push this project to GitHub.
2. In Railway, create a new project from this repo.
3. Ensure branch is `main` and root directory is `/`.
4. Deploy; Railway runs `npm start` (configured in `railway.json`).

## Important files

- `src/App.jsx` main landing page
- `src/styles.css` blue/white/black styling
- `server.js` serves built `dist` files
- `railway.json` Railway start command
- `nixpacks.toml` explicit Node runtime/start setup
