/* The Island Sketch catalogue. Every picture is drawn by hand for this site.
   tests/nonogram.test.ts checks each one is rectangular and solvable by line
   logic alone, so a puzzle that would need guessing can never ship. */

export interface Puzzle {
  id: string;
  title: string;
  /** Shown after solving: what the sketch adds to the island map. */
  note: string;
  solution: string[];
}

export interface Chapter {
  id: string;
  title: string;
  blurb: string;
  puzzles: Puzzle[];
}

export const chapters: Chapter[] = [
  {
    id: 'shore',
    title: 'The Shore',
    blurb: '5 × 5 sketches. Small enough to learn every rule on.',
    puzzles: [
      {
        id: 'sun',
        title: 'Morning Sun',
        note: 'The first sketch on the map: the sun rising over the island.',
        solution: [
          '#.#.#',
          '.###.',
          '#####',
          '.###.',
          '#.#.#',
        ],
      },
      {
        id: 'sail',
        title: 'Little Sail',
        note: 'A dinghy pulled up on the sand.',
        solution: [
          '..#..',
          '.##..',
          '###..',
          '..#..',
          '#####',
        ],
      },
      {
        id: 'fish',
        title: 'Shallows Fish',
        note: 'Fish dart through the shallows by the landing.',
        solution: [
          '.....',
          '.##.#',
          '#####',
          '.##.#',
          '.....',
        ],
      },
      {
        id: 'anchor',
        title: 'Anchor',
        note: 'An old anchor half-buried at the tide line.',
        solution: [
          '..#..',
          '.###.',
          '..#..',
          '#.#.#',
          '.###.',
        ],
      },
    ],
  },
  {
    id: 'village',
    title: 'Harbour Village',
    blurb: '10 × 10 sketches. Clues start to split into several blocks.',
    puzzles: [
      {
        id: 'lighthouse',
        title: 'The Lighthouse',
        note: 'The lighthouse stands dark for now. Lighthouse Wiring will bring it back.',
        solution: [
          '....##....',
          '...####...',
          '....##....',
          '...####...',
          '...#..#...',
          '...####...',
          '...#..#...',
          '..######..',
          '.########.',
          '##########',
        ],
      },
      {
        id: 'crab',
        title: 'Rock Crab',
        note: 'A crab guards the rock pools below the harbour wall.',
        solution: [
          '##......##',
          '#........#',
          '.#.####.#.',
          '..######..',
          '.#.#..#.#.',
          '.########.',
          '##########',
          '.#.####.#.',
          '#.#....#.#',
          '..........',
        ],
      },
      {
        id: 'turtle',
        title: 'Sea Turtle',
        note: 'Turtles nest on the quiet beach east of the village.',
        solution: [
          '......###.',
          '.....#####',
          '..####.##.',
          '.######...',
          '#######...',
          '#.######..',
          '.########.',
          '..#....#..',
          '.##....##.',
          '..........',
        ],
      },
      {
        id: 'palm',
        title: 'Palm Tree',
        note: 'The tallest palm in the village square.',
        solution: [
          '.###..###.',
          '#####.####',
          '#...###..#',
          '...#.#.#..',
          '.....#....',
          '.....#....',
          '....#.....',
          '....#.....',
          '..######..',
          '##########',
        ],
      },
      {
        id: 'boat',
        title: 'Fishing Boat',
        note: 'The harbour fleet is back on the water.',
        solution: [
          '....#.....',
          '....##....',
          '....###...',
          '....####..',
          '....#####.',
          '....#.....',
          '##########',
          '.########.',
          '..######..',
          '#.#.#.#.#.',
        ],
      },
    ],
  },
  {
    id: 'peaks',
    title: 'Cloud Peaks',
    blurb: '15 × 15 sketches. Long lines where the advanced techniques pay off.',
    puzzles: [
      {
        id: 'volcano',
        title: 'Sleeping Volcano',
        note: 'The old volcano at the island’s heart, quiet for a hundred years.',
        solution: [
          '......#.#......',
          '.....#.#.#.....',
          '......#.#......',
          '...............',
          '.....#####.....',
          '....#######....',
          '....###.###....',
          '...#########...',
          '...####.####...',
          '..###########..',
          '..#####.#####..',
          '.#############.',
          '.######.######.',
          '###############',
          '###############',
        ],
      },
      {
        id: 'whale',
        title: 'Passing Whale',
        note: 'A whale surfaces off the northern cliffs every spring.',
        solution: [
          '..........#.#..',
          '...........#...',
          '.........#####.',
          '..#####.......#',
          '.#######......#',
          '##########...##',
          '###.#######.###',
          '###############',
          '###############',
          '.#############.',
          '..###########..',
          '....#######....',
          '......#.#......',
          '.....##.##.....',
          '...............',
        ],
      },
      {
        id: 'compass',
        title: 'Map Compass',
        note: 'The compass rose that finishes the island map.',
        solution: [
          '.......#.......',
          '.......#.......',
          '......###......',
          '......###......',
          '...#..###..#...',
          '...#########...',
          '...####.####...',
          '###############',
          '...####.####...',
          '...#########...',
          '...#..###..#...',
          '......###......',
          '......###......',
          '.......#.......',
          '.......#.......',
        ],
      },
    ],
  },
];

export const allPuzzles: Puzzle[] = chapters.flatMap((c) => c.puzzles);

export function findPuzzle(id: string): Puzzle | undefined {
  return allPuzzles.find((p) => p.id === id);
}
