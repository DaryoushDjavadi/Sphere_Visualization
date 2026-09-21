import WebSocket from 'ws';
import puppeteer from 'puppeteer-core';

function client(name) {
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://127.0.0.1:3847/ws');
    const st = { ws, results: [] };
    ws.on('open', () => ws.send(JSON.stringify({ type: 'join', name })));
    ws.on('message', (buf) => {
      const msg = JSON.parse(String(buf));
      if (msg.type === 'welcome') st.welcome = msg;
      if (msg.type === 'state') st.last = msg;
      if (msg.type === 'action_result') st.results.push(msg);
    });
    setTimeout(() => resolve(st), 250);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const anna = await client('Anna');
const ben = await client('Ben');
console.log('assigned', {
  anna: anna.welcome.farms.find((f) => f.ownerId === anna.welcome.you)?.name,
  ben: ben.welcome.farms.find((f) => f.ownerId === ben.welcome.you)?.name,
});

async function act(st, select) {
  st.ws.send(JSON.stringify({ type: 'input', select }));
  await sleep(40);
  st.ws.send(JSON.stringify({ type: 'action' }));
  await sleep(220);
}

await act(anna, 0);
await act(anna, 5);
await act(anna, 1);
console.log('farm results', anna.results);
console.log('overlays', anna.last.overlays);

for (let i = 0; i < 140; i++) {
  ben.ws.send(JSON.stringify({ type: 'input', up: true }));
  await sleep(45);
}
ben.ws.send(JSON.stringify({ type: 'input', up: false }));
await sleep(120);
const bm = ben.last.players.find((p) => p.self);
const am = anna.last.players.find((p) => p.self);
const annaFarm = ben.last.farms.find((f) => f.id === 'n');
const onAnna =
  bm.x >= annaFarm.ox &&
  bm.x < annaFarm.ox + annaFarm.w &&
  bm.y >= annaFarm.oy &&
  bm.y < annaFarm.oy + annaFarm.h;
console.log(
  'ben pos',
  bm.x.toFixed(1),
  bm.y.toFixed(1),
  'anna',
  am.x.toFixed(1),
  am.y.toFixed(1),
  'benOnNordhof',
  onAnna,
);
console.log('players synced', ben.last.players.map((p) => p.name).join(','), '|', anna.last.players.map((p) => p.name).join(','));

anna.ws.close();
ben.ws.close();

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=390,844'],
  defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:3847', { waitUntil: 'networkidle0' });
await page.click('#nameInput', { clickCount: 3 });
await page.type('#nameInput', 'Dary');
await page.click('#joinBtn');
await page.waitForSelector('#game:not(.hidden)');
await sleep(500);

async function hold(key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
}

await page.keyboard.press('Digit1');
await sleep(50);
for (let i = 0; i < 4; i++) {
  await page.keyboard.press('Space');
  await sleep(220);
  await hold('ArrowRight', 100);
}
await page.keyboard.press('Digit6');
await sleep(50);
for (let i = 0; i < 4; i++) {
  await page.keyboard.press('Space');
  await sleep(220);
  await hold('ArrowLeft', 100);
}
await page.keyboard.press('Digit2');
await sleep(50);
for (let i = 0; i < 4; i++) {
  await page.keyboard.press('Space');
  await sleep(220);
  await hold('ArrowRight', 100);
}
await sleep(400);
await page.screenshot({ path: '/opt/cursor/artifacts/08_crops_planted.png' });
for (let i = 0; i < 45; i++) await hold('ArrowDown', 70);
await sleep(300);
await page.screenshot({ path: '/opt/cursor/artifacts/09_town_plaza.png' });
console.log('final zone', await page.$eval('#zoneLabel', (el) => el.textContent));
await browser.close();
console.log('OK');
