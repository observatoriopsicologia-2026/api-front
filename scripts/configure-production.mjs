import { writeFile } from 'node:fs/promises';

const apiUrl = process.env.API_URL;
if (!apiUrl) {
  if (process.env.CF_PAGES) throw new Error('Define API_URL in Cloudflare Pages with the real HTTPS backend URL ending in /api.');
  console.log('API_URL not provided; using the saved production environment for this local build.');
} else {
  const url = new URL(apiUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !url.pathname.replace(/\/$/, '').endsWith('/api')) {
    throw new Error('API_URL must be a public HTTPS URL ending in /api, without credentials, query or fragment.');
  }
  if (!process.argv.includes('--check')) {
    const source = `export const environment = ${JSON.stringify({ production: true, apiUrl: apiUrl.replace(/\/$/, '') }, null, 2)};\n`;
    await writeFile(new URL('../src/environments/environment.prod.ts', import.meta.url), source);
  }
  console.log('Production API_URL validated.');
}
