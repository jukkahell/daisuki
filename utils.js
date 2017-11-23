var self = module.exports = {
    setPlayerMovement (previous, current) {
        let bots = previous.map( b => {
            let bot = current.filter( o => o.name === b.name)[0];
            if (!bot) {
                return {};
            }
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
                allMovements = [...b.movements, ...movement];
            }
            else {
                allMovements = movement;
            }

            bot.movements = allMovements;
            return bot;
        });

        return bots;

    },

    getLongestPath({x, y, z}, cube, moves = [], visited = [], direction = "") {
        let zIndex = z, xIndex = x, yIndex = y;
        switch(direction) {
            case "+X":
                if (visited.length < 5 && validCoordinate(xIndex + 1, yIndex, zIndex) && !cube[xIndex+1][yIndex][zIndex] && !visited.includes(`${xIndex+1}|${yIndex}|${zIndex}`)) {
                    let nearest = self.getNearestItems({x: xIndex +1,y,z}, cube);
                    if (nearest.lengh == 0 || nearest[0].moves > 1) {
                        moves.push("+X");
                        let newVisited = [...visited, `${xIndex+1}|${yIndex}|${zIndex}`];
                        return checkLongest({x: xIndex +1, y, z}, cube, moves, newVisited);
                    }
                }
                return moves;
                break;
            case "-X":
                if (visited.length < 5 && validCoordinate(xIndex - 1, yIndex, zIndex) && !cube[xIndex-1][yIndex][zIndex] && !visited.includes(`${xIndex-1}|${yIndex}|${zIndex}`)) {
                    let nearest = self.getNearestItems({x: xIndex-1,y,z}, cube);
                    if (nearest.lengh == 0 || nearest[0].moves > 1) {
                        moves.push("-X");
                        let newVisited = [...visited, `${xIndex-1}|${yIndex}|${zIndex}`];
                        return checkLongest({x: xIndex -1, y, z}, cube, moves, newVisited);
                    }
                }
                return moves;
                break;
            case "+Y":
                if (visited.length < 5 && validCoordinate(xIndex, yIndex + 1, zIndex) && !cube[xIndex][yIndex+1][zIndex] && !visited.includes(`${xIndex}|${yIndex+1}|${zIndex}`)) {
                    let nearest = self.getNearestItems({x,y:yIndex+1,z}, cube);
                    if (nearest.lengh == 0 || nearest[0].moves > 1) {
                        moves.push("+Y");
                        let newVisited = [...visited, `${xIndex}|${yIndex+1}|${zIndex}`];
                        return checkLongest({x, y: yIndex+1, z}, cube, moves, newVisited);
                    }
                }
                return moves;
                break;
            case "-Y":
                if (visited.length < 5 && validCoordinate(xIndex, yIndex - 1, zIndex) && !cube[xIndex][yIndex-1][zIndex] && !visited.includes(`${xIndex}|${yIndex-1}|${zIndex}`)) {
                    let nearest = self.getNearestItems({x,y:yIndex-1,z}, cube);
                    if (nearest.lengh == 0 || nearest[0].moves > 1) {
                        moves.push("-Y");
                        let newVisited = [...visited, `${xIndex}|${yIndex-1}|${zIndex}`];
                        return checkLongest({x, y: yIndex-1, z}, cube, moves, newVisited);
                    }
                }
                return moves;
                break;
            case "+Z":
                if (visited.length < 5 && validCoordinate(xIndex, yIndex, zIndex+1) && !cube[xIndex][yIndex][zIndex+1] && !visited.includes(`${xIndex}|${yIndex}|${zIndex+1}`)) {
                    let nearest = self.getNearestItems({x,y,z: zIndex+1}, cube);
                    if (nearest.lengh == 0 || nearest[0].moves > 1) {
                        moves.push("+Z");
                        let newVisited = [...visited, `${xIndex}|${yIndex}|${zIndex+1}`];
                        return checkLongest({x, y, z: zIndex+1}, cube, moves, newVisited);
                    }
                }
                return moves;
                break;
            case "-Z":
                if (visited.length < 5 && validCoordinate(xIndex, yIndex, zIndex-1) && !cube[xIndex][yIndex][zIndex-1] && !visited.includes(`${xIndex}|${yIndex}|${zIndex-1}`)) {
                    let nearest = self.getNearestItems({x,y,z: zIndex-1}, cube);
                    if (nearest.lengh == 0 || nearest[0].moves > 1) {
                        moves.push("-Z");
                        let newVisited = [...visited, `${xIndex}|${yIndex}|${zIndex-1}`];
                        return checkLongest({x, y, z: zIndex-1}, cube, moves, newVisited);
                    }
                }
                return moves;
                break;
            default:
                return checkLongest({x,y,z}, cube, [], [...visited, `${x}|${y}|${z}`]);
                break;
        }

        function checkLongest({x, y, z}, cube, moves, visited) {
            let right = self.getLongestPath({x, y, z}, cube, [...moves], [...visited], "+X");
            let left = self.getLongestPath({x, y, z}, cube, [...moves], [...visited], "-X");
            let up = self.getLongestPath({x, y, z}, cube, [...moves], [...visited], "+Y");
            let down = self.getLongestPath({x, y, z}, cube, [...moves], [...visited], "-Y");
            let top = self.getLongestPath({x, y, z}, cube, [...moves], [...visited], "+Z");
            let bottom = self.getLongestPath({x, y, z}, cube, [...moves], [...visited], "-Z");
            let all = [right, left, up, down, top, bottom];
            let biggest = all.reduce((biggest, current) => {
                if (biggest.length > current.length) {
                    return biggest;
                }
                return current;
            }, []);
            return biggest;

        }
        function validCoordinate (x, y, z) {
            if (x >= 0 && x < cube.length && y >= 0 && y < cube.length && z >= 0 && z < cube.length) {
                return true;
            }
            return false;
        }

    },

    getNearestItems ({x, y, z}, cube, level = 0, includeWalls = true) {

        let nearest = [];
        let zIndex = z, xIndex = x, yIndex = y;

        for (let zi = -level; zi <= level; zi++) {
            zIndex = z - +zi;
            for (let xi = -level; xi <= level ; xi++ ) {
                xIndex = x + xi;
                for (let yi = -level; yi <= level ; yi++ ) {
                    yIndex = y + yi;
                    if (validCoordinate(xIndex, yIndex, zIndex)) {
                        if (cube[xIndex][yIndex][zIndex]) {
                            nearest.push({x: xIndex, y: yIndex, z: zIndex, item: cube[xIndex][yIndex][zIndex]});
                        }
                    }
                    else {
                        if (includeWalls) {
                            nearest.push({x: xIndex, y: yIndex, z: zIndex, item: 'W'});
                        }
                    }
                }
            }
        }

        if (nearest.length !== 0 || level === 5) {
            if (nearest.length != 0) {
                nearest = nearest.map(i => {
                    i["moves"] = calculateMoves(i.x, i.y, i.z);
                    return i;
                })
                nearest = nearest.sort((a,b) => {
                    if (a.moves < b.moves) {
                        return -1;
                    }
                    if (b.moves < a.moves) {
                        return -1;
                    }
                    return 0;
                });

                nearest = nearest.filter(i => i.moves === nearest[0].moves);
            }
            return nearest;
        }
        else {
            return self.getNearestItems({ x, y, z }, cube, (level + 1), includeWalls);
        }
        
        function calculateMoves(newX, newY, newZ) {
            return Math.abs(x - newX) + Math.abs(y - newY) + Math.abs(z - newZ);
        }

        function validCoordinate (x, y, z) {
            if (x >= 0 && x < cube.length && y >= 0 && y < cube.length && z >= 0 && z < cube.length) {
                return true;
            }
            return false;
        }
    },

    createCube (length, players, bombs)  {
        let defaultArray = [...Array(length)];
            defaultArray = defaultArray.map(x => {
                let y = [...Array(length)];
                    y = y.map(() => {
                        return [...Array(length)]
                    })
                return y;
            });

        for (let player of players) {
            defaultArray[player.x][player.y][player.z] = "P";
          }
        
        for (let bomb of bombs) {
            defaultArray[bomb.x][bomb.y][bomb.z] = "B";
        }

        return defaultArray;
    }
}
