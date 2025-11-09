import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';


const __dirname = path.dirname(fileURLToPath(import.meta.url));


export async function mermaidToPng(mermaid: string, outPath: string) {
const html = `<!doctype html><html><head>
<meta charset="utf-8" />
<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
mermaid.initialize({ startOnLoad: true, theme: 'default' });
</script>
<style>body{margin:0;padding:20px;}</style>
</head><body>
<div class="mermaid">${mermaid.replace(/`/g,'\`')}</div>
</body></html>`;


const tmp = path.join(__dirname, `tmp-${Date.now()}.html`);
await fs.writeFile(tmp, html, 'utf8');
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto('file://' + tmp, { waitUntil: 'networkidle0' });
const el = await page.$('.mermaid');
if (!el) throw new Error('Mermaid container not found');
const targetPath = outPath.endsWith('.png') ? outPath : `${outPath}.png`;
await el.screenshot({ path: targetPath as `${string}.png` });
await browser.close();
await fs.unlink(tmp);
}
