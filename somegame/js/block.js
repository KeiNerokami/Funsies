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
var Block = function(x, y, id) {
    this.init(x, y, id);
}

Block.prototype.x = 0;
Block.prototype.y = 0;
Block.UP = 0;
Block.DOWN = 1;
Block.LEFT = 2;
Block.RIGHT = 3;
Block.WIDTH = 10;
Block.HEIGHT = 10;
Block.prototype.id = 0;
Block.prototype.init = function(x, y, id) {
    this.x = x;
    this.y = y;
    this.id = id;
}
Block.prototype.display = function() {
    //console.debug("show: " + this.debug());
    context.save();
    context.fillStyle = "rgb(255, 255, 0)";
    context.translate(this.x, this.y);
    context.fillRect(0, 0, Block.WIDTH, Block.HEIGHT);
    //context.strokeStyle = "rgb(0,0,255)";
    //context.strokeText(this.id, 2, this.height - 1)
    context.restore();
}
Block.prototype.clear = function() {
	//console.debug("clear: " + this.debug());
    context.save();
    context.fillStyle = "rgb(0,0,255)"
    context.translate(this.x, this.y);
    context.fillRect(0, 0, Block.WIDTH, Block.HEIGHT);
    context.restore();
}
Block.prototype.insideFrame = function() {
    //console.debug("Move");
    //console.debug(this.x + " > " + Frame.border.left());
    //console.debug((this.x + Block.WIDTH) + " < " + Frame.border.right());
    //console.debug(this.y + " > " + Frame.border.top());
    //console.debug((this.y + Block.HEIGHT) + " < " + Frame.border.bottom());
    return (this.x > Frame.border.left()) &&
           ((this.x + Block.WIDTH) < Frame.border.right()) &&
           (this.y > Frame.border.top()) &&
           ((this.y + Block.HEIGHT) < Frame.border.bottom());
}
Block.prototype.collideWithBlock = function(block) {
    //console.debug(this.x + " == " + block.x + " " + this.y + " == " + block.y);
    return (this.x == block.x) &&
           (this.y == block.y);
}
Block.prototype.updatePosition = function(direction) {
    switch (direction) {
        case Block.UP:
            this.y -= Block.HEIGHT; break;
        case Block.DOWN:
            this.y += Block.HEIGHT; break;
        case Block.LEFT:
            this.x -= Block.WIDTH; break;
        case Block.RIGHT:
            this.x += Block.WIDTH; break;
    }
}
Block.prototype.debug = function() {
	return "(" + this.x + "," + this.y + ")";
}
