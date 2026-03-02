/**
 * Etsy OAuth 2.0 Helper (PKCE Flow)
 *
 * Generates tokens for the Etsy API and saves them to .env.local.
 * Uses only Node.js built-ins + global fetch (no new dependencies).
 *
 * Prerequisites:
 *   1. Add http://localhost:3003/oauth/redirect as a callback URL in
 *      your Etsy app settings: https://www.etsy.com/developers/your-account
 *   2. Ensure ETSY_API_KEY is set in .env.local
 *
 * Run:  npx tsx scripts/etsy-oauth.ts
 */

import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const ENV_FILE = resolve(import.meta.dirname ?? __dirname, '..', '.env.local');
const REDIRECT_URI = 'http://localhost:3003/oauth/redirect';
const PORT = 3003;
const SCOPES = 'transactions_r email_r';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readEnvFile(): string {
  try {
    return readFileSync(ENV_FILE, 'utf-8');
  } catch {
    return '';
  }
}

function getEnvValue(content: string, key: string): string {
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match?.[1]?.trim() ?? '';
}

function upsertEnvValue(content: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  // Append after existing ETSY_ block or at end
  return content.trimEnd() + '\n' + line + '\n';
}

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function generatePKCE() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function openBrowser(url: string) {
  const cmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
        ? `start "${url}"`
        : `xdg-open "${url}"`;
  execSync(cmd);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n--- Etsy OAuth 2.0 (PKCE) ---\n');

  const envContent = readEnvFile();
  const clientId = getEnvValue(envContent, 'ETSY_API_KEY');

  if (!clientId) {
    console.error('Error: ETSY_API_KEY not found in .env.local');
    process.exit(1);
  }

  const { verifier, challenge } = generatePKCE();
  const state = randomBytes(16).toString('hex');

  // Build authorization URL
  const authUrl = new URL('https://www.etsy.com/oauth/connect');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  // Start local server to receive the callback
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

    if (url.pathname !== '/oauth/redirect') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const returnedState = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h2>Authorization failed</h2><p>${error}</p>`);
      console.error(`\nAuthorization failed: ${error}`);
      shutdown(1);
      return;
    }

    if (returnedState !== state) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h2>State mismatch — possible CSRF attack</h2>');
      console.error('\nState mismatch. Aborting.');
      shutdown(1);
      return;
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h2>No authorization code received</h2>');
      console.error('\nNo authorization code in callback.');
      shutdown(1);
      return;
    }

    console.log('Authorization code received. Exchanging for tokens...');

    try {
      const tokenRes = await fetch(
        'https://api.etsy.com/v3/public/oauth/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            redirect_uri: REDIRECT_URI,
            code,
            code_verifier: verifier,
          }),
        }
      );

      if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        throw new Error(`Token exchange failed (${tokenRes.status}): ${errBody}`);
      }

      const tokens = await tokenRes.json();
      const accessToken: string = tokens.access_token;
      const refreshToken: string = tokens.refresh_token;

      // Update .env.local
      let updated = readEnvFile();
      updated = upsertEnvValue(updated, 'ETSY_ACCESS_TOKEN', accessToken);
      updated = upsertEnvValue(updated, 'ETSY_REFRESH_TOKEN', refreshToken);
      writeFileSync(ENV_FILE, updated);

      console.log('\nTokens saved to .env.local');
      console.log(`  Access token:  ${accessToken.slice(0, 20)}...`);
      console.log(`  Refresh token: ${refreshToken.slice(0, 20)}...`);
      console.log(`  Expires in:    ${tokens.expires_in}s`);
      console.log('\nRestart the dev server to pick up the new tokens.\n');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<h2>Success!</h2><p>Tokens saved. You can close this tab.</p>'
      );
      shutdown(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h2>Token exchange error</h2><pre>${msg}</pre>`);
      console.error(`\nToken exchange error: ${msg}`);
      shutdown(1);
    }
  });

  function shutdown(code: number) {
    server.close(() => process.exit(code));
    // Force exit after 2s if server doesn't close cleanly
    setTimeout(() => process.exit(code), 2000);
  }

  server.listen(PORT, () => {
    console.log(`Callback server listening on http://localhost:${PORT}`);
    console.log('Opening browser for Etsy authorization...\n');
    openBrowser(authUrl.toString());
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
