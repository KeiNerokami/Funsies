/*!
 * Global leaderboard backed by Supabase's public REST API.
 */
var Leaderboard = {
    supabaseUrl: "https://ellrzniyizneoagmlvdf.supabase.co",
    supabaseKey: "sb_publishable_-t8HW6JaYWMcujL-xCy37g_Oyv74BWf",
    tableName: "scores",
    submittedGames: [],

    init: function() {
        this.load();
    },

    endpoint: function(path) {
        return this.supabaseUrl + "/rest/v1/" + path;
    },

    headers: function(extra) {
        var headers = {
            "apikey": this.supabaseKey,
            "Accept": "application/json"
        };
        for (var key in extra) {
            if (extra.hasOwnProperty(key)) {
                headers[key] = extra[key];
            }
        }
        return headers;
    },

    request: function(path, options) {
        if (! window.fetch) {
            return Promise.reject(new Error("Leaderboard requires a browser with fetch support."));
        }
        options = options || {};
        options.headers = this.headers(options.headers || {});
        return fetch(this.endpoint(path), options).then(function(response) {
            if (! response.ok) {
                return response.text().then(function(message) {
                    throw new Error(message || response.statusText);
                });
            }
            if (response.status === 204) {
                return null;
            }
            return response.text().then(function(text) {
                return text ? JSON.parse(text) : null;
            });
        });
    },

    cleanName: function(name) {
        name = $.trim(name || "");
        if (! name) {
            name = "whoru";
        }
        return name.substring(0, 15);
    },

    levelName: function(level) {
        switch (parseInt(level, 10)) {
            case 1:
                return "Simple";
            case 2:
                return "Easy";
            case 3:
                return "Medium";
            case 4:
                return "Hard";
            case 5:
                return "Insane";
            case 6:
                return "F1 racer";
            case 7:
                return "Impossible";
            case 46:
                return "Pacman?";
            default:
                return "Level " + level;
        }
    },

    setStatus: function(message) {
        $("#leaderboardStatus").text(message).toggle(!! message);
    },

    render: function(scores) {
        var list = $("#leaderboardScores");
        list.empty();
        if (! scores || scores.length === 0) {
            this.setStatus("No scores yet.");
            return;
        }
        this.setStatus("");
        for (var i = 0; i < scores.length; i++) {
            $("<li/>", { "class": "leaderboardScore" })
                .append($("<span/>", { "class": "leaderboardRank", text: "#" + (i + 1) }))
                .append($("<span/>", { "class": "leaderboardName", text: scores[i].name }))
                .append($("<span/>", { "class": "leaderboardPoints", text: scores[i].score }))
                .append($("<span/>", {
                    "class": "leaderboardLevel",
                    text: this.levelName(scores[i].level)
                }))
                .appendTo(list);
        }
    },

    load: function() {
        var self = this;
        this.setStatus("Loading...");
        return this.request(this.tableName + "?select=name,score,level,created_at&order=score.desc,created_at.asc&limit=10", {
            method: "GET"
        }).then(function(scores) {
            self.render(scores);
        }).catch(function(error) {
            console.error(error);
            self.setStatus("Leaderboard unavailable.");
        });
    },

    submitGame: function(gameInstance) {
        if (gameInstance == null || gameInstance.score == null) {
            return;
        }
        if ($.inArray(gameInstance, this.submittedGames) !== -1) {
            return;
        }
        this.submittedGames.push(gameInstance);

        var self = this;
        var payload = {
            name: this.cleanName(gameInstance.score.playerName),
            score: Math.max(0, parseInt(gameInstance.score.points, 10) || 0),
            level: parseInt(Snake.level, 10) || 5
        };

        this.setStatus("Saving score...");
        return this.request(this.tableName, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            body: JSON.stringify(payload)
        }).then(function() {
            self.setStatus("Score saved.");
            return self.load();
        }).catch(function(error) {
            console.error(error);
            self.setStatus("Score not saved.");
        });
    },

    setPanel: function(open) {
        if (open) {
            Achievements.setPanel(false);
            setLevelModesPanel(false);
            this.load();
        }
        $("#drawerPanel").toggleClass("leaderboardOpen", open);
        $("#leaderboardToggle")
            .attr("aria-expanded", open ? "true" : "false");
        $("#leaderboardPanel")
            .attr("aria-hidden", open ? "false" : "true");
    },

    togglePanel: function() {
        this.setPanel(! $("#drawerPanel").hasClass("leaderboardOpen"));
    }
};

function submitLeaderboardScore(gameInstance) {
    Leaderboard.submitGame(gameInstance);
}
