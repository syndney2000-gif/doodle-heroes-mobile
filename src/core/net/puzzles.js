/* The Lighthouse Wiring catalogue. Grids were grown by ./generate.ts from
   fixed seeds and picked by hand for a steady rise in difficulty; they're
   stored as text so the published puzzles never change. Each row is one hex
   digit per tile as first shown; tests/net.test.ts proves each puzzle has
   exactly one solution. */

export const chapters = [{
  id: 'village-lanes',
  title: 'Village Lanes',
  blurb: '5 × 5 grids. Most tiles can be turned the right way from the board’s edges.',
  puzzles: [{
    id: 'first-light',
    title: 'First Light',
    note: 'The first cottages in the village have power again.',
    rows: ['823d8', 'a58d9', '5ddea', 'de2a5', '83212'],
    source: [2, 2]
  }, {
    id: 'baker-row',
    title: 'Baker Row',
    note: 'Lights are on along Baker Row, just in time for the early bake.',
    rows: ['3828c', 'c3d53', '3dfa4', '5977c', '11491'],
    source: [2, 2]
  }, {
    id: 'school-house',
    title: 'School House',
    note: 'The school house is lit for evening lessons.',
    rows: ['82918', 'd3599', 'a4771', 'be73d', '24711'],
    source: [2, 2]
  }, {
    id: 'chapel-green',
    title: 'Chapel Green',
    note: 'The chapel on the green glows again.',
    rows: ['15da1', '49591', '1fee4', '8ddd6', '45c24'],
    source: [2, 2]
  }]
}, {
  id: 'harbour-grid',
  title: 'Harbour Grid',
  blurb: '7 × 7 grids. Watch for wires that would loop back on themselves.',
  puzzles: [{
    id: 'net-sheds',
    title: 'Net Sheds',
    note: 'The fishermen’s net sheds are wired up.',
    rows: ['114ea54', 'ed3bc81', '12fdcd3', '6e3b222', 'aa3de95', '24a2b56', '1a6c7a1'],
    source: [3, 3]
  }, {
    id: 'market-square',
    title: 'Market Square',
    note: 'Lanterns light the market square at dusk.',
    rows: ['815e582', 'e1c911d', 'c5d8b17', '3e7e79e', '8a9d335', '1da3c3b', '4c81c82'],
    source: [3, 3]
  }, {
    id: 'boat-yard',
    title: 'Boat Yard',
    note: 'The boat yard can work through the night.',
    rows: ['88a6461', 'a427b58', '59be4bc', '6dbfbe6', '991a48c', 'a16e7b1', '86b2468'],
    source: [3, 3]
  }, {
    id: 'harbour-wall',
    title: 'Harbour Wall',
    note: 'Lamps run the whole length of the harbour wall.',
    rows: ['4c8ca14', '2fbea85', '4a14ccc', 'db77779', 'e747735', '53945a1', 'c8922c2'],
    source: [3, 3]
  }]
}, {
  id: 'cliff-road',
  title: 'Cliff Road',
  blurb: '9 × 9 grids. Long runs of wire, and sections that must not be cut off.',
  puzzles: [{
    id: 'cliff-cottages',
    title: 'Cliff Cottages',
    note: 'Every cottage on the cliff road is lit.',
    rows: ['14285d242', 'e7d96c47e', '2a159b954', '8fbbb64e1', '19437d7e3', '25ac1e961', '377adb7c1', '5a58b3d9d', '844131823'],
    source: [4, 4]
  }, {
    id: 'watch-house',
    title: 'Watch House',
    note: 'The coastguard watch house has power again.',
    rows: ['444d58431', '3d65ca2e6', '2abdc95d6', '12a72d541', 'cb7f7dc33', '3db512ec8', '29d527e14', '25a21bfec', '938476292'],
    source: [4, 4]
  }, {
    id: 'old-mill',
    title: 'Old Mill',
    note: 'The old mill’s lamps turn on for the first time in years.',
    rows: ['4a5a7a832', '86185cad4', '85737bc11', '9f7451a6e', '6e7ffd76a', '45a153bca', '48e6e3128', '65d12e551', '85e28ea51'],
    source: [4, 4]
  }, {
    id: 'lantern-lit',
    title: 'Lantern-Lit',
    note: 'The whole island glows — and the lighthouse beam sweeps the sea again.',
    rows: ['8aaa69541', '168afb5bd', '2ca997314', 'd75e2a918', '5449fd68a', 'acf5ddbb7', '51a8de914', '28b831d53', '15c8aa712'],
    source: [4, 4]
  }]
}];
export const allPuzzles = chapters.flatMap(c => c.puzzles);
export function findPuzzle(id) {
  return allPuzzles.find(p => p.id === id);
}
