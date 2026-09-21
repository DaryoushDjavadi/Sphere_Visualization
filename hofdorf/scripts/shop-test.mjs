import WebSocket from 'ws';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function join(name) {
  return new Promise((res) => {
    const ws = new WebSocket('ws://127.0.0.1:3847/ws');
    const st = { ws, res: [] };
    ws.on('open', () => ws.send(JSON.stringify({ type: 'join', name })));
    ws.on('message', (b) => {
      const m = JSON.parse(String(b));
      if (m.type === 'welcome') st.w = m;
      if (m.type === 'state') st.s = m;
      if (m.type === 'action_result') st.res.push(m);
    });
    setTimeout(() => res(st), 250);
  });
}

const a = await join('Anna');
const b = await join('Ben');
console.log('gold', a.w.players.find((p) => p.self).gold);
console.log('shops', a.w.shops.map((s) => s.name));

a.ws.send(JSON.stringify({ type: 'action', shop: true, claim: 'kitchen' }));
await sleep(120);
b.ws.send(JSON.stringify({ type: 'action', shop: true, claim: 'kitchen' }));
await sleep(100);
a.ws.send(JSON.stringify({ type: 'action', shop: true, shopId: 'kitchen', invite: 'Ben' }));
await sleep(100);

// grant potatoes by planting path — directly mutate via deposit after invent cheat:
// Use seed shop claim with remaining gold instead
a.ws.send(JSON.stringify({ type: 'action', shop: true, claim: 'seeds' }));
await sleep(80);

console.log('anna results', a.res);
console.log('ben results', b.res);
console.log('kitchen', a.s.shops.find((s) => s.id === 'kitchen'));
console.log('help page', await fetch('http://127.0.0.1:3847/').then((r) => r.status));
const html = await fetch('http://127.0.0.1:3847/').then((r) => r.text());
console.log('has help modal', html.includes('id="help"'));
console.log('has business tab', html.includes('data-tab="business"'));

a.ws.close();
b.ws.close();
