/* Authentication + roles: admin = full control, everyone else = viewer (read-only) */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var loaded = false, auth;
  var MSG = {
    "auth/invalid-credential": "Wrong email or password.", "auth/wrong-password": "Wrong email or password.",
    "auth/user-not-found": "Wrong email or password.", "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
    "auth/network-request-failed": "No internet connection.", "auth/user-disabled": "This account is disabled."
  };
  function say(e) { $("lgErr").textContent = typeof e === "string" ? e : (MSG[e.code] || e.message); }

  try { firebase.initializeApp(window.FIREBASE_CONFIG); auth = firebase.auth(); }
  catch (e) { $("login").classList.add("ready"); say("Could not start sign-in: " + e.message); return; }

  $("loginForm").onsubmit = function (ev) {
    ev.preventDefault(); say(""); $("lgBtn").disabled = true;
    auth.signInWithEmailAndPassword($("lgEmail").value.trim(), $("lgPw").value)
      .catch(say).then(function () { $("lgBtn").disabled = false; });
  };
  $("lgShow").onclick = function () {
    var p = $("lgPw"), show = p.type === "password"; p.type = show ? "text" : "password"; this.textContent = show ? "Hide" : "Show";
  };
  $("lgForgot").onclick = function (ev) {
    ev.preventDefault(); var em = $("lgEmail").value.trim();
    if (!em) { say("Type your email first, then click Forgot password."); return; }
    auth.sendPasswordResetEmail(em).then(function () { say(""); alert("Password reset email sent to " + em); }).catch(say);
  };
  $("signOut").onclick = function () { auth.signOut().then(function () { location.reload(); }); };

  auth.onAuthStateChanged(function (u) {
    $("login").classList.add("ready");
    if (!u) { document.body.classList.remove("authed"); return; }
    var admins = (window.ADMIN_EMAILS || []).map(function (x) { return x.toLowerCase(); });
    var admin = admins.indexOf((u.email || "").toLowerCase()) > -1;
    window.APP_ROLE = admin ? "admin" : "viewer"; window.APP_USER = u;
    document.body.classList.add("authed", "role-" + window.APP_ROLE);
    $("whoChip").textContent = (admin ? "Admin · " : "Viewer (view-only) · ") + u.email;
    $("whoChip").className = "chip" + (admin ? "" : " v");
    if (!admin) {   /* hide whole form cards that contain editing buttons */
      ["btnTx", "alSave", "anSave", "btnSave"].forEach(function (id) {
        var b = $(id), c = b && b.closest("section"); if (c) c.classList.add("vh");
      });
    }
    $("lgPw").value = "";
    if (!loaded) {   /* start the main app only after sign-in */
      loaded = true; var sc = document.createElement("script"); sc.src = "js/app.js"; document.body.appendChild(sc);
    }
  });
})();
