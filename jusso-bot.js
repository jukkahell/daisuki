const http = require('http');
const [port] = process.argv.slice(2);
if (!port) {
  console.log('Pass port as command line argument...');
  process.exit(1);
}

const getRandomInt = (max, min = 0) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getPlaceBombDirection = (nextTickInfo) => {
  return {
    task: 'BOMB',
    x: getRandomInt(0, nextTickInfo.gameInfo.edgeLength),
    y: getRandomInt(0, nextTickInfo.gameInfo.edgeLength),
    z: getRandomInt(0, nextTickInfo.gameInfo.edgeLength)
  }
};

const getNoopDirection = () => {
  return {
    task: 'NOOP'
  }
};

const getMoveDirection = (nextTickInfo) => {
  const allDirections = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];
  const currentCoordinates = nextTickInfo.players.find(p => p.name === nextTickInfo.currentPlayer.name);

  const badCoordinates = [];
  if (currentCoordinates.x === 0) {
    badCoordinates.push('-X');
  }
  if (currentCoordinates.x === nextTickInfo.gameInfo.edgeLength - 1) {
    badCoordinates.push(('+X'));
  }
  if (currentCoordinates.y === 0) {
    badCoordinates.push('-Y');
  }
  if (currentCoordinates.y === nextTickInfo.gameInfo.edgeLength - 1) {
    badCoordinates.push(('+Y'));
  }
  if (currentCoordinates.z === 0) {
    badCoordinates.push('-Z');
  }
  if (currentCoordinates.z === nextTickInfo.gameInfo.edgeLength - 1) {
    badCoordinates.push(('+Z'));
  }

  const possibleDirections = allDirections.filter(d => !badCoordinates.includes(d));
  return {
    task: 'MOVE',
    direction: possibleDirections[Math.floor(Math.random() * possibleDirections.length)]
  };
};

const getDirections = (nextTickInfo) => {
  const numOfTasksToDo = nextTickInfo.gameInfo.numOfTasksPerTick;
  const botDirections = [];
  const possibleTasks = [getMoveDirection, getNoopDirection, getPlaceBombDirection];
  for (let i = 0; i < numOfTasksToDo; i++) {
    const task = possibleTasks[Math.floor(Math.random() * possibleTasks.length)];
    botDirections.push(task(nextTickInfo));
  }
  return botDirections;
};

var cubeLength, cube, bots;

const getTasks = (tickInfo) => {
  const others = tickInfo.players.filter(p => p.name != tickInfo.currentPlayer.name);
  if (!bots) {
    bots = others
  }
  else {
    setPlayerMovement(others);
  }

  const me = tickInfo.players.filter(p => p.name === tickInfo.currentPlayer.name)[0];
  const bombs = tickInfo.items.filter(i => i.type === "BOMB");
  const playersInGame = others.length;

  cubeLength = tickInfo.gameInfo.edgeLength;
  cube = createCube(cubeLength, others, bombs);

  const nearestItems = getNearestItems(me);
};

const setPlayerMovement = (others) => {

  bots = bots.map( b => {
    let bot = others[others.find( o => o.name === b.name)];
    let movement = [];
    if (b.x != bot.x) {
      if (bot.x > b.x) movement.push('+X');
      else movement.push('-X');
    }
    if (b.y != bot.y) {
      if (bot.y > b.y) movement.push('+Y');
      else movement.push('-Y');
    }
    if (b.z != bot.z) {
      if (bot.z > b.z) movement.push('+Z');
      else movement.push('-Z');
    }
    if (movement.length === 0) {
      movement.push("NOOP");
    }

    let allMovements = [];
    if(b.movements) {
      allMovements = [...b.movements];
      allMovements.push(movement);
    }
    else {
      allMovements = movement;
    }

    bot.movements = allMovements;
    return bot;
  });

}

const getNearestItems = ({x, y, z}, level = 1) => {

  let nearest = [];
  let zIndex = z, xIndex = x, yIndex = y;

  for (let zi = -level; zi <= level; zi++) {
    zIndex = z - +zi;
    if (!validCoordinate(zIndex)) continue;

    for (let xi = -level; xi <= level ; xi++ ) {
      xIndex = x + xi;
      if (!validCoordinate(xIndex)) continue;

      for (let yi = -level; yi <= level ; yi++ ) {
        yIndex = y + yi;
        if (!validCoordinate(yIndex)) continue;

        if (cube[xIndex, yIndex, zIndex]) {
          nearest.push([xIndex, yIndex, zIndex, cube[newX, y, z]]);
        }
      }
    }
  }

  if (nearest.length !== 0 || level === 5) {
    return nearest;
  }
  else {
    return getNearestItems({ x, y, z }, level++);
  }
  
  
  function validCoordinate (coordinate) {
    return coordinate >= 0 && coordinate < cubeLength;
  }
};

const createCube = (length, players, bombs) => {
  let defaultArray = [...Array(length).fill( Array(length).fill( [...Array(length)]) )];

  for (let player of players) {
    defaultArray[player.x, player.y, player.z] = "P";
  }
  
  for (let bomb of bombs) {
    defaultArray[bomb.x, bomb.y, bomb.z] = "P";
  }

  return defaultArray;
};


http.createServer((req, res) => {
  if (req.method === 'POST') {
    let jsonString = '';

    req.on('data', (data) => {
      jsonString += data;
    });

    /*
    {
      "gameInfo": {
        "id": <string>,
        "edgeLength": <number>,
        "numOfTasksPerTick": <number>, // how many tasks bots can do per tick
        "numOfBotsInPlay": <number>,
        "currentTick": <number>
      },
      "players": [
        {
          "name": <string>,
          "x": <number>,
          "y": <number>,
          "z": <number> 
        },
        ...
      ],
      "items": [
        {
          "type": "BOMB",
          "x": <number>,
          "y": <number>,
          "z": <number> 
        },
        ...
      ]
    }
    */
    req.on('end', () => {
      const nextTickInfo = JSON.parse(jsonString);
      console.log('we got next tick info', nextTickInfo);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      // Send the response body as "Hello World"
      res.end(JSON.stringify(getTasks(nextTickInfo)));
    });

  }
}).listen(port);

// Console will print the message
console.log(`Dumb-bot running at http://127.0.0.1:${port}/`);