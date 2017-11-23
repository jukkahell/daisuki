const http = require('http');
const [port] = process.argv.slice(2);
if (!port) {
  console.log('Pass port as command line argument...');
  process.exit(1);
}

const MOVE = "MOVE";
const BOMB = "BOMB";
const ENEMY_PROXIMITY_RATE = 2; // Bigger value causes us to be more fearless near enemy bots
const RANDOM_MOVEMENT_RATE = 3; // The bigger the value the more still bot stays if no other reasons to move. 3 => 1/3 chance to move.
const TOO_MANY_BOMBS_ALERT = 3; // We want to move if we have this much or more bombs next to us

const getRandomInt = (max, min = 0) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const placeBomb = ({x, y, z}) => {
  return {
    task: BOMB,
    x: x,
    y: y,
    z: z
  }
};

const move = (direction) => {
  return {
    task: MOVE,
    direction: direction
  };
};

const distanceOf = (obj1, obj2) => {
  return Math.abs((obj1.x + obj2.x) + obj1.y + obj1.z) - (obj2.x + obj2.y + obj2.z));
};

const enemyTooClose = (enemy, me, numOfTasks) => {
  return distanceOf(enemy, me) < numOfTasks/ENEMY_PROXIMITY_RATE;
};

const bombIsNextToMe = (bomb, me) => {
  return distanceOf(bomb, me) == 1;
};

const getMovePosition = (dir, me) => {
  const newPos = {"x":me.x, "y":me.y, "z":me.z};
  switch(direction) {
    case "-X":
      newPos.x--;
      break;
    case "+X":
      newPos.x++;
      break;
    case "-Y":
      newPos.y--;
      break;
    case "+Y":
      newPos.y++;
      break;
    case "-Z":
      newPos.z--;
      break;
    case "+Z":
      newPos.z++;
      break;
  }
  return newPos;
};

const posCollidesWithBomb = (pos, bombs) => {
  for (let bomb of bombs) {
    if (distanceOf(bomb, me) == 0) {
      return true;
    }
  }
  return false;
};

const determineNextTask = (tickInfo, me) => {
  const enemies = tickInfo.players.filter(p => p.name && p.name != tickInfo.currentPlayer.name);
  const numOfTasks = tickInfo.gameInfo.numOfTasksPerTick;

  // Let's move if we are on the edge
  if (me.x == 0 || me.y == 0 || me.z == 0) {
    return MOVE;
  }

  // Move if enemy bot is able to collide with us
  for (let enemy of enemies) {
    if (enemyTooClose(enemy, me, numOfTasks)) {
      return MOVE;
    }
  }

  // Move if we have too many bombs next to us
  const bombs = tickInfo.items.filter(i => i.type === BOMB);
  var numOfBombsNextToMe = 0;
  for (let bomb of bombs) {
    if (bombIsNextToMe(bomb, me)) {
      numOfBombsNextToMe++;
    }
  }
  if (numOfBombsNextToMe >= TOO_MANY_BOMBS_ALERT) {
    return MOVE;
  }

  // Move randomly to prevent staying too long still
  if (getRandomInt(RANDOM_MOVEMENT_RATE - 1) == 0) {
    return MOVE;
  }

  return BOMB;
};

const calculateDirection = (tickInfo, me) => {
  // Value should be between 1-5 where 5 is the most recommended dir and 1 if absolutely forbidden dir. 0 = not analyzed.
  let directionWeights = {"-X":0, "+X":0, "-Y":0, "+Y":0, "-Z":0, "+Z":0};

  // Move away from enemy that is too close
  const enemies = tickInfo.players.filter(p => p.name && p.name != tickInfo.currentPlayer.name);
  const bombs = tickInfo.items.filter(i => i.type === BOMB);

  for (let dir of Object.keys(directionWeights)) {
    const newPos = getMovePosition(dir, me);
    // Don't move on a bomb
    if (posCollidesWithBomb(newPos, bombs)) {
      directionWeights[dir] = 1;
    }

    // Don't move out of the cube
  }
};

const calculateBombPosition = (tickInfo, me) => {

};

const getTasks = (tickInfo) => {
  const numOfTasks = tickInfo.gameInfo.numOfTasksPerTick;
  const me = tickInfo.players.filter(p => p.name === tickInfo.currentPlayer.name)[0];
  const tasks = [];

  for (let i = 0; i < numOfTasks; i++) {
    const task = determineNextTask(tickInfo, me);
    switch (task) {
      case MOVE:
        move(calculateDirection(tickInfo, me));
        break;
      case BOMB:
        placeBomb(calculateBombPosition(tickInfo, me));
        break;
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
      const tickInfo = JSON.parse(jsonString);
      console.log('we got next tick info', tickInfo);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getTasks(tickInfo)));
    });

  }
}).listen(port);

// Console will print the message
console.log(`Juki-bot running at http://127.0.0.1:${port}/`);