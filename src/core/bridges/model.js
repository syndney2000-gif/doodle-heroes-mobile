/* Isle Spans — board model.
   A puzzle is written as rows of text: a digit 1–8 is an island needing that
   many bridges, '.' is open water. */

/** A place a bridge could go: two islands with clear water between them. */

export function parse(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const islands = [];
  const at = new Map();
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch >= '1' && ch <= '8') {
      at.set(`${r},${c}`, islands.length);
      islands.push({
        id: islands.length,
        r,
        c,
        n: Number(ch)
      });
    }
  }));

  // Each island links to the nearest island to its right and below; the
  // other two directions come from the neighbour's point of view.
  const spans = [];
  for (const isl of islands) {
    for (const dir of ['h', 'v']) {
      let r = isl.r,
        c = isl.c;
      for (;;) {
        if (dir === 'h') c++;else r++;
        if (r >= h || c >= w) break;
        const other = at.get(`${r},${c}`);
        if (other != null) {
          // Neighbouring islands touching side by side leave no water for a bridge.
          if (Math.abs(r - isl.r) + Math.abs(c - isl.c) > 1) {
            spans.push({
              id: spans.length,
              a: isl.id,
              b: other,
              dir,
              crosses: []
            });
          }
          break;
        }
      }
    }
  }
  for (const s of spans) {
    if (s.dir !== 'h') continue;
    const row = islands[s.a].r,
      c1 = islands[s.a].c,
      c2 = islands[s.b].c;
    for (const t of spans) {
      if (t.dir !== 'v') continue;
      const col = islands[t.a].c,
        r1 = islands[t.a].r,
        r2 = islands[t.b].r;
      if (r1 < row && row < r2 && c1 < col && col < c2) {
        s.crosses.push(t.id);
        t.crosses.push(s.id);
      }
    }
  }
  const spansOf = islands.map(() => []);
  for (const s of spans) {
    spansOf[s.a].push(s.id);
    spansOf[s.b].push(s.id);
  }
  return {
    w,
    h,
    islands,
    spans,
    spansOf
  };
}

/** Which island a span leads to from `from`. */
export function across(span, from) {
  return span.a === from ? span.b : span.a;
}

/** Direction of a span as seen from one of its islands. */
export function directionFrom(board, span, from) {
  const self = board.islands[from];
  const other = board.islands[across(span, from)];
  if (span.dir === 'h') return other.c > self.c ? 'right' : 'left';
  return other.r > self.r ? 'down' : 'up';
}

/** True when the built spans join every island into one group. */
export function connected(board, counts) {
  if (!board.islands.length) return true;
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const i = stack.pop();
    for (const sid of board.spansOf[i]) {
      if (!counts[sid]) continue;
      const j = across(board.spans[sid], i);
      if (!seen.has(j)) {
        seen.add(j);
        stack.push(j);
      }
    }
  }
  return seen.size === board.islands.length;
}
