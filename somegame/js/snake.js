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
var Snake = {
    blocks: null,
    direction: 0,
    speed: 1000,
    timer: null,
    growSnake: null,
    level: null,
    shadowBlur: 6,

    init: function(size) {
        this.blocks = new Array();
        size = (size) ? size : 10;
        var centerX = this.gridAlignedCenter(
            Frame.border.left() + (Frame.lineWidth / 2),
            Frame.border.width(),
            Block.WIDTH
        );
        var centerY = this.gridAlignedCenter(
            Frame.border.top() + (Frame.lineWidth / 2),
            Frame.border.height(),
            Block.HEIGHT
        );
        for (var i = 0; i < size; i++) {
            this.blocks.push(new Block(centerX, centerY, i))
        }
        if (this.timer != null) {
            this.clearTimer();
        }
        this.setTimer();
    },

    gridAlignedCenter: function(origin, span, blockSize) {
        var cells = Math.max(1, Math.floor((span - blockSize) / blockSize));
        return origin + (Math.floor(cells / 2) * blockSize);
    },

    setLevel: function(level) {
    	this.level = parseInt(level);
    	switch (this.level) {
    		case 1:
    			this.speed = 250;
    			this.growSnake = this.growSnakeTemplate(this['growSnakeLinear']);
    			break;
    		case 2:
    			this.speed = 125;
    			this.growSnake = this.growSnakeTemplate(this['growSnakeLinear']);
    			break;
    		case 3:
    			this.speed = 100;
    			this.growSnake = this.growSnakeTemplate(this['growSnakeLinear']);
    			break;
    		case 4:
    			this.speed = 75;
    			this.growSnake = this.growSnakeTemplate(this['growSnakeLinear']);
    			break;
    		case 5:
    			this.speed = 50;
    			this.growSnake = this.growSnakeTemplate(this['growSnakeLinear']);
    			break;
            case 6:
                this.speed = 25;
                this.growSnake = this.growSnakeTemplate(this['growSnakeLinear']);
                break;
            case 7:
                this.speed = 10;
                this.growSnake = this.growSnakeTemplate(this['growSnakeLinear']);
                break;
            case 46:
                this.speed = 46;
                this.growSnake = this.growSnakeTemplate(this['growSnakeLinear']);
                break;
    		default:
    			this.level = 2;
    			this.speed = 125;
    			this.growSnake = this.growSnakeTemplate(this['growSnakeLinear']);
    			break;
    	}
    },

    setTimer: function() {
        this.timer = setTimeout("Snake.updatePosition()", Snake.speed);
    },

    resetTimer: function() {
        this.clearTimer();
        this.setTimer();
    },

    clearTimer: function() {
        clearTimeout(this.timer);
        this.timer = null;
    },

    togglePause: function() {
        if (this.timer == null) {
            this.setTimer();
        } else {
            this.clearTimer();
        }
    },

    display: function() {
        if (this.blocks == null) {
            return;
        }

        context.save();
        context.strokeStyle = "rgb(255, 255, 0)";
        context.lineWidth = Block.WIDTH;
        context.lineCap = "square";
        context.lineJoin = "miter";
        context.shadowColor = "rgba(0, 0, 0, 0.55)";
        context.shadowBlur = this.shadowBlur;
        context.shadowOffsetX = 3;
        context.shadowOffsetY = 3;
        context.beginPath();
        context.moveTo(
            this.blocks[0].x + (Block.WIDTH / 2),
            this.blocks[0].y + (Block.HEIGHT / 2));
        for (var i = 1; i < this.blocks.length; i++) {
            context.lineTo(
                this.blocks[i].x + (Block.WIDTH / 2),
                this.blocks[i].y + (Block.HEIGHT / 2));
        }
        context.stroke();
        context.restore();

        for (i = 0; i < this.blocks.length; i++) {
            this.blocks[i].display();
        }
    },

    clear: function() {
        this.blocks[this.blocks.length - 1].clear();
    },

    move: function(direction) {
        if (this.validateMove(direction)) {
            this.direction = direction;
        }
    },

    updatePosition: function() {
        this.moveLastToFront();
        if (this.checkCollisions()) {
            this.handleCollision();
        } else {
            this.checkCollisionWithFood();
        }
        if (! game.done) {
            //console.debug("Game still running, rescheduling snake timer");
            this.setTimer();
        }
    },

    checkCollisions: function() {
        var collision = false;
        this.lastCollisionType = null;
        // check inside bounds of board
        collision = ! this.blocks[0].insideFrame();
        if (collision) {
            this.lastCollisionType = "wall";
        }
        // check collision with self
        for (i = 1; i < this.blocks.length; i++) {
            if (this.blocks[0].collideWithBlock(this.blocks[i])) {
                collision = true;
                this.lastCollisionType = "self";
            }
        }
        return collision;
    },

    checkCollisionWithFood: function() {
        var touchedGhost = game != null &&
            game.checkSnakeGhostCollision &&
            game.checkSnakeGhostCollision();
        var touchedPacman = game != null &&
            game.checkSnakePacmanCollision &&
            game.checkSnakePacmanCollision();
        if (touchedGhost || touchedPacman) {
            return;
        }
        if (this.blocks[0].collideWithBlock(game.food)) {
            this.growSnake();
            game.incrementScore();
            game.randomlyPlaceFood();
        }
    },

    checkPositionOfNewFood: function(food) {
        var collision = false;
    	var tmp = "";
        for (i = 0; i < this.blocks.length; i++) {
        	tmp += this.blocks[i].debug() + ", ";
        	collision = collision || this.blocks[i].collideWithBlock(food);
        }
        //console.debug("snake: [" + tmp + "]");
        //console.debug("collision with food: " + collision + " [" + food.x + "," + food.y + "]");
        return ! collision;
    },

    moveLastToFront: function() {
        var last = this.blocks.pop();
        var first = this.blocks[0];
        last.x = first.x;
        last.y = first.y;
        last.updatePosition(this.direction);
        this.blocks.unshift(last);
    },

    validateMove: function(direction) {
        if (this.blocks[0].collideWithBlock(this.blocks[1]) &&
                this.blocks[0].collideWithBlock(this.blocks[2]))
        {
            return true;
        } else {
            var first = this.blocks[0];
            var tmp = new Block(first.x, first.y, first.id);
            tmp.updatePosition(direction);
            return ! tmp.collideWithBlock(this.blocks[1]);
        }
    },

    handleCollision: function() {
        if (this.lastCollisionType === "self" && typeof unlockAchievement === "function") {
            unlockAchievement("ouroboros");
        }
        this.clearTimer();
        game.stopTimer();
        game.done = true;
        if (typeof submitLeaderboardScore === "function") {
            submitLeaderboardScore(game);
        }
        setTimeout("Frame.gameOver()", 100);
    },

    growSnakeTemplate: function(growth) {
        return function() {
            var last = this.blocks[this.blocks.length - 1];
            var inc = growth();
            //console.debug("Growing snake by [" + inc + "]");
            for (var i = 0; i < inc; i++) {
                this.blocks.push(new Block(last.x, last.y, last.id + 1));
            }
        }
    },

    growSnakeLinear: function() { return 1; },
    growSnakeQuadratic: function() { return Math.pow(game.score.foodEaten, 2); },
    growSnakeRandom: function() { return Math.floor(Math.random() * 10) + 1; },
    growSnakeExponential: function() { return Math.pow(2, game.score.foodEaten); }
};
