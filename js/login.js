async function setLoggedIn(userId, authKey) {
    currentUserId = userId;
    try {
        localStorage.setItem('guestAppUserId', userId);
        localStorage.setItem('guestAppAuthKey', authKey);
    } catch (e) {
        console.error(e);
    }

    if (!guestData.creation_time || guestData.creation_time === "NULL") {
        const now = new Date().toISOString(); 
        console.log(`DB Update: Setting creation_time=${now} for UID=${guestData.uid} in status table`);
        // SUPABASE:
        await db.from('status').update({ creation_time: now }).eq('uid', guestData.uid);
        guestData.creation_time = now;
    }

    // 1. Hide Login, Show App
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    // 2. Populate data and run UI logic
    populateUIWithGuestData();
}

async function checkExistingLogin() {
    let storedAuthKey = null;
    try {
        storedAuthKey = localStorage.getItem('guestAppAuthKey');
    } catch (e) { console.error(e); }

    if (storedAuthKey) {
        // SAFEGUARD: Clean the key again just in case
        const cleanKey = storedAuthKey.trim().toUpperCase();
        // Re-verify against CSV to load guestData
        const userId = await deriveUserIdFromKey(cleanKey);        if (userId) {
            setLoggedIn(userId, storedAuthKey);
            updateStatusCard();
            return; // Stay on the app-container
        }
    }

    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

async function attemptLogin() {
    console.log("Login button clicked!");
    const input = document.getElementById('auth-key-input');
    const errorEl = document.getElementById('auth-error');
    
    // SAFEGUARD: Remove hidden iPhone spaces and force UPPERCASE
    const key = input.value.trim().toUpperCase();

    console.log("Trying to login with key:", key);
    try {
        const userId = await deriveUserIdFromKey(key);
        console.log("Derived User ID:", userId);
        
        if (!userId) {
            console.log("User ID not found, showing error.");
            errorEl.classList.remove('hidden');
            return;
        }
        
        console.log("Login successful! Setting UI...");
        errorEl.classList.add('hidden');
        setLoggedIn(userId, key);
        
    } catch (err) {
        console.error("Something went wrong during login:", err);
    }
}
