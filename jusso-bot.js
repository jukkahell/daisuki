const http = require('http');
const utils = require('./utils');

const [port] = process.argv.slice(2);
if (!port) {
  console.log('Pass port as command line argument...');
  process.exit(1);
}


var cubeLength, cube, bots;

const getTasks = (tickInfo) => {
  const others = tickInfo.players.filter(p => p.name != tickInfo.currentPlayer.name);
  if (!bots) {
    bots = others
  }
  else {
    bots = utils.setPlayerMovement(bots, others);
  }

  const me = tickInfo.players.filter(p => p.name === tickInfo.currentPlayer.name)[0];
  const bombs = tickInfo.items.filter(i => i.type === "BOMB");
  const playersInGame = others.length;

  cubeLength = tickInfo.gameInfo.edgeLength;
  cube = utils.createCube(cubeLength, others, bombs);

  const nearestItems = utils.getNearestItems(me, cube);
  console.log("Nearest" : nearestItems);
  
  let tasks = [];
  for (let i = 0; i < tickInfo.gameInfo.numOfTasksPerTick; i++) {
    tasks.push({task: "NOOP"})
  }
  return tasks;
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