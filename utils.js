module.exports = {
    setPlayerMovement (previous, current) {
        let bots = previous.map( b => {
            let bot = current.filter( o => o.name === b.name)[0];
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

        return bots;

    },

    getNearestItems ({x, y, z}, cube, level = 1) {

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

                    if (cube[xIndex][yIndex][zIndex]) {
                        nearest.push({x: xIndex, y: yIndex, z: zIndex, item: cube[xIndex][yIndex][zIndex]});
                    }
                }
            }
        }

        if (nearest.length !== 0 || level === 5) {
            return nearest;
        }
        else {
            return getNearestItems({ x, y, z }, cube, level++);
        }
        
        
        function validCoordinate (coordinate) {
            return coordinate >= 0 && coordinate < cube.length;
        }
    },

    createCube (length, players, bombs)  {
        let defaultArray = [...Array(length).fill( Array(length).fill( [...Array(length)]) )];

        for (let player of players) {
            defaultArray[player.x][player.y][player.z] = "P";
        }
        
        for (let bomb of bombs) {
            defaultArray[bomb.x][bomb.y][bomb.z] = "P";
        }

        return defaultArray;
    }
}