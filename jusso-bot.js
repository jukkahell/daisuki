const http = require('http');
const utils = require('./utils');

const [port] = process.argv.slice(2);
if (!port) {
  console.log('Pass port as command line argument...');
  process.exit(1);
}

const getRandomInt = (max, min = 0) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const addDirection = (location, direction) => {
  if (direction === '+X') {
    location.x = location.x +1;
  }
  else if (direction === '-X') {
    location.x = location.x -1;
  }
  else if (direction === '+Y') {
    location.y = location.y +1;
  }
  else if (direction === '-Y') {
    location.y = location.y -1;
  }
  else if (direction === '+Z') {
    location.z = location.z +1;
  }
  else if (direction === '-Z') {
    location.z = location.z -1;
  }

  return location;
};

var cubeLength, cube, bots, items, previous, id;

const getTasks = (tickInfo) => {
  if (tickInfo.gameInfo.currentTick === 0) {
    previous = undefined;
    bots = undefined;
    console.log("restart")
  }
  id = tickInfo.gameInfo.id;
  const otherPlayers = tickInfo.players.filter(p => p.name && p.name != tickInfo.currentPlayer.name);
  const me = tickInfo.players.filter(p => p.name === tickInfo.currentPlayer.name)[0];
  const bombs = tickInfo.items.filter(i => i.type === "BOMB");
  
  if (!bots) {
    bots = otherPlayers
    previous = me;
  }
  else {
    bots = utils.setPlayerMovement(bots, otherPlayers);
    bots = bots.filter(b => b.name);
  }  
  
  let setBomb = false;
  let bombLocation = {};
  if (bots[0].movements && bots[0].movements.length > 2) {
    movements = bots[0].movements;
    let last = movements[movements.length-1]
    let secondLast = movements[movements.length-2]
    let thirdLast = movements[movements.length-3]
    if (last === thirdLast && (secondLast != last && secondLast[1] == last[1])) {
      //going back and forth
      setBomb = true;
      bombLocation = {x: bots[0].x, y: bots[0].y, z: bots[0].z};
      bombLocation = addDirection(bombLocation, secondLast);
    }
  }

  cubeLength = tickInfo.gameInfo.edgeLength;
  cube = utils.createCube(cubeLength, otherPlayers, bombs);

  const nearestItems = utils.getNearestItems(me, cube);
  const longestPath = utils.getLongestPath(me, cube, [], [`${previous.x}|${previous.y}|${previous.z}`]);

  items = tickInfo.items;

  previous = me;

  if (setBomb) {
    if (longestPath.length > 0) {
      return [{
        task: 'BOMB',
        x: bombLocation.x,
        y: bombLocation.y,
        z: bombLocation.z
      },{
        task: 'MOVE',
        direction: longestPath[0]
      }]
    }
    else {
      return [{
        task: 'BOMB',
        x: bombLocation.x,
        y: bombLocation.y,
        z: bombLocation.z
      },{
        task: 'NOOP'
      }]
    }
  }
  else if (longestPath.length === 1) {
    return [{
      task: 'MOVE',
      direction: longestPath[0]
    },
    {
      task: 'BOMB',
      x: bots[0].x,
      y: bots[0].y,
      z: bots[0].z
    }];
  }
  else if (longestPath.length > 1) {
    return [{
      task: 'MOVE',
      direction: longestPath[0]
    },
    {
      task: 'BOMB',
      x: bots[0].x,
      y: bots[0].y,
      z: bots[0].z
    }];
  }
  else {
    return [{
      task: 'NOOP'
    },{
      task: 'NOOP'
    }];
  }

};

http.createServer((req, res) => {
  if (req.method === 'POST') {
    let jsonString = '';

    req.on('data', (data) => {
      jsonString += data;
    });

    req.on('end', () => {
      const nextTickInfo = JSON.parse(jsonString);
      //console.log('we got next tick info', nextTickInfo);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      // Send the response body as "Hello World"
      res.end(JSON.stringify(getTasks(nextTickInfo)));
    });

  }
}).listen(port);

// Console will print the message
console.log(`Dumb-bot running at http://127.0.0.1:${port}/`);