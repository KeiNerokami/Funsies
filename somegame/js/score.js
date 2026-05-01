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
var Score = function(playerName) {
    this.init(playerName);
}
Score.prototype.foodEaten = 0;
Score.prototype.points = 0;
Score.prototype.startTime = new Date();
Score.prototype.stopTime = null;
Score.prototype.playerName = "";
Score.prototype.init = function(playerName) {
    this.playerName = playerName;
    this.startTime = new Date();
    this.stopTime = null;
}
Score.prototype.display = function() {
    context.save();
    context.fillStyle = "rgb(0,0,255)";
    context.fillRect(board.width / 1.7, 7, board.width, 20);
    context.fillStyle = "rgb(255,255,255)";
    context.font = "bold 14px Tahoma, Geneva, sans-serif";
    context.textAlign = "left";
    context.fillText("Score: " + this.points, (board.width / 1.6), 22);
    context.restore();
}
