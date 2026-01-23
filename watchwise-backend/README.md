# WatchWise Backend

WatchWise Backend is the API server for authentication, user management, groups, preferences, and movie recommendations for the WatchWise platform.

## What does this backend do?
- Handles OAuth authentication (Google, GitHub) and user registration
- Exposes REST APIs for users, groups, lists, preferences, and watch history
- Connects to MongoDB for data persistence
- Implements movie recommendation logic (group and individual)
- Enforces unique and privacy-safe usernames

## Requirements
- Node.js 18+
- MongoDB (local or cloud)
- Google and/or GitHub OAuth client credentials

## Quick Setup
1. **Clone the repository**

	```bash
	git clone <repo-url>
	cd watchwise-backend
	```

2. **Install dependencies**

	```bash
	npm install
	```

3. **Configure environment variables**

	Create a `.env` file in the backend root with these variables:

	```env
	NODE_ENV=production                # Node.js environment (development/production)
	PORT=3001                          # Backend server port

	MONGODB_URI=mongodb://localhost:27017   # MongoDB connection string
	MONGODB_DB=WatchWise                   # MongoDB database name

	AUTH_JWT_SECRET=...                # Secret key for signing JWT tokens (use a long random string)
	AUTH_TOKEN_TTL=1h                  # JWT token expiration (e.g. 1h, 24h)
	AUTH_BASE_URL=http://localhost:3001    # Public base URL of the backend (used for OAuth redirects)

	GOOGLE_CLIENT_ID=...               # Google OAuth client ID (from Google Cloud Console)
	GOOGLE_CLIENT_SECRET=...           # Google OAuth client secret
	GOOGLE_OAUTH_CALLBACK_URL=http://localhost:3001/oauth/google/callback   # Google OAuth callback URL

	GITHUB_CLIENT_ID=...               # GitHub OAuth client ID (from GitHub Developer Settings)
	GITHUB_CLIENT_SECRET=...           # GitHub OAuth client secret

	TMDB_API_KEY=...                   # TMDB (The Movie Database) API key
	TMDB_BASE_URL=https://api.themoviedb.org/3   # TMDB API base URL
	TMDB_API_READ_ACCESS_TOKEN=...     # TMDB API read access token (for advanced requests)
	```

### Explanation of all .env variables

- **NODE_ENV**: Set to `development` or `production` to control Node.js behavior.
- **PORT**: The port the backend server will listen on.
- **MONGODB_URI**: Connection string for your MongoDB instance (local or cloud).
- **MONGODB_DB**: Name of the MongoDB database to use.
- **AUTH_JWT_SECRET**: Secret key for signing JWT tokens. Generate with `openssl rand -hex 64` for security.
- **AUTH_TOKEN_TTL**: How long JWT tokens are valid (e.g. `1h` for 1 hour).
- **AUTH_BASE_URL**: The public URL of your backend, used for OAuth redirect URIs.
- **GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET**: Credentials from Google Cloud Console for OAuth login.
- **GOOGLE_OAUTH_CALLBACK_URL**: The callback URL registered in Google Cloud Console for OAuth (must match this value).
- **GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET**: Credentials from GitHub Developer Settings for OAuth login.
- **TMDB_API_KEY**: API key for The Movie Database (TMDB) to fetch movie data.
- **TMDB_BASE_URL**: Base URL for TMDB API requests (usually `https://api.themoviedb.org/3`).
- **TMDB_API_READ_ACCESS_TOKEN**: Read access token for TMDB API (for advanced or authenticated requests).

4. **Start the backend**

	```bash
	npm run dev
	# or
	npm start
	```

	The server will listen on `http://localhost:3001` (or your configured port).

## Important notes
- For local OAuth testing, set redirect URIs in Google/GitHub consoles to `http://localhost:3001/oauth/google/callback` and similar.
- Usernames are unique: if the one proposed by Google/GitHub is already taken, the backend suggests alternatives and the UI lets the user choose a new one.
- All API endpoints are documented in the `docs/` folder.

## Main structure
- `src/auth/` — authentication, OAuth, JWT
- `src/data/` — repositories and data models (users, groups, lists...)
- `src/pcs/` — movie recommendation logic
- `src/common/` — errors and utilities
- `src/config/` — MongoDB configuration


