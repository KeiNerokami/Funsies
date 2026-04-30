/*!
 * Snake Game v 1.0
 * http://www.mikusa.com/
 *
 * Copyright 2011, Daniel Mikusa
 * Licensed under the GPL Version 2 license.
 * http://www.mikusa.com/snake/license
 *
 * Date: Sun Jan 30 11:03 2011 -0500
 */
var Game = function(playerName) {
    this.init(playerName);
}
Game.speed = 60; // 60 frames per second
Game.counter = 0; // fps counter
Game.start = new Date().getTime(); // fps timer
Game.pacmanModeLevel = 46;
Game.pacmanMaxHp = 100;
Game.powerDamageToPacman = 10;
// Future reference for the disabled big Pacman food/power node.
Game.pacmanPelletDamage = 2;
Game.ghostEyeMillis = 5000;
Game.ghostSpawnSafeDistance = 8;
Game.prototype.score = null;
Game.prototype.food = null;
Game.prototype.done = false;
Game.prototype.pacmanMode = false;
Game.prototype.pacman = null;
Game.prototype.pacmanFood = null;
Game.prototype.ghosts = null;
Game.prototype.pacmanHp = Game.pacmanMaxHp;
Game.prototype.pacmanPoints = 0;
Game.prototype.powerCharges = 0;
Game.prototype.pacmanMoveAt = 0;
Game.prototype.ghostMoveAt = 0;
Game.prototype.init = function(playerName) {
    this.score = new Score(playerName);
    this.pacmanMode = Snake.level === Game.pacmanModeLevel;
    this.ghosts = [];
    this.pacmanHp = Game.pacmanMaxHp;
    this.pacmanPoints = 0;
    this.powerCharges = 0;
    if (this.pacmanMode) {
        this.initPacmanMode();
    }
}
Game.prototype.gridOriginX = function() {
    return Frame.border.left() + (Frame.lineWidth / 2);
}
Game.prototype.gridOriginY = function() {
    return Frame.border.top() + (Frame.lineWidth / 2);
}
Game.prototype.gridCols = function() {
    return Math.floor((Frame.border.width() - Block.WIDTH) / Block.WIDTH);
}
Game.prototype.gridRows = function() {
    return Math.floor((Frame.border.height() - Block.HEIGHT) / Block.HEIGHT);
}
Game.prototype.blockAt = function(col, row) {
    return new Block(
        this.gridOriginX() + (col * Block.WIDTH),
        this.gridOriginY() + (row * Block.HEIGHT),
        0
    );
}
Game.prototype.blockToGrid = function(block) {
    return {
        col: Math.round((block.x - this.gridOriginX()) / Block.WIDTH),
        row: Math.round((block.y - this.gridOriginY()) / Block.HEIGHT)
    };
}
Game.prototype.sameBlock = function(a, b) {
    return a != null && b != null && a.x === b.x && a.y === b.y;
}
Game.prototype.oppositeDirection = function(direction) {
    switch (direction) {
        case Block.UP:
            return Block.DOWN;
        case Block.DOWN:
            return Block.UP;
        case Block.LEFT:
            return Block.RIGHT;
        case Block.RIGHT:
            return Block.LEFT;
        default:
            return Block.DOWN;
    }
}
Game.prototype.directionOffset = function(direction) {
    switch (direction) {
        case Block.UP:
            return { col: 0, row: -1 };
        case Block.DOWN:
            return { col: 0, row: 1 };
        case Block.LEFT:
            return { col: -1, row: 0 };
        case Block.RIGHT:
            return { col: 1, row: 0 };
        default:
            return { col: 0, row: 1 };
    }
}
Game.prototype.getCenterBlock = function(colOffset, rowOffset) {
    return this.blockAt(
        Math.floor(this.gridCols() / 2) + (colOffset || 0),
        Math.floor(this.gridRows() / 2) + (rowOffset || 0)
    );
}
Game.prototype.getPacmanStartBlock = function(direction) {
    var start = Snake.blocks != null && Snake.blocks.length > 0 ?
        new Block(Snake.blocks[0].x, Snake.blocks[0].y, 0) :
        this.getCenterBlock(0, 0);
    var moved = this.moveBlock(start, direction);
    if (this.isInsideGrid(this.blockToGrid(moved))) {
        return moved;
    }
    var offset = this.directionOffset(direction);
    return this.getCenterBlock(offset.col, offset.row);
}
Game.prototype.initPacmanMode = function() {
    var pacmanDirection = this.oppositeDirection(Snake.direction);
    var pacmanStart = this.getPacmanStartBlock(pacmanDirection);
    this.pacman = {
        x: pacmanStart.x,
        y: pacmanStart.y,
        direction: pacmanDirection,
        nextDirection: pacmanDirection,
        mouthOpen: true
    };
    this.pacmanMoveAt = new Date().getTime() + 220;
    this.ghostMoveAt = new Date().getTime() + 600;
    // Big Pacman food is disabled for now; keep the methods below as a
    // future power-node reference. Pacman now races for normal snake food.
    // this.randomlyPlacePacmanFood();
}
Game.prototype.collidesWithSnake = function(block) {
    if (Snake.blocks == null) {
        return false;
    }
    for (var i = 0; i < Snake.blocks.length; i++) {
        if (Snake.blocks[i].collideWithBlock(block)) {
            return true;
        }
    }
    return false;
}
Game.prototype.collidesWithGhost = function(block) {
    if (this.ghosts == null) {
        return false;
    }
    for (var i = 0; i < this.ghosts.length; i++) {
        if (this.ghosts[i].state !== "eyes" && this.sameBlock(this.ghosts[i], block)) {
            return true;
        }
    }
    return false;
}
Game.prototype.collidesWithPacmanMode = function(block) {
    if (! this.pacmanMode) {
        return false;
    }
    return this.sameBlock(this.pacman, block) ||
        this.sameBlock(this.pacmanFood, block) ||
        this.collidesWithGhost(block);
}
Game.prototype.blockDistance = function(a, b) {
    if (a == null || b == null) {
        return Infinity;
    }
    var gridA = this.blockToGrid(a);
    var gridB = this.blockToGrid(b);
    return Math.abs(gridA.col - gridB.col) + Math.abs(gridA.row - gridB.row);
}
Game.prototype.isOpenBlock = function(block, avoidPacmanFood, minPacmanDistance) {
    return block != null &&
        ! this.collidesWithSnake(block) &&
        ! this.sameBlock(this.food, block) &&
        ! (avoidPacmanFood && this.sameBlock(this.pacmanFood, block)) &&
        ! this.sameBlock(this.pacman, block) &&
        ! this.collidesWithGhost(block) &&
        this.blockDistance(block, this.pacman) >= (minPacmanDistance || 0);
}
Game.prototype.randomOpenBlock = function(avoidPacmanFood, minPacmanDistance) {
    var block = null;
    var attempts = 0;
    do {
        block = this.blockAt(
            Math.floor(Math.random() * this.gridCols()),
            Math.floor(Math.random() * this.gridRows())
        );
        attempts++;
    } while (attempts < 600 && ! this.isOpenBlock(block, avoidPacmanFood, minPacmanDistance));

    if (this.isOpenBlock(block, avoidPacmanFood, minPacmanDistance)) {
        return block;
    }

    for (var row = 0; row < this.gridRows(); row++) {
        for (var col = 0; col < this.gridCols(); col++) {
            block = this.blockAt(col, row);
            if (this.isOpenBlock(block, avoidPacmanFood, minPacmanDistance)) {
                return block;
            }
        }
    }
    return null;
}
Game.prototype.randomlyPlacePacmanFood = function() {
    this.pacmanFood = this.randomOpenBlock(true);
}
Game.prototype.randomlyPlaceFood = function() {
    var food = new Food(
    			   this.score.foodEaten + 1,
                   Math.floor(Math.random() * (Frame.border.width() - Block.WIDTH) / Block.WIDTH),
                   Math.floor(Math.random() * (Frame.border.height() - Block.HEIGHT) / Block.HEIGHT));
    while (! Snake.checkPositionOfNewFood(new Block(food.x, food.y)) ||
            this.collidesWithPacmanMode(new Block(food.x, food.y))) {
        food = new Food(
        		   this.score.foodEaten + 1,
                   Math.floor(Math.random() * (Frame.border.width() - Block.WIDTH) / Block.WIDTH),
                   Math.floor(Math.random() * (Frame.border.height() - Block.HEIGHT) / Block.HEIGHT));
    }
    this.food = food;
}
Game.prototype.startGame = function() {
    if (this.timer != null) {
        this.stopTimer();
    }
    this.startTimer();
}
Game.prototype.togglePause = function() {
    if (this.timer == null) {
        this.startTimer();
    } else {    	
        this.stopTimer();
    }
}
Game.prototype.startTimer = function() {
    this.timer = setTimeout("game.display()", Game.speed);
}
Game.prototype.stopTimer = function() {
    clearTimeout(this.timer);
    this.timer = null;
}
Game.prototype.resetTimer = function() {
    this.stopTimer();
    this.startTimer();
}
Game.prototype.moveBlock = function(block, direction) {
    var moved = new Block(block.x, block.y, 0);
    moved.updatePosition(direction);
    return moved;
}
Game.prototype.isInsideGrid = function(grid) {
    return grid.col >= 0 &&
        grid.col < this.gridCols() &&
        grid.row >= 0 &&
        grid.row < this.gridRows();
}
Game.prototype.isSnakeBlockedGrid = function(grid, targetGrid) {
    if (targetGrid != null && grid.col === targetGrid.col && grid.row === targetGrid.row) {
        return false;
    }
    return this.collidesWithSnake(this.blockAt(grid.col, grid.row));
}
Game.prototype.findDirection = function(startBlock, targetBlock, blockSnake) {
    if (startBlock == null || targetBlock == null) {
        return null;
    }

    var start = this.blockToGrid(startBlock);
    var target = this.blockToGrid(targetBlock);
    var queue = [{ col: start.col, row: start.row, firstDirection: null }];
    var visited = {};
    var directions = [Block.UP, Block.DOWN, Block.LEFT, Block.RIGHT];
    visited[start.col + "," + start.row] = true;

    for (var index = 0; index < queue.length; index++) {
        var node = queue[index];
        if (node.col === target.col && node.row === target.row) {
            return node.firstDirection;
        }

        for (var i = 0; i < directions.length; i++) {
            var direction = directions[i];
            var next = { col: node.col, row: node.row };
            switch (direction) {
                case Block.UP:
                    next.row -= 1;
                    break;
                case Block.DOWN:
                    next.row += 1;
                    break;
                case Block.LEFT:
                    next.col -= 1;
                    break;
                case Block.RIGHT:
                    next.col += 1;
                    break;
            }

            var key = next.col + "," + next.row;
            if (! this.isInsideGrid(next) || visited[key]) {
                continue;
            }
            if (blockSnake && this.isSnakeBlockedGrid(next, target)) {
                continue;
            }
            visited[key] = true;
            queue.push({
                col: next.col,
                row: next.row,
                firstDirection: node.firstDirection == null ? direction : node.firstDirection
            });
        }
    }
    return null;
}
Game.prototype.movePacman = function() {
    var direction = this.findDirection(this.pacman, this.food, true);
    if (direction == null) {
        return;
    }
    this.pacman.direction = direction;
    var moved = this.moveBlock(this.pacman, direction);
    if (this.isInsideGrid(this.blockToGrid(moved)) && ! this.collidesWithSnake(moved)) {
        this.pacman.x = moved.x;
        this.pacman.y = moved.y;
        this.pacman.mouthOpen = ! this.pacman.mouthOpen;
    }
}
Game.prototype.checkPacmanSnakeFood = function() {
    if (! this.sameBlock(this.pacman, this.food)) {
        return;
    }
    this.pacmanPoints += 1;
    this.randomlyPlaceFood();
}
Game.prototype.damagePacman = function(amount) {
    this.pacmanHp -= amount;
    if (this.pacmanHp <= 0) {
        this.pacmanHp = 0;
        this.handlePacmanDefeated();
    }
}
Game.prototype.spawnGhost = function() {
    var spawn = this.randomOpenBlock(true, Game.ghostSpawnSafeDistance);
    if (spawn == null) {
        return;
    }
    this.ghosts.push({
        x: spawn.x,
        y: spawn.y,
        color: "rgb(255,47,47)",
        state: "ghost",
        eyeUntil: 0
    });
}
Game.prototype.reviveGhost = function(ghost) {
    var spawn = this.randomOpenBlock(true, Game.ghostSpawnSafeDistance);
    if (spawn == null) {
        ghost.eyeUntil = new Date().getTime() + 1000;
        return;
    }
    ghost.x = spawn.x;
    ghost.y = spawn.y;
    ghost.state = "ghost";
    ghost.eyeUntil = 0;
}
Game.prototype.updateGhostStates = function(now) {
    for (var i = 0; i < this.ghosts.length; i++) {
        if (this.ghosts[i].state === "eyes" && now >= this.ghosts[i].eyeUntil) {
            this.reviveGhost(this.ghosts[i]);
        }
    }
}
Game.prototype.moveGhosts = function() {
    for (var i = 0; i < this.ghosts.length; i++) {
        var ghost = this.ghosts[i];
        if (ghost.state === "eyes") {
            continue;
        }
        var direction = this.findDirection(ghost, this.pacman, true);
        if (direction == null) {
            continue;
        }
        var moved = this.moveBlock(ghost, direction);
        if (! this.collidesWithSnake(moved) && this.isInsideGrid(this.blockToGrid(moved))) {
            ghost.x = moved.x;
            ghost.y = moved.y;
        }
    }
}
Game.prototype.checkSnakeGhostCollision = function() {
    if (! this.pacmanMode || Snake.blocks == null || Snake.blocks.length === 0) {
        return false;
    }

    var head = Snake.blocks[0];
    for (var i = 0; i < this.ghosts.length; i++) {
        var ghost = this.ghosts[i];
        if (ghost.state !== "eyes" && this.sameBlock(head, ghost)) {
            ghost.state = "eyes";
            ghost.eyeUntil = new Date().getTime() + Game.ghostEyeMillis;
            this.powerCharges += 1;
            return true;
        }
    }
    return false;
}
Game.prototype.checkSnakePacmanCollision = function() {
    if (! this.pacmanMode ||
            this.pacman == null ||
            this.powerCharges <= 0 ||
            Snake.blocks == null ||
            Snake.blocks.length === 0) {
        return false;
    }

    if (this.sameBlock(Snake.blocks[0], this.pacman)) {
        this.powerCharges -= 1;
        this.damagePacman(Game.powerDamageToPacman);
        return true;
    }
    return false;
}
Game.prototype.updatePacmanMode = function() {
    if (! this.pacmanMode || this.done) {
        return;
    }

    var now = new Date().getTime();
    this.updateGhostStates(now);
    if (now >= this.pacmanMoveAt) {
        this.movePacman();
        this.checkPacmanSnakeFood();
        this.pacmanMoveAt = now + 110;
    }
    if (now >= this.ghostMoveAt) {
        this.moveGhosts();
        this.ghostMoveAt = now + 130;
    }
}
Game.prototype.handlePacmanDefeated = function() {
    this.done = true;
    this.ghosts = [];
    this.stopTimer();
    Snake.clearTimer();
    if (typeof submitLeaderboardScore === "function") {
        submitLeaderboardScore(this);
    }
}
Game.prototype.drawPacmanFood = function() {
    // Future reference only: this big food is not drawn in the current
    // Pacman mode because Pacman now eats normal snake food.
    if (this.pacmanFood == null) {
        return;
    }
    context.save();
    context.fillStyle = "rgb(255,255,255)";
    context.shadowColor = "rgba(255,255,255,0.8)";
    context.shadowBlur = 10;
    context.beginPath();
    context.arc(
        this.pacmanFood.x + (Block.WIDTH / 2),
        this.pacmanFood.y + (Block.HEIGHT / 2),
        Block.WIDTH * 0.65,
        0,
        Math.PI * 2
    );
    context.fill();
    context.restore();
}
Game.prototype.drawPacman = function() {
    if (this.pacman == null) {
        return;
    }

    var centerX = this.pacman.x + (Block.WIDTH / 2);
    var centerY = this.pacman.y + (Block.HEIGHT / 2);
    var mouth = this.pacman.mouthOpen ? Math.PI / 4 : Math.PI / 12;
    var rotation = 0;
    switch (this.pacman.direction) {
        case Block.UP:
            rotation = -Math.PI / 2;
            break;
        case Block.DOWN:
            rotation = Math.PI / 2;
            break;
        case Block.LEFT:
            rotation = Math.PI;
            break;
        case Block.RIGHT:
            rotation = 0;
            break;
    }

    context.save();
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.fillStyle = "rgb(248,209,0)";
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, Block.WIDTH, mouth, (Math.PI * 2) - mouth);
    context.closePath();
    context.fill();
    context.restore();
}
Game.prototype.drawGhosts = function() {
    for (var i = 0; i < this.ghosts.length; i++) {
        var ghost = this.ghosts[i];
        context.save();
        if (ghost.state === "eyes") {
            context.fillStyle = "rgb(255,255,255)";
            context.fillRect(ghost.x + 2, ghost.y + 3, 3, 4);
            context.fillRect(ghost.x + 6, ghost.y + 3, 3, 4);
            context.fillStyle = "rgb(0,0,255)";
            context.fillRect(ghost.x + 3, ghost.y + 5, 1, 1);
            context.fillRect(ghost.x + 7, ghost.y + 5, 1, 1);
        } else {
            context.fillStyle = ghost.color;
            context.fillRect(ghost.x, ghost.y + 3, Block.WIDTH, Block.HEIGHT - 3);
            context.fillRect(ghost.x + 2, ghost.y, Block.WIDTH - 4, 4);
            context.fillStyle = "rgb(255,255,255)";
            context.fillRect(ghost.x + 2, ghost.y + 4, 2, 3);
            context.fillRect(ghost.x + 6, ghost.y + 4, 2, 3);
        }
        context.restore();
    }
}
Game.prototype.drawPacmanHud = function() {
    var compact = board.width < 560;
    var hpWidth = compact ? board.width - 16 : 180;
    var fillWidth = Math.floor(hpWidth * (this.pacmanHp / Game.pacmanMaxHp));

    context.save();
    context.fillStyle = "rgb(0,0,255)";
    context.fillRect(0, 0, board.width, 34);
    context.fillStyle = "rgb(255,255,255)";
    if (compact) {
        context.font = "bold 10px Tahoma, Geneva, sans-serif";
        context.textAlign = "left";
        context.fillText("S:" + this.score.points, 8, 11);
        context.textAlign = "center";
        context.fillText("Pac:" + this.pacmanPoints, board.width / 2, 11);
        context.textAlign = "right";
        context.fillText("Pow:" + this.powerCharges, board.width - 8, 11);

        context.fillStyle = "rgb(50,0,0)";
        context.fillRect(8, 17, hpWidth, 7);
        context.fillStyle = "rgb(255,47,47)";
        context.fillRect(8, 17, fillWidth, 7);
        context.strokeStyle = "rgb(255,255,255)";
        context.strokeRect(8, 17, hpWidth, 7);
        context.fillStyle = "rgb(255,255,255)";
        context.textAlign = "center";
        context.font = "bold 9px Tahoma, Geneva, sans-serif";
        context.fillText("Pacman HP " + this.pacmanHp + "/" + Game.pacmanMaxHp, board.width / 2, 32);
    } else {
        context.font = "bold 12px Tahoma, Geneva, sans-serif";
        context.textAlign = "left";
        context.fillText("Pacman HP", 18, 14);
        context.fillStyle = "rgb(50,0,0)";
        context.fillRect(18, 20, hpWidth, 8);
        context.fillStyle = "rgb(255,47,47)";
        context.fillRect(18, 20, fillWidth, 8);
        context.strokeStyle = "rgb(255,255,255)";
        context.strokeRect(18, 20, hpWidth, 8);
        context.fillStyle = "rgb(255,255,255)";
        context.fillText(this.pacmanHp + " / " + Game.pacmanMaxHp, 210, 29);
        context.fillText("Pac: " + this.pacmanPoints, 310, 14);
        context.fillText("Power: " + this.powerCharges, 310, 29);
        context.textAlign = "right";
        context.fillText("Score: " + this.score.points, board.width - 18, 22);
    }
    context.restore();
}
Game.prototype.drawWinMessage = function() {
    context.save();
    context.fillStyle = "rgba(0,0,0,0.75)";
    context.fillRect((board.width / 2) - 170, (board.height / 2) - 30, 340, 60);
    context.fillStyle = "rgb(248,209,0)";
    context.font = "bold 16px Tahoma, Geneva, sans-serif";
    context.textAlign = "center";
    context.fillText("PACMAN DEFEATED", board.width / 2, board.height / 2 + 5);
    context.restore();
}
Game.prototype.drawPacmanMode = function() {
    if (! this.pacmanMode) {
        return;
    }
    // this.drawPacmanFood(); // Disabled big food; kept for future reference.
    this.drawGhosts();
    this.drawPacman();
    this.drawPacmanHud();
    if (this.pacmanHp === 0) {
        this.drawWinMessage();
    }
}
Game.prototype.display = function() {
    Game.counter += 1;
    var curMillis = new Date().getTime();
    var diff = (curMillis - Game.start);
    if (diff > 1000) {
        var fps = (Game.counter / diff * 1000);
        console.debug("time: " + diff + " counter: " + Game.counter + " fps: " + fps);
        Game.start = curMillis;
        Game.counter = 0;
    }
    this.updatePacmanMode();
    Frame.clear();
    Frame.display();
    if (! this.pacmanMode) {
        this.score.display();
    }
    this.food.display();
    this.drawPacmanMode();
    Snake.display();
    if (! this.done) {
        //console.debug("Game not done, rescheduling display timer");
        this.startTimer();
    }
}
Game.prototype.incrementScore = function() {
	this.score.foodEaten += 1;
	this.score.points += 1;
    if (! this.pacmanMode &&
            Snake.level >= 1 &&
            Snake.level <= 5 &&
            this.score.points >= 100 &&
            typeof unlockAchievement === "function") {
        unlockAchievement("longSnake");
    }
    if (this.pacmanMode && this.score.foodEaten === 5 && this.ghosts.length === 0) {
        this.spawnGhost();
        if (typeof unlockAchievement === "function") {
            unlockAchievement("ghost");
        }
    }
}
Game.prototype.decrementScore = function(amount) {
	this.score.points -= amount;
	this.score.display();
}
