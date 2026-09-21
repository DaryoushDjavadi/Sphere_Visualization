import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');
const SAVE_PATH = join(DATA_DIR, 'save.json');

export function loadSave() {
  try {
    if (!existsSync(SAVE_PATH)) return { players: {}, townProject: null, day: 1, season: 'Frühling' };
    return JSON.parse(readFileSync(SAVE_PATH, 'utf8'));
  } catch {
    return { players: {}, townProject: null, day: 1, season: 'Frühling' };
  }
}

export function writeSave(data) {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(SAVE_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('save failed', e.message);
  }
}
