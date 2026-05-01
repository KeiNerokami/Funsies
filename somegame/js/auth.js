(function(window, $) {
    var storageKeys = {
        authToken: "snake.supabase.authToken",
        authUser: "snake.supabase.authUser",
        refreshToken: "snake.supabase.authRefreshToken",
        expiresAt: "snake.supabase.authExpiresAt",
        codeVerifier: "snake.supabase.authCodeVerifier"
    };

    function authEndpoint(path) {
        var config = window.SnakeSupabaseConfig || {};
        if (! config.supabaseUrl || ! config.supabaseKey || ! config.authPath) {
            return "";
        }
        try {
            return new URL(config.authPath + path, config.supabaseUrl).toString();
        } catch (error) {
            return "";
        }
    }

    function redirectUrl() {
        var url = new URL(window.location.href);
        url.hash = "";
        url.searchParams.delete("code");
        url.searchParams.delete("error");
        url.searchParams.delete("error_code");
        url.searchParams.delete("error_description");
        return url.toString();
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

    function base64UrlEncode(bytes) {
        var binary = "";
        for (var i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }

    function randomVerifier() {
        var bytes = new Uint8Array(32);
        window.crypto.getRandomValues(bytes);
        return base64UrlEncode(bytes);
    }

    function codeChallenge(verifier) {
        var bytes = new TextEncoder().encode(verifier);
        return window.crypto.subtle.digest("SHA-256", bytes).then(function(hash) {
            return base64UrlEncode(new Uint8Array(hash));
        });
    }

    function signOut() {
        removeStoredValue(storageKeys.authToken);
        removeStoredValue(storageKeys.authUser);
        removeStoredValue(storageKeys.refreshToken);
        removeStoredValue(storageKeys.expiresAt);
        removeStoredValue(storageKeys.codeVerifier);
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

    function exchangeAuthCode(code) {
        var verifier = getStoredValue(storageKeys.codeVerifier);
        removeStoredValue(storageKeys.codeVerifier);
        if (! code || ! verifier) {
            $("#authStatus").text("Auth session expired");
            return Promise.resolve(false);
        }
        return fetch(authEndpoint("/token?grant_type=pkce"), {
            method: "POST",
            headers: {
                "apikey": Leaderboard.supabaseKey(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                auth_code: code,
                code_verifier: verifier
            })
        }).then(function(response) {
            if (! response.ok) {
                throw new Error("Code exchange failed");
            }
            return response.json();
        }).then(function(session) {
            storeSession(session);
            return fetchUser(session.access_token);
        }).then(function() {
            return true;
        }).catch(function() {
            signOut();
            $("#authStatus").text("Sign in failed");
            return false;
        });
    }

    function handleAuthRedirect() {
        var url = new URL(window.location.href);
        var code = url.searchParams.get("code");
        var error = url.searchParams.get("error_description") || url.searchParams.get("error");
        var params = parseFragment();
        if (code || error || params.access_token) {
            window.history.replaceState(null, document.title, redirectUrl());
        }
        if (error) {
            $("#authStatus").text("Sign in cancelled");
            return Promise.resolve(false);
        }
        if (code) {
            return exchangeAuthCode(code);
        }
        if (! params.access_token) {
            return Promise.resolve(false);
        }
        // Legacy implicit callback support. New sign-ins use PKCE and should not hit this path.
        storeSession(params);
        return fetchUser(params.access_token).then(function() {
            return true;
        });
    }

    function signInWithDiscord() {
        var endpoint = authEndpoint("/authorize");
        if (! endpoint) {
            $("#authStatus").text("Auth not configured");
            return;
        }
        if (! window.crypto || ! window.crypto.subtle || ! window.TextEncoder) {
            $("#authStatus").text("Browser auth unsupported");
            return;
        }
        var verifier = randomVerifier();
        setStoredValue(storageKeys.codeVerifier, verifier);
        codeChallenge(verifier).then(function(challenge) {
            var url = new URL(endpoint);
            url.searchParams.set("provider", "discord");
            url.searchParams.set("redirect_to", redirectUrl());
            url.searchParams.set("code_challenge", challenge);
            url.searchParams.set("code_challenge_method", "s256");
            window.location.href = url.toString();
        }).catch(function() {
            removeStoredValue(storageKeys.codeVerifier);
            $("#authStatus").text("Sign in failed");
        });
    }

    function init() {
        var storedUser = authUser();
        if (storedUser) {
            updateSignedInUi(storedUser);
        } else {
            updateSignedOutUi();
        }

        handleAuthRedirect().then(function(handledRedirect) {
            if (! handledRedirect) {
                refreshSession().then(fetchUser);
            }
        });

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
