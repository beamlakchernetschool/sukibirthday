/* ==============================
   FEVEN'S BLOOM — Game Engine
   ============================== */

'use strict';

// ── STATE ─────────────────────────────────────────────────────────────────────
const state = {
  inventory: [],          // array of { icon, label }
  trust: 0,              // tracks relationship/trust accumulation
  kellanDepth: 0,        // how deep kellan opened up
  tadeFriendly: false,   // was Tade handled gently?
  seraStyle: null,       // 'careful'|'compare'|'quiet'
  greenhouse_how: null,  // 'honest'|'mention'|'offer'|'wait'
  greenhouse_first: null,// what Feven looked at first inside
  envelope_how: null,    // 'immediately'|'others'|'held'
  pressedFlower: false,  // picked up in room
  askedBeamlak: false,   // asked about the secret
  currentScene: null,
};

// ── INVENTORY HELPERS ─────────────────────────────────────────────────────────
function addItem(icon, label) {
  if (state.inventory.some(i => i.label === label)) return;
  state.inventory.push({ icon, label });
  renderInventory();
  flashInventory();
}

function renderInventory() {
  const ul = document.getElementById('inv-list');
  ul.innerHTML = '';
  state.inventory.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="item-icon">${item.icon}</span>${item.label}`;
    ul.appendChild(li);
  });
}

function flashInventory() {
  const panel = document.getElementById('inventory-panel');
  panel.style.boxShadow = '0 0 0 2px var(--clr-rose), 0 8px 40px rgba(0,0,0,0.6)';
  setTimeout(() => { panel.style.boxShadow = ''; }, 1000);
}

// ── SCENE / DIALOGUE ENGINE ───────────────────────────────────────────────────
/*
  A "scene" is an object with:
    bg:      path to background image (optional)
    steps:   array of step objects

  A "step" is one of:
    { type:'say',    speaker, emoji, text }           — dialogue line
    { type:'narrate', text }                          — narrator text (italic)
    { type:'choice', prompt, options: [{label, next, effect}] }
    { type:'goto',   scene }                          — jump to another scene
    { type:'end' }                                    — trigger ending
*/

const BG  = 'assets/backgrounds/';
const PRT = 'assets/character_portraits/';
const SND = 'soundtrack/';

// ── PORTRAIT EXPRESSION MAPPING ───────────────────────────────────────────
// Maps speaker → scene-key patterns → image file
// If no scene matches, 'default' is used
const PORTRAIT_MAP = {
  hana: {
    smile:   PRT + 'mrs_hana_smile.png',
    default: PRT + 'mrs_hana_neutral.png',
    // used whenever Mrs. Hana is giving a reward line
  },
  kellan: {
    inspired: PRT + 'kellan_inspired.png',
    default:  PRT + 'kellan_neutral.png',
  },
  tade: {
    apologetic:  PRT + 'tade_apologetic.png',
    default:     PRT + 'tad_mischevious.png', // mischievous is default
  },
  sera: {
    smile:   PRT + 'sera_smile.png',
    default: PRT + 'sera_neutral.png',
  },
  nira: {
    warm:      PRT + 'nira_warm.png',
    default:   PRT + 'nira_suspicious.png',
  },
};

// Which portrait expression to use per scene
// key = sceneId, value = { speakerKey: 'expressionKey' }
const SCENE_PORTRAIT_EXPR = {
  // Mrs. Hana smiles at reward scenes
  flower_shop_arrive: { hana: 'smile' },
  // Kellan reward = inspired
  kellan_reward:    { kellan: 'inspired' },
  kellan_listen:    { kellan: 'inspired' },
  kellan_ask:       { kellan: 'inspired' },
  kellan_suggest:   { kellan: 'inspired' },
  // Tade apologetic after scolding / gentle
  tade_gentle:      { tade: 'apologetic' },
  tade_reward:      { tade: 'apologetic' },
  tade_scold:       { tade: 'apologetic' },
  // Sera smiles at reward
  sera_reward:      { sera: 'smile' },
  sera_describe:    { sera: 'smile' },
  sera_quiet:       { sera: 'smile' },
  // Nira warm once inside
  greenhouse_enter:          { nira: 'warm' },
  greenhouse_restore:        { nira: 'warm' },
  nira_ask_who:              { nira: 'warm' },
  greenhouse_look_flowers:   { nira: 'warm' },
  act4_notes:                { nira: 'warm' },
  nira_offer:                { nira: 'warm' },
  nira_honest:               { nira: 'warm' },
  nira_mention:              { nira: 'warm' },
  nira_wait:                 { nira: 'warm' },
  envelope_open:             { nira: 'warm' },
  envelope_show:             { nira: 'warm' },
  envelope_hold:             { nira: 'warm' },
  // Reward scenes — Hana smile
  kellan_reward:             { hana: 'smile', kellan: 'inspired' },
};

// ── MUSIC TRACK MAPPING ────────────────────────────────────────────────────
const MUSIC_TRACKS = {
  main_theme:            SND + 'main_theme.mp3',
  town_exploration:      SND + 'town_exploration_theme.mp3',
  greenhouse:            SND + 'greenhouse_theme.mp3',
  ending:                SND + 'ending_theme.mp3',
};

// Maps scene groups to music tracks
const SCENE_MUSIC = {
  room:                      'main_theme',
  room_look:                 'main_theme',
  path_split:                'main_theme',
  beamlak_asked:             'main_theme',
  beamlak_trust:             'main_theme',
  flower_shop_arrive:        'town_exploration',
  river_path:                'town_exploration',
  kellan_listen:             'town_exploration',
  kellan_ask:                'town_exploration',
  kellan_suggest:            'town_exploration',
  kellan_reward:             'town_exploration',
  market_arrive:             'town_exploration',
  tade_scold:                'town_exploration',
  tade_gentle:               'town_exploration',
  tade_follow:               'town_exploration',
  tade_reward:               'town_exploration',
  sera_arrive:               'town_exploration',
  sera_describe:             'town_exploration',
  sera_compare:              'town_exploration',
  sera_quiet:                'town_exploration',
  sera_reward:               'town_exploration',
  greenhouse_exterior:       'greenhouse',
  nira_honest:               'greenhouse',
  nira_mention:              'greenhouse',
  nira_offer:                'greenhouse',
  nira_wait:                 'greenhouse',
  greenhouse_enter:          'greenhouse',
  nira_ask_who:              'greenhouse',
  greenhouse_look_flowers:   'greenhouse',
  greenhouse_restore:        'greenhouse',
  act4_notes:                'greenhouse',
  envelope_show:             'greenhouse',
  envelope_hold:             'greenhouse',
  envelope_open:             'greenhouse',
  hill_arrive:               'ending',
  ending_smile:              'ending',
  ending_thank:              'ending',
  ending_hug:                'ending',
  ending_flowers:            'ending',
  ending_final:              'ending',
};

// Speaker config: name, emoji initial, css class key
const SPEAKERS = {
  narrator: { name: '',          emoji: '✦', cls: 'narrator'  },
  feven:    { name: 'Feven',     emoji: '🌸', cls: 'feven'    },
  beamlak:  { name: 'Beamlak',  emoji: '🍃', cls: 'beamlak'  },
  hana:     { name: 'Mrs. Hana',emoji: '🌼', cls: 'hana'     },
  kellan:   { name: 'Kellan',   emoji: '🎵', cls: 'kellan'   },
  tade:     { name: 'Tade',     emoji: '🧡', cls: 'tade'     },
  sera:     { name: 'Sera',     emoji: '🎨', cls: 'sera'     },
  nira:     { name: 'Nira',     emoji: '🌿', cls: 'nira'     },
};

// ── ALL SCENES ─────────────────────────────────────────────────────────────────
const SCENES = {

  /* ═══════════════════════════════════════════════════════════
     OPENING: Feven's Room
  ═══════════════════════════════════════════════════════════ */
  room: {
    bg: BG + 'feven_room.png',
    steps: [
      { type:'narrate', text: 'Early morning. The sun has not fully warmed the streets yet.' },
      { type:'narrate', text: 'A cup on the table. A breeze slipping through the curtain. A plant stretching toward the light, leaning the way living things do.' },
      { type:'narrate', text: 'Feven\'s phone lights up.' },
      { type:'say', speaker:'beamlak', text: '"Meet me where the old paths split. I found something you\'ll probably like."' },
      { type:'narrate', text: 'No explanation. No context. Just that.' },
      {
        type: 'choice',
        prompt: 'What do you do?',
        options: [
          {
            label: '[Go immediately] — Leave without overthinking it.',
            effect: () => { state.trust += 1; },
            next: 'path_split',
          },
          {
            label: '[Look around the room first] — Something in the corner of your eye catches you.',
            effect: () => {
              state.pressedFlower = true;
              addItem('🌷', 'Pressed flower (from an old book)');
            },
            next: 'room_look',
          },
        ],
      },
    ],
  },

  room_look: {
    bg: BG + 'feven_room.png',
    steps: [
      { type:'narrate', text: 'Tucked between the pages of an old book — a small pressed flower, flattened and soft with age.' },
      { type:'narrate', text: 'You almost put it back. Instead, you carry it with you.' },
      { type:'narrate', text: '<em>Pressed flower added to inventory.</em>' },
      { type:'goto', scene: 'path_split' },
    ],
  },

  /* ═══════════════════════════════════════════════════════════
     ACT 1: The Old Path Split — Meet Beamlak
  ═══════════════════════════════════════════════════════════ */
  path_split: {
    bg: BG + 'old_path_split.png',
    steps: [
      { type:'narrate', text: 'A wall of climbing vines marks the place where the old roads split. Beamlak is already here, leaning against the stone like he has been waiting for longer than he admits.' },
      { type:'narrate', text: 'He is holding a folded note and a small pressed flower tucked into paper.' },
      { type:'say', speaker:'beamlak', text: '"You showed up faster than I expected."' },
      { type:'say', speaker:'feven',   text: '"You made it sound important."' },
      { type:'say', speaker:'beamlak', text: '"It is. Just trust me on this one."' },
      { type:'narrate', text: 'He tells you there is a path in town people have stopped paying attention to, and something beautiful is waiting at the end of it. He hands you the first clue.' },
      {
        type: 'choice',
        prompt: 'What do you say?',
        options: [
          {
            label: '[Ask Beamlak what he\'s hiding] — "What exactly are you not telling me?"',
            effect: () => { state.askedBeamlak = true; },
            next: 'beamlak_asked',
          },
          {
            label: '[Trust him and move on] — You take the clue without pushing for answers.',
            effect: () => { state.trust += 1; },
            next: 'beamlak_trust',
          },
        ],
      },
    ],
  },

  beamlak_asked: {
    bg: BG + 'old_path_split.png',
    steps: [
      { type:'say', speaker:'beamlak', text: '"If I told you now, the whole thing would lose the fun."' },
      { type:'say', speaker:'beamlak', text: '"Just go. Mrs. Hana\'s shop is the first stop."' },
      { type:'narrate', text: 'He is clearly enjoying keeping you guessing.' },
      { type:'goto', scene: 'flower_shop_arrive' },
    ],
  },

  beamlak_trust: {
    bg: BG + 'old_path_split.png',
    steps: [
      { type:'say', speaker:'beamlak', text: '"Thank you. Seriously."' },
      { type:'narrate', text: 'Something in his face relaxes — like he\'d been a little afraid you\'d refuse.' },
      { type:'narrate', text: 'He points you toward Mrs. Hana\'s flower shop.' },
      { type:'goto', scene: 'flower_shop_arrive' },
    ],
  },

  /* ═══════════════════════════════════════════════════════════
     ACT 2a: Mrs. Hana's Flower Shop
  ═══════════════════════════════════════════════════════════ */
  flower_shop_arrive: {
    bg: BG + 'flower_shop.png',
    steps: [
      { type:'narrate', text: 'The shop is small and busy in the way only old places can be — mismatched pots, handwritten labels, glass jars filled with seeds you\'ve never seen named.' },
      { type:'narrate', text: 'Mrs. Hana is behind the counter, trimming stems with practiced patience.' },
      { type:'say', speaker:'hana', text: '"Ah. You found your way here. I wondered when you\'d arrive."' },
      { type:'say', speaker:'feven', text: '"Beamlak sent me. He said you\'d know what the clue means."' },
      { type:'say', speaker:'hana', text: '"There was once a rare flower that bloomed all across this town — in hidden corners, in forgotten spaces. People used to care for those places. Then they stopped."' },
      { type:'say', speaker:'hana', text: '"I want you to collect signs of its old route. Go to the people who still remember."' },
      { type:'say', speaker:'feven', text: '"How will I know what I\'m looking for?"' },
      { type:'say', speaker:'hana', text: '"You\'ll know. You always notice the small things."' },
      { type:'narrate', text: 'She gives you a hand-drawn map of the town with three paths marked.' },
      { type:'narrate', text: '<em>You receive: Hand-drawn map (Mrs. Hana\'s marks).</em>' },
      {
        type: 'choice',
        prompt: 'Where do you go first?',
        options: [
          { label: '[River Path] — Find the musician Beamlak mentioned.',  next: 'river_path'    },
          { label: '[The Market] — Something\'s going on at the stalls.',   next: 'market_arrive'  },
          { label: '[Sera\'s Corner] — Someone is painting alone there.',  next: 'sera_arrive'    },
        ],
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════
     ACT 2b: River Path — Kellan
  ═══════════════════════════════════════════════════════════ */
  river_path: {
    bg: BG + 'river_path.png',
    steps: [
      { type:'narrate', text: 'The river path is lined with wild plants, and the sound of water is almost musical on its own. Almost.' },
      { type:'narrate', text: 'A man sits on a low stone wall, a weathered instrument in his lap, staring at the water like it owes him something.' },
      { type:'say', speaker:'kellan', text: '"It\'s not bad. It\'s just… missing something."' },
      { type:'say', speaker:'feven',  text: '"The song?"' },
      { type:'say', speaker:'kellan', text: '"Been working on it long enough that I\'ve forgotten what I was trying to say."' },
      {
        type: 'choice',
        prompt: 'How do you approach this?',
        options: [
          {
            label: '[Listen quietly first] — Sit beside him and let the sound come.',
            effect: () => { state.kellanDepth = 2; },
            next: 'kellan_listen',
          },
          {
            label: '[Ask him what the song is about] — "What were you thinking when you wrote it?"',
            effect: () => { state.kellanDepth = 1; },
            next: 'kellan_ask',
          },
          {
            label: '[Suggest a few notes to try] — "What if it went a little lower here?"',
            effect: () => { state.kellanDepth = 1; },
            next: 'kellan_suggest',
          },
        ],
      },
    ],
  },

  kellan_listen: {
    bg: BG + 'river_path.png',
    steps: [
      { type:'narrate', text: 'You sit down without saying a word. The water moves. The notes drift.' },
      { type:'narrate', text: 'After a while, something in him loosens.' },
      { type:'say', speaker:'kellan', text: '"It was for a day I never finished. Someone I didn\'t get to say goodbye to properly. I thought if I completed the song, it would feel like… closing something."' },
      { type:'say', speaker:'feven',  text: '"Maybe it doesn\'t need to feel closed. Maybe it just needs to feel real."' },
      { type:'narrate', text: 'There is a long pause. Then he plays the missing part.' },
      { type:'goto', scene: 'kellan_reward' },
    ],
  },

  kellan_ask: {
    bg: BG + 'river_path.png',
    steps: [
      { type:'say', speaker:'kellan', text: '"It was written for a day I never finished properly."' },
      { type:'say', speaker:'kellan', text: '"I keep coming back to it, but it feels like I\'m just putting words in the wrong places."' },
      { type:'say', speaker:'feven',  text: '"What did the day feel like, at the beginning?"' },
      { type:'narrate', text: 'He thinks about that for a long moment. Then the melody shifts — just slightly — and the missing part returns.' },
      { type:'goto', scene: 'kellan_reward' },
    ],
  },

  kellan_suggest: {
    bg: BG + 'river_path.png',
    steps: [
      { type:'say', speaker:'kellan', text: '"Lower? Like…"' },
      { type:'narrate', text: 'He tries the notes. They don\'t quite fit, but they point him somewhere else. He looks up.' },
      { type:'say', speaker:'kellan', text: '"Wait. Not lower. Slower."' },
      { type:'narrate', text: 'The melody stretches, finds its footing. Something clicks into place.' },
      { type:'goto', scene: 'kellan_reward' },
    ],
  },

  kellan_reward: {
    bg: BG + 'river_path.png',
    steps: [
      { type:'say', speaker:'kellan', text: '"You didn\'t just hear it. You actually listened."' },
      { type:'narrate', text: 'He reaches into his jacket and hands you a folded piece of paper.' },
      { type:'narrate', text: 'Inside: a crude hand-drawn fragment of a map, and a single line of lyrics written in small, careful letters.' },
      { type:'narrate', text: '<em>You receive: Map fragment (Kellan\'s) + Song lyric clue.</em>' },
      {
        type: 'choice',
        prompt: 'Continue the journey.',
        getOptions: () => getNextLocationOptions('river'),
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════
     ACT 2c: The Market — Tade
  ═══════════════════════════════════════════════════════════ */
  market_arrive: {
    bg: BG + 'market.png',
    steps: [
      { type:'narrate', text: 'The market is loud, bright, and full of shoulders. Something is wrong at one of the flower stalls.' },
      { type:'narrate', text: 'A small boy with a bundled armful of flowers is weaving fast through the crowd. A vendor shouts. He weaves faster.' },
      { type:'say', speaker:'tade', text: '"I was helping them! Sort of. Mostly."' },
      {
        type: 'choice',
        prompt: 'How do you handle this?',
        options: [
          {
            label: '[Scold Tade] — "You can\'t just take things that aren\'t yours."',
            effect: () => { state.tadeFriendly = false; },
            next: 'tade_scold',
          },
          {
            label: '[Talk to him gently] — Crouch down and ask what\'s really going on.',
            effect: () => { state.tadeFriendly = true; },
            next: 'tade_gentle',
          },
          {
            label: '[Ignore him and follow him quietly] — See where he\'s actually going.',
            effect: () => { state.tadeFriendly = false; },
            next: 'tade_follow',
          },
        ],
      },
    ],
  },

  tade_scold: {
    bg: BG + 'market.png',
    steps: [
      { type:'say', speaker:'feven', text: '"You can\'t just take things that aren\'t yours."' },
      { type:'say', speaker:'tade',  text: '"Fine. Fine."' },
      { type:'narrate', text: 'He hands the flowers back, a little defensive. He tells you the shortcut through the market, but clips his own explanation short.' },
      { type:'goto', scene: 'tade_reward' },
    ],
  },

  tade_gentle: {
    bg: BG + 'market.png',
    steps: [
      { type:'narrate', text: 'You crouch down so you\'re eye‑level with him. He stops fidgeting.' },
      { type:'say', speaker:'feven', text: '"Why those flowers?"' },
      { type:'say', speaker:'tade',  text: '"Because nobody ever gives me pretty things to carry."' },
      { type:'narrate', text: 'A long pause opens between you.' },
      { type:'say', speaker:'feven', text: '"Then carry them properly. Let\'s go return them together."' },
      { type:'say', speaker:'tade',  text: '"…okay."' },
      { type:'narrate', text: 'He even apologizes to the vendor — quietly but genuinely.' },
      { type:'goto', scene: 'tade_reward' },
    ],
  },

  tade_follow: {
    bg: BG + 'market.png',
    steps: [
      { type:'narrate', text: 'You say nothing and just trail behind. He glances back at you twice, confused.' },
      { type:'say', speaker:'tade',  text: '"Are you just… following me? On purpose?"' },
      { type:'say', speaker:'feven', text: '"I\'m curious where you\'re going."' },
      { type:'narrate', text: 'He leads you through a narrow alley and back to the same starting stall. He hands back the flowers, more amused than sorry.' },
      { type:'goto', scene: 'tade_reward' },
    ],
  },

  tade_reward: {
    bg: BG + 'market.png',
    steps: [
      { type:'say', speaker:'tade', text: '"Okay, fine. You\'re nicer than I expected."' },
      { type:'narrate', text: 'He digs into his pocket and produces a small wax seal — a circle stamped with something that looks like a flower.' },
      { type:'say', speaker:'tade', text: '"Secret shortcut through the back alleys, too. Better than the main road."' },
      { type:'narrate', text: '<em>You receive: Wax seal (flower symbol) + Market shortcut note.</em>' },
      {
        type: 'choice',
        prompt: 'Continue the journey.',
        getOptions: () => getNextLocationOptions('market'),
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════
     ACT 2d: Sera's Corner
  ═══════════════════════════════════════════════════════════ */
  sera_arrive: {
    bg: BG + 'sera_painting_corner.png',
    steps: [
      { type:'narrate', text: 'A quiet corner where the buildings make a natural alcove. A woman is painting by herself — not looking at anything in front of her, only at what is behind her eyes.' },
      { type:'say', speaker:'sera',  text: '"It was there for a moment. Now I can almost feel it slipping."' },
      { type:'say', speaker:'feven', text: '"What are you painting?"' },
      { type:'say', speaker:'sera',  text: '"A flower I saw only once. I\'m trying to remember the exact shape of it before it\'s completely gone."' },
      {
        type: 'choice',
        prompt: 'How do you help her?',
        options: [
          {
            label: '[Describe the petals carefully] — You find a nearby bloom and study it slowly.',
            effect: () => { state.seraStyle = 'careful'; },
            next: 'sera_describe',
          },
          {
            label: '[Compare it to another flower] — "It might have looked like that one over there, but narrower."',
            effect: () => { state.seraStyle = 'compare'; },
            next: 'sera_compare',
          },
          {
            label: '[Stay quiet and let her think] — You sit with her. Sometimes that\'s enough.',
            effect: () => { state.seraStyle = 'quiet'; },
            next: 'sera_quiet',
          },
        ],
      },
    ],
  },

  sera_describe: {
    bg: BG + 'sera_painting_corner.png',
    steps: [
      { type:'narrate', text: 'You find a cluster of small flowers near the wall and look at them slowly — the way they\'re curved, where the veins run, how many petals.' },
      { type:'say', speaker:'feven', text: '"There are five petals. They curve slightly back at the tips, like they\'re made of paper."' },
      { type:'narrate', text: 'Sera\'s brush moves faster. Then she adds a small hidden mark to the corner of the canvas — something she would not have put there otherwise.' },
      { type:'goto', scene: 'sera_reward' },
    ],
  },

  sera_compare: {
    bg: BG + 'sera_painting_corner.png',
    steps: [
      { type:'say', speaker:'feven', text: '"It might have looked like that one over there, but narrower. And lighter."' },
      { type:'say', speaker:'sera',  text: '"Lighter… yes. The memory is getting clearer."' },
      { type:'narrate', text: 'She corrects a line in the painting. She seems relieved to have something to push against.' },
      { type:'goto', scene: 'sera_reward' },
    ],
  },

  sera_quiet: {
    bg: BG + 'sera_painting_corner.png',
    steps: [
      { type:'narrate', text: 'You sit beside her without saying anything. Time passes. The light shifts.' },
      { type:'narrate', text: 'Eventually she notices that you haven\'t left.' },
      { type:'say', speaker:'sera',  text: '"Most people ask what it is. Then get bored and walk away."' },
      { type:'say', speaker:'feven', text: '"I\'m not bored."' },
      { type:'narrate', text: 'Something unlocks in her expression. She finishes the sketch in silence — and this time, the flower looks right.' },
      { type:'goto', scene: 'sera_reward' },
    ],
  },

  sera_reward: {
    bg: BG + 'sera_painting_corner.png',
    steps: [
      { type:'say', speaker:'sera', text: '"You made me remember it without making me feel stupid for forgetting."' },
      { type:'narrate', text: 'She tears a page from the back of her sketchbook and hands it to you — a careful drawing of the old greenhouse, seen from outside.' },
      { type:'narrate', text: '<em>You receive: Greenhouse sketch (Sera\'s drawing).</em>' },
      {
        type: 'choice',
        prompt: 'Continue the journey.',
        getOptions: () => getNextLocationOptions('sera'),
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════
     ACT 3: The Greenhouse — Nira
  ═══════════════════════════════════════════════════════════ */
  greenhouse_exterior: {
    bg: BG + 'greenhouse_exterior.png',
    steps: [
      { type:'narrate', text: 'The clues have led here — an old greenhouse covered in dust, rust, and enormous wild vines. It looks like a secret the city kept and then forgot.' },
      { type:'narrate', text: 'A woman stands in front of the door, arms crossed, watching you arrive like she has seen too many visitors with the wrong reasons.' },
      { type:'say', speaker:'nira',  text: '"This place is not for wandering eyes."' },
      { type:'say', speaker:'feven', text: '"I am not here to take anything."' },
      { type:'say', speaker:'nira',  text: '"That is what they all say."' },
      {
        type: 'choice',
        prompt: 'How do you earn her trust?',
        options: [
          {
            label: '[Speak honestly] — Tell her everything you\'ve seen today.',
            effect: () => { state.greenhouse_how = 'honest'; state.trust += 1; },
            next: 'nira_honest',
          },
          {
            label: '[Mention the people you helped] — "Kellan, Tade, Sera — they all pointed me here."',
            effect: () => { state.greenhouse_how = 'mention'; state.trust += 1; },
            next: 'nira_mention',
          },
          {
            label: '[Offer to clean instead of asking for entry] — "I can start clearing the overgrowth."',
            effect: () => { state.greenhouse_how = 'offer'; state.trust += 2; },
            next: 'nira_offer',
          },
          {
            label: '[Wait silently] — Don\'t push. Just stand here.',
            effect: () => { state.greenhouse_how = 'wait'; },
            next: 'nira_wait',
          },
        ],
      },
    ],
  },

  nira_honest: {
    bg: BG + 'greenhouse_exterior.png',
    steps: [
      { type:'say', speaker:'feven', text: '"I don\'t want to use this place. I want to understand it."' },
      { type:'say', speaker:'nira',  text: '"That is a rarer answer than you think."' },
      { type:'narrate', text: 'A long pause. Then she steps aside.' },
      { type:'goto', scene: 'greenhouse_enter' },
    ],
  },

  nira_mention: {
    bg: BG + 'greenhouse_exterior.png',
    steps: [
      { type:'say', speaker:'feven', text: '"A musician by the river gave me a map fragment. A boy at the market gave me a wax seal. A painter showed me a sketch of this place."' },
      { type:'narrate', text: 'Nira\'s expression changes — not warmer, exactly, but more careful. Like she is reconsidering.' },
      { type:'say', speaker:'nira',  text: '"…Kellan sent you?"' },
      { type:'say', speaker:'feven', text: '"Not exactly. But he pointed the way."' },
      { type:'narrate', text: 'She steps aside.' },
      { type:'goto', scene: 'greenhouse_enter' },
    ],
  },

  nira_offer: {
    bg: BG + 'greenhouse_exterior.png',
    steps: [
      { type:'say', speaker:'feven', text: '"I can start clearing the overgrowth outside while we talk. I\'m not in a hurry."' },
      { type:'narrate', text: 'Nira studies you for a long moment. Then something in her shoulders drops — the particular way they drop when someone decides to trust.' },
      { type:'say', speaker:'nira',  text: '"Come in. And yes — you can help."' },
      { type:'goto', scene: 'greenhouse_enter' },
    ],
  },

  nira_wait: {
    bg: BG + 'greenhouse_exterior.png',
    steps: [
      { type:'narrate', text: 'You don\'t say anything. You don\'t knock again. You just stand.' },
      { type:'narrate', text: 'After a while, Nira tilts her head.' },
      { type:'say', speaker:'nira',  text: '"You are not going to make an argument?"' },
      { type:'say', speaker:'feven', text: '"I thought I already did."' },
      { type:'narrate', text: 'She almost smiles. She opens the door.' },
      { type:'goto', scene: 'greenhouse_enter' },
    ],
  },

  greenhouse_enter: {
    bg: BG + 'greenhouse_interior_ruined.png',
    steps: [
      { type:'narrate', text: 'Inside: broken pots, dry soil, faded glass catching what little light seeps through. Dust hangs in the air like quiet time itself.' },
      { type:'narrate', text: 'But somewhere deeper — something green is still alive.' },
      { type:'say', speaker:'nira',  text: '"People kept coming here only to take pictures. Or to make promises they\'d never keep. So I closed it."' },
      { type:'say', speaker:'feven', text: '"But you kept it. You kept coming back."' },
      { type:'say', speaker:'nira',  text: '"Someone had to."' },
      { type:'narrate', text: 'She leads you to a hidden back section. In the shadow of the neglect — a small bloom garden, quietly alive.' },
      { type:'narrate', text: 'Feven stops. This is the emotional heart of the place.'  },
      { type:'say', speaker:'nira',  text: '"This garden was meant to be restored. For someone who notices small things." She pauses. "I was not told who."' },
      {
        type: 'choice',
        prompt: 'What do you do first?',
        options: [
          {
            label: '[Ask who it was meant for] — "Who planned this?"',
            effect: () => { state.greenhouse_first = 'ask'; },
            next: 'nira_ask_who',
          },
          {
            label: '[Start helping immediately] — Pick up the nearest pot and begin.',
            effect: () => { state.greenhouse_first = 'help'; state.trust += 1; },
            next: 'greenhouse_restore',
          },
          {
            label: '[Look at the surviving flowers first] — Lean in, study them slowly.',
            effect: () => { state.greenhouse_first = 'look'; },
            next: 'greenhouse_look_flowers',
          },
        ],
      },
    ],
  },

  nira_ask_who: {
    bg: BG + 'greenhouse_interior_ruined.png',
    steps: [
      { type:'say', speaker:'feven', text: '"Who was it made for?"' },
      { type:'say', speaker:'nira',  text: '"I was only told to keep it. The rest, I expect, will explain itself."' },
      { type:'narrate', text: 'She hands you a pair of worn gardening gloves.' },
      { type:'goto', scene: 'greenhouse_restore' },
    ],
  },

  greenhouse_look_flowers: {
    bg: BG + 'greenhouse_interior_ruined.png',
    steps: [
      { type:'narrate', text: 'Small blossoms, pale and reaching. The kind that have been trying to bloom without anyone encouraging them.' },
      { type:'narrate', text: 'You recognize one of the varieties — the same kind that appears in Mrs. Hana\'s sketches.' },
      { type:'say', speaker:'nira',  text: '"Those ones are the ones that always survive."' },
      { type:'goto', scene: 'greenhouse_restore' },
    ],
  },

  greenhouse_restore: {
    bg: BG + 'greenhouse_interior_ruined.png',
    steps: [
      { type:'narrate', text: 'You work together — Nira directing, Feven clearing and planting.' },
      { type:'narrate', text: 'Water buckets refilled. Seedlings carefully replanted. Broken glass swept aside. Flowers arranged by what feels right.' },
      { type:'narrate', text: 'It takes time. But time spent on something real passes differently.' },
      { type:'narrate', text: 'When you look up, the light inside the greenhouse has shifted — softer, fuller, more alive.' },
      { type:'say', speaker:'nira',  text: '"I have not seen it look like this in a long time."' },
      { type:'goto', scene: 'act4_notes' },
    ],
  },

  /* ═══════════════════════════════════════════════════════════
     ACT 4: The Hidden Meaning — Notes + Envelope
  ═══════════════════════════════════════════════════════════ */
  act4_notes: {
    bg: BG + 'greenhouse_interior_restored.png',
    steps: [
      { type:'narrate', text: 'As the greenhouse comes back to life, you begin finding more notes. Folded carefully. Left in small obvious places that would only seem obvious to someone who notices small things.' },
      { type:'say', speaker:'kellan', text: '"Some songs only return when someone else believes in them."' },
      { type:'say', speaker:'tade',   text: '"Even small hands can carry something important if they are trusted."' },
      { type:'say', speaker:'sera',   text: '"Memory is not just what we keep, but what we choose to protect."' },
      { type:'say', speaker:'hana',   text: '"The flower you are looking for was never just a flower."' },
      { type:'narrate', text: 'Something in the air changes. You understand now that this has all been moving toward a single point.' },
      { type:'narrate', text: 'Nira guides you to the very center of the greenhouse. She places one final flower carefully in the soil.' },
      { type:'narrate', text: 'A hidden drawer opens in the old pot stand beneath it.' },
      { type:'narrate', text: 'Inside: a small envelope, beautifully wrapped, sealed in wax. The handwriting is immediately familiar.' },
      { type:'say', speaker:'feven', text: '"Beamlak."' },
      {
        type: 'choice',
        prompt: 'What do you do with the envelope?',
        options: [
          {
            label: '[Open it immediately] — You need to know.',
            effect: () => { state.envelope_how = 'immediately'; },
            next: 'envelope_open',
          },
          {
            label: '[Show it to Nira first] — You don\'t want to open it alone.',
            effect: () => { state.envelope_how = 'others'; },
            next: 'envelope_show',
          },
          {
            label: '[Hold it for a moment] — Something about the weight of it makes you pause.',
            effect: () => { state.envelope_how = 'held'; },
            next: 'envelope_hold',
          },
        ],
      },
    ],
  },

  envelope_show: {
    bg: BG + 'greenhouse_interior_restored.png',
    steps: [
      { type:'say', speaker:'nira',  text: '"You should open it yourself. But… I\'m glad you didn\'t want to be alone for it."' },
      { type:'narrate', text: 'Nira gives you a small extra hint — she says the hill at the edge of town has the best view of the sunset. And that Beamlak has always loved that spot.' },
      { type:'goto', scene: 'envelope_open' },
    ],
  },

  envelope_hold: {
    bg: BG + 'greenhouse_interior_restored.png',
    steps: [
      { type:'narrate', text: 'You hold it. It\'s light, but it feels like it contains something larger than paper.' },
      { type:'narrate', text: 'The envelope smells faintly of dried flowers. Something about it feels oddly familiar, like a word you\'ve been trying to remember all day.' },
      { type:'goto', scene: 'envelope_open' },
    ],
  },

  envelope_open: {
    bg: BG + 'greenhouse_interior_restored.png',
    steps: [
      { type:'narrate', text: 'You break the seal.' },
      { type:'narrate', text: 'Inside, in Beamlak\'s careful handwriting:' },
      { type:'say', speaker:'beamlak', text: '"Come to the hill at the edge of town. Before the sun goes down. Everyone will be there."' },
      { type:'narrate', text: 'That\'s all.' },
      { type:'narrate', text: '<em>You receive: Beamlak\'s letter (the final direction).</em>' },
      { type:'narrate', text: 'You look at Nira.' },
      { type:'say', speaker:'nira',    text: '"Go. I will lock up carefully."' },
      { type:'goto', scene: 'hill_arrive' },
    ],
  },

  /* ═══════════════════════════════════════════════════════════
     FINAL ACT: The Hill at Sunset
  ═══════════════════════════════════════════════════════════ */
  hill_arrive: {
    bg: BG + 'hill_at_sunset.png',
    steps: [
      { type:'narrate', text: 'The path up the hill is quiet. The evening air is cooler here, and below, the town looks small and peaceful — like it has been holding its breath for this moment.' },
      { type:'narrate', text: 'At the top, the sky is soft orange and gold.' },
      { type:'narrate', text: 'Beamlak is there. So are all the others — Mrs. Hana, Kellan, Nira, Tade, Sera.' },
      { type:'narrate', text: 'Each of them is holding something — one flower, or one small piece of the restored greenhouse.' },
      { type:'say', speaker:'beamlak', text: '"You made it."' },
      { type:'say', speaker:'feven',   text: '"You planned all this?"' },
      { type:'say', speaker:'beamlak', text: '"Not alone."' },
      { type:'say', speaker:'beamlak', text: '"You spend so much time making other people\'s days brighter. You never ask for anything." He pauses. "I thought today should be the day the world gave one back to you."' },
      { type:'narrate', text: 'A breath. The whole weight of the day settles into something clear.' },
      { type:'say', speaker:'beamlak', text: '"Happy Birthday, Feven."' },
      { type:'narrate', text: 'Today is Feven\'s birthday. The entire adventure — the flower route, the clues, the greenhouse — was a birthday journey built specifically for her.' },
      {
        type: 'choice',
        prompt: 'How do you respond?',
        options: [
          { label: '[Smile] — A soft, open smile.', next: 'ending_smile' },
          { label: '[Thank everyone] — Look at each of them.',  next: 'ending_thank' },
          { label: '[Hug Beamlak] — You step forward.',  next: 'ending_hug'   },
          { label: '[Look at the flowers] — You want to see them all.',  next: 'ending_flowers' },
        ],
      },
    ],
  },

  ending_smile: {
    bg: BG + 'hill_at_sunset.png',
    steps: [
      { type:'narrate', text: 'You smile — the kind that doesn\'t need to announce itself. A small, full thing.' },
      { type:'goto', scene: 'ending_final' },
    ],
  },

  ending_thank: {
    bg: BG + 'hill_at_sunset.png',
    steps: [
      { type:'say', speaker:'hana',   text: '"Flowers do not rush to bloom. They simply know when the light has arrived."' },
      { type:'say', speaker:'kellan', text: '"I finished the song because you gave me back the part I lost."' },
      { type:'say', speaker:'tade',   text: '"I brought you the best flower on purpose. Not because I stole it this time."' },
      { type:'say', speaker:'sera',   text: '"You made the colors easier to remember."' },
      { type:'goto', scene: 'ending_final' },
    ],
  },

  ending_hug: {
    bg: BG + 'hill_at_sunset.png',
    steps: [
      { type:'narrate', text: 'You step forward and put your arms around him.' },
      { type:'narrate', text: 'He exhales like he\'d been holding his breath since morning.' },
      { type:'say', speaker:'beamlak', text: '"You didn\'t make it easy, you know. Keeping this secret."' },
      { type:'say', speaker:'feven',   text: '"You\'re a terrible liar. I almost figured it out twice."' },
      { type:'say', speaker:'beamlak', text: '"Twice? That\'s better than I expected."' },
      { type:'goto', scene: 'ending_final' },
    ],
  },

  ending_flowers: {
    bg: BG + 'greenhouse_interior_restored.png',
    steps: [
      { type:'narrate', text: 'The bouquet is everything the day was made of.' },
      { type:'narrate', text: 'One flower from the river path, one from the market stalls, one from Sera\'s sketchbook reference, one from the greenhouse\'s hidden living corner.' },
      { type:'narrate', text: 'Together, they look like a sentence that took all day to finish.' },
      { type:'goto', scene: 'ending_final' },
    ],
  },

  ending_final: {
    bg: BG + 'greenhouse_interior_restored.png',
    steps: [
      { type:'say', speaker:'hana',    text: '"Flowers do not rush to bloom. They simply know when the light has arrived."' },
      { type:'say', speaker:'kellan',  text: '"I finished the song because you gave me back the part I lost."' },
      { type:'say', speaker:'tade',    text: '"I brought you the best flower on purpose. Not because I stole it this time."' },
      { type:'say', speaker:'sera',    text: '"You made the colors easier to remember."' },
      { type:'say', speaker:'beamlak', text: '"You spend so much time giving people reasons to smile. I thought today should be the day the world gave one back to you."' },
      { type:'narrate', text: 'The sky deepens into amber and violet. The town glows below.' },
      { type:'end' },
    ],
  },

};

// ── HELPER: Which location options remain? ────────────────────────────────────
function getNextLocationOptions(visited) {
  const locations = [
    { key: 'river',  label: '[River Path] — Find the musician.',          next: 'river_path'    },
    { key: 'market', label: '[The Market] — Something\'s going on.',      next: 'market_arrive'  },
    { key: 'sera',   label: '[Sera\'s Corner] — The quiet painter.',       next: 'sera_arrive'   },
  ];

  const completed = getCompletedLocations();
  completed.push(visited);

  const remaining = locations.filter(l => !completed.includes(l.key));

  if (remaining.length === 0) {
    return [{ label: '[Head to the greenhouse] — All paths lead here now.', next: 'greenhouse_exterior', effect: () => {
      addItem('🗺️', 'Map fragment (Kellan\'s)');
      addItem('🪙', 'Wax seal (flower symbol)');
      addItem('🖼️', 'Greenhouse sketch (Sera\'s drawing)');
    }}];
  }

  const options = remaining.map(l => ({ label: l.label, next: l.next }));
  // Also show "continue to greenhouse" if only 1 remaining
  return options;
}

function getCompletedLocations() {
  const locs = [];
  if (SCENES.kellan_reward && _visitedScenes.has('kellan_reward')) locs.push('river');
  if (_visitedScenes.has('tade_reward'))   locs.push('market');
  if (_visitedScenes.has('sera_reward'))   locs.push('sera');
  return locs;
}

const _visitedScenes = new Set();

// ── INVENTORY ITEMS ADDED ON COMPLETION ──────────────────────────────────────
const SCENE_ITEM_GRANTS = {
  kellan_reward: [
    { icon: '🗺️', label: 'Map fragment (Kellan\'s)' },
    { icon: '🎵', label: 'Song lyric clue' },
  ],
  tade_reward: [
    { icon: '🪙', label: 'Wax seal (flower symbol)' },
    { icon: '🚪', label: 'Market shortcut note' },
  ],
  sera_reward: [
    { icon: '🖼️', label: 'Greenhouse sketch (Sera\'s drawing)' },
  ],
  envelope_open: [
    { icon: '💌', label: 'Beamlak\'s letter (the final direction)' },
  ],
  flower_shop_arrive: [
    { icon: '🗺️', label: 'Hand-drawn map (Mrs. Hana\'s marks)' },
  ],
};

// ── ENGINE ────────────────────────────────────────────────────────────────────
let currentScene = null;
let currentStep  = 0;
let isTyping     = false;
let typeTimeout  = null;

const $ = id => document.getElementById(id);

const sceneEl    = $('scene-bg');
const portraitEl = $('portrait-area');
const initialsEl = $('portrait-initials');
const nameTagEl  = $('portrait-name-tag');
const speakerEl  = $('speaker-name');
const dialogueEl = $('dialogue-text');
const nextHint   = $('next-hint');
const choicesBox = $('choices-box');
const choicesList= $('choices-list');

function loadScene(sceneId) {
  _visitedScenes.add(sceneId);
  const scene = SCENES[sceneId];
  if (!scene) { console.error('Missing scene:', sceneId); return; }

  currentScene = { id: sceneId, ...scene };
  currentStep  = 0;

  // Grant items for this scene if applicable
  const grants = SCENE_ITEM_GRANTS[sceneId];
  if (grants) grants.forEach(g => addItem(g.icon, g.label));

  // Set background
  if (scene.bg) {
    sceneEl.style.backgroundImage = `url('${scene.bg}')`;
  }

  // Switch music track if this scene has a different one
  const trackKey = SCENE_MUSIC[sceneId];
  if (trackKey) switchMusic(trackKey);

  advanceStep();
}

function advanceStep() {
  if (!currentScene) return;
  if (currentStep >= currentScene.steps.length) return;

  const step = currentScene.steps[currentStep];

  choicesBox.classList.remove('visible');
  nextHint.classList.remove('hidden');

  if (step.type === 'say') {
    showDialogue(step.speaker, step.text);
  } else if (step.type === 'narrate') {
    showNarrator(step.text);
  } else if (step.type === 'choice') {
    showChoices(step);
    return; // wait for user
  } else if (step.type === 'goto') {
    loadScene(step.scene);
    return;
  } else if (step.type === 'end') {
    triggerEnding();
    return;
  }
}

function showDialogue(speakerKey, text) {
  const sp = SPEAKERS[speakerKey] || SPEAKERS.narrator;

  // portrait class for color accent
  portraitEl.className = `speaker-${sp.cls}`;
  nameTagEl.textContent = sp.name || '';

  // portrait image
  const portraitImgEl = document.getElementById('portrait-img');
  const portraitMap    = PORTRAIT_MAP[speakerKey];
  const sceneExprs     = SCENE_PORTRAIT_EXPR[currentScene?.id] || {};
  const exprKey        = sceneExprs[speakerKey] || 'default';

  if (portraitMap) {
    const src = portraitMap[exprKey] || portraitMap.default;
    // Use an <img> inside portrait-img
    let img = portraitImgEl.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = sp.name;
      portraitImgEl.appendChild(img);
    }
    initialsEl.style.display = 'none';
    if (img.getAttribute('src') !== src) {
      img.style.opacity = '0';
      img.setAttribute('src', src);
      img.onload = () => { img.style.opacity = '1'; };
    } else {
      img.style.opacity = '1';
    }
  } else {
    // No portrait image — show emoji fallback
    const img = portraitImgEl.querySelector('img');
    if (img) img.remove();
    initialsEl.style.display = '';
    initialsEl.textContent = sp.emoji;
  }

  // speaker name in dialogue box
  speakerEl.textContent = sp.name ? sp.name + ':' : '';

  typeText(dialogueEl, stripHtml(text), text);
}

function showNarrator(text) {
  portraitEl.className = 'speaker-narrator';
  // Clear portrait image, show diamond
  const portraitImgEl = document.getElementById('portrait-img');
  const img = portraitImgEl.querySelector('img');
  if (img) img.remove();
  initialsEl.style.display = '';
  initialsEl.textContent = SPEAKERS.narrator.emoji;
  nameTagEl.textContent  = '';
  speakerEl.textContent  = '';
  typeText(dialogueEl, stripHtml(text), text);
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Typewriter effect
function typeText(el, plain, richFull) {
  if (typeTimeout) clearTimeout(typeTimeout);
  isTyping = true;
  el.classList.add('type-cursor');
  nextHint.classList.add('hidden');

  let i = 0;
  const speed = 22; // ms per char

  function tick() {
    i++;
    // Display partial plain text while typing, then swap to rich
    if (i < plain.length) {
      el.textContent = plain.slice(0, i);
      typeTimeout = setTimeout(tick, speed);
    } else {
      el.innerHTML = richFull; // full rich text at end
      el.classList.remove('type-cursor');
      isTyping = false;
      nextHint.classList.remove('hidden');
    }
  }
  tick();
}

function showChoices(step) {
  nextHint.classList.add('hidden');
  choicesList.innerHTML = '';

  const label = step.prompt || 'What do you do?';
  $('choices-label').textContent = label;

  // Support dynamic option resolution via getOptions()
  const options = step.getOptions ? step.getOptions() : step.options;

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      if (opt.effect) opt.effect();
      currentStep++;
      loadScene(opt.next);
    });
    choicesList.appendChild(btn);
  });

  choicesBox.classList.add('visible');
}

// Advance on click (anywhere except choices)
document.getElementById('game-screen').addEventListener('click', e => {
  if (e.target.classList.contains('choice-btn')) return;
  if (choicesBox.classList.contains('visible')) return;

  if (isTyping) {
    // Skip typewriter
    if (typeTimeout) clearTimeout(typeTimeout);
    const step = currentScene?.steps[currentStep];
    if (step?.type === 'say') {
      portraitEl.className = `speaker-${(SPEAKERS[step.speaker] || SPEAKERS.narrator).cls}`;
      dialogueEl.innerHTML = step.text;
    } else if (step?.type === 'narrate') {
      dialogueEl.innerHTML = step.text;
    }
    dialogueEl.classList.remove('type-cursor');
    isTyping = false;
    nextHint.classList.remove('hidden');
    return;
  }

  currentStep++;
  advanceStep();
});

// ── ENDING ────────────────────────────────────────────────────────────────────
function triggerEnding() {
  const endMessage = buildEndMessage();
  transitionScreen('game-screen', 'end-screen', () => {
    $('end-message').innerHTML = endMessage;
    spawnPetals();
  });
}

function buildEndMessage() {
  const lines = [];
  lines.push('"You spend so much time giving people reasons to smile.');
  lines.push('I thought today should be the day the world gave one back to you."');
  if (state.pressedFlower) {
    lines.push('');
    lines.push('<em>You still have that pressed flower from this morning.</em>');
  }
  if (state.trust >= 3) {
    lines.push('');
    lines.push('<em>Beamlak smiles — the kind that takes the whole face.</em>');
  }
  return lines.join('<br>');
}

function spawnPetals() {
  const shower = $('petal-shower');
  shower.innerHTML = '';
  const colors = ['#d66f8a','#e8c78a','#7daa7a','#b393c9'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'falling-petal';
    p.style.left     = Math.random() * 100 + 'vw';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDuration  = (4 + Math.random() * 5) + 's';
    p.style.animationDelay     = (Math.random() * 6) + 's';
    p.style.width  = (8 + Math.random() * 8) + 'px';
    p.style.height = (10 + Math.random() * 10) + 'px';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    shower.appendChild(p);
  }
}

// ── SCREEN TRANSITIONS ────────────────────────────────────────────────────────
function transitionScreen(fromId, toId, callback) {
  const from = $(fromId);
  const to   = $(toId);

  from.style.opacity = '0';
  setTimeout(() => {
    from.classList.remove('active');
    from.style.opacity = '';
    to.classList.add('active');
    to.style.opacity = '0';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        to.style.opacity = '1';
        if (callback) callback();
      });
    });
  }, 700);
}


// ── MUSIC ENGINE ─────────────────────────────────────────────────────────────
let _currentTrackKey = null;

function switchMusic(trackKey) {
  if (trackKey === _currentTrackKey) return; // already playing this track
  _currentTrackKey = trackKey;

  const audio = document.getElementById('bg-music');
  const newSrc = MUSIC_TRACKS[trackKey];
  if (!newSrc) return;

  // Fade out current track, then swap
  fadeVolume(audio, audio.volume, 0, 400, () => {
    audio.src = newSrc;
    audio.volume = 0;
    audio.play().then(() => {
      fadeVolume(audio, 0, 0.55, 800);
    }).catch(() => {
      // Autoplay blocked — queued for next gesture
      _pendingPlay = true;
    });
  });
}

function fadeVolume(audio, from, to, durationMs, onDone) {
  const steps = 20;
  const interval = durationMs / steps;
  const delta = (to - from) / steps;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    audio.volume = Math.min(1, Math.max(0, from + delta * step));
    if (step >= steps) {
      clearInterval(timer);
      if (onDone) onDone();
    }
  }, interval);
}

let _pendingPlay = false;

// Resume music after first user interaction (browser autoplay policy)
document.addEventListener('click', () => {
  if (_pendingPlay) {
    _pendingPlay = false;
    const audio = document.getElementById('bg-music');
    audio.play().then(() => { fadeVolume(audio, 0, 0.55, 800); }).catch(() => {});
  }
}, { once: false });

// ── INIT ──────────────────────────────────────────────────────────────────────
function showGameScreen() {
  transitionScreen('title-screen', 'game-screen', () => {
    loadScene('room');
  });
}

function restartGame() {
  // Reset state
  state.inventory   = [];
  state.trust       = 0;
  state.kellanDepth = 0;
  state.tadeFriendly = false;
  state.seraStyle   = null;
  state.greenhouse_how  = null;
  state.greenhouse_first= null;
  state.envelope_how    = null;
  state.pressedFlower   = false;
  state.askedBeamlak    = false;
  _visitedScenes.clear();
  renderInventory();
  currentScene = null;
  currentStep  = 0;

  // Stop music
  _currentTrackKey = null;
  const audio = document.getElementById('bg-music');
  fadeVolume(audio, audio.volume, 0, 600, () => {
    audio.pause();
    audio.src = '';
  });

  transitionScreen('end-screen', 'title-screen', () => {});
}

document.getElementById('start-btn').addEventListener('click', showGameScreen);
document.getElementById('restart-btn').addEventListener('click', restartGame);
