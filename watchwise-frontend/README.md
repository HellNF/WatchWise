# WatchWise Frontend

WatchWise Frontend is the web application for the WatchWise platform, providing a modern UI for movie recommendations, user profiles, groups, lists, and authentication.

## What does this frontend do?
- Connects to the WatchWise backend via REST APIs
- Handles OAuth authentication (Google, GitHub) and user registration
- Lets users manage their profile, preferences, lists, and groups
- Displays personalized movie recommendations
- Provides a responsive, mobile-friendly experience

## Requirements
- Node.js 18+
- A running WatchWise backend (see backend README)
- Google and/or GitHub OAuth client credentials (for login)

## Quick Setup
1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd watchwise-frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the frontend root with these variables:

   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3001        # URL of the backend API
   NEXT_PUBLIC_AUTH_BASE_URL=http://localhost:3001       # URL of the backend for OAuth
   NEXT_PUBLIC_AUTH_CALLBACK_URL=http://localhost:3000/auth/callback   # Frontend OAuth callback URL
  
   ```

   ### Explanation of all .env variables
   - **NEXT_PUBLIC_API_BASE_URL**: The base URL for backend API requests (should match backend server)
   - **NEXT_PUBLIC_AUTH_BASE_URL**: The backend URL used for OAuth flows
   - **NEXT_PUBLIC_AUTH_CALLBACK_URL**: The frontend callback URL for OAuth (must be registered in Google/GitHub consoles)

4. **Start the frontend**

   ```bash
   npm run dev
   # or
   pnpm dev
   ```

   The app will be available at `http://localhost:3000` by default.

## Important notes
- Make sure the backend is running and accessible at the URL specified in your `.env`.
- For OAuth to work locally, set redirect URIs in Google/GitHub consoles to match your frontend and backend callback URLs.
- Usernames are unique: if the one proposed by Google/GitHub is already taken, the backend suggests alternatives and the UI lets the user choose a new one.
- All main UI components are in the `components/` folder. Pages are in `app/`.


## Website Structure & Main Features

The app is organized using the Next.js App Router. Main pages and features:

- `/` — Home: Welcome, intro, and call to action.
- `/login` — Login page: OAuth login (Google, GitHub).
- `/register` — Registration page: Start registration via OAuth.
- `/auth/callback` — Handles OAuth callback, session, and username selection if needed.
- `/profile` — User profile: View and edit username, avatar, preferences.
- `/groups` — List and manage user groups.
- `/groups/[id]` — Group details: Members, group recommendations, actions.
- `/lists` — User's movie lists (watchlist, favorites, etc.).
- `/movie/[id]` — Movie details: Info, actions, add to lists, mark as seen.
- `/person/[role]` — People search (actors, directors, etc.).
- `/search` — Search for movies.
- `/suggestions` — Personalized movie suggestions.
- `/seen` — User's watch history.
- `/questionnaire` — Mood and preference questionnaire.

### Key Features
- **OAuth Authentication**: Secure login/registration with Google and GitHub.
- **Unique Username Flow**: If the default username is taken, the user is prompted to choose another, with suggestions.
- **Profile Management**: Edit username, avatar, and preferences.
- **Group Recommendations**: Create/join groups, get group-based movie suggestions.
- **Personalized Suggestions**: Movie recommendations based on user/group preferences and history.
- **Lists & Watch History**: Manage custom lists and track watched movies.
- **Responsive UI**: Mobile-first, modern design.

## Main structure
- `app/` — Next.js app directory (pages, routing, API handlers)
- `components/` — UI components and widgets
- `lib/` — API and auth helpers
- `hooks/` — Custom React hooks
- `public/` — Static assets
- `styles/` — Global CSS

---

For questions or contributions, open an issue or contact the maintainer.
