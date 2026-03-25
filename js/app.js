document.addEventListener('DOMContentLoaded', function() {
    // --- SPLASH SCREEN LOGIC ---
    const splashScreen = document.getElementById('splash-screen');
    const splashImage = document.getElementById('splash-image');

    // Check if we already played the splash screen this session
    if (sessionStorage.getItem('splashPlayed')) {
        // Already played: hide it instantly so they can use the app
        if (splashScreen) splashScreen.style.display = 'none';
    } else {
        // First time: Play the animation
        if (splashScreen && splashImage) {
            // 1. Fade IN the image (takes 2 seconds because of Tailwind CSS duration-[2000ms])
            setTimeout(() => {
                splashImage.style.opacity = '1';
            }, 100); // Tiny delay to ensure browser paints the initial state

            // 2. Wait 2 seconds (for fade in), then hold for 1 second, then Fade OUT everything
            setTimeout(() => {
                splashScreen.style.opacity = '0';
            }, 3000); 

            // 3. Wait for the 2-second fade out to finish, then delete it to reveal the app
            setTimeout(() => {
                splashScreen.style.display = 'none';
                // Mark it as played for this session
                sessionStorage.setItem('splashPlayed', 'true');
            }, 5000); 
        }
    }

    // Initial Language Detect
    const userLang = (navigator.language || navigator.userLanguage).toLowerCase();
    if (userLang.includes('en')) setLanguage('en');
    else setLanguage('zh');

    // 1. Run initial login check
    checkExistingLogin();

    // 2. Set up Login button listeners
    const input = document.getElementById('auth-key-input');
    const btn = document.getElementById('auth-submit-btn');
    const errorEl = document.getElementById('auth-error');
    

    btn.addEventListener('click', attemptLogin);
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') attemptLogin();
    });
    
    if (btn && input) {
        btn.addEventListener('click', attemptLogin);
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') attemptLogin();
        });
    }

    // 3. Set up Modal Logic (moved from index.html)
    const openTriggers = document.querySelectorAll('[data-modal-target]');
    const closeTriggers = document.querySelectorAll('[data-modal-close]');
    const allModals = document.querySelectorAll('[id$="-modal"]');

    openTriggers.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-modal-target');
            const targetModal = document.getElementById(targetId);
            if (targetModal) {
                targetModal.classList.remove('hidden');
                targetModal.classList.add('flex');
            }
        });
    });

    closeTriggers.forEach(btn => {
        btn.addEventListener('click', () => {
            const activeModal = btn.closest('div[id$="-modal"]');
            if (activeModal) {
                activeModal.classList.add('hidden');
                activeModal.classList.remove('flex');
            }
        });
    });

    // 4. Start Countdown
    setInterval(updateCountdown, 1000);
    updateCountdown();
    
    // 5. Initial UI setup
    generateArrivalOptions();


    // --- CAMERA LOGIC ---
    const btnOpenCamera = document.getElementById('btn-open-camera');
    const videoFeed = document.getElementById('camera-feed');
    const scanAnimation = document.getElementById('scan-animation');
    const cameraPlaceholder = document.getElementById('camera-placeholder');
    let currentStream = null;

    if (btnOpenCamera) {
        btnOpenCamera.addEventListener('click', async () => {
            // If camera is already running, do nothing (or change this to stop the camera)
            if (currentStream) return;

            try {
                // 1. Request Camera Access from the browser (preferring the back camera)
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "environment" } 
                });
                
                // 2. If allowed, connect the stream to the <video> element
                currentStream = stream;
                videoFeed.srcObject = stream;
                
                // 3. Update the UI to show the video and hide the placeholder
                videoFeed.classList.remove('hidden');
                scanAnimation.classList.remove('hidden');
                cameraPlaceholder.classList.add('hidden');
                
                // Change button text to indicate it's scanning
                btnOpenCamera.textContent = "Scanning...";
                btnOpenCamera.classList.add('opacity-50', 'cursor-not-allowed');
                
                // Note: Actual QR code reading requires an external library like html5-qrcode.
                // This code just opens the native camera feed.

            } catch (err) {
                console.error("Camera access denied or failed:", err);
                alert("Please allow camera access in your browser settings to scan QR codes.");
            }
        });
    }

    // --- SAFE FEEDBACK SUBMISSION LOGIC ---
    const fbBtn = document.getElementById('btn-submit-feedback');
    if (fbBtn) {
        fbBtn.addEventListener('click', async function(e) {
            e.preventDefault(); 
            
            const fbTextEl = document.getElementById('fb-text');
            if (!fbTextEl) return;

            const fbText = fbTextEl.value.trim();
            if (!fbText) {
                alert("Please enter some text before submitting.");
                return;
            }

            // Fallback to 'unknown_user' if guestData isn't loaded
            const currentUid = (typeof guestData !== 'undefined' && guestData && guestData.uid) ? guestData.uid : 'unknown_user';
            
            const n = new Date();
            const pad = num => String(num).padStart(2, '0');
            const timestamp = `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;

            const feedbackPayload = { uid: currentUid, datetime: timestamp, user_input: fbText };
            
            fbBtn.disabled = true;
            fbBtn.innerHTML = '<span class="text-sm font-bold">Sending...</span>';

            try {
                // FIXED: Using 'db' directly instead of 'window.db'
                const { error } = await db.from('feedback').insert([feedbackPayload]);
                
                if (error) {
                    console.error("Supabase rejected the insert:", error);
                    alert(`Database Error: ${error.message}`);
                    fbBtn.disabled = false;
                    fbBtn.innerHTML = '<span data-i18n="settings_feedback_submit">Submit</span>';
                    return; 
                }
                
                // Clean up and close modal
                fbTextEl.value = '';
                document.getElementById('feedback-modal').classList.remove('flex');
                document.getElementById('feedback-modal').classList.add('hidden');
                
                // Open Settings Modal again
                document.getElementById('settings-modal').classList.remove('hidden');
                document.getElementById('settings-modal').classList.add('flex');
                
                // Custom GUI Toast Notification instead of alert()
                const toast = document.createElement('div');
                toast.className = 'fixed top-10 left-1/2 transform -translate-x-1/2 bg-green-100 border-2 border-green-600 text-green-800 px-4 py-2 rounded-lg shadow-xl z-[100] font-bold text-sm transition-opacity duration-500';
                toast.innerText = 'Thank you! Your feedback has been sent.';
                document.body.appendChild(toast);
                
                // Fade out and remove after 3 seconds
                setTimeout(() => {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 500);
                }, 3000);
                
            } catch (err) {
                // FIXED: Actually print the error to the console!
                console.error("JavaScript caught an error during insert:", err);
                alert("Something went wrong. Check console.");
            } finally {
                fbBtn.disabled = false;
                fbBtn.innerHTML = '<span data-i18n="settings_feedback_submit">Submit</span>';
            }
        });
    }

    // VAPID Key (global)
    const VAPID_PUBLIC_KEY = 'BOnGCym7arrYw2lqJw7gkPu2V1JjRj7lRF-J5UaAdhKUt00XOn8PeZ5PXsWl4g_wvGI5KHu5tfMYj6F_zf2qUU8';

    async function subscribeToPush(uid, vapidKey) {
        console.log('🔄 Starting push subscription for:', uid);
        
        if (!('PushManager' in window) || !('serviceWorker' in navigator)) {
            console.log('❌ Push/ServiceWorker not available');
            return;
        }

        try {
            // Direct registration instead of .ready
            console.log('🔄 Getting direct SW registration...');
            const reg = await navigator.serviceWorker.getRegistration();
            console.log('SW registration:', reg ? 'found' : 'none');
            
            if (!reg) {
                console.log('❌ No ServiceWorker registration');
                return;
            }

            console.log('✅ Using existing registration');
            let sub = await reg.pushManager.getSubscription();
            console.log('Current subscription:', sub ? 'exists' : 'none');

            if (!sub) {
                console.log('🔄 Creating new subscription...');
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
            console.error('❌ Push FAILED:', err.message);
            console.error('Full error:', err);
        }
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
    }

    // Notifications button
    document.getElementById('btn-auth-notif').addEventListener('click', async () => {
        const perm = Notification.permission;
        
        if (perm === 'granted') {
            // Check if already subscribed
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            
            if (sub) {
                document.getElementById('btn-auth-notif').innerHTML = `
                    <span class="text-xs font-bold uppercase text-green-600">✅ Push Active</span>
                    <i class="fa-solid fa-satellite-dish text-green-600"></i>
                `;
                console.log('🎉 Already subscribed:', sub.endpoint);
                return;
            }
        }
        
        if (perm !== 'granted') {
            const newPerm = await Notification.requestPermission();
            if (newPerm !== 'granted') return;
        }
        
        // Create + save sub
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
        await db.from('push_subscriptions').upsert({
            uid: currentUserId,
            subscription: sub.toJSON()
        });
        
        document.getElementById('btn-auth-notif').innerHTML = `
            <span class="text-xs font-bold uppercase text-green-600">✅ Push Active</span>
            <i class="fa-solid fa-satellite-dish text-green-600"></i>
        `;
    });
});
