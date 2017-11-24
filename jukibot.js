const http = require('http');
const [port] = process.argv.slice(2);
if (!port) {
    console.log('Pass port as command line argument...');
    process.exit(1);
}

const MOVE = "MOVE";
const BOMB = "BOMB";
const ENEMY_PROXIMITY_RATE = 2; // Bigger value causes us to be more fearless near enemy bots
const MAX_TASK_REPEATS = 1; // How many repeats of single task type could be made in a row
const MAX_DIR_REPEATS = 2; // How many times we want to go on the same axis
const TOO_FEW_MOVE_POSSIBILITIES = 3; // We want to move if we have this much or less possibilities where we can move
const OBSTACLE_ADVERSE_FACTOR = 0.5; // How much we decrease the direction weight if there is an obstacle (bomb/wall/enemy) next to the new pos. Weight -= obstacle amount * factor.
const ENEMY_ADVERSE_FACTOR = 0.5; // How much we weight the enemy proximity when calculating on what dir we want to move.
const ENEMY_PROXIMITY_ALERT = 5; // How much we decrease the direction weight based on enemy distance. Weight -= (PROXIMITY - distance) * ENEMY_ADVERSE_FACTOR
const EMPTY_AREA_CHECK_AMOUNT = 3; // How many layers will be checked around the bot when counting how many of them are empty. 3 layers would be a 7*7*7=343 cells.
const EMPTY_AREA_FACTOR = 1; // How much we weight the above amount. If 300 cells are free we add weight by 300 / 342 * FACTOR = 0.88

var previousTasks = [];
var previousDirs = [];

const getRandomInt = (max, min = 0) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const placeBomb = (x, y, z) => {
    return {
        task: BOMB,
        x: x,
        y: y,
        z: z
    }
};

const addBombToTickInfo = (tickInfo, target) => {
    tickInfo.items.push({
        "type": BOMB,
        "x": target.x,
        "y": target.y,
        "z": target.z
    });
};

const moveMeInTickInfo = (tickInfo, myName, newPos) => {
    for (let player of tickInfo.players) {
        if (player.name === myName) {
            player.x = newPos.x;
            player.y = newPos.y;
            player.z = newPos.z;
        }
    }
};

const move = (direction) => {
    return {
        task: MOVE,
        direction: direction
    };
};

const distanceOf = (obj1, obj2) => {
    return Math.abs(obj1.x - obj2.x) + Math.abs(obj1.y - obj2.y) + Math.abs(obj1.z - obj2.z);
};

const enemyTooClose = (enemy, me, numOfTasks) => {
    return distanceOf(enemy, me) < numOfTasks / ENEMY_PROXIMITY_RATE;
};

const bombIsNextToMe = (bomb, me) => {
    return distanceOf(bomb, me) === 1;
};

const obstaclesNextToObject = (obj, bombs, enemies, edgeLength) => {
    let closeObstacles = [];
    for (let bomb of bombs) {
        if (bombIsNextToMe(bomb, obj)) {
            closeObstacles.push(bomb);
        }
    }

    for (let enemy of enemies) {
        if (distanceOf(enemy, obj) === 1) {
            closeObstacles.push(enemy);
        }
    }

    if (obj.x - 1 < 0) { closeObstacles.push({"x":obj.x-1, "y":obj.y, "z":obj.z}); }
    if (obj.x + 1 >= edgeLength) { closeObstacles.push({"x":obj.x+1, "y":obj.y, "z":obj.z}); }
    if (obj.y - 1 < 0) { closeObstacles.push({"x":obj.x, "y":obj.y-1, "z":obj.z}); }
    if (obj.y + 1 >= edgeLength) { closeObstacles.push({"x":obj.x, "y":obj.y+1, "z":obj.z}); }
    if (obj.z - 1 < 0) { closeObstacles.push({"x":obj.x, "y":obj.y, "z":obj.z-1}); }
    if (obj.z + 1 >= edgeLength) { closeObstacles.push({"x":obj.x, "y":obj.y, "z":obj.z+1}); }

    return closeObstacles;
};

const getFreePositionsNextToMe = (target, obstacles) => {
    const allPositions = [
        {"x": target.x - 1, "y": target.y, "z": target.z},
        {"x": target.x + 1, "y": target.y, "z": target.z},
        {"x": target.x, "y": target.y - 1, "z": target.z},
        {"x": target.x, "y": target.y + 1, "z": target.z},
        {"x": target.x, "y": target.y, "z": target.z - 1},
        {"x": target.x, "y": target.y, "z": target.z + 1}
    ];

    return allPositions.filter(function (obj) {
        for (let obstacle of obstacles) {
            if (obstacle.x === obj.x && obstacle.y === obj.y && obstacle.z === obj.z) {
                return false;
            }
        }

        return true;
    });
};

const getMovePosition = (dir, me) => {
    const newPos = {"x": me.x, "y": me.y, "z": me.z};
    switch (dir) {
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
        if (distanceOf(bomb, pos) === 0) {
            return true;
        }
    }
    return false;
};

const posCollidesWithEnemy = (pos, enemies) => {
    for (let enemy of enemies) {
        if (distanceOf(enemy, pos) === 0) {
            return true;
        }
    }
    return false;
};

const newPosIsOutOfCube = (pos, edgeLength) => {
    return pos.x < 0 || pos.x >= edgeLength || pos.y < 0 || pos.y >= edgeLength || pos.z < 0 || pos.z >= edgeLength;
};

const percentageOfEmptyCellsAroundMe = (me, enemies, bombs, edgeLength) => {
    let emptyCellCount = 0;
    for (let x = -EMPTY_AREA_CHECK_AMOUNT; x <= EMPTY_AREA_CHECK_AMOUNT; x++) {
        for (let y = -EMPTY_AREA_CHECK_AMOUNT; y <= EMPTY_AREA_CHECK_AMOUNT; y++) {
            for (let z = -EMPTY_AREA_CHECK_AMOUNT; z <= EMPTY_AREA_CHECK_AMOUNT; z++) {
                const posToCheck = {"x": me.x + x, "y": me.y + y, "z": me.z + z};
                // Check for area
                if (!newPosIsOutOfCube(posToCheck, edgeLength)) {
                    // Check for bombs
                    if (!posCollidesWithBomb(posToCheck, bombs)) {
                        // Check for enemies
                        if (!posCollidesWithEnemy(posToCheck, enemies)) {
                            emptyCellCount++;
                        }
                    }
                }
            }
        }
    }
    let length = EMPTY_AREA_CHECK_AMOUNT * 2 + 1;
    return emptyCellCount / (length * length * length);
};

const latestTaskRepeats = () => {
    if (previousTasks.length < 2) {
        return previousTasks.length;
    }

    let latestTask = previousTasks[previousTasks.length - 1];
    let previousTask = previousTasks[previousTasks.length - 2];

    if (latestTask !== previousTask) {
        return 1;
    } else if (latestTask === previousTask && previousTasks.length === 2) {
        return 2;
    }

    let i = 2;
    while (latestTask === previousTask && i < previousTasks.length) {
        i++;
        previousTask = previousTasks[previousTasks.length - i];
    }
    console.log("We have " + (i - 1) + " " + latestTask + " tasks done.");
    return (i - 1);
};

const latestDirRepeats = () => {
    if (previousDirs.length < 2) {
        return previousDirs.length;
    }

    let latestDir = previousDirs[previousDirs.length - 1];
    let previousDir = previousDirs[previousDirs.length - 2];

    if (latestDir !== previousDir) {
        return 1;
    }

    let i = 2;
    while (latestDir === previousDir && i < previousDirs.length) {
        i++;
        previousDir = previousDirs[previousDirs.length - i];
    }
    return i - 1;
};

const determineNextTask = (tickInfo, me) => {
    const enemies = tickInfo.players.filter(p => p.name && p.name !== me.name);
    const bombs = tickInfo.items.filter(i => i.type === BOMB);
    const numOfTasks = tickInfo.gameInfo.numOfTasksPerTick;
    const edgeLength = tickInfo.gameInfo.edgeLength;

    // Move to prevent staying too long still
    if (latestTaskRepeats() >= MAX_TASK_REPEATS) {
        return previousTasks[previousTasks.length - 1] === MOVE ? BOMB : MOVE;
    }

    // Let's move if we are on the edge
    if (me.x === 0 || me.y === 0 || me.z === 0) {
        return MOVE;
    }

    // Move if enemy bot is able to collide with us
    for (let enemy of enemies) {
        if (enemyTooClose(enemy, me, numOfTasks)) {
            return MOVE;
        }
    }

    // Move if we have too few options where to move
    if (getFreePositionsNextToMe(me, bombs).length <= TOO_FEW_MOVE_POSSIBILITIES) {
        return MOVE;
    }

    return BOMB;
};

const calculateDirection = (tickInfo, me) => {
    // Value should be between -1-5 where 5 is the most recommended dir and -1 if absolutely forbidden dir.
    let directionWeights = {"-X": 3, "+X": 3, "-Y": 3, "+Y": 3, "-Z": 3, "+Z": 3};

    const enemies = tickInfo.players.filter(p => p.name && p.name !== tickInfo.currentPlayer.name);
    const bombs = tickInfo.items.filter(i => i.type === BOMB);
    const edgeLength = tickInfo.gameInfo.edgeLength;

    for (let dir of Object.keys(directionWeights)) {
        const newPos = getMovePosition(dir, me);
        // Don't move on a bomb
        if (posCollidesWithBomb(newPos, bombs)) {
            directionWeights[dir] = -1;
            continue;
        }

        // Don't move out of the cube
        if (newPosIsOutOfCube(newPos, edgeLength)) {
            directionWeights[dir] = -1;
            continue;
        }

        // Rather not move too close on enemy, bombs or edge
        const numOfObstacles = obstaclesNextToObject(newPos, bombs, enemies, edgeLength).length;
        directionWeights[dir] -= numOfObstacles * OBSTACLE_ADVERSE_FACTOR;

        let closestEnemyDistance = -1;
        for (let enemy of enemies) {
            const distance = distanceOf(me, enemy);
            if (closestEnemyDistance < 0 || distance < closestEnemyDistance) {
                closestEnemyDistance = distance;
            }
        }

        // Don't collide with enemies
        if (closestEnemyDistance === 0) {
            directionWeights[dir] = -1;
            continue;
        } else {
            // Enemies further than 5 moves doesn't affect on the weight at all
            directionWeights[dir] -= Math.max((ENEMY_PROXIMITY_ALERT - closestEnemyDistance), 0) * ENEMY_ADVERSE_FACTOR;
        }

        const percentageOfEmptyCells = percentageOfEmptyCellsAroundMe(me, enemies, bombs, edgeLength);
        directionWeights[dir] += percentageOfEmptyCells * EMPTY_AREA_FACTOR;
    }

    // Find dirs with the greatest value and pick a random dir from those
    let arr = Object.values(directionWeights);
    let maxValue = Math.max(...arr);
    let goodDirs = [];
    for (let dir of Object.keys(directionWeights)) {
        if (directionWeights[dir] === maxValue) {
            goodDirs.push(dir);
        }
    }

    // Sould I use this or not...
    //if (goodDirs.length > 2) {
    //  const dirRepeats = latestDirRepeats();
    //  if (dirRepeats >= MAX_DIR_REPEATS) {
    //    const previousDir = previousDirs[previousDirs.length-1];
    //    console.log("We have " + dirRepeats + " " + previousDir + " movements done.");
    //    goodDirs.pop(previousDir);
    //  }
    //}

    const moveDir = goodDirs[getRandomInt(goodDirs.length - 1)];
    const newPos = getMovePosition(moveDir, me);

    console.log("To direction " + moveDir);
    console.log("Weights: ");
    console.log(directionWeights);
    console.log("New position would be: " + newPos.x + ":" + newPos.y + ":" + newPos.z);
    previousDirs.push(moveDir);
    moveMeInTickInfo(tickInfo, me.name, newPos);
    return move(moveDir);
};

const calculateBombPosition = (tickInfo, me) => {
    // Find the enemy with most bombs around it
    const enemies = tickInfo.players.filter(p => p.name && p.name !== tickInfo.currentPlayer.name);
    const bombs = tickInfo.items.filter(i => i.type === BOMB);
    const edgeLength = tickInfo.gameInfo.edgeLength;

    let target = {};
    let targetSurroundingBombs = [];
    for (let enemy of enemies) {
        const surroundingBombs = obstaclesNextToObject(enemy, bombs, enemies, edgeLength);
        if (targetSurroundingBombs.length <= surroundingBombs.length) {
            targetSurroundingBombs = surroundingBombs;
            target = enemy;
        }
    }

    console.log("Target bot: " + target.name);

    let possibleBombPositions = getFreePositionsNextToMe(target, targetSurroundingBombs);

    // If there are still open cells where to place a bomb, place it randomly on one of them
    if (possibleBombPositions.length > 0) {

        // Make sure not to place a bomb on our own location
        possibleBombPositions = possibleBombPositions.filter(function (pos) {
            return !(pos.x === me.x && pos.y === me.y && pos.z === me.z);
        });

        const bombPos = possibleBombPositions[getRandomInt(possibleBombPositions.length - 1)];
        console.log("Bomb position: " + bombPos.x + ":" + bombPos.y + ":" + bombPos.z);
        addBombToTickInfo(tickInfo, bombPos);
        return placeBomb(bombPos.x, bombPos.y, bombPos.z);
    }
    // Otherwise we can just destroy the bot by placing the bomb over it
    else {
        addBombToTickInfo(tickInfo, target);
        return placeBomb(target.x, target.y, target.z);
    }
};

const getTasks = (tickInfo) => {
    if (tickInfo.gameInfo.currentTick === 0) {
        previousTasks = [];
        console.log("restart")
    }

    const numOfTasks = tickInfo.gameInfo.numOfTasksPerTick;
    const tasks = [];

    for (let i = 0; i < numOfTasks; i++) {
        const me = tickInfo.players.filter(p => p.name === tickInfo.currentPlayer.name)[0];
        const task = determineNextTask(tickInfo, me);
        console.log("I wanna " + task);
        let nextTask = undefined;
        switch (task) {
            case MOVE:
                nextTask = calculateDirection(tickInfo, me);
                break;
            case BOMB:
                nextTask = calculateBombPosition(tickInfo, me);
                break;
        }
        previousTasks.push(nextTask.task);
        tasks.push(nextTask);
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
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(getTasks(tickInfo)));
        });

    }
}).listen(port);

// Console will print the message
console.log(`Juki-bot running at http://127.0.0.1:${port}/`);