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
    let randPlayer = nextTickInfo.players[getRandomInt(nextTickInfo.gameInfo.numOfBotsInPlay - 1, 0)];
    do {
        randPlayer = nextTickInfo.players[getRandomInt(nextTickInfo.gameInfo.numOfBotsInPlay - 1, 0)]
    } while (randPlayer.name === nextTickInfo.currentPlayer.name);

    let randX = randPlayer.x + getRandomInt(-1, 1);
    if (randX > nextTickInfo.gameInfo.edgeLength-1) {
        randX = randPlayer.x + getRandomInt(-1, 0)
    } else if (randX < 0) {
        randX = randPlayer.x + getRandomInt(0, 1)
    }

    let randY = randPlayer.y + getRandomInt(-1, 1);
    if (randY > nextTickInfo.gameInfo.edgeLength-1) {
        randY = randPlayer.y + getRandomInt(-1, 0)
    } else if (randY < 0) {
        randY = randPlayer.y + getRandomInt(0, 1)
    }

    let randZ = randPlayer.z + getRandomInt(-1, 1);
    if (randZ > nextTickInfo.gameInfo.edgeLength-1) {
        randZ = randPlayer.z + getRandomInt(-1, 0)
    } else if (randZ < 0) {
        randZ = randPlayer.z + getRandomInt(0, 1)
    }

    needToMove = true;
    console.log("BOMB to " + randX + " " + randY + " " + randZ);
    return {
        task: 'BOMB',
        x: randX,
        y: randY,
        z: randZ
    }
};

const revertMove = (move) => {
    if (move === '+X') return '-X';
    else if (move === '+Y') return '-Y';
    else if (move === '+Z') return '-Z';
    else if (move === '-X') return '+X';
    else if (move === '-Y') return '+Y';
    else if (move === '-Z') return '+Z';
};

const distanceOf = (obj1, obj2) => {
    return Math.abs(obj1.x - obj2.x) + Math.abs(obj1.y - obj2.y) + Math.abs(obj1.z - obj2.z);
};

const distanceOfCoords = (coord1, coord2) => {
    return coord1 - coord2;
};

let revertedLastMove = '';
let lastMove = '';

const getMoveDirection = (nextTickInfo) => {
    const allDirections = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];
    const currentCoordinates = nextTickInfo.players.find(p => p.name === nextTickInfo.currentPlayer.name);

    const badCoordinates = [];

    for (let item of items) {
        if (distanceOf(myCoords, {x: item.x, y: item.y, z: item.z}) === 1) {
            console.log("Vieressä pommi suunnassa: ");
            if (distanceOfCoords(myCoords.x, item.x) === 1) {
                console.log("-X");
                badCoordinates.push('-X');
            } else if (distanceOfCoords(myCoords.x, item.x) === -1) {
                console.log("+X");
                badCoordinates.push('+X');
            } else if (distanceOfCoords(myCoords.y, item.y) === 1) {
                console.log("-Y");
                badCoordinates.push('-Y');
            } else if (distanceOfCoords(myCoords.y, item.y) === -1) {
                console.log("+Y");
                badCoordinates.push('+Y');
            } else if (distanceOfCoords(myCoords.z, item.z) === 1) {
                console.log("-Z");
                badCoordinates.push('-Z');
            } else if (distanceOfCoords(myCoords.z, item.z) === -1) {
                console.log("+Z");
                badCoordinates.push('+Z');
            }
        }
    }

    if (currentCoordinates.x === 0 && !badCoordinates.includes('-X')) {
        badCoordinates.push('-X');
    }
    if (currentCoordinates.x === nextTickInfo.gameInfo.edgeLength - 1 && !badCoordinates.includes('+X')) {
        badCoordinates.push(('+X'));
    }
    if (currentCoordinates.y === 0 && !badCoordinates.includes('-Y')) {
        badCoordinates.push('-Y');
    }
    if (currentCoordinates.y === nextTickInfo.gameInfo.edgeLength - 1 && !badCoordinates.includes('+X')) {
        badCoordinates.push(('+Y'));
    }
    if (currentCoordinates.z === 0 && !badCoordinates.includes('-Z')) {
        badCoordinates.push('-Z');
    }
    if (currentCoordinates.z === nextTickInfo.gameInfo.edgeLength - 1 && !badCoordinates.includes('+Z')) {
        badCoordinates.push(('+Z'));
    }

    const possibleDirections = allDirections.filter(d => !badCoordinates.includes(d));
    needToMove = false;

    if (possibleDirections.length === 0) {
        return getPlaceBombDirection;
    }

    let direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
    while (possibleDirections.length >= 2 && (direction === revertedLastMove || direction === lastMove)) {
        direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
    }

    revertedLastMove = revertMove(direction);
    lastMove = direction;

    console.log("MOVE to " + direction);

    return {
        task: 'MOVE',
        direction: direction
    };
};

let myCoords = {};
let needToMove = true;

let items = [];

const getDirections = (nextTickInfo) => {
    const numOfTasksToDo = nextTickInfo.gameInfo.numOfTasksPerTick;
    const botDirections = [];
    const possibleTasks = [getPlaceBombDirection, getMoveDirection, getMoveDirection];

    for (let player of nextTickInfo.players) {
        if (player.name === nextTickInfo.currentPlayer.name) {
            myCoords.x = player.x;
            myCoords.y = player.y;
            myCoords.z = player.z;
        }
    }

    items = nextTickInfo.items;

    for (let i = 0; i < numOfTasksToDo; i++) {
        let task;
        if (needToMove) {
            task = getMoveDirection;
        } else {
            task = possibleTasks[Math.floor(Math.random() * possibleTasks.length)];
        }
        botDirections.push(task(nextTickInfo));
    }
    return botDirections;
};

http.createServer((req, res) => {
    if (req.method === 'POST') {
        let jsonString = '';

        req.on('data', (data) => {
            jsonString += data;
        });

        req.on('end', () => {
            const nextTickInfo = JSON.parse(jsonString);
            console.log('we got next tick info', nextTickInfo);
            res.writeHead(200, {'Content-Type': 'application/json'});
            // Send the response body as "Hello World"
            res.end(JSON.stringify(getDirections(nextTickInfo)));
        });

    }
}).listen(port);

// Console will print the message
console.log(`Vile-bot running at http://127.0.0.1:${port}/`);