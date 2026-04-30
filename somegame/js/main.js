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
//TODO:
//  - implements levels
//   - different maps
//   - levels change every 10 food eaten

// Globals
var board;
var context;
var game;
var lastEnterKey = 0;
var touchStartX = null;
var touchStartY = null;
var lastTouchControl = 0;
var lastBoardTapTime = 0;
var lastBoardTapX = null;
var lastBoardTapY = null;
var Achievements = {
    storageKey: "snakeAchievements",
    unlocked: {},

    init: function() {
        this.load();
        this.render();
    },

    load: function() {
        try {
            this.unlocked = JSON.parse(localStorage.getItem(this.storageKey)) || {};
        } catch (e) {
            this.unlocked = {};
        }
    },

    save: function() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.unlocked));
        } catch (e) {}
    },

    unlock: function(key) {
        if (this.unlocked[key]) {
            return;
        }
        this.unlocked[key] = true;
        this.save();
        this.render();
    },

    render: function() {
        $(".achievementItem").each(function() {
            var item = $(this);
            var key = item.attr("data-achievement");
            item.toggleClass("unlocked", !! Achievements.unlocked[key]);
        });
    },

    setPanel: function(open) {
        if (open) {
            setLevelModesPanel(false);
        }
        $("#drawerPanel").toggleClass("achievementsOpen", open);
        $("#achievementsToggle")
            .attr("aria-expanded", open ? "true" : "false");
        $("#achievementsPanel")
            .attr("aria-hidden", open ? "false" : "true");
    },

    togglePanel: function() {
        this.setPanel(! $("#drawerPanel").hasClass("achievementsOpen"));
    }
};

function unlockAchievement(key) {
    Achievements.unlock(key);
}

function trackAchievementLevelStart(level) {
    if (level === 6) {
        unlockAchievement("speed");
    } else if (level === 46) {
        unlockAchievement("pacman");
    }
}

function getCurrentModeName() {
    var selected = $("input[name='level']:checked");
    if (selected.length === 0) {
        return "";
    }
    return $.trim(selected.parent().clone().children().remove().end().text());
}

function getCurrentModeNote() {
    var selected = $("input[name='level']:checked");
    if (selected.length === 0) {
        return "";
    }
    return $.trim(selected.parent().find(".modeNote").text());
}

function setLevelModesPanel(open) {
    if (open) {
        Achievements.setPanel(false);
    }
    $("#drawerPanel").toggleClass("levelModesOpen", open);
    $("#levelModesToggle")
        .attr("aria-expanded", open ? "true" : "false");
    $("#levelModesPanel")
        .attr("aria-hidden", open ? "false" : "true");
}

function toggleLevelModesPanel() {
    setLevelModesPanel(! $("#drawerPanel").hasClass("levelModesOpen"));
}

jQuery.extend(jQuery.expr[':'], {
	focus: function(element) {
		return element == document.activeElement;
	}
});

function newGame() {
    if (game != null) {
        game.stopTimer();
    }
    Snake.setLevel($("input[name='level']:checked").val());
    trackAchievementLevelStart(Snake.level);
    Snake.init();
    game = new Game($("#playerName").val().substring(0, 15));
    game.randomlyPlaceFood();
    game.startGame();
    Frame.clear();
    setOptionsDrawer(false);
}

function setOptionsDrawer(open) {
    $("#optionsGroup")
        .toggleClass("drawerOpen", open)
        .toggleClass("drawerClosed", ! open);
    $("#drawerToggle")
        .attr("aria-expanded", open ? "true" : "false")
        .find(".buttonText")
        .text(open ? "Hide" : "Menu");
    if (! open) {
        Achievements.setPanel(false);
        setLevelModesPanel(false);
    }
}

function controlsHaveFocus() {
    return $("#optionsGroup input, #optionsGroup button").is(":focus");
}

function activeGameReady() {
    return game != null && ! game.done && Snake.blocks != null && Snake.blocks.length > 0;
}

function ensureGameForInput() {
    if (game == null || game.done) {
        newGame();
        return true;
    }
    return false;
}

function moveSnake(direction) {
    if (! activeGameReady()) {
        return false;
    }
    Snake.move(direction);
    return true;
}

function directionFromKey(keyCode) {
    switch (keyCode) {
        case 37: // left
        case 65: // a
            return Block.LEFT;
        case 38: // up
        case 87: // w
            return Block.UP;
        case 39: // right
        case 68: // d
            return Block.RIGHT;
        case 40: // down
        case 83: // s
            return Block.DOWN;
    }
    return null;
}

function directionFromDelta(dx, dy) {
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    var smallSide = Math.min($(window).width(), $(window).height());
    var minSwipe = Math.max(18, Math.min(36, smallSide * 0.04));
    if (Math.max(absX, absY) < minSwipe) {
        return null;
    }
    if (absX > absY) {
        return (dx > 0) ? Block.RIGHT : Block.LEFT;
    }
    return (dy > 0) ? Block.DOWN : Block.UP;
}

function canvasPointFromClient(clientX, clientY) {
    var rect = board.getBoundingClientRect();
    var width = rect.right - rect.left;
    var height = rect.bottom - rect.top;
    return {
        x: (clientX - rect.left) * (board.width / width),
        y: (clientY - rect.top) * (board.height / height)
    };
}

function directionFromBoardTap(clientX, clientY) {
    if (Snake.blocks == null || Snake.blocks.length === 0) {
        return null;
    }
    var point = canvasPointFromClient(clientX, clientY);
    var head = Snake.blocks[0];
    var dx = point.x - (head.x + (Block.WIDTH / 2));
    var dy = point.y - (head.y + (Block.HEIGHT / 2));
    if (Math.abs(dx) > Math.abs(dy)) {
        return (dx > 0) ? Block.RIGHT : Block.LEFT;
    }
    return (dy > 0) ? Block.DOWN : Block.UP;
}

function handleBoardDirection(direction) {
    ensureGameForInput();
    if (direction == null) {
        return false;
    }
    return moveSnake(direction);
}

function handleBoardTap(clientX, clientY) {
    var wasActive = activeGameReady();
    ensureGameForInput();
    var moved = moveSnake(directionFromBoardTap(clientX, clientY));
    if (wasActive) {
        lastBoardTapTime = new Date().getTime();
        lastBoardTapX = clientX;
        lastBoardTapY = clientY;
    } else {
        clearBoardTapMarker();
    }
    return moved;
}

function firstTouch(evt) {
    var touches = evt.changedTouches || evt.touches || evt.targetTouches;
    if (! touches || touches.length === 0) {
        return null;
    }
    return touches[0];
}

function clearBoardTapMarker() {
    lastBoardTapTime = 0;
    lastBoardTapX = null;
    lastBoardTapY = null;
}

function isBoardDoubleTap(clientX, clientY, now) {
    if (! activeGameReady() || lastBoardTapTime === 0) {
        return false;
    }
    var distance = Math.sqrt(
        Math.pow(clientX - lastBoardTapX, 2) +
        Math.pow(clientY - lastBoardTapY, 2)
    );
    return (now - lastBoardTapTime <= 340) && distance <= 34;
}

function handleBoardTapOrPause(clientX, clientY) {
    var now = new Date().getTime();
    if (isBoardDoubleTap(clientX, clientY, now)) {
        clearBoardTapMarker();
        return toggleActiveGamePause();
    }
    return handleBoardTap(clientX, clientY);
}

function bindBoardTouchControls() {
    board.addEventListener("touchstart", function(evt) {
        var touch = firstTouch(evt);
        if (touch == null) {
            return;
        }
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        evt.preventDefault();
    }, false);

    board.addEventListener("touchmove", function(evt) {
        evt.preventDefault();
    }, false);

    board.addEventListener("touchend", function(evt) {
        var touch = firstTouch(evt);
        if (touch == null || touchStartX == null || touchStartY == null) {
            return;
        }
        evt.preventDefault();
        lastTouchControl = new Date().getTime();
        var direction = directionFromDelta(touch.clientX - touchStartX, touch.clientY - touchStartY);
        if (direction == null) {
            handleBoardTapOrPause(touch.clientX, touch.clientY);
        } else {
            clearBoardTapMarker();
            handleBoardDirection(direction);
        }
        touchStartX = null;
        touchStartY = null;
    }, false);

    board.addEventListener("touchcancel", function() {
        touchStartX = null;
        touchStartY = null;
    }, false);

    $("#board").click(function(evt) {
        if (new Date().getTime() - lastTouchControl < 450) {
            return;
        }
        evt.preventDefault();
        handleBoardTapOrPause(evt.clientX, evt.clientY);
    });
}

function toggleActiveGamePause() {
    if (game == null || game.done) {
        return false;
    }
    if (game.timer == null || Snake.timer == null) {
        if (game.timer == null) {
            game.startTimer();
        }
        if (Snake.timer == null) {
            Snake.setTimer();
        }
    } else {
        game.stopTimer();
        Snake.clearTimer();
        Frame.paused();
    }
    return true;
}

function resizeBoard() {
    if (board == null) {
        return;
    }
    var gameEl = $("#game");
    var width = Math.max(Block.WIDTH * 30, Math.floor(gameEl.width() / Block.WIDTH) * Block.WIDTH);
    var height = Math.max(Block.HEIGHT * 20, Math.floor(gameEl.height() / Block.HEIGHT) * Block.HEIGHT);
    board.width = width;
    board.height = height;
    if (context != null && (game == null || game.done || game.timer == null)) {
        Frame.preGame();
    }
}

function checkForGameSupport() {
    var missing = "";
    if (! Modernizr.canvas) {
        missing += "Canvas, ";
    }
    if (missing.length > 0) {
        missing = missing.substring(0, missing.length - 2);
        $("#game").html(
        	'<div id="error">' +
				'<img src="images/cartoon_snake.jpg" alt="cartoon snake" />' +
				'<p>Your browser does not support the following HTML5 features which are ' +
				'required to run this game!<span>' + missing + '</span></p>' +
				'<p style="background-color: #FFF">Please install a browser like Firefox ' + 
				'or Chrome which supports these features.<br/><br/>' +
				'<a href="http://www.mozilla.com/?from=sfx&amp;uid=0&amp;t=557"><img ' +
				'src="http://sfx-images.mozilla.org/firefox/3.6/110x32_get_orange.png" ' +
				'alt=Spread Firefox Affiliate Button" border="0" /></a>' + 
				'<a href="http://www.google.com/chrome"><img src="images/chrome_logo.gif"' +
				'border="0" alt="Download Google Chrome"></a>' +
				'</p></div>');
        return false;
    } else {
        return true;
    }
}

$(document).ready(function() {
    if (checkForGameSupport()) {
        Achievements.init();
    	board = $("#board")[0];
    	context = board.getContext("2d");
        resizeBoard();
        // setup new game button
        $("#newGame").click(function() {
            newGame();
        });
        $("#drawerToggle").click(function() {
            setOptionsDrawer(! $("#optionsGroup").hasClass("drawerOpen"));
        });
        $("#achievementsToggle").click(function() {
            Achievements.togglePanel();
        });
        $("#levelModesToggle").click(function() {
            toggleLevelModesPanel();
        });
        bindBoardTouchControls();
        $("input[name='level']").change(function() {
            if (game == null || game.done || game.timer == null) {
                Frame.preGame();
            }
        });
        $(window).resize(function() {
            resizeBoard();
        });
        $(window).bind("orientationchange", function() {
            setTimeout(resizeBoard, 60);
        });
        Frame.preGame();
    }
});

function onKeyDown(evt) {
    var keyCode = evt.which || evt.keyCode;
    if (keyCode == 13) { // enter
        evt.preventDefault();
        var now = new Date().getTime();
        if (now - lastEnterKey < 180) {
            return;
        }
        lastEnterKey = now;
        if (! toggleActiveGamePause()) {
            newGame();
        }
        return;
    }
	if (! controlsHaveFocus()) {
        var direction = directionFromKey(keyCode);
        if (direction != null) {
            evt.preventDefault();
            moveSnake(direction);
            return;
        }
        if (keyCode == 80) { // pause
            evt.preventDefault();
            toggleActiveGamePause();
        }
	}
}
$(document).keydown(onKeyDown);
