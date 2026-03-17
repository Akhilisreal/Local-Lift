// js/auth.js
// Purpose: handle user authentication (login, signup, logout)
// This file initializes Firebase auth/database, provides helpers to
// map Firebase errors to friendly messages, and wires up DOM
// handlers for the login/signup/logout UI.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// Firebase configuration values for this project
// (kept here so other modules can import `auth` / `database` if needed)
// NOTE: changing these without creating a matching Firebase project
// will break authentication and data access.
// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA655hz1iZMa2Qmg5DZWpIiQ0Q9p9DkbtY",
  authDomain: "bytesizedbusinessboost-fbeb6.firebaseapp.com",
  projectId: "bytesizedbusinessboost-fbeb6",
  storageBucket: "bytesizedbusinessboost-fbeb6.firebasestorage.app",
  messagingSenderId: "1033680545380",
  appId: "1:1033680545380:web:f8a2c99a5ea22355bc6171",
  databaseURL: "https://bytesizedbusinessboost-fbeb6-default-rtdb.firebaseio.com"
};

// Initialize Firebase app and export `database` and `auth` for use elsewhere
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);

// Convert a username into a safe Realtime Database key.
export function usernameToKey(username) {
    return encodeURIComponent(String(username || '').toLowerCase());
}

// Hash a password using the Web Crypto API (SHA-256) and return a
// hex-encoded string. This is used so we don't store raw passwords
// in the readable mirror. Firebase Auth still manages authentication.
export async function hashPassword(password) {
    const enc = new TextEncoder();
    const data = enc.encode(String(password));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to display friendly error messages in the UI when possible
// Convert Firebase error objects into short, friendly messages that make
// sense to typical users (avoid showing raw Firebase strings).
function mapFirebaseError(err) {
    const code = err && err.code ? err.code : '';
    const raw = err && err.message ? String(err.message).toLowerCase() : '';
    // normalize and map common error codes/messages to friendly text
    switch (code) {
        case 'auth/user-not-found': return 'No account matches that email. Check the address or create a new account.';
        case 'auth/wrong-password': return 'The password is incorrect. Try again or reset your password if you forgot it.';
        case 'auth/invalid-email': return 'Please enter a valid email address.';
        case 'auth/email-already-in-use': return 'An account with this email already exists. Try logging in instead.';
        case 'auth/weak-password': return 'Choose a stronger password (at least 6 characters).';
        default:
                // If code is missing, try to infer from the message text to avoid showing raw Firebase strings
                // First, try to extract an auth code like "auth/wrong-password" from the raw message
                const codeMatch = raw.match(/auth\/?[a-z0-9-]+/i);
                const inferred = codeMatch ? String(codeMatch[0]).toLowerCase().replace(/^auth\/?/, '') : '';
                switch (inferred) {
                    case 'user-not-found': return 'No account matches that email. Check the address or create a new account.';
                    case 'wrong-password': return 'The password is incorrect. Try again or reset your password if you forgot it.';
                    case 'invalid-email': return 'Please enter a valid email address.';
                    case 'email-already-in-use': return 'An account with this email already exists. Try logging in instead.';
                    case 'weak-password': return 'Choose a stronger password (at least 6 characters).';
                }

                // Fallback keyword checks (broader matching)
                // broader string matching to cover varied Firebase messages
                if (raw.includes('no user record') || raw.includes('there is no user') || raw.includes('no user')) return 'No account matches that email. Check the address or create a new account.';
                if (raw.includes('wrong-password') || raw.includes('wrong password') || (raw.includes('password') && raw.includes('invalid'))) return 'The password is incorrect. Try again or reset your password if you forgot it.';
                if (raw.includes('invalid-email') || raw.includes('invalid email')) return 'Please enter a valid email address.';
                if (raw.includes('already in use') || raw.includes('already exists')) return 'An account with this email already exists. Try logging in instead.';

                // As a last resort, return a short friendly message without echoing the full raw Firebase string
                return 'Something went wrong. Either your email or password is invalid.';
    }
}

// Display a user-visible error message. If `elementId` exists on the page
// this writes the message there; otherwise it falls back to a simple alert.
function showErrorMessage(message, elementId) {
    if (elementId) {
        const el = document.getElementById(elementId);
        if (el) {
            // write the message into the provided element and auto-hide
            el.textContent = message;
            el.style.display = 'block';
            // Optionally remove message after a short delay
            setTimeout(() => {
                el.style.display = 'none';
                el.textContent = '';
            }, 6000);
            return;
        }
    }
    // Fallback to alert when no element is provided/found
    alert(message);
}

// LOGIN handler
// Handles the login form: validates input, calls Firebase sign-in, and
// shows friendly error messages when sign-in fails.
// LOGIN
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.onclick = () => {
        // Read form fields
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        if (!email || !password) {
            showErrorMessage('Please enter both email and password.', 'loginError');
            return;
        }

        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                window.location.href = '../index.html';
            })
            .catch(err => {
                const msg = mapFirebaseError(err);
                showErrorMessage(msg, 'loginError');
            });
    };
}

// SIGNUP handler
// Handles creating a new account: validates input, creates the user with
// Firebase Auth, stores a basic profile record in the Realtime Database,
// and redirects on success.
// SIGNUP
const signupBtn = document.getElementById('signupBtn');
if (signupBtn) {
    signupBtn.onclick = () => {
        // Collect signup inputs
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value.trim();

        if (!name || !email || !password) {
            showErrorMessage('Please fill all fields.', 'signupError');
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then(async userCredential => {
                // update the Firebase profile display name
                updateProfile(userCredential.user, { displayName: name });

                // Write primary record under /users/{usernameKey} so the
                // Realtime Database `users` root lists usernames as keys.
                try {
                    const key = usernameToKey(name);
                    const hashed = await hashPassword(password);
                    await set(ref(database, `users/${key}`), {
                        username: name,
                        email: email,
                        password: hashed,
                        favorites: {}
                    });
                } catch (e) {
                    console.warn('Failed to write user record under username key', e);
                    // Fallback: write under UID so the app remains functional
                    set(ref(database, 'users/' + userCredential.user.uid), {
                        username: name,
                        email: email,
                        password: password,
                        favorites: {}
                    });
                }

                window.location.href = '../index.html';
            })
            .catch(err => {
                const msg = mapFirebaseError(err);
                showErrorMessage(msg, 'signupError');
            });
    };
}

// LOGOUT handler
// Signs the current user out and redirects back to the login page.
// LOGOUT
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.onclick = () => {
        // Trigger Firebase sign-out
        signOut(auth).then(() => {
            // Correct path to login page
            window.location.href = '/pages/login.html';
        }).catch(err => {
            // No logout-specific element on most pages; fall back to alert
            const msg = mapFirebaseError(err);
            alert('Error logging out: ' + msg);
        });
    };
}

//Auth state wa
// Watches authentication state to protect certain pages and populate
// profile fields when a user is present.
// PROTECT PAGES & FILL PROFILE
onAuthStateChanged(auth, user => {
    const protectedPages = [
        '/pages/business.html',
        '/pages/profile.html',
        '/pages/favorites.html'
    ];

    if (!user && protectedPages.some(page => window.location.pathname.includes(page))) {
        window.location.href = '/pages/captcha.html';
    }

    // Support both hyphenated and camelCase IDs used across pages
    const profileName = document.getElementById('profile-name') || document.getElementById('profileName');
    const profileEmail = document.getElementById('profile-email') || document.getElementById('profileEmail');
    if (user) {
        // populate simple profile fields when available
        if (profileName) profileName.textContent = user.displayName || 'Anonymous';
        if (profileEmail) profileEmail.textContent = user.email;
    }
});