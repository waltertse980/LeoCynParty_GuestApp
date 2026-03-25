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

    // Push subscription (SINGLE non-blocking call)
    const VAPID_PUBLIC_KEY = 'BOnGCym7arrYw2lqJw7gkPu2V1JjRj7lRF-J5UaAdhKUt00XOn8PeZ5PXsWl4g_wvGI5KHu5tfMYj6F_zf2qUU8';
    subscribeToPush(userId, VAPID_PUBLIC_KEY).catch(e => console.warn('Push skipped:', e));
}

async function subscribeToPush(uid, vapidKey) {
    console.log('🔄 Starting push subscription for:', uid);
    
    if (!('PushManager' in window)) {
        console.log('❌ PushManager not available');
        return;
    }

    try {
        console.log('✅ PushManager available, getting SW registration...');
        const reg = await navigator.serviceWorker.ready;
        console.log('✅ Service Worker ready');

        let sub = await reg.pushManager.getSubscription();
        console.log('Current subscription:', sub ? 'exists' : 'none');

        if (!sub) {
            console.log('🔄 Requesting new subscription...');
            const keyArray = urlBase64ToUint8Array(vapidKey);
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: keyArray
            });
            console.log('✅ New subscription created');
        }

        console.log('🔄 Saving to Supabase...');
        const { error, data } = await db.from('push_subscriptions').upsert({
            uid: uid,
            subscription: sub.toJSON()
        });

        console.log('Supabase response:', { error: error?.message, data });
        
        if (error) {
            console.error('❌ Supabase upsert failed:', error);
            return;
        }
        
        console.log('✅ Push subscription saved!', data);
        
    } catch (err) {
        console.error('❌ Push subscription FAILED:', err.message);
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
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
