const http = require('http');
const utils = require('./utils');

const [port] = process.argv.slice(2);
if (!port) {
  console.log('Pass port as command line argument...');
  process.exit(1);
}

var bots, previous;
var mymoves = [];
var myallmoves = [];
var bombCount;
var noBombscount = 0;

const getTasks = (tickInfo) => {
  if (tickInfo.gameInfo.currentTick === 0) {
    previous = undefined;
    bots = undefined;
    noBombscount = 0;
    bombCount = 0;
    console.log("restart")
  }
  const tasksNeeded = tickInfo.gameInfo.numOfTasksPerTick;
  const otherPlayers = tickInfo.players.filter(p => p.name && p.name != tickInfo.currentPlayer.name);
  const me = tickInfo.players.filter(p => p.name === tickInfo.currentPlayer.name)[0];
  const bombs = tickInfo.items.filter(i => i.type === "BOMB");
  if (tickInfo.gameInfo.currentTick > 0) {
    if (bombs.length == bombCount) {
      noBombscount++;
    }
    else {
      noBombscount = 0;
    }
    bombCount = bombs.length;
  }

  if (!bots) {
    bots = otherPlayers
    previous = me;
  }
  else {
    bots = utils.setPlayerMovement(bots, otherPlayers, tasksNeeded);
    bots = bots.filter(b => b.name);
  }  
  
  const cubeLength = tickInfo.gameInfo.edgeLength;
  const cube = utils.createCube(cubeLength, otherPlayers, bombs);

  let someoneTriedToHit = cube[previous.x][previous.y][previous.z] === "B";

  let setBomb = false;
  let bombLocations = [];
  if (bots[0].movements && bots[0].movements.length > 2) {
    
    for (let bot of bots) {
      let movements = bot.movements;
      let last = movements[movements.length-1];
      let secondLast = movements[movements.length-2];
      let thirdLast = movements[movements.length-3];
      let bombLocation = {x: bot.x, y: bot.y, z: bot.z};

      if (last === thirdLast && (secondLast != last && secondLast[1] == last[1])) {
        //going back and forth
        bombLocation = utils.addDirection(bombLocation, secondLast);
        bombLocations.push(bombLocation);
      }
      else if (secondLast === last) {
        bombLocation = utils.addDirection(bombLocation, last);
        if (utils.isValidCoordinate(bombLocation.x, bombLocation.y, bombLocation.z, cubeLength) && cube[bombLocation.x][bombLocation.y][bombLocation.z] != 'B') {
          bombLocations.push(bombLocation);
        }
      }
    }
  }

  if (bombLocations.length === 0 && noBombscount > 3) {
    bombLocations.push({x: bots[0].x, y: bots[0].y, z: bots[0].z});
    noBombscount = 0;
  }

  const nearestItems = utils.getNearestItems(me, cube);
  let visited = [`${previous.x}|${previous.y}|${previous.z}`];
 
  if (mymoves.length >= 2) {
    let dir = mymoves[0];
    let loc = utils.addDirection({x: me.x, y: me.y, z: me.z}, dir);
    if (utils.isValidCoordinate(loc.x, loc.y, loc.z, cubeLength)) {
      visited.push(`${loc.x}|${loc.y}|${loc.z}`)
    }
    mymoves = [];
  }
  const longestPath = utils.getLongestPath(me, cube, [], visited);
  previous = me;

  let tasks = [];
  let moved = false;

  console.log(someoneTriedToHit);
  for (let i = 0; i < tasksNeeded; i++) {
    if ((!someoneTriedToHit || (i > 0 && moved)) && bombLocations.length > 0) {
      let bombLocation = bombLocations.shift();
      tasks.push({
        task: 'BOMB',
        x: bombLocation.x,
        y: bombLocation.y,
        z: bombLocation.z
      });
    }
    else if (longestPath.length > 0 && !moved) {
      let dir = longestPath.shift();
      tasks.push({
        task: 'MOVE',
        direction: dir
      });
      moved = true;
      myallmoves.push(dir);

      if (mymoves.length === 0 || mymoves[0] === dir) {
        mymoves.push(dir);
      }
      else {
        mymoves = [];
      }
    }
    else {
      let location = {
        x: otherPlayers[0].x,
        y: otherPlayers[0].y,
        z: otherPlayers[0].z
      }
      let directions = ["+X", "-X", "+Y", "-Y", "+Z", "-Z", "NOOP"];
      for (let i = 0; i < directions.length; i++) {
        let rand = utils.getRandomInt(directions.length-1);
        location = utils.addDirection(location, directions[rand]);
        if (utils.isValidCoordinate(location.x, location.y, location.z, cubeLength) && cube[location.x][location.y][location.z] !== "B") {
          break;
        }
      }

      tasks.push({
        task: 'BOMB',
        x: location.x,
        y: location.y,
        z: location.z
      });
    } 
  }

  return tasks;

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