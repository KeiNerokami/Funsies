var Leaderboard = {
    config: window.SnakeSupabaseConfig || {},
    scores: [],
    loading: false,

    init: function() {
        this.renderStatus(this.isConfigured() ?
            "Open leaderboard to load scores." :
            "Leaderboard not configured.");
    },

    supabaseUrl: function() {
        return this.config.supabaseUrl || "";
    },

    supabaseKey: function() {
        return this.config.supabaseKey || "";
    },

    scoresPath: function() {
        return this.config.scoresPath || "";
    },

    isConfigured: function() {
        return !! (this.supabaseUrl() && this.supabaseKey() && this.scoresPath());
    },

    endpoint: function(query) {
        try {
            return new URL(this.scoresPath() + (query || ""), this.supabaseUrl()).toString();
        } catch (error) {
            return "";
        }
    },

    headers: function(extraHeaders) {
        extraHeaders = extraHeaders || {};
        var headers = {
            "apikey": this.supabaseKey(),
            "Accept": "application/json"
        };
        var authToken = this.authToken();
        if (authToken) {
            headers.Authorization = "Bearer " + authToken;
        }
        for (var key in extraHeaders) {
            if (extraHeaders.hasOwnProperty(key)) {
                headers[key] = extraHeaders[key];
            }
        }
        return headers;
    },

    sanitizeName: function(name) {
        name = $.trim(name || "");
        if (name.length === 0) {
            name = "whoru";
        }
        return name.substring(0, 15);
    },

    authToken: function() {
        if (window.SnakeAuth) {
            return SnakeAuth.authToken();
        }
        try {
            return localStorage.getItem("snake.supabase.authToken") || "";
        } catch (e) {
            return "";
        }
    },

    authUser: function() {
        if (window.SnakeAuth) {
            return SnakeAuth.authUser();
        }
        try {
            return JSON.parse(localStorage.getItem("snake.supabase.authUser") || "null");
        } catch (e) {
            return null;
        }
    },

    gameDurationMs: function(currentGame) {
        if (! currentGame) {
            return 0;
        }
        if (currentGame.elapsedMillis) {
            return Math.max(0, currentGame.elapsedMillis());
        }
        if (! currentGame.score || ! currentGame.score.startTime) {
            return 0;
        }
        var startTime = currentGame.score.startTime.getTime ?
            currentGame.score.startTime.getTime() :
            new Date(currentGame.score.startTime).getTime();
        if (isNaN(startTime)) {
            return 0;
        }
        return Math.max(0, new Date().getTime() - startTime);
    },

    submitGame: function(currentGame) {
        if (currentGame == null || currentGame.scoreSubmitted) {
            return;
        }

        if (! this.isConfigured()) {
            this.renderStatus("Leaderboard not configured.");
            return;
        }

        var authUser = this.authUser();
        if (! this.authToken() || ! authUser || ! authUser.id) {
            this.renderStatus("Sign in to submit scores.");
            return;
        }

        if (! window.fetch) {
            this.renderStatus("Leaderboard needs fetch support.");
            return;
        }
        currentGame.scoreSubmitted = true;

        var payload = {
            user_id: authUser.id,
            name: this.sanitizeName(currentGame.score.playerName),
            score: Math.min(100000, Math.max(0, currentGame.score.points || 0)),
            level: Snake.level || 2,
            game_duration_ms: this.gameDurationMs(currentGame),
            updated_at: new Date().toISOString()
        };

        this.renderStatus("Submitting score...");
        fetch(this.endpoint("?on_conflict=user_id"), {
            method: "POST",
            headers: this.headers({
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal"
            }),
            body: JSON.stringify(payload)
        }).then(function(response) {
            if (! response.ok) {
                throw new Error("Score submit failed");
            }
            Leaderboard.renderStatus("Score submitted.");
            Leaderboard.fetchScores();
        }).catch(function() {
            Leaderboard.renderStatus("Score submit failed.");
        });
    },

    fetchScores: function() {
        if (! window.fetch || this.loading) {
            return;
        }
        if (! this.isConfigured()) {
            this.renderStatus("Leaderboard not configured.");
            return;
        }
        this.loading = true;
        this.renderStatus("Loading scores...");
        fetch(this.endpoint("?select=name,score,level,created_at&order=score.desc,created_at.asc&limit=10"), {
            method: "GET",
            headers: this.headers({})
        }).then(function(response) {
            if (! response.ok) {
                throw new Error("Score load failed");
            }
            return response.json();
        }).then(function(scores) {
            Leaderboard.scores = scores || [];
            Leaderboard.render();
        }).catch(function() {
            Leaderboard.renderStatus("Leaderboard unavailable.");
        }).then(function() {
            Leaderboard.loading = false;
        });
    },

    modeName: function(level) {
        switch (parseInt(level, 10)) {
            case 1: return "Simple";
            case 2: return "Easy";
            case 3: return "Medium";
            case 4: return "Hard";
            case 5: return "Insane";
            case 6: return "F1";
            case 7: return "Impossible";
            case 46: return "Pacman?";
            default: return "Level " + level;
        }
    },

    renderStatus: function(message) {
        $("#leaderboardStatus").text(message);
    },

    render: function() {
        var list = $("#leaderboardScores");
        list.empty();
        if (this.scores.length === 0) {
            this.renderStatus("No scores yet.");
            return;
        }
        this.renderStatus("Top scores");
        for (var i = 0; i < this.scores.length; i++) {
            var score = this.scores[i];
            var item = $("<li></li>").addClass("leaderboardScore");
            $("<span></span>").addClass("leaderboardRank").text(i + 1).appendTo(item);
            $("<span></span>").addClass("leaderboardName").text(score.name).appendTo(item);
            $("<span></span>").addClass("leaderboardPoints").text(score.score).appendTo(item);
            $("<span></span>").addClass("leaderboardLevel").text(this.modeName(score.level)).appendTo(item);
            list.append(item);
        }
    },

    setPanel: function(open) {
        if (open) {
            setLevelModesPanel(false);
            Achievements.setPanel(false);
            this.fetchScores();
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

function submitLeaderboardScore(currentGame) {
    Leaderboard.submitGame(currentGame);
}
