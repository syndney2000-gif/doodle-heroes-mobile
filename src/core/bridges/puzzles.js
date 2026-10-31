/* The Isle Spans catalogue. These maps were grown by ./generate.ts from fixed
   seeds, then picked by hand for a steady rise in difficulty. They're stored
   as text so the published puzzles never change if the generator does.
   tests/bridges.test.ts proves each one has exactly one solution. */

export const chapters = [{
  id: 'shallows',
  title: 'The Shallows',
  blurb: '7 × 7 maps. Most islands can be worked out from their number alone.',
  puzzles: [{
    id: 'two-coves',
    title: 'Two Coves',
    note: 'Rope bridges link the coves on the island’s sheltered side.',
    rows: ['.1...2.', '.......', '..3..6.', '.......', '.2.....', '..2.1..', '.2...3.']
  }, {
    id: 'stepping-stones',
    title: 'Stepping Stones',
    note: 'The stepping stones across the shallows are passable again.',
    rows: ['3..3.2.', '.......', '...2...', '.....2.', '2......', '.....1.', '.1.2...']
  }, {
    id: 'reef-crossing',
    title: 'Reef Crossing',
    note: 'Two paths across the reef, and they can’t both go straight.',
    rows: ['..2...3', '....2..', '2.....2', '.......', '3.3....', '.......', '..2.3..']
  }, {
    id: 'tide-pools',
    title: 'Tide Pools',
    note: 'Every rock pool can be reached at low tide.',
    rows: ['......1', '.......', '.......', '2.3...4', '.......', '..2..1.', '2...1.2']
  }]
}, {
  id: 'harbour-reach',
  title: 'Harbour Reach',
  blurb: '9 × 9 maps. Bridges start to block each other.',
  puzzles: [{
    id: 'fishing-jetties',
    title: 'Fishing Jetties',
    note: 'The jetties are joined up for the morning catch.',
    rows: ['..1.3...4', '.........', '..2......', '.........', '......1.3', '..4.6..2.', '2........', '....2....', '4.6..3.1.']
  }, {
    id: 'ferry-routes',
    title: 'Ferry Routes',
    note: 'The little ferry runs between the harbour islands once more.',
    rows: ['.........', '2...4.2..', '.....2..4', '.........', '2.2.4...4', '.1....2..', '........1', '2...2.2..', '.........']
  }, {
    id: 'gull-rocks',
    title: 'Gull Rocks',
    note: 'Nobody visits Gull Rocks except the gulls — but now they could.',
    rows: ['1..2.1..1', '.........', '2..4....4', '.........', '...3...3.', '.........', '........2', '...2..1..', '.1...2.3.']
  }, {
    id: 'lantern-quay',
    title: 'Lantern Quay',
    note: 'The quay where the lamp oil arrives for the lighthouse.',
    rows: ['.2...2..1', '.........', '.........', '..1..5..4', '.2..1..2.', '.........', '...1.5.4.', '.........', '.1..2...3']
  }]
}, {
  id: 'open-sea',
  title: 'Open Sea',
  blurb: '11 × 11 maps. Long chains of reasoning, and islands that must not be cut off.',
  puzzles: [{
    id: 'far-islets',
    title: 'Far Islets',
    note: 'The far islets join the map for the first time.',
    rows: ['1..2....3.2', '...........', '.1.4...2.1.', '....2.3.3.1', '...........', '4..4....3..', '...........', '.2.6...3..3', '...........', '2..3....1.1', '.1.........']
  }, {
    id: 'storm-passage',
    title: 'Storm Passage',
    note: 'A safe route through the passage where storms come in.',
    rows: ['.....2.4..4', '2..4....3..', '.2.........', '2...2...6.3', '......1....', '..........1', '.4.4.......', '2...4.2.7.4', '...........', '....2.....1', '......2.4..']
  }, {
    id: 'archipelago',
    title: 'Archipelago',
    note: 'Every island of the outer chain, finally connected.',
    rows: ['...........', '2...3...3.2', '.......3.2.', '..2.....1.3', '.2.........', '2.4.4..3..4', '...........', '..1...2.3..', '2..........', '.3..3...2..', '2.........2']
  }, {
    id: 'the-long-haul',
    title: 'The Long Haul',
    note: 'The longest crossing on the map — and the last.',
    rows: ['.....1.3.2.', '3..5..2...2', '...........', '4.2......1.', '.2.5...5..4', '...........', '2..4.2....1', '...........', '.1.1...1...', '3.4..2.....', '...........']
  }]
}];
export const allPuzzles = chapters.flatMap(c => c.puzzles);
export function findPuzzle(id) {
  return allPuzzles.find(p => p.id === id);
}
