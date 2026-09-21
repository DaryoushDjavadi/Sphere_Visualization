/** UI extras: inventory, chat, animals, quests, trade, sounds */

export function createSfx() {
  let ctx;
  function beep(freq = 440, dur = 0.08, type = 'square', gain = 0.03) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.stop(ctx.currentTime + dur);
    } catch {
      /* ignore */
    }
  }
  return {
    ok: () => beep(520, 0.07),
    plant: () => beep(360, 0.09, 'triangle'),
    harvest: () => beep(660, 0.1, 'sine'),
    coin: () => { beep(800, 0.05); setTimeout(() => beep(1000, 0.06), 50); },
    error: () => beep(180, 0.12, 'sawtooth', 0.025),
    chat: () => beep(440, 0.04, 'sine', 0.02),
  };
}

export function wireExtras({ sendAction, toast, getState, openModals }) {
  const sfx = createSfx();
  const invModal = document.getElementById('invModal');
  const npcModal = document.getElementById('npcModal');
  let activeNpc = null;

  function closeAll() {
    invModal?.classList.add('hidden');
    npcModal?.classList.add('hidden');
    openModals?.();
  }

  function openInv() {
    document.getElementById('shop')?.classList.add('hidden');
    document.getElementById('help')?.classList.add('hidden');
    document.getElementById('mapModal')?.classList.add('hidden');
    invModal.classList.remove('hidden');
    renderInv();
  }

  function renderInv() {
    const state = getState();
    if (!state) return;
    const me = state.players.find((p) => p.self);
    if (!me) return;
    const list = document.getElementById('invList');
    const items = Object.entries(me.inventory).filter(([, n]) => n > 0);
    list.innerHTML = items.map(([k, n]) => `<div>${k}: <b>${n}</b></div>`).join('') || '<div>Leer</div>';
    const fest = state.festival ? ` · Fest: ${state.festival.name}` : '';
    document.getElementById('invMeta').textContent =
      `Markt ×${(state.marketMod || 1).toFixed(2)}${fest} · Tools ${JSON.stringify(me.toolLevels || {})}`;

    const farm = state.farms.find((f) => f.ownerId === me.id);
    const ap = document.getElementById('animalPanel');
    if (!farm?.animals?.length) {
      ap.innerHTML = '<h3>Tiere</h3><p>Noch keine — kaufe Huhn/Kuh.</p>';
    } else {
      ap.innerHTML = `<h3>Tiere</h3>` + farm.animals.map((a) => {
        const st = a.ready ? 'bereit!' : a.fed ? 'gefüttert' : 'hungrig';
        return `<div class="row" style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">
          <span>${a.type} (${st})</span>
          <button type="button" data-feed="${a.id}">Füttern</button>
          <button type="button" data-collect="${a.id}">Einsammeln</button>
        </div>`;
      }).join('');
      ap.querySelectorAll('[data-feed]').forEach((b) => b.onclick = () => sendAction({ feedAnimal: b.dataset.feed }));
      ap.querySelectorAll('[data-collect]').forEach((b) => b.onclick = () => sendAction({ collectAnimal: b.dataset.collect }));
    }

    const qp = document.getElementById('questPanel');
    qp.innerHTML = `<h3>NPCs in der Stadt</h3>` + (state.npcs || []).map((n) => {
      const done = (state.questsDone || []).includes(n.quest.id);
      return `<div style="margin:6px 0"><b>${n.name}</b> (${n.role}) — ${done ? 'erledigt' : n.quest.text}
        <button type="button" data-npc="${n.id}">Reden</button></div>`;
    }).join('');
    qp.querySelectorAll('[data-npc]').forEach((b) => b.onclick = () => talkNpc(b.dataset.npc));

    const proj = state.townProject;
    const pp = document.getElementById('projectPanel');
    if (proj) {
      pp.innerHTML = `<h3>${proj.name}</h3><p>${proj.blurb}</p>
        <p>Holz ${proj.progress.wood}/${proj.needs.wood} · Stein ${proj.progress.stone}/${proj.needs.stone}
        ${proj.complete ? ' ✓ fertig' : ''}</p>
        <button type="button" id="donWood">+1 Holz</button>
        <button type="button" id="donStone">+1 Stein</button>`;
      document.getElementById('donWood').onclick = () => sendAction({ donate: 'wood', qty: 1 });
      document.getElementById('donStone').onclick = () => sendAction({ donate: 'stone', qty: 1 });
    }

    const offers = document.getElementById('tradeOffers');
    offers.innerHTML = (state.trades || []).map((t) =>
      `<div style="margin:6px 0">${t.fromName} bietet ${t.qty}× ${t.item} für ${t.gold}g
        <button type="button" data-acc="${t.fromName}">Annehmen</button></div>`,
    ).join('') || '<p class="muted">Keine offenen Angebote an dich.</p>';
    offers.querySelectorAll('[data-acc]').forEach((b) => {
      b.onclick = () => sendAction({ acceptTrade: b.dataset.acc });
    });
  }

  function talkNpc(id) {
    sendAction({ talkNpc: id });
    activeNpc = id;
  }

  function showNpc(msg) {
    if (!msg.npc) return;
    activeNpc = msg.npc.id;
    document.getElementById('npcTitle').textContent = `${msg.npc.name} · ${msg.npc.role}`;
    document.getElementById('npcText').textContent = msg.finished
      ? 'Danke nochmal — Auftrag ist erledigt.'
      : msg.npc.quest.text;
    npcModal.classList.remove('hidden');
  }

  document.getElementById('btnInv')?.addEventListener('click', openInv);
  document.getElementById('closeInv')?.addEventListener('click', () => invModal.classList.add('hidden'));
  document.getElementById('closeNpc')?.addEventListener('click', () => npcModal.classList.add('hidden'));
  document.getElementById('npcQuestBtn')?.addEventListener('click', () => {
    if (activeNpc) sendAction({ completeQuest: activeNpc });
  });
  document.getElementById('btnBuyChicken')?.addEventListener('click', () => sendAction({ buyAnimal: 'chicken' }));
  document.getElementById('btnBuyCow')?.addEventListener('click', () => sendAction({ buyAnimal: 'cow' }));
  document.getElementById('btnMineWarp')?.addEventListener('click', () => sendAction({ mineEnter: true }));
  document.getElementById('btnUpgradeHoe')?.addEventListener('click', () => sendAction({ upgradeTool: 'hoe' }));
  document.getElementById('tradeSend')?.addEventListener('click', () => {
    sendAction({
      trade: true,
      to: document.getElementById('tradeTo').value,
      item: document.getElementById('tradeItem').value,
      qty: Number(document.getElementById('tradeQty').value || 1),
      gold: Number(document.getElementById('tradeGold').value || 0),
    });
  });

  const chatInput = document.getElementById('chatInput');
  const sendChat = () => {
    const text = chatInput.value.trim();
    if (!text) return;
    sendAction({ chat: text });
    chatInput.value = '';
    sfx.chat();
  };
  document.getElementById('chatSend')?.addEventListener('click', sendChat);
  chatInput?.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') sendChat();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyI') openInv();
    if (e.code === 'KeyT' && !e.ctrlKey) chatInput?.focus();
  });

  return {
    sfx,
    openInv,
    renderInv,
    showNpc,
    onActionResult(msg) {
      if (msg.error) sfx.error();
      else if (msg.earned != null || msg.collected != null || msg.gold) sfx.coin();
      else if (msg.planted) sfx.plant();
      else if (msg.harvest || msg.fish || msg.got) sfx.harvest();
      else if (msg.ok) sfx.ok();
      if (msg.npc) showNpc(msg);
      if (!invModal.classList.contains('hidden')) renderInv();
    },
  };
}
