import WebSocket from 'ws';
import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function join(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:3847/ws');
    const st = { ws, name, results: [] };
    ws.on('open', () => ws.send(JSON.stringify({ type: 'join', name })));
    ws.on('error', reject);
    ws.on('message', (buf) => {
      const msg = JSON.parse(String(buf));
      if (msg.type === 'welcome') st.welcome = msg;
      if (msg.type === 'state') st.state = msg;
      if (msg.type === 'action_result') st.results.push(msg);
    });
    setTimeout(() => resolve(st), 300);
  });
}

async function act(st, payload) {
  st.ws.send(JSON.stringify({ type: 'action', ...payload }));
  await sleep(120);
}

console.log('== feature smoke ==');
const a = await join('Anna');
const b = await join('Ben');
console.log('farms', a.welcome.farms.length, 'npcs', a.welcome.npcs?.length, 'mine', !!a.welcome.mine);
console.log('assigned', a.welcome.farms.find((f) => f.ownerId === a.welcome.you)?.id, b.welcome.farms.find((f) => f.ownerId === b.welcome.you)?.id);

await act(a, { buyAnimal: 'chicken' });
await act(a, { chat: 'Hallo Ben!' });
await act(a, { renameFarm: 'Sonnenhof' });
// give anna wood via cheat by planting path - use inventory from save; instead buy and mine
await act(a, { mineEnter: true });
await sleep(100);
// till/pick near - just upgrade fails without ore
await act(a, { upgradeTool: 'hoe' });
await act(a, { shop: true, buy: 'berry' });
await act(a, { trade: true, to: 'Ben', item: 'parsnip_seed', qty: 2, gold: 10 });
await sleep(100);
await act(b, { acceptTrade: 'Anna' });
await act(a, { talkNpc: 'mira' });
console.log('anna last results', a.results.slice(-8));
console.log('ben last', b.results.slice(-3));
console.log('trade inventory ben seeds', b.state.players.find((p) => p.self).inventory.parsnip_seed);
console.log('chat has hello', a.state.chat.some((c) => c.text.includes('Hallo')));

// Move both toward town center for meetup screenshots via puppeteer
a.ws.close();
b.ws.close();

console.log('== dual browser ==');
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=900,500'],
});

const pageA = await browser.newPage();
await pageA.setViewport({ width: 450, height: 800, isMobile: true, hasTouch: true });
const pageB = await browser.newPage();
await pageB.setViewport({ width: 450, height: 800, isMobile: true, hasTouch: true });

async function enter(page, name) {
  await page.goto('http://127.0.0.1:3847/?dual=1', { waitUntil: 'networkidle0' });
  await page.click('#nameInput', { clickCount: 3 });
  await page.type('#nameInput', name);
  await page.click('#joinBtn');
  await page.waitForSelector('#game:not(.hidden)');
  await sleep(500);
}

await enter(pageA, 'Lena');
await enter(pageB, 'Max');

async function hold(page, key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
}

// Walk both toward town - Lena from n farm go down, Max similar
for (let i = 0; i < 70; i++) {
  await hold(pageA, 'ArrowDown', 55);
  await hold(pageB, 'ArrowDown', 55);
}
await sleep(400);

// chat
await pageA.click('#chatInput');
await pageA.type('#chatInput', 'Treffen am Brunnen!');
await pageA.click('#chatSend');
await sleep(300);

await pageA.screenshot({ path: '/opt/cursor/artifacts/hofdorf_two_players_lena.png' });
await pageB.screenshot({ path: '/opt/cursor/artifacts/hofdorf_two_players_max.png' });

// Open inventory on Lena
await pageA.click('#btnInv');
await sleep(400);
await pageA.screenshot({ path: '/opt/cursor/artifacts/hofdorf_inventory_animals.png' });
await pageA.click('#closeInv');

// Side-by-side composite via second browser window width - take town meetup
// Move Max left/right to seek Lena - both should be near town path x~56
for (let i = 0; i < 20; i++) await hold(pageB, 'ArrowRight', 50);
for (let i = 0; i < 20; i++) await hold(pageA, 'ArrowLeft', 50);
await sleep(500);

const zoneA = await pageA.$eval('#zoneLabel', (el) => el.textContent);
const zoneB = await pageB.$eval('#zoneLabel', (el) => el.textContent);
const playersOnA = await pageA.evaluate(() => {
  // can't access state; check chat log for both names
  return document.getElementById('chatLog')?.innerText || '';
});
console.log({ zoneA, zoneB, chatSnippet: playersOnA.slice(0, 200) });

await pageA.screenshot({ path: '/opt/cursor/artifacts/hofdorf_meetup_from_lena.png' });
await pageB.screenshot({ path: '/opt/cursor/artifacts/hofdorf_meetup_from_max.png' });

await browser.close();
console.log('DONE');
