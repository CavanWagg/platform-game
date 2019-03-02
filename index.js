let simpleLevelPlan = `
......................
..#................#..
..#..............=.#..
..#.........o.o....#..
..#.@......#####...#..
..#####............#..
......#++++++++++++#..
......##############..
......................`;

class Level {
  constructor(plan) {
    // rows holds an array of arrays of characters, the rows of the plan.
    let rows = plan
      // remove wightspace and the end of the plan string
      // each line is spread into an array, producing arrays of characters
      .trim()
      .split('\n')
      .map(l => [...l]);
    this.height = rows.length;
    this.width = rows[0].length;
    // actors are the moving elements
    this.startActors = [];

    this.rows = rows.map((row, y) => {
      return row.map((ch, x) => {
        let type = levelChars[ch];
        if (typeof type == 'string') return type;
        this.startActors.push(type.create(new Vec(x, y), ch));
        return 'empty';
      });
    });
  }
}

class State {
  constructor(level, actors, status) {
    this.level = level;
    this.actors = actors;
    this.status = status;
  }

  static start(level) {
    return new State(level, level.startActors, 'playing');
  }

  get player() {
    return this.actors.find(a => a.type == 'player');
  }
}
// Vec class for 2-D values such as position and size of actors
class Vec {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  plus(other) {
    return new Vec(this.x + other.x, this.y + other.y);
  }

  times(factor) {
    return new Vec(this.x * factor, this.y * factor);
  }
}

class Player {
  constructor(pos, speed) {
    this.pos = pos;
    this.speed = speed;
  }

  get type() {
    return 'player';
  }

  static create(pos) {
    return new Player(pos.plus(new Vec(0, -0.5)), new Vec(0, 0));
  }
}

// the size property is the same for all instances of Player, os we store it on the prototype rather than on the instances themselves

Player.prototype.size = new Vec(0.8, 1.5);

// Dynamic lava moves along at its current speed until it hits an obstacle. At that point, if it has a reset property, it will jump back to its start position (dripping).
// If it does not, it will invert its speed and continue in the other direction (bouncing).
class Lava {
  constructor(pos, speed, reset) {
    this.pos = pos;
    this.speed = speed;
    this.reset = reset;
  }

  get type() {
    return 'lava';
  }

  static create(pos, ch) {
    if (ch == '=') {
      return new Lava(pos, new Vec(2, 0));
    } else if (ch == '|') {
      return new Lava(pos, new Vec(0, 2));
    } else if (ch == 'v') {
      return new Lava(pos, new Vec(0, 3), pos);
    }
  }
}

Lava.prototype.size = new Vec(1, 1);

class Coin {
  constructor(pos, basePos, wobble) {
    this.pos = pos;
    this.basePos = basePos;
    this.wobble = wobble;
  }

  get type() {
    return 'coin';
  }

  static create(pos) {
    let basePos = pos.plus(new Vec(0.2, 0.1));
    return new Coin(basePos, basePos, Math.random() * Math.PI * 2);
  }
}

Coin.prototype.size = new Vec(0.6, 0.6);

const levelChars = {
  '.': 'empty',
  '#': 'wall',
  '+': 'lava',
  '@': Player,
  o: Coin,
  '=': Lava,
  '|': Lava,
  v: Lava
};

// helper function to provide a succint way to create an element and give it some
// attributes and child nodes

function elt(name, attrs, ...children) {
  let dom = document.createElement(name);
  for (let attr of Object.keys(attrs)) {
    dom.setAttribute(attr, attrs[attr]);
  }
  for (let child of children) {
    dom.appendChild(child);
  }
  return dom;
}

// A display is created by giving it a parent element to which it should append itself
// and a level object.

class DOMDisplay {
  constructor(parent, level) {
    this.dom = elt('div', { class: 'game' }, drawGrid(level));
    console.log(this.dom);
    console.log(parent);
    this.actorLayer = null;
    parent.appendChild(this.dom);
  }
  clear() {
    this.dom.remove();
  }
}

// scale constant gives the number of pixels that a single unit takes up on the screen
const scale = 20;

function drawGrid(level) {
  return elt(
    'table',
    {
      class: 'background',
      style: `width: ${level.width * scale}px`
    },
    ...level.rows.map(row =>
      elt(
        'tr',
        { style: `height: ${scale}px` },
        ...row.map(type => elt('td', { class: type }))
      )
    )
  );
}

function drawActors(actors) {
  return elt(
    'div',
    {},
    ...actors.map(actor => {
      let rect = elt('div', { class: `actor ${actor.type}` });
      rect.style.width = `${actor.size.x * scale}px`;
      rect.style.height = `${actor.size.y * scale}px`;
      rect.style.left = `${actor.pos.x * scale}px`;
      rect.style.top = `${actor.pos.y * scale}px`;
      return rect;
    })
  );
}

// the background is drawn as a <table> element. each row of the grid is turned into a table row

// display a given state, remove the old actor graphics, then redraw the actors in their new positions.
//
DOMDisplay.prototype.syncState = function(state) {
  if (this.actorLayer) this.actorLayer.remove();
  this.actorLayer = drawActors(state.actors);
  this.dom.appendChild(this.actorLayer);
  this.dom.className = `game ${state.status}`;
  this.scrollPlayerIntoView(state);
};

// find the player's position and update the wrapping element's scroll position.

DOMDisplay.prototype.scrollPlayerIntoView = function(state) {
  let width = this.dom.clientWidth;
  let height = this.dom.clientHeight;
  let margin = width / 3;

  // The viewport
  let left = this.dom.scrollLeft,
    right = left + width;
  let top = this.dom.scrollTop,
    bottom = top + height;

  let player = state.player;
  let center = player.pos.plus(player.size.times(0.5)).times(scale);

  if (center.x < left + margin) {
    this.dom.scrollLeft = center.x - margin;
  } else if (center.x > right - margin) {
    this.dom.scrollLeft = center.x + margin - width;
  }
  if (center.y < top + margin) {
    this.dom.scrollTop = center.y - margin;
  } else if (center.y > bottom - margin) {
    this.dom.scrollTop = center.y + margin - height;
  }
};
console.log(document.body);
let simpleLevel = new Level(simpleLevelPlan);
let display = new DOMDisplay(document.body, simpleLevel);
display.syncState(State.start(simpleLevel));
