import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TOWN_X = 56.5;
const TOWN_Y = 48.5;

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  protocolTimeout: 120000,
  args: ['--no-sandbox', '--disable-gpu', '--window-size=420,860'],
});

async function play(name) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:3847/?v=dual2', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#joinBtn');
  await page.click('#nameInput', { clickCount: 3 });
  await page.type('#nameInput', name);
  await page.click('#joinBtn');
  await page.waitForSelector('#game:not(.hidden)', { timeout: 30000 });
  await sleep(800);
  return page;
}

const pageA = await play('Lena');
const pageB = await play('Max');

await fetch('http://127.0.0.1:3847/api/debug/place', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'Lena', x: TOWN_X - 0.8, y: TOWN_Y }),
});
await fetch('http://127.0.0.1:3847/api/debug/place', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'Max', x: TOWN_X + 0.8, y: TOWN_Y }),
});
await sleep(600);

await pageA.click('#chatInput');
await pageA.type('#chatInput', 'Hey Max, hier!');
await pageA.click('#chatSend');
await sleep(500);

await pageA.screenshot({ path: '/opt/cursor/artifacts/hofdorf_two_players_lena_view.png' });
await pageB.screenshot({ path: '/opt/cursor/artifacts/hofdorf_two_players_max_view.png' });

await pageA.click('#btnInv');
await sleep(500);
await pageA.screenshot({ path: '/opt/cursor/artifacts/hofdorf_pack_quests.png' });
await pageA.click('#closeInv');

const zoneA = await pageA.$eval('#zoneLabel', (el) => el.textContent);
const zoneB = await pageB.$eval('#zoneLabel', (el) => el.textContent);
const logA = await pageA.$eval('#chatLog', (el) => el.innerText);
console.log({ zoneA, zoneB, logA: logA.slice(0, 240) });

await browser.close();
console.log('dual screenshots ok');
