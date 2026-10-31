/* Scribble Siege — game data. Every number the game uses lives here, so the
   guide pages can print the same tables the game plays by. */

export const RUN_SECONDS = 600; // a full run: survive ten minutes
export const BOSS_AT = 540; // the Big Eraser arrives at 9:00
export const MAX_WEAPONS = 4;
export const MAX_PASSIVES = 4;
export const MAX_LEVEL = 5;

/* ---------- weapons ---------- */

const L = (damage, cooldown, count, area, pierce = 1) => ({
  damage,
  cooldown,
  count,
  area,
  pierce
});
export const weapons = {
  darts: {
    id: 'darts',
    name: 'Pencil Darts',
    icon: '✏️',
    blurb: 'Fires sharpened pencils at the nearest scribble.',
    levels: [L(10, 0.9, 1, 0), L(10, 0.9, 2, 0), L(14, 0.8, 2, 0, 2), L(14, 0.7, 3, 0, 2), L(20, 0.6, 4, 0, 3)],
    changes: ['One pencil at the nearest enemy.', '+1 pencil per volley.', '+40% damage, pierces 2, faster.', '+1 pencil, faster.', '+40% damage, +1 pencil, pierces 3.']
  },
  orbit: {
    id: 'orbit',
    name: 'Eraser Orbit',
    icon: '🧽',
    blurb: 'Erasers circle you, rubbing out anything they touch.',
    levels: [L(8, 0.5, 2, 70), L(8, 0.5, 3, 75), L(11, 0.45, 3, 85), L(11, 0.45, 4, 95), L(15, 0.4, 5, 105)],
    changes: ['Two erasers circle you.', '+1 eraser.', '+35% damage, wider circle.', '+1 eraser, wider circle.', '+35% damage, +1 eraser.']
  },
  splash: {
    id: 'splash',
    name: 'Marker Splash',
    icon: '🖍️',
    blurb: 'A burst of marker ink hits everything around you.',
    levels: [L(14, 2.1, 1, 95), L(18, 2.0, 1, 105), L(18, 2.0, 1, 115), L(24, 1.8, 1, 125), L(30, 1.5, 1, 140)],
    changes: ['A ring of ink every few seconds.', '+30% damage, bigger.', 'Faster, bigger.', '+35% damage, faster.', '+25% damage, much bigger.']
  },
  ruler: {
    id: 'ruler',
    name: 'Ruler Swipe',
    icon: '📏',
    blurb: 'A wide swing in the direction you’re moving.',
    levels: [L(22, 1.15, 1, 115), L(28, 1.1, 1, 125), L(28, 1.1, 2, 125), L(36, 1.0, 2, 135), L(46, 0.85, 2, 150)],
    changes: ['Swings forward.', '+25% damage, longer.', 'Swings forward and back.', '+30% damage, faster.', '+30% damage, faster, longer.']
  },
  planes: {
    id: 'planes',
    name: 'Paper Planes',
    icon: '🛩️',
    blurb: 'Planes glide out in random directions, slicing through crowds.',
    levels: [L(12, 1.6, 2, 0, 4), L(12, 1.5, 3, 0, 5), L(16, 1.4, 3, 0, 6), L(16, 1.2, 4, 0, 7), L(22, 1.0, 5, 0, 9)],
    changes: ['Two planes that pierce four enemies.', '+1 plane.', '+35% damage, pierce more.', '+1 plane, faster.', '+35% damage, +1 plane.']
  },
  ink: {
    id: 'ink',
    name: 'Ink Puddles',
    icon: '💧',
    blurb: 'Spills ink nearby that hurts scribbles standing in it.',
    levels: [L(5, 3.0, 1, 50), L(6, 2.8, 2, 55), L(7, 2.6, 2, 65), L(8, 2.3, 3, 70), L(10, 2.0, 4, 80)],
    changes: ['One puddle that burns for 3 seconds.', '+1 puddle.', 'Bigger, stronger.', '+1 puddle, faster.', '+1 puddle, bigger, stronger.']
  }
};

/* ---------- passives ---------- */

export const passives = {
  sharpener: {
    id: 'sharpener',
    name: 'Sharpener',
    icon: '🪒',
    effect: '+10% damage per level'
  },
  sneakers: {
    id: 'sneakers',
    name: 'Sneakers',
    icon: '👟',
    effect: '+8% move speed per level'
  },
  magnet: {
    id: 'magnet',
    name: 'Fridge Magnet',
    icon: '🧲',
    effect: '+25% pickup range per level'
  },
  hardcover: {
    id: 'hardcover',
    name: 'Hardcover',
    icon: '📕',
    effect: '+20 max health per level'
  },
  coffee: {
    id: 'coffee',
    name: 'Cold Coffee',
    icon: '☕',
    effect: '−7% weapon cooldowns per level'
  },
  notes: {
    id: 'notes',
    name: 'Study Notes',
    icon: '🗒️',
    effect: '+10% experience per level'
  }
};

/* ---------- heroes ---------- */

export const heroes = [{
  id: 'pip',
  name: 'Pip the Pencil',
  weapon: 'darts',
  health: 1,
  speed: 1,
  colour: '#E0A030',
  story: 'Pip has been doodling in margins since the first day of school, and isn’t about to let some scribbles take over the page.',
  unlock: {
    kind: 'free'
  }
}, {
  id: 'ed',
  name: 'Eraser Ed',
  weapon: 'orbit',
  health: 1.25,
  speed: 0.92,
  colour: '#E58FA8',
  story: 'Ed is soft-spoken and slightly squishy, but every mistake that gets close to him disappears.',
  unlock: {
    kind: 'survive',
    seconds: 180
  }
}, {
  id: 'mo',
  name: 'Marker Mo',
  weapon: 'splash',
  health: 0.9,
  speed: 1.05,
  colour: '#3F7FD8',
  story: 'Mo is permanent, bold and a little bit smelly. Mo does not do subtle.',
  unlock: {
    kind: 'kills',
    total: 1500
  }
}, {
  id: 'rae',
  name: 'Ruler Rae',
  weapon: 'ruler',
  health: 1.1,
  speed: 1,
  colour: '#3E9E57',
  story: 'Rae measures twice and swings once. Straight lines only.',
  unlock: {
    kind: 'win'
  }
}];
export const BASE = {
  health: 100,
  speed: 150,
  // world units per second
  pickup: 100,
  // gem pull radius
  radius: 16,
  // hero body
  invulnerable: 0.65 // seconds after a hit
};

/* ---------- enemies ---------- */

export const enemies = {
  scribble: {
    id: 'scribble',
    name: 'Scribble',
    health: 12,
    speed: 62,
    damage: 7,
    radius: 13,
    xp: 1,
    colour: '#4A4459',
    blurb: 'A tangle of pencil lines. Slow, but there are always more.'
  },
  squiggle: {
    id: 'squiggle',
    name: 'Squiggle',
    health: 8,
    speed: 105,
    damage: 5,
    radius: 10,
    xp: 1,
    colour: '#7A55C4',
    blurb: 'Fast and flimsy. Arrives in quick waves.'
  },
  stickman: {
    id: 'stickman',
    name: 'Angry Stickman',
    health: 30,
    speed: 72,
    damage: 10,
    radius: 15,
    xp: 3,
    colour: '#2D2B33',
    blurb: 'Tougher than he looks. Marches straight at you.'
  },
  bat: {
    id: 'bat',
    name: 'Paper Bat',
    health: 18,
    speed: 120,
    damage: 7,
    radius: 12,
    xp: 2,
    colour: '#8A8170',
    blurb: 'Folded from homework. Flutters in from the dark.'
  },
  blot: {
    id: 'blot',
    name: 'Ink Blot',
    health: 90,
    speed: 42,
    damage: 16,
    radius: 26,
    xp: 8,
    colour: '#1F3A8A',
    blurb: 'A big, slow puddle of ink that soaks up hits.'
  },
  eraser: {
    id: 'eraser',
    name: 'The Big Eraser',
    health: 4200,
    speed: 58,
    damage: 35,
    radius: 48,
    xp: 0,
    colour: '#E58FA8',
    blurb: 'The boss. It wants a blank page.'
  }
};

/** Which enemies spawn, and how fast, at each point in the run. */

export const waves = [{
  from: 0,
  perSecond: 1.2,
  mix: [['scribble', 1]],
  toughness: 1
}, {
  from: 45,
  perSecond: 1.8,
  mix: [['scribble', 3], ['squiggle', 1]],
  toughness: 1
}, {
  from: 100,
  perSecond: 2.4,
  mix: [['scribble', 3], ['squiggle', 2], ['stickman', 1]],
  toughness: 1.15
}, {
  from: 180,
  perSecond: 3.0,
  mix: [['scribble', 2], ['squiggle', 2], ['stickman', 2], ['bat', 1]],
  toughness: 1.3
}, {
  from: 260,
  perSecond: 3.6,
  mix: [['squiggle', 2], ['stickman', 2], ['bat', 2], ['blot', 1]],
  toughness: 1.5
}, {
  from: 340,
  perSecond: 4.4,
  mix: [['scribble', 2], ['stickman', 3], ['bat', 2], ['blot', 1]],
  toughness: 1.8
}, {
  from: 420,
  perSecond: 5.2,
  mix: [['squiggle', 3], ['stickman', 3], ['bat', 3], ['blot', 2]],
  toughness: 2.2
}, {
  from: 500,
  perSecond: 6.0,
  mix: [['stickman', 3], ['bat', 3], ['blot', 3]],
  toughness: 2.6
}];
export function waveAt(t) {
  let w = waves[0];
  for (const x of waves) if (t >= x.from) w = x;
  return w;
}

/** Experience needed to go from `level` to `level + 1`. */
export function xpToNext(level) {
  return Math.round(4 + level * 3 + level * level * 0.45);
}

/* ---------- permanent upgrades (the mind map) ---------- */

const cost = (base, step) => owned => base + owned * step;
export const upgrades = [{
  id: 'might',
  name: 'Might',
  icon: '💪',
  effect: '+5% damage per level',
  max: 5,
  cost: cost(60, 50)
}, {
  id: 'toughness',
  name: 'Toughness',
  icon: '🛡️',
  effect: '+10 max health per level',
  max: 5,
  cost: cost(50, 40)
}, {
  id: 'swiftness',
  name: 'Swiftness',
  icon: '💨',
  effect: '+4% move speed per level',
  max: 3,
  cost: cost(60, 60)
}, {
  id: 'magnetism',
  name: 'Magnetism',
  icon: '🧲',
  effect: '+15% pickup range per level',
  max: 3,
  cost: cost(40, 40)
}, {
  id: 'greed',
  name: 'Greed',
  icon: '🪙',
  effect: '+10% coins per level',
  max: 5,
  cost: cost(80, 60)
}, {
  id: 'recovery',
  name: 'Recovery',
  icon: '❤️‍🩹',
  effect: 'Heal 0.2 health per second per level',
  max: 3,
  cost: cost(90, 90)
}, {
  id: 'rerolls',
  name: 'Rerolls',
  icon: '🎲',
  effect: '+1 card reroll per run',
  max: 3,
  cost: cost(100, 100)
}, {
  id: 'wisdom',
  name: 'Wisdom',
  icon: '🎓',
  effect: '+5% experience per level',
  max: 3,
  cost: cost(70, 70)
}];

/* ---------- daily sieges ---------- */

export const twists = [{
  id: 'rush',
  name: 'Rush Hour',
  text: 'Scribbles move 20% faster.',
  enemySpeed: 1.2,
  enemyHealth: 1,
  xp: 1,
  playerHealth: 1,
  spawn: 1
}, {
  id: 'crowd',
  name: 'Crowded Page',
  text: '40% more scribbles, but they’re weaker.',
  enemySpeed: 1,
  enemyHealth: 0.75,
  xp: 1,
  playerHealth: 1,
  spawn: 1.4
}, {
  id: 'glass',
  name: 'Glass Cannon',
  text: 'Half health, double experience.',
  enemySpeed: 1,
  enemyHealth: 1,
  xp: 2,
  playerHealth: 0.5,
  spawn: 1
}, {
  id: 'tough',
  name: 'Thick Lines',
  text: 'Scribbles have 50% more health, and give 50% more experience.',
  enemySpeed: 1,
  enemyHealth: 1.5,
  xp: 1.5,
  playerHealth: 1,
  spawn: 1
}, {
  id: 'calm',
  name: 'Quiet Study',
  text: 'Fewer, slower scribbles — but each one gives less experience.',
  enemySpeed: 0.85,
  enemyHealth: 1,
  xp: 0.8,
  playerHealth: 1,
  spawn: 0.8
}];
