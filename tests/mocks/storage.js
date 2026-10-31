const data = new Map();
export default { getItem: async key => data.get(key) || null, setItem: async (key, value) => { data.set(key, value); }, clear: async () => data.clear() };
