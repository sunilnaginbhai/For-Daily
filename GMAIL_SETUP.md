# Gmail connection setup

The inbox connects with Google OAuth and the Gmail API. It requests the
`gmail.modify` scope to mark messages read or unread, star, archive, and move
messages to Trash, and to send replies from the message details drawer. New
message composition and permanent deletion are not implemented. Google's
`gmail.modify` permission is broader than those buttons and can allow those
operations through the API.

## Local setup

1. Copy `.env.example` to `.env` in the `folio` folder. The backend also checks
   the parent workspace folder for `.env` if no project-level file exists.
2. From the `folio` folder, install the frontend and backend dependencies:

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

6. Start the API and Vite:

   ```powershell
   npm run dev:backend
   ```

   In another terminal, start the frontend from the project root with
   `npm run dev:frontend`. Open `http://localhost:5173`, select **Email**,
   and click **Connect Gmail**.
   Use `localhost` consistently for the app; do not switch between it and
   `127.0.0.1` during OAuth because the session cookie is host-scoped.

   Alternatively, `npm run dev:full` starts both processes together, but only
   when port 5173 is free.

The OAuth client secret and session secret belong only in the ignored local
`.env` file. Never put them in `VITE_*` variables, frontend code, or source
control. The backend keeps OAuth tokens in server-side development sessions.
After changing Gmail permissions, restart the backend, disconnect Gmail in the
app, and connect again to grant the updated scope.

This backend is for local development. It uses an in-memory session store and
refuses to start with `NODE_ENV=production`; before deployment, configure a
persistent, protected session store and HTTPS cookie settings.
