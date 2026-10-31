export function statefulRandom(seed) {
  const random = () => {
    random.state = (random.state + 0x6d2b79f5) >>> 0;
    let t = random.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  random.state = seed >>> 0;
  return random;
}
