import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { colors as C } from '../theme';
import { heroes, weapons, passives, upgrades, twists, RUN_SECONDS } from '../core/survivor/data';
import { chooseCard, grade, newGame, reroll, runCoins, skip, step, STEP } from '../core/survivor/engine';
import { bankRun, collectJar, jarCoins, purchase, restoreGame, snapshotGame, unlocked, unlockText } from '../core/survivor/snapshot';
import { hashString } from '../core/lib/rng';
import { formatTime } from '../core/lib/scoring';
import { Button, Notice, Page, Stats, U, useGameState } from './ui';

function pathFor(points) { return points.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' '); }
function cardCopy(card) {
  if (card.kind === 'weapon') return { title: `${weapons[card.id].icon} ${weapons[card.id].name} · ${card.level}`, text: weapons[card.id].changes[card.level - 1] };
  if (card.kind === 'passive') return { title: `${passives[card.id].icon} ${passives[card.id].name} · ${card.level}`, text: passives[card.id].effect };
  return card.kind === 'snack' ? { title: 'A little snack', text: 'Recover 30 health.' } : { title: 'Pocket money', text: 'Collect ten coins.' };
}
export default function ScribbleSiege({ initial, onSave, onExit, reducedMotion, today }) {
  const [state, change, current] = useGameState(initial, onSave);
  useEffect(() => {
    if (current.current.profile.jarSince === null) change(s => { s.profile = collectJar(s.profile); });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const game = useRef(null);
  const initialized = useRef(false);
  if (!initialized.current) { game.current = initial.run ? restoreGame(initial.run) : null; initialized.current = true; }
  const run = useRef(initial.run ? { id: initial.run.id, daily: initial.run.daily } : null);
  const input = useRef({ x: 0, y: 0 });
  const [playing, setPlaying] = useState(false), [paused, setPaused] = useState(false), [heroId, setHeroId] = useState('pip');
  const [now, setNow] = useState(Date.now());
  const [shop, setShop] = useState(false), [editor, setEditor] = useState(false), [message, setMessage] = useState('');
  const [, setFrame] = useState(0);
  const flags = useRef({ playing, paused }); flags.current = { playing, paused };
  const saveLatest = useRef(null);
  function saveRun() {
    const g = game.current;
    if (g && run.current && ['playing', 'levelup'].includes(g.status)) {
      const snapshot = snapshotGame(g, run.current.id, run.current.daily);
      change(s => { s.run = snapshot; });
    }
  }
  saveLatest.current = saveRun;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => {
      if (status !== 'active') { flags.current.paused = true; setPaused(true); input.current = { x: 0, y: 0 }; saveLatest.current(); }
    });
    return () => { subscription.remove(); saveLatest.current(); };
  }, []);
  function finish() {
    const g = game.current, info = run.current;
    if (!g || !info) return;
    const result = { id: info.id, daily: info.daily, hero: g.config.hero.id, seconds: Math.floor(g.t), kills: g.kills, coins: runCoins(g), won: g.status === 'won', grade: grade(g), date: new Date().toISOString() };
    change(s => { s.profile = bankRun(s.profile, result); s.result = result; s.run = null; });
    setPlaying(false); setPaused(false); input.current = { x: 0, y: 0 };
  }
  const finishLatest = useRef(finish); finishLatest.current = finish;
  useEffect(() => {
    if (!playing) return;
    let frame, last = 0, accumulator = 0, lastDraw = 0, lastSave = game.current?.t || 0, lastStatus = game.current?.status;
    const loop = timestamp => {
      const g = game.current;
      if (g && !flags.current.paused) {
        const delta = last ? Math.min(0.12, (timestamp - last) / 1000) : 0;
        accumulator = Math.min(0.14, accumulator + delta);
        let steps = 0;
        while (accumulator >= STEP && g.status === 'playing' && steps++ < 8) { step(g, input.current); accumulator -= STEP; g.events.length = 0; }
        if (g.status !== 'playing') accumulator = 0;
        if (g.status === 'won' || g.status === 'dead') { finishLatest.current(); return; }
        if (g.status !== lastStatus) { lastStatus = g.status; saveLatest.current(); }
        if (g.t - lastSave >= 5) { lastSave = g.t; saveLatest.current(); }
        if (timestamp - lastDraw >= 33) { setFrame(n => n + 1); lastDraw = timestamp; }
      } else accumulator = 0;
      last = timestamp;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); input.current = { x: 0, y: 0 }; saveLatest.current(); };
  }, [playing]);
  function start(daily = false) {
    const custom = state.profile.custom;
    const hero = heroId === 'custom' && custom ? { ...heroes[0], id: 'custom', name: custom.name || 'My Doodle', weapon: custom.weapon, colour: C.green } : heroes.find(h => h.id === heroId) || heroes[0];
    if (hero.id !== 'custom' && !unlocked(state.profile, hero)) return;
    const seed = daily ? hashString(`${today}:scribble-siege`) : Date.now() >>> 0;
    const info = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, daily: daily ? today : null };
    const config = { hero, weapon: hero.weapon, meta: { ...state.profile.upgrades }, seed, ...(daily ? { twist: twists[hashString(today) % twists.length] } : {}) };
    game.current = newGame(config); run.current = info;
    change(s => { s.run = snapshotGame(game.current, info.id, info.daily); s.result = null; });
    setPaused(false); setPlaying(true); setMessage('');
  }
  function startGuard(daily) {
    if (state.run) Alert.alert('Start a fresh siege?', 'The paused run will be replaced. Its unbanked coins will not be awarded.', [{ text: 'Keep paused run', style: 'cancel' }, { text: 'Start fresh', onPress: () => start(daily) }]);
    else start(daily);
  }
  function resume() {
    if (!current.current.run) return;
    game.current = restoreGame(current.current.run); run.current = { id: current.current.run.id, daily: current.current.run.daily };
    if (['dead', 'won'].includes(game.current.status)) { finish(); return; }
    setPaused(false); setPlaying(true);
  }
  function back() {
    if (editor) { setEditor(false); return; }
    if (shop) { setShop(false); return; }
    if (playing) { flags.current.paused = true; setPaused(true); input.current = { x: 0, y: 0 }; saveRun(); setPlaying(false); }
    else onExit();
  }
  const help = 'Survive the scribbles for ten minutes. Drag anywhere on the arena to bring up a floating joystick. Your weapons attack automatically. Collect green gems to level up, then choose a weapon or passive upgrade. The Big Eraser arrives at nine minutes.\n\nPause at any time. Backgrounding the app pauses and saves the run. Resume from the lobby; enemies, projectiles and random state are restored. Finished or ended runs bank coins once, and coins buy permanent upgrades. Survive three minutes to unlock Ed, defeat 1,500 scribbles for Mo, or win for Rae. You can also draw your own hero. Essential combat movement remains active with reduced motion; decorative flashing is reduced.';
  const g = game.current;
  if (playing && g) return <Page name="Scribble Siege" title={`${formatTime(g.t)} / ${formatTime(RUN_SECONDS)}`} onExit={back} help={help} reducedMotion={reducedMotion} scroll={false} onHelpOpen={() => { flags.current.paused = true; setPaused(true); input.current = { x: 0, y: 0 }; saveRun(); }}>
    <View style={Z.hud}><Text style={Z.hudText}>♥ {Math.ceil(g.player.hp)} / {g.player.maxHp}</Text><Text style={Z.hudText}>Lv {g.level} · {g.kills} defeated</Text><Button small secondary onPress={() => { flags.current.paused = true; setPaused(true); input.current = { x: 0, y: 0 }; saveRun(); }}>Ⅱ Pause</Button></View>
    <View style={Z.health}><View style={[Z.healthFill, { width: `${Math.max(0, g.player.hp / g.player.maxHp) * 100}%` }]} /></View>
    <View style={[Z.health, { backgroundColor: '#EBE2CF', height: 5 }]}><View style={[Z.healthFill, { width: `${Math.min(1, g.xp / g.xpNeed) * 100}%`, backgroundColor: C.gold }]} /></View>
    <Arena game={g} input={input} custom={state.profile.custom} reducedMotion={reducedMotion} disabled={paused || g.status !== 'playing'} />
    <View style={Z.loadout}><Text style={U.body}>{g.weapons.map(w => `${weapons[w.id].icon}${w.level}`).join('  ')}  {g.passives.map(p => `${passives[p.id].icon}${p.level}`).join('  ')}</Text><Text style={U.body}>{run.current?.daily ? `Daily · ${g.config.twist?.name}` : `${runCoins(g)} coins earned`}</Text></View>
    <DirectionPad input={input} disabled={paused || g.status !== 'playing'} />
    {(paused || g.status === 'levelup') && <View style={Z.overlay}><View style={Z.overlayCard}>
      {paused ? <><Text style={U.hero}>A little breather.</Text><Text style={U.body}>Your siege is paused and saved.</Text><Button onPress={() => { setPaused(false); flags.current.paused = false; }}>Resume the adventure</Button><Button secondary onPress={back}>Save and return to heroes</Button><Button secondary onPress={() => Alert.alert('End this run?', 'Bank the coins earned so far and return to the lobby.', [{ text: 'Keep playing', style: 'cancel' }, { text: 'End and bank coins', onPress: () => { game.current.status = 'dead'; finish(); } }])}>End run and bank coins</Button></> : <>
        <Text style={U.hero}>A little stronger.</Text><Text style={U.body}>Choose your level {g.level} upgrade.</Text>
        {g.cards.map((card, i) => { const copy = cardCopy(card); return <Pressable key={`${card.kind}-${card.id || i}`} accessibilityRole="button" style={U.card} onPress={() => { chooseCard(g, i); saveRun(); setFrame(n => n + 1); }}><Text style={U.title}>{copy.title}</Text><Text style={U.body}>{copy.text}</Text></Pressable>; })}
        <View style={U.row}><Button small secondary disabled={!g.rerolls} onPress={() => { reroll(g); saveRun(); setFrame(n => n + 1); }}>Reroll · {g.rerolls}</Button><Button small secondary onPress={() => { skip(g); saveRun(); setFrame(n => n + 1); }}>Skip · +3 coins</Button></View>
      </>}
    </View></View>}
  </Page>;
  return <Page name="Scribble Siege" title={editor ? 'Draw your little hero' : shop ? 'A stronger little doodle' : 'The margins are alive'} onExit={back} help={help} reducedMotion={reducedMotion}>
    {editor ? <HeroEditor custom={state.profile.custom} onSave={custom => { change(s => { s.profile.custom = custom; }); setHeroId('custom'); setEditor(false); }} reducedMotion={reducedMotion} /> : shop ? <>
      <Stats>{[`${state.profile.coins} coins`, `${state.profile.runs} runs`, `${state.profile.wins} victories`]}</Stats>
      {upgrades.map(def => { const owned = state.profile.upgrades[def.id] || 0; return <View key={def.id} style={U.card}><Text style={U.title}>{def.icon} {def.name} · {owned}/{def.max}</Text><Text style={U.body}>{def.effect}</Text><Button secondary disabled={owned >= def.max || state.profile.coins < def.cost(owned)} onPress={() => change(s => { s.profile = purchase(s.profile, def.id); })}>{owned >= def.max ? 'Fully upgraded' : `Upgrade · ${def.cost(owned)} coins`}</Button></View>; })}
    </> : <>
      <Text style={U.hero}>Small hero. Big scribbles.</Text><Text style={U.body}>Ten minutes on the notebook page. Move, collect, and let your weapons do the doodling.</Text>
      <Stats>{[`${state.profile.coins} coins`, `${state.profile.totalKills} defeated`, `${state.profile.wins} wins`]}</Stats>
      {state.run && <Button onPress={resume}>Continue saved siege · {formatTime(state.run.game.t)} →</Button>}
      {state.result && <View style={U.notice}><Text style={U.title}>{state.result.won ? 'The page is yours! ✦' : 'A brave little run.'} · Grade {state.result.grade}</Text><Text style={U.body}>{formatTime(state.result.seconds)} survived · {state.result.kills} defeated · {state.result.coins} coins banked</Text></View>}
      <Text style={U.title}>Choose your hero</Text>
      {heroes.map(hero => <Pressable accessibilityRole="button" accessibilityState={{ disabled: !unlocked(state.profile, hero), selected: heroId === hero.id }} disabled={!unlocked(state.profile, hero)} key={hero.id} style={[U.card, heroId === hero.id && Z.selected, !unlocked(state.profile, hero) && { opacity: 0.5 }]} onPress={() => setHeroId(hero.id)}><Text style={U.title}>{hero.name} {heroId === hero.id ? '✓' : ''}</Text><Text style={U.body}>{unlocked(state.profile, hero) ? `${weapons[hero.weapon].icon} ${weapons[hero.weapon].name} · best ${formatTime(state.profile.bestTime[hero.id] || 0)}` : unlockText(hero)}</Text></Pressable>)}
      {state.profile.custom && <Pressable accessibilityRole="button" onPress={() => setHeroId('custom')} style={[U.card, heroId === 'custom' && Z.selected]}><Text style={U.title}>✎ {state.profile.custom.name || 'My Doodle'} {heroId === 'custom' ? '✓' : ''}</Text><Text style={U.body}>{weapons[state.profile.custom.weapon].name}</Text></Pressable>}
      <Button onPress={() => startGuard(false)}>Start a fresh siege →</Button><Button secondary onPress={() => startGuard(true)}>Daily siege · {twists[hashString(today) % twists.length].name}</Button>
      {state.profile.daily[today] && <Text style={U.body}>Today’s best: {formatTime(state.profile.daily[today].seconds)} · {state.profile.daily[today].kills} defeated</Text>}
      <Button secondary disabled={!jarCoins(state.profile, now)} onPress={() => change(s => { s.profile = collectJar(s.profile); })}>Collect coin jar · {jarCoins(state.profile, now)} coins</Button><Text style={U.body}>The jar fills while you are away, up to twelve hours.</Text>
      <Button secondary onPress={() => setShop(true)}>Spend coins on permanent upgrades</Button><Button secondary onPress={() => setEditor(true)}>✎ Draw your own hero</Button><Notice>{message}</Notice>
    </>}
  </Page>;
}
function DirectionPad({ input, disabled }) {
  return <View style={Z.dpad} accessibilityLabel="Alternative movement controls. Hold a direction to move.">{[['←', -1, 0, 'Move left'], ['↑', 0, -1, 'Move up'], ['↓', 0, 1, 'Move down'], ['→', 1, 0, 'Move right']].map(([label, x, y, description]) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={description} disabled={disabled} onPressIn={() => { input.current = { x, y }; }} onPressOut={() => { input.current = { x: 0, y: 0 }; }} style={Z.pad}><Text style={Z.padText}>{label}</Text></Pressable>)}</View>;
}
function Arena({ game, input, custom, disabled, reducedMotion }) {
  const [size, setSize] = useState({ width: 340, height: 400 }), [stick, setStick] = useState(null);
  const disabledRef = useRef(disabled); disabledRef.current = disabled;
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabledRef.current,
    onMoveShouldSetPanResponder: () => !disabledRef.current,
    onPanResponderGrant: event => { setStick({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY, dx: 0, dy: 0 }); input.current = { x: 0, y: 0 }; },
    onPanResponderMove: (_, gesture) => { const length = Math.hypot(gesture.dx, gesture.dy), ratio = Math.min(1, 48 / (length || 1)); input.current = { x: gesture.dx * ratio / 48, y: gesture.dy * ratio / 48 }; setStick(s => s && ({ ...s, dx: gesture.dx * ratio, dy: gesture.dy * ratio })); },
    onPanResponderRelease: () => { input.current = { x: 0, y: 0 }; setStick(null); },
    onPanResponderTerminate: () => { input.current = { x: 0, y: 0 }; setStick(null); }, onPanResponderTerminationRequest: () => false,
  }), []);
  const w = 480, h = Math.max(320, w * size.height / Math.max(1, size.width));
  const px = game.player.x, py = game.player.y;
  const circle = (x, y, r) => `M${x-r} ${y}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0`;
  const visible = (x, y, radius = 30) => Math.abs(x-px) <= w/2+radius && Math.abs(y-py) <= h/2+radius;
  const enemies = {};
  let eyes = '';
  for (const enemy of game.enemies) {
    if (!visible(enemy.x, enemy.y, enemy.radius)) continue;
    const x = enemy.x-px, y = enemy.y-py, r = enemy.radius;
    const color = !reducedMotion && enemy.flash > 0 ? '#E4B15B' : enemy.def.colour;
    enemies[color] = (enemies[color] || '') + circle(x, y, r);
    eyes += `M${x-r*.3} ${y-r*.15}l1 0M${x+r*.3} ${y-r*.15}l1 0`;
  }
  let gems = '', coins = '', darts = '', planes = '';
  for(const gem of game.gems) if(visible(gem.x,gem.y,10)){const x=gem.x-px,y=gem.y-py;gems+=`M${x} ${y-5}l5 5-5 5-5-5Z`;}
  for(const coin of game.coins) if(visible(coin.x,coin.y,10)) coins+=circle(coin.x-px,coin.y-py,5);
  for(const p of game.projectiles) if(visible(p.x,p.y,15)){const x=p.x-px,y=p.y-py;if(p.kind==='dart') darts+=`M${x} ${y}l${p.vx*.025} ${p.vy*.025}`;else planes+=`M${x-7} ${y+5}l14-5-14-5 3 5Z`;}
  const orbit = game.weapons.find(w => w.id === 'orbit'), orbitStats = orbit && weapons.orbit.levels[orbit.level-1];
  return <View style={Z.arena} onLayout={e => setSize(e.nativeEvent.layout)}>
    <Svg width="100%" height="100%" viewBox={`${-w/2} ${-h/2} ${w} ${h}`} pointerEvents="none">
      <Rect x={-w/2} y={-h/2} width={w} height={h} fill="#FBF7EB" />
      {Array.from({length:Math.ceil(h/48)+2},(_,i)=>{const y=-h/2+i*48-(py%48);return <Line key={i} x1={-w/2} x2={w/2} y1={y} y2={y} stroke="#DCE4D7" strokeWidth="1" />;})}
      {game.effects.filter(f=>visible(f.x,f.y,f.radius)).map((effect,i)=><Circle key={i} cx={effect.x-px} cy={effect.y-py} r={effect.radius} fill={effect.kind==='puddle'?'#6776B333':'none'} stroke={effect.kind==='ruler'?'#CB9F4F':'#719C85'} strokeWidth="4" opacity={effect.life/effect.maxLife} />)}
      <Path d={gems} fill="#6D9A76" stroke="#436B4B" strokeWidth="1" /><Path d={coins} fill="#DDB04E" />
      {Object.entries(enemies).map(([color,d])=><Path key={color} d={d} fill={color} fillOpacity=".85" stroke="#304330" strokeWidth="1.5" />)}
      <Path d={eyes} stroke="#FFFEF8" strokeWidth="3" strokeLinecap="round" />
      <Path d={darts} stroke="#C99730" strokeWidth="4" strokeLinecap="round" /><Path d={planes} stroke="#657E88" fill="#EDF5ED" strokeWidth="2" />
      {orbitStats && Array.from({length:orbitStats.count},(_,i)=>{const angle=game.t*3+i*Math.PI*2/orbitStats.count;return <Rect key={i} x={Math.cos(angle)*orbitStats.area-9} y={Math.sin(angle)*orbitStats.area-7} width="18" height="14" rx="4" fill="#E8A8B7" stroke="#8F6071" />;})}
      <Circle cx="0" cy="0" r="22" fill="#E8ECD9" stroke={C.gold} strokeWidth="2" />
      {game.config.hero.id==='custom'&&custom ? <G transform="translate(-18 -18) scale(.36)">{custom.lines.map((line,i)=><Path key={i} d={pathFor(line)} stroke={C.green} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />)}</G> : <><Path d="M-8 13L-7-8 0-18 7-8 8 13Z" fill={game.config.hero.colour} stroke={C.ink} strokeWidth="2" /><Path d="M-3-3h1M3-3h1M-3 5Q0 8 3 5" stroke={C.ink} strokeWidth="2" strokeLinecap="round" /></>}
      {game.player.invulnerable>0 && <Circle cx="0" cy="0" r="26" stroke={C.gold} strokeWidth="3" fill="none" />}
    </Svg>
    <View style={StyleSheet.absoluteFill} {...responder.panHandlers} accessible={false}>
      {stick ? <View pointerEvents="none" style={[Z.stick,{left:stick.x-55,top:stick.y-55}]}><View style={[Z.knob,{transform:[{translateX:stick.dx},{translateY:stick.dy}]}]} /></View> : <View pointerEvents="none" style={Z.stickHint}><Text style={Z.hintText}>Drag anywhere to move</Text></View>}
    </View>
  </View>;
}
function HeroEditor({ custom, onSave }) {
  const [lines,setLines]=useState(custom?.lines||[]),[name,setName]=useState(custom?.name||'My Doodle'),[weapon,setWeapon]=useState(custom?.weapon||'darts'),[width,setWidth]=useState(300);
  const active=useRef(null),latest=useRef({lines,width}); latest.current={lines,width};
  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onPanResponderGrant:event=>{if(latest.current.lines.length>=100)return;const p=event.nativeEvent;active.current=[[Math.max(0,Math.min(100,p.locationX/latest.current.width*100)),Math.max(0,Math.min(100,p.locationY/latest.current.width*100))]];setLines([...latest.current.lines,active.current]);},
    onPanResponderMove:event=>{if(!active.current||active.current.length>=1000)return;const p=event.nativeEvent;active.current.push([Math.max(0,Math.min(100,p.locationX/latest.current.width*100)),Math.max(0,Math.min(100,p.locationY/latest.current.width*100))]);setLines(current=>[...current.slice(0,-1),[...active.current]]);},
    onPanResponderRelease:()=>{active.current=null;},onPanResponderTerminate:()=>{active.current=null;},onPanResponderTerminationRequest:()=>false,
  }),[]);
  return <><Text style={U.body}>Draw a little hero with your finger. Choose its name and starting weapon. The drawing stays on your device.</Text><View style={Z.canvas} onLayout={e=>setWidth(e.nativeEvent.layout.width)}><Svg width="100%" height="100%" viewBox="0 0 100 100" pointerEvents="none">{lines.map((line,i)=><Path key={i} d={pathFor(line)} stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />)}</Svg><View style={StyleSheet.absoluteFill} {...responder.panHandlers} /></View><View style={U.row}><Button secondary small disabled={!lines.length} onPress={()=>setLines(lines.slice(0,-1))}>Undo stroke</Button><Button secondary small onPress={()=>setLines([])}>Clear</Button></View><TextInput accessibilityLabel="Hero name" style={Z.name} value={name} onChangeText={setName} maxLength={24} /><Text style={U.title}>Starting weapon</Text>{Object.values(weapons).map(def=><Button key={def.id} secondary selected={weapon===def.id} onPress={()=>setWeapon(def.id)}>{def.icon} {def.name}</Button>)}<Button disabled={!lines.some(l=>l.length>1)} onPress={()=>onSave({name:name.trim()||'My Doodle',weapon,lines})}>Save my little hero</Button></>;
}
const Z=StyleSheet.create({
  hud:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6,paddingHorizontal:12},hudText:{color:C.ink,fontSize:11,fontWeight:'700'},health:{height:8,backgroundColor:'#E6DDCC',marginHorizontal:16,borderRadius:8,overflow:'hidden',marginBottom:5},healthFill:{height:'100%',backgroundColor:'#789768'},arena:{flex:1,minHeight:230,marginHorizontal:12,borderRadius:20,overflow:'hidden',borderWidth:2,borderColor:C.line},loadout:{paddingHorizontal:18,paddingVertical:5,flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},dpad:{flexDirection:'row',justifyContent:'center',gap:9,paddingBottom:10},pad:{width:48,height:44,backgroundColor:C.soft,borderRadius:14,alignItems:'center',justifyContent:'center'},padText:{fontSize:23,color:C.ink},overlay:{...StyleSheet.absoluteFillObject,backgroundColor:'#18352580',alignItems:'center',justifyContent:'center',padding:20},overlayCard:{backgroundColor:C.paper,padding:20,borderRadius:24,width:'100%',maxWidth:440},selected:{borderColor:C.green,borderWidth:2,backgroundColor:'#E8EDD9'},stick:{position:'absolute',width:110,height:110,borderRadius:60,backgroundColor:'#36543E25',borderWidth:2,borderColor:'#36543E70',alignItems:'center',justifyContent:'center'},knob:{width:42,height:42,borderRadius:22,backgroundColor:'#36543E99'},stickHint:{position:'absolute',left:0,right:0,bottom:25,alignItems:'center'},hintText:{color:C.muted,fontSize:12,backgroundColor:'#FAF7EFDD',padding:8,borderRadius:12},canvas:{width:'100%',aspectRatio:1,borderWidth:2,borderColor:C.line,borderRadius:20,backgroundColor:C.white,marginVertical:15,overflow:'hidden'},name:{color:C.ink,fontSize:16,borderWidth:1,borderColor:C.line,borderRadius:16,padding:14,backgroundColor:C.white,marginTop:12},
});
