// --- LOGIN LOGIC ---

async function loginWithKey(key) {
    console.log('Querying database for auth_id:', key);
    
    const { data, error } = await db
        .from('profile')
        .select('*')
        .eq('auth_id', key)  // ← Changed from 'uid' to 'auth_id'
        .single();
    
    if (error || !data) {
        console.log('Database returned error or no data:', error?.message || 'No row found');
        throw new Error('Invalid key');
    }
    
    console.log('Found user:', data.uid);
    return data;
}

async function setLoggedIn(userId, authKey) {
    try {
        localStorage.setItem('guestAppUserId', userId);
        localStorage.setItem('guestAppAuthKey', authKey);
    } catch (e) {
        console.error("Failed to save auth to localStorage", e);
    }

    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');

    document.body.classList.remove('booting');

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
            // Assign directly to window to avoid redeclaration errors
            window.guestData = await loginWithKey(cleanKey);
            
            if (window.guestData && window.guestData.uid) {
                await setLoggedIn(window.guestData.uid, cleanKey);
                if (typeof updateStatusCard === 'function') updateStatusCard();
                return; 
            }
        } catch (err) {
            console.error("Existing login check failed:", err);
        }
    }

    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (appContainer) appContainer.classList.add('hidden');
    
    document.body.classList.remove('booting');
}

async function attemptLogin() {
    console.log('Login button clicked!');
    const input = document.getElementById('auth-key-input');
    const errorEl = document.getElementById('auth-error');
    
    if (!input) return;
    
    const key = input.value.trim().toUpperCase();
    
    if (!key) {
        if (errorEl) errorEl.classList.remove('hidden');
        return;
    }

    console.log('Trying to login with key:', key);

    try {
        const btn = document.getElementById('auth-submit-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        btn.disabled = true;

        // Assign directly to window
        window.guestData = await loginWithKey(key);

        if (!window.guestData || !window.guestData.uid) {
            throw new Error("Invalid User Data");
        }

        console.log('Login successful! Setting UI...');
        if (errorEl) errorEl.classList.add('hidden');
        
        await setLoggedIn(window.guestData.uid, key);
        if (typeof updateStatusCard === 'function') updateStatusCard();

    } catch (err) {
        console.error('Something went wrong during login:', err);
        if (errorEl) {
            errorEl.textContent = 'Invalid key. Please check with your host.';
            errorEl.classList.remove('hidden');
        }
        
        const btn = document.getElementById('auth-submit-btn');
        btn.innerHTML = 'Enter';
        btn.disabled = false;
    }
}
