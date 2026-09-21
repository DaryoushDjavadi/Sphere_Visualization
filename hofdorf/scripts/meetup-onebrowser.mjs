import WebSocket from 'ws';
import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TOWN = { x: 56.5, y: 48.5 };

function wsJoin(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:3847/ws');
    const st = { ws, name };
    ws.on('open', () => ws.send(JSON.stringify({ type: 'join', name })));
    ws.on('error', reject);
    ws.on('message', (buf) => {
      const msg = JSON.parse(String(buf));
      if (msg.type === 'welcome') st.welcome = msg;
      if (msg.type === 'state') st.state = msg;
    });
    setTimeout(() => resolve(st), 400);
  });
}

async function place(name, x, y) {
  await fetch('http://127.0.0.1:3847/api/debug/place', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, x, y }),
  });
}

const max = await wsJoin('Max');
console.log('Max farm', max.welcome.farms.find((f) => f.ownerId === max.welcome.you)?.displayName);
await place('Max', TOWN.x + 1.2, TOWN.y);

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  protocolTimeout: 180000,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.setDefaultTimeout(60000);

await page.goto('http://127.0.0.1:3847/?v=meet', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#joinBtn');
await page.click('#nameInput', { clickCount: 3 });
await page.keyboard.type('Lena');
await page.click('#joinBtn');
await page.waitForSelector('#game:not(.hidden)');
await sleep(1000);
await place('Lena', TOWN.x - 1.2, TOWN.y);
await sleep(800);

// chat
await page.click('#chatInput');
await page.keyboard.type('Hey Max!');
await page.click('#chatSend');
await sleep(700);

const names = await page.$eval('#chatLog', (el) => el.innerText);
const zone = await page.$eval('#zoneLabel', (el) => el.textContent);
console.log({ zone, names: names.slice(0, 300) });

await page.screenshot({ path: '/opt/cursor/artifacts/hofdorf_two_players_together.png' });

await page.click('#btnInv');
await sleep(600);
await page.screenshot({ path: '/opt/cursor/artifacts/hofdorf_pack_panel.png' });

// verify Max still visible in state via health players
const health = await fetch('http://127.0.0.1:3847/api/health').then((r) => r.json());
console.log('players online', health.players);

await browser.close();
max.ws.close();
console.log('ok');
