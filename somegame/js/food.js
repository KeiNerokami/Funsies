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
var Food = function(id, x, y) {
    this.init(id, x, y);
}
Food.prototype.id = 0;
Food.prototype.x = 0;
Food.prototype.y = 0;
Food.prototype.init = function(id, col, row) {
    this.id = id;
    this.x = Frame.border.left() + Frame.lineWidth / 2 + (col * Block.WIDTH);
    this.y = Frame.border.top() + Frame.lineWidth / 2 + (row * Block.HEIGHT);
    //console.debug("food block created: (" + this.x + "," + this.y + ")");
}
Food.prototype.display = function(id) {
    context.save();
    context.fillStyle = "rgb(255,255,255)";
    context.beginPath();
    context.arc(
        this.x + (Block.WIDTH / 2),
        this.y + (Block.HEIGHT / 2),
        Block.WIDTH / 3,
        0,
        Math.PI * 2
    );
    context.fill();
    context.restore();
}
