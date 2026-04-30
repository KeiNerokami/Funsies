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
var Frame = {
    lineWidth: 6,
    display: function() {
        // display border
        context.save();
        context.translate(this.border.left(), this.border.top());
        context.strokeStyle = "rgb(255,119,17)";
        context.lineWidth = this.lineWidth;
        context.shadowColor = "rgba(0, 0, 0, 0.55)";
        context.shadowBlur = 10;
        context.shadowOffsetX = 4;
        context.shadowOffsetY = 4;
        context.strokeRect(0, 0, this.border.width(), this.border.height());
        context.restore();
    },
    clear: function() {
        context.save();
        context.fillStyle = "rgb(0,0,255)";
        context.fillRect(0, 0, board.width, board.height);
        context.restore();
    },
    gameOver: function() {
        this.displayMessage("Game Over!");
        this.displayFinalScore();
    },
    preGame: function() {
    	this.displayMessage('press "Enter" to start');
        this.displayCurrentMode();
    },
    paused: function() {
    	this.displayMessage('Paused');
    },
    displayMessage: function(message) {
    	this.clear();
    	context.save();
		context.translate(
                  (board.width / 4),
                  (board.height / 4));
        context.strokeStyle = "rgb(255,119,17)";
        context.lineWidth = this.lineWidth;
        context.strokeRect(0, 0, (board.width / 2), 50);
        context.fillStyle = "rgb(255,255,255)";
        context.font = "bold 16px Tahoma, Geneva, sans-serif";
        context.textAlign = "left";
        context.fillText(message, (board.width / 4) - (message.length * 4), 30);
        context.restore();    	
    },
    displayCurrentMode: function() {
        var mode = (typeof getCurrentModeName === "function") ? getCurrentModeName() : "";
        if (! mode) {
            return;
        }
        var note = (typeof getCurrentModeNote === "function") ? getCurrentModeNote() : "";
        var modeText = "Mode: " + mode;
        context.save();
        context.fillStyle = "rgb(255,255,255)";
        context.font = "bold 14px Tahoma, Geneva, sans-serif";
        context.textAlign = "left";
        if (note) {
            var y = (board.height / 4) + 78;
            context.textAlign = "center";
            context.fillText(modeText, board.width / 2, y);
            context.globalAlpha = 0.5;
            context.font = "bold 10px Tahoma, Geneva, sans-serif";
            context.fillText(note, board.width / 2, y + 16);
        } else {
            context.textAlign = "center";
            context.fillText(modeText, board.width / 2, (board.height / 4) + 78);
        }
        context.restore();
    },
    displayFinalScore: function() {
        if (game != null && game.pacmanMode) {
            this.displayPacmanFinalScore();
            return;
        }

    	context.save();
    	context.translate(
    				(board.width / 4),
    				(board.height / 4) * 1.75);
        context.strokeStyle = "rgb(255,119,17)";
		context.lineWidth = this.lineWidth;
        context.strokeRect(0, 0, (board.width / 2), 70);
        context.fillStyle = "rgb(255,255,255)";
        context.font = "bold 16px Tahoma, Geneva, sans-serif";
        context.textAlign = "left";
        context.fillText("Score: " + game.score.points, 50, 42);
    	context.restore();
    },
    displayPacmanFinalScore: function() {
        var boxWidth = Math.min(board.width - 36, 360);
        var boxHeight = 76;
        var boxX = (board.width - boxWidth) / 2;
        var boxY = (board.height / 4) * 1.75;
        var compact = boxWidth < 280;
        var iconSize = compact ? 14 : 18;
        var centerY = boxHeight / 2;
        var pacmanPoints = game.pacmanPoints || 0;
        var snakePoints = game.score.points || 0;

        context.save();
        context.translate(boxX, boxY);
        context.strokeStyle = "rgb(255,119,17)";
		context.lineWidth = this.lineWidth;
        context.strokeRect(0, 0, boxWidth, boxHeight);

        context.fillStyle = "rgb(255,255,255)";
        context.font = compact ? "bold 12px Tahoma, Geneva, sans-serif" : "bold 16px Tahoma, Geneva, sans-serif";
        context.textBaseline = "middle";
        context.textAlign = "left";

        this.drawPacmanIcon(22, centerY, iconSize);
        context.fillText(pacmanPoints + " pts", 22 + iconSize + 12, centerY);

        context.textAlign = "center";
        context.fillText("|", boxWidth / 2, centerY);

        context.textAlign = "right";
        this.drawSnakePixelIcon(boxWidth - 22 - iconSize, centerY, iconSize);
        context.fillText(snakePoints + " pts", boxWidth - 22 - iconSize - 12, centerY);
        context.restore();
    },
    drawPacmanIcon: function(x, y, size) {
        context.save();
        context.translate(x + (size / 2), y);
        context.fillStyle = "rgb(248,209,0)";
        context.beginPath();
        context.moveTo(0, 0);
        context.arc(0, 0, size / 2, Math.PI / 5, (Math.PI * 2) - (Math.PI / 5));
        context.closePath();
        context.fill();
        context.restore();
    },
    drawSnakePixelIcon: function(x, y, size) {
        var cell = Math.max(3, Math.floor(size / 4));
        var startY = y - (cell * 1.5);

        context.save();
        context.fillStyle = "rgb(255,255,0)";
        context.fillRect(x, startY + cell, cell, cell);
        context.fillRect(x + cell, startY + cell, cell, cell);
        context.fillRect(x + (cell * 2), startY + cell, cell, cell);
        context.fillRect(x + (cell * 2), startY, cell, cell);
        context.fillRect(x + (cell * 3), startY, cell, cell);
        context.fillStyle = "rgb(0,0,0)";
        context.fillRect(x + (cell * 3) + Math.max(1, Math.floor(cell / 2)), startY + 1, 1, 1);
        context.restore();
    },
    border: {
        cols: function() { return board.width / Block.WIDTH; },
        colRem: function() { return board.width % Block.WIDTH; },
        rows: function() { return board.height / Block.HEIGHT; },
        rowRem: function() { return board.height % Block.HEIGHT; },
        vline: function() { return (Frame.lineWidth / 2) + (Block.WIDTH - Frame.lineWidth); },
        hline: function() { return (Frame.lineWidth / 2) + (Block.HEIGHT - Frame.lineWidth); },
        left: function() {
            return (this.colRem() / 2) + Block.WIDTH + this.vline();
        },
        top: function() {
            return (this.rowRem() / 2) + (Block.HEIGHT * 3) + this.hline();
        },
        width: function() {
            return board.width - (this.left() * 2); 
        },
        height: function() {
            return board.height - (this.top() * 2) + 20;
        },
        right: function() {
            return this.left() + this.width();
        },
        bottom: function() {
            return this.top() + this.height();
        }
    }
}
