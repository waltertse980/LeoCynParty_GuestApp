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

    const VAPID_PUBLIC_KEY = 'BOnGCym7arrYw2lqJw7gkPu2V1JjRj7lRF-J5UaAdhKUt00XOn8PeZ5PXsWl4g_wvGI5KHu5tfMYj6F_zf2qUU8';

    await subscribeToPush(data.uid);

    async function subscribeToPush(uid) {
        if (!('PushManager' in window)) return console.log('Push not supported');
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }
        await db.from('push_subscriptions').upsert({
            uid: uid,
            subscription: sub.toJSON()
        });
        console.log('Push subscribed:', uid);
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
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
