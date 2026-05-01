(function(window, $) {
    var storageKeys = {
        authToken: "snake.supabase.authToken",
        authUser: "snake.supabase.authUser",
        refreshToken: "snake.supabase.authRefreshToken",
        expiresAt: "snake.supabase.authExpiresAt"
    };

    function authEndpoint(path) {
        var config = window.SnakeSupabaseConfig || {};
        if (! config.supabaseUrl || ! config.supabaseKey || ! config.authPath) {
            return "";
        }
        return config.supabaseUrl + config.authPath + path;
    }

    function redirectUrl() {
        return window.location.href.split("#")[0];
    }

    function parseFragment() {
        var hash = window.location.hash.replace(/^#/, "");
        var params = {};
        if (! hash) {
            return params;
        }
        var pairs = hash.split("&");
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split("=");
            params[decodeURIComponent(pair[0])] = decodeURIComponent((pair[1] || "").replace(/\+/g, " "));
        }
        return params;
    }

    function getStoredValue(key) {
        try {
            return localStorage.getItem(key) || "";
        } catch (error) {
            return "";
        }
    }

    function setStoredValue(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {}
    }

    function removeStoredValue(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {}
    }

    function authToken() {
        return getStoredValue(storageKeys.authToken);
    }

    function authUser() {
        var storedUser = getStoredValue(storageKeys.authUser);
        if (! storedUser) {
            return null;
        }
        try {
            return JSON.parse(storedUser);
        } catch (error) {
            return null;
        }
    }

    function displayName(user) {
        var metadata = (user && user.user_metadata) || {};
        var label = metadata.full_name ||
            metadata.global_name ||
            metadata.name ||
            metadata.user_name ||
            metadata.preferred_username ||
            metadata.nickname ||
            (user && user.email) ||
            "Discord";
        return $.trim(label).substring(0, 15) || "Discord";
    }

    function updateSignedInUi(user) {
        var label = displayName(user);
        $("#discordSignInText").text("Sign out " + label.substring(0, 12));
        $("#discordSignIn").attr("aria-label", "Sign out of Discord");
        $("#authStatus").text("Signed in as " + label);
        $("#playerName").val(label);
    }

    function updateSignedOutUi() {
        $("#discordSignInText").text("Sign in Discord");
        $("#discordSignIn").attr("aria-label", "Sign in with Discord");
        $("#authStatus").text("Not signed in");
    }

    function storeSession(session) {
        if (session.access_token) {
            setStoredValue(storageKeys.authToken, session.access_token);
        }
        if (session.refresh_token) {
            setStoredValue(storageKeys.refreshToken, session.refresh_token);
        }
        if (session.expires_at) {
            setStoredValue(storageKeys.expiresAt, String(session.expires_at));
        } else if (session.expires_in) {
            setStoredValue(
                storageKeys.expiresAt,
                String(Math.floor(Date.now() / 1000) + parseInt(session.expires_in, 10))
            );
        }
        if (session.user) {
            setStoredValue(storageKeys.authUser, JSON.stringify(session.user));
            updateSignedInUi(session.user);
        }
    }

    function signOut() {
        removeStoredValue(storageKeys.authToken);
        removeStoredValue(storageKeys.authUser);
        removeStoredValue(storageKeys.refreshToken);
        removeStoredValue(storageKeys.expiresAt);
        updateSignedOutUi();
    }

    function fetchUser(token) {
        if (! window.fetch || ! token || ! window.Leaderboard) {
            if (! token) {
                updateSignedOutUi();
            }
            return Promise.resolve(null);
        }
        return fetch(authEndpoint("/user"), {
            headers: {
                "apikey": Leaderboard.supabaseKey(),
                "Authorization": "Bearer " + token
            }
        }).then(function(response) {
            if (! response.ok) {
                throw new Error("Auth user unavailable");
            }
            return response.json();
        }).then(function(user) {
            setStoredValue(storageKeys.authUser, JSON.stringify(user));
            updateSignedInUi(user);
            return user;
        }).catch(function() {
            signOut();
            return null;
        });
    }

    function refreshSession() {
        var refreshToken = getStoredValue(storageKeys.refreshToken);
        var expiresAt = parseInt(getStoredValue(storageKeys.expiresAt) || "0", 10);
        var now = Math.floor(Date.now() / 1000);
        if (! window.fetch || ! window.Leaderboard || ! refreshToken || expiresAt - 60 > now) {
            return Promise.resolve(authToken());
        }

        return fetch(authEndpoint("/token?grant_type=refresh_token"), {
            method: "POST",
            headers: {
                "apikey": Leaderboard.supabaseKey(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ refresh_token: refreshToken })
        }).then(function(response) {
            if (! response.ok) {
                throw new Error("Refresh failed");
            }
            return response.json();
        }).then(function(session) {
            storeSession(session);
            return authToken();
        }).catch(function() {
            return authToken();
        });
    }

    function handleAuthRedirect() {
        var params = parseFragment();
        if (! params.access_token) {
            return false;
        }
        storeSession(params);
        window.history.replaceState(null, document.title, redirectUrl());
        return true;
    }

    function signInWithDiscord() {
        var endpoint = authEndpoint("/authorize");
        if (! endpoint) {
            $("#authStatus").text("Auth not configured");
            return;
        }
        window.location.href = endpoint +
            "?provider=discord&redirect_to=" + encodeURIComponent(redirectUrl());
    }

    function init() {
        handleAuthRedirect();

        var storedUser = authUser();
        if (storedUser) {
            updateSignedInUi(storedUser);
        } else {
            updateSignedOutUi();
        }

        refreshSession().then(fetchUser);

        $("#discordSignIn").click(function() {
            if (authToken()) {
                signOut();
                return;
            }
            signInWithDiscord();
        });
    }

    window.SnakeAuth = {
        storageKeys: storageKeys,
        authToken: authToken,
        authUser: authUser,
        displayName: displayName,
        fetchUser: fetchUser,
        isSignedIn: function() {
            return !! authToken();
        },
        signInWithDiscord: signInWithDiscord,
        signOut: signOut
    };

    $(init);
}(window, jQuery));
