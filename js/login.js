async function setLoggedIn(userId, authKey) {
    console.log('setLoggedIn:', userId);
    currentUserId = userId;
    
    try {
        localStorage.setItem('guestAppUserId', userId);
        localStorage.setItem('guestAppAuthKey', authKey);
    } catch (e) {
        console.error(e);
    }

    // Creation time (background)
    if (!guestData.creation_time || guestData.creation_time === "NULL") {
        (async () => {
            try {
                const now = new Date().toISOString();
                await db.from('status').update({ creation_time: now }).eq('uid', guestData.uid);
                guestData.creation_time = now;
            } catch (e) {
                console.warn('creation_time failed:', e);
            }
        })();
    }

    // CRITICAL: Show UI FIRST
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    populateUIWithGuestData();
}

async function checkExistingLogin() {
    let storedAuthKey = null;
    try {
        storedAuthKey = localStorage.getItem('guestAppAuthKey');
    } catch (e) {
        console.error(e);
    }

    if (storedAuthKey) {
        const userId = await deriveUserIdFromKey(storedAuthKey);
        if (userId) {
            setLoggedIn(userId, storedAuthKey);
            updateStatusCard();
            document.body.classList.remove('booting');
            return;
        }
    }

    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
    document.body.classList.remove('booting');
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
