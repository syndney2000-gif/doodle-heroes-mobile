/* Doodle Guess — turns strokes into pencil lines and draws a fraction of a
   drawing's ink, so the picture appears the way someone would sketch it. */

/** Points along a stroke, close enough together to draw it smoothly. */
export function strokePoints(s) {
  const ring = (x, y, rx, ry, from, to) => {
    const steps = Math.max(6, Math.ceil(Math.abs(to - from) / 10));
    return Array.from({
      length: steps + 1
    }, (_, k) => {
      const a = (from + (to - from) * k / steps) * Math.PI / 180;
      return [x + Math.cos(a) * rx, y + Math.sin(a) * ry];
    });
  };
  switch (s.t) {
    case 'l':
      {
        const pts = [];
        for (let k = 0; k + 1 < s.p.length; k += 2) pts.push([s.p[k], s.p[k + 1]]);
        if (s.close) pts.push(pts[0]);
        return pts;
      }
    case 'c':
      return ring(s.x, s.y, s.r, s.r, 0, 360);
    case 'e':
      return ring(s.x, s.y, s.rx, s.ry, 0, 360);
    case 'a':
      return ring(s.x, s.y, s.r, s.r, s.from, s.to);
    case 'q':
      {
        const [x0, y0, cx, cy, x1, y1] = s.p;
        return Array.from({
          length: 13
        }, (_, k) => {
          const t = k / 12,
            u = 1 - t;
          return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1];
        });
      }
  }
}
const segLength = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Total ink in a drawing, in page units. */
export function inkLength(d) {
  let total = 0;
  for (const s of d.strokes) {
    const pts = strokePoints(s);
    for (let k = 1; k < pts.length; k++) total += segLength(pts[k - 1], pts[k]);
  }
  return total;
}
export function revealedPaths(drawing, fraction) {
 let budget = inkLength(drawing) * Math.max(0, Math.min(1, fraction));
 const paths = [];
 for (const stroke of drawing.strokes) {
   if (budget <= 0) break;
   const points = strokePoints(stroke);
   let path = 'M' + points[0].join(' ');
   for (let i=1;i<points.length && budget>0;i++) {
     const [x,y]=points[i-1], [tx,ty]=points[i];
     const length=Math.hypot(tx-x,ty-y);
     const portion=Math.min(1,budget/(length||1));
     path += 'L'+(x+(tx-x)*portion)+' '+(y+(ty-y)*portion);
     budget-=Math.min(budget,length);
   }
   paths.push(path);
 }
 return paths;
}
