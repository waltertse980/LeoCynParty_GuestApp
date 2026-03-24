// --- LOGIN LOGIC ---
var guestData = null; // Global variable to hold the user's data

async function setLoggedIn(userId, authKey) {
    try {
        localStorage.setItem('guestAppUserId', userId);
        localStorage.setItem('guestAppAuthKey', authKey);
    } catch (e) {
        console.error("Failed to save auth to localStorage", e);
    }

    // 1. Hide Login, Show App
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');

    // 2. Remove booting class to reveal the screen
    document.body.classList.remove('booting');

    // 3. Populate data and run UI logic (safely check if function exists)
    if (typeof populateUIWithGuestData === 'function') {
        await populateUIWithGuestData();
    }
}

async function checkExistingLogin() {
    let storedAuthKey = null;
    try {
        storedAuthKey = localStorage.getItem('guestAppAuthKey');
    } catch (e) {
        console.error("Error reading localStorage", e);
    }

    if (storedAuthKey) {
        const cleanKey = storedAuthKey.trim().toUpperCase();
        try {
            // Verify against database
            guestData = await loginWithKey(cleanKey);
            
            if (guestData && guestData.uid) {
                await setLoggedIn(guestData.uid, cleanKey);
                if (typeof updateStatusCard === 'function') updateStatusCard();
                return; // Successfully logged in
            }
        } catch (err) {
            console.error("Existing login check failed:", err);
            // Fall through to show login screen
        }
    }

    // If we get here, no valid login exists. Show the login screen.
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (appContainer) appContainer.classList.add('hidden');
    
    // Crucial: remove the booting lock so they can actually see the login screen!
    document.body.classList.remove('booting');
}

async function attemptLogin() {
    console.log('Login button clicked!');
    const input = document.getElementById('auth-key-input');
    const errorEl = document.getElementById('auth-error');
    
    if (!input) return;
    
    // SAFEGUARD: Remove hidden iPhone spaces and force UPPERCASE
    const key = input.value.trim().toUpperCase();
    
    if (!key) {
        if (errorEl) errorEl.classList.remove('hidden');
        return;
    }

    console.log('Trying to login with key:', key);

    try {
        // Change button to show loading state
        const btn = document.getElementById('auth-submit-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        btn.disabled = true;

        guestData = await loginWithKey(key);

        if (!guestData || !guestData.uid) {
            throw new Error("Invalid User Data");
        }

        console.log('Login successful! Setting UI...');
        if (errorEl) errorEl.classList.add('hidden');
        
        await setLoggedIn(guestData.uid, key);
        if (typeof updateStatusCard === 'function') updateStatusCard();

    } catch (err) {
        console.error('Something went wrong during login:', err);
        if (errorEl) {
            errorEl.textContent = 'Invalid key. Please check with your host.';
            errorEl.classList.remove('hidden');
        }
        
        // Restore button
        const btn = document.getElementById('auth-submit-btn');
        btn.innerHTML = 'Enter';
        btn.disabled = false;
    }
}
