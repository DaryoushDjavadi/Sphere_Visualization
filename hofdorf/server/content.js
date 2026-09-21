/** NPCs, quests, town project, animals helpers */

export function createNpcs(town) {
  const cx = town.ox + Math.floor(town.w / 2);
  const cy = town.oy + Math.floor(town.h / 2);
  return [
    {
      id: 'mira',
      name: 'Mira',
      role: 'Händlerin',
      color: '#e87ab8',
      x: cx - 3.5,
      y: cy + 2.5,
      homeX: cx - 3.5,
      homeY: cy + 2.5,
      dir: 'down',
      quest: {
        id: 'mira_tomato',
        text: 'Bring mir 3 Tomaten für die Küche.',
        needs: { tomato: 3 },
        rewardGold: 200,
        rewardItem: null,
      },
    },
    {
      id: 'otto',
      name: 'Otto',
      role: 'Fischer',
      color: '#4c8fe8',
      x: cx + 4.5,
      y: cy + 4.5,
      homeX: cx + 4.5,
      homeY: cy + 4.5,
      dir: 'left',
      quest: {
        id: 'otto_fish',
        text: 'Fang einen Barsch für mich.',
        needs: { fish_common: 1 },
        rewardGold: 120,
        rewardItem: { rod: 0 },
      },
    },
    {
      id: 'lina',
      name: 'Lina',
      role: 'Schreinerin',
      color: '#e8c84c',
      x: cx - 1.5,
      y: cy - 2.5,
      homeX: cx - 1.5,
      homeY: cy - 2.5,
      dir: 'right',
      quest: {
        id: 'lina_wood',
        text: 'Ich brauche 8 Holz für den Dorfbrunnen.',
        needs: { wood: 8 },
        rewardGold: 150,
        rewardItem: null,
      },
    },
  ];
}

export function createTownProject() {
  return {
    id: 'fountain',
    name: 'Dorfbrunnen-Ausbau',
    blurb: 'Gemeinsam Holz & Stein spenden — alle profitieren.',
    needs: { wood: 40, stone: 30 },
    progress: { wood: 0, stone: 0 },
    complete: false,
    bonusGold: 100, // paid to each online player when finished
  };
}

export function createFarmAnimals() {
  return []; // { id, type, fed, ready }
}
