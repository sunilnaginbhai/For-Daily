# Gmail connection setup

The inbox connects with Google OAuth and the Gmail API. It requests the
`gmail.modify` scope to mark messages read or unread, star, archive, and move
messages to Trash, and to send replies from the message details drawer. New
message composition and permanent deletion are not implemented. Google's
`gmail.modify` permission is broader than those buttons and can allow those
operations through the API.

## Local setup

1. Copy `.env.example` to `.env` in the project root. The backend also checks
   the parent workspace folder for `.env` if no project-level file exists.
2. From the project root, install the frontend and backend dependencies:

   ```powershell
   npm install
   ```
3. In Google Cloud Console, create a project, enable the Gmail API, and configure
   the OAuth consent screen. While the app is in testing mode, add the exact
   Google account you will sign in with under **Google Auth Platform > Audience >
   Test users**, then save the change. Under **Data Access**, include the Gmail
   API scope `https://www.googleapis.com/auth/gmail.modify`.
4. Create an OAuth client ID with application type **Web application** and add:
   - Authorized JavaScript origin: `http://localhost:5173`
   - Authorized redirect URI: `http://localhost:3001/auth/google/callback`
5. Put the client ID and client secret in `.env` as `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET`. Set `SESSION_SECRET` to a random value, for example:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   `SESSION_SECRET` is optional for local development; if omitted, the server
   generates a temporary value and sessions end when it restarts. This backend
   uses server-side sessions, not JWT, so `JWT_SECRET` is not required.

For private testing, leave the OAuth app in testing mode and add each account
that needs access as a test user. If Google shows **Access blocked** because the
app has not completed verification, confirm the signed-in account is on that
list and retry. Publishing the app to other users requires Google's OAuth
verification for Gmail scopes.

6. From the project root, start the API and Vite together:

   ```powershell
   npm run dev
   ```

   Open `http://localhost:5173`, select **Email**, and click **Connect Gmail**.
   Use `localhost` consistently for the app; do not switch between it and
   `127.0.0.1` during OAuth because the session cookie is host-scoped.

   To run them separately, use `npm run dev:backend` and
   `npm run dev:frontend` in different terminals.

The OAuth client secret and session secret belong only in the ignored local
`.env` file. Never put them in `VITE_*` variables, frontend code, or source
control. The backend keeps OAuth tokens in server-side development sessions.
After changing Gmail permissions, restart the backend, disconnect Gmail in the
app, and connect again to grant the updated scope.

## Gmail paging

The connected inbox requests 25 messages at a time. The backend passes Gmail's
`nextPageToken` through to the next request, loads message details only for that
page, and returns the token for the following page. Previous pages are cached
in the dashboard; the cache is bounded and filters start again at page one.
Use **Load as you scroll** to opt into loading the next page when the list
approaches the bottom. Inbox folders and user labels are loaded from Gmail, and search/date plus
high/low priority filters are sent with the message-list request.

The messages endpoint accepts page sizes from 20 to 30. Run the pagination
validation tests with `npm run test --workspace backend`.

Email HTML is sanitized by the backend before display. Inline CID images are
served through the authenticated backend; remote images stay blocked until
**Load images** is selected in the message drawer.

This backend is for local development. It uses an in-memory session store and
refuses to start with `NODE_ENV=production`; before deployment, configure a
persistent, protected session store and HTTPS cookie settings.

## Windows desktop app

The Electron shell runs the existing Express backend locally. In development,
it loads the Vite app; the packaged app serves the production frontend build
from the backend. The native window has standard Windows controls and can be
hidden to the system tray; closing the window does not quit the app. Use **Quit
Workspace** from the tray menu to exit.

Run the desktop version during development:

```powershell
npm run desktop:dev
```

The first run also downloads Electron's local Windows runtime if it is missing.

Create an unpacked Windows app for testing with `npm run desktop:dir`, or build
the NSIS installer with:

```powershell
npm run desktop:build
```

The installer is written to `release/`. The packaged app copies `.env.example`
to `%APPDATA%\Workspace\.env` on first launch. Add `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` there to enable Gmail. Keep the redirect URI set to
`http://localhost:3001/auth/google/callback`. Desktop Gmail sign-in opens the
system browser and returns to the app through the registered `workspace://`
protocol.

The repository currently has no MongoDB client, connection string, or MongoDB
usage. Desktop packaging preserves the existing in-memory Express session
behavior; Gmail sign-in must be repeated after the app restarts.
