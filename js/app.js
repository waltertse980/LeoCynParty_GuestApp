document.addEventListener('DOMContentLoaded', async function() {
    // 🛑 GLOBAL FAILSAFE: If the app is still booting after 5 seconds, force it open
    setTimeout(() => {
        if (document.body.classList.contains('booting')) {
            console.warn("Failsafe triggered: forcefully removing booting class.");
            document.body.classList.remove('booting');
            const loginScreen = document.getElementById('login-screen');
            if (loginScreen) loginScreen.classList.remove('hidden');
        }
    }, 5000);

    // --- SPLASH SCREEN LOGIC (Wrapped in a Promise so we can await it) ---
    const splashScreen = document.getElementById('splash-screen');
    const splashImage = document.getElementById('splash-image');

    const playSplashScreen = new Promise((resolve) => {
        if (sessionStorage.getItem('splashPlayed')) {
            if (splashScreen) splashScreen.style.display = 'none';
            resolve();
        } else {
            if (splashScreen && splashImage) {
                setTimeout(() => { splashImage.style.opacity = '1'; }, 100); 
                setTimeout(() => { splashScreen.style.opacity = '0'; }, 3000); 
                setTimeout(() => {
                    splashScreen.style.display = 'none';
                    sessionStorage.setItem('splashPlayed', 'true');
                    resolve(); 
                }, 5000); 
            } else {
                resolve(); 
            }
        }
    });

    await playSplashScreen;

    // Initial Language Detect
    const userLang = (navigator.language || navigator.userLanguage || "").toLowerCase();
    if (userLang.includes('en')) setLanguage('en');
    else setLanguage('zh');

    // 1. Run initial login check SAFELY
    try {
        if (typeof checkExistingLogin === 'function') {
            await checkExistingLogin(); // <--- Wait for auth check to finish
        } else {
            // Failsafe: if checkExistingLogin doesn't exist
            document.getElementById('login-screen').classList.remove('hidden');
        }
    } catch (err) {
        console.error("Critical error during login check:", err);
        // If the database fails, fallback to showing the login screen
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) loginScreen.classList.remove('hidden');
    } finally {
        // 🔥 THIS WILL NOW ALWAYS RUN NO MATTER WHAT 🔥
        document.body.classList.remove('booting');
    }

    // 2. Set up Login button listeners
    const input = document.getElementById('auth-key-input');
    const btn = document.getElementById('auth-submit-btn');
    const errorEl = document.getElementById('auth-error');
    
    if (btn && input) {
        btn.addEventListener('click', attemptLogin);
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') attemptLogin();
        });
    }

    // 3. Set up Modal Logic
    const openTriggers = document.querySelectorAll('[data-modal-target]');
    const closeTriggers = document.querySelectorAll('[data-modal-close]');

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
    if (typeof generateArrivalOptions === 'function') {
        generateArrivalOptions();
    }

    // --- CAMERA LOGIC ---
    const btnOpenCamera = document.getElementById('btn-open-camera');
    const videoFeed = document.getElementById('camera-feed');
    const scanAnimation = document.getElementById('scan-animation');
    const cameraPlaceholder = document.getElementById('camera-placeholder');
    window.currentStream = null;

    if (btnOpenCamera) {
        btnOpenCamera.addEventListener('click', async () => {
            if (window.currentStream) return;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "environment" } 
                });
                
                window.currentStream = stream;
                videoFeed.srcObject = stream;
                
                videoFeed.classList.remove('hidden');
                scanAnimation.classList.remove('hidden');
                cameraPlaceholder.classList.add('hidden');
                
                btnOpenCamera.textContent = document.body.classList.contains('lang-zh') ? '掃描中...' : 'Scanning...';
                btnOpenCamera.classList.add('opacity-50', 'cursor-not-allowed');
                
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

            const currentUid = (typeof guestData !== 'undefined' && guestData && guestData.uid) ? guestData.uid : 'unknown_user';
            
            const n = new Date();
            const pad = num => String(num).padStart(2, '0');
            const timestamp = `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;

            const feedbackPayload = { uid: currentUid, datetime: timestamp, user_input: fbText };
            
            fbBtn.disabled = true;
            fbBtn.innerHTML = '<span class="text-sm font-bold">Sending...</span>';

            try {
                const { error } = await db.from('feedback').insert([feedbackPayload]);
                
                if (error) {
                    console.error("Supabase rejected the insert:", error);
                    alert(`Database Error: ${error.message}`);
                    fbBtn.disabled = false;
                    fbBtn.innerHTML = '<span data-i18n="settings_feedback_submit">Submit</span>';
                    return; 
                }
                
                fbTextEl.value = '';
                document.getElementById('feedback-modal').classList.remove('flex');
                document.getElementById('feedback-modal').classList.add('hidden');
                document.getElementById('settings-modal').classList.remove('hidden');
                document.getElementById('settings-modal').classList.add('flex');
                
                const toast = document.createElement('div');
                toast.className = 'fixed top-10 left-1/2 transform -translate-x-1/2 bg-green-100 border-2 border-green-600 text-green-800 px-4 py-2 rounded-lg shadow-xl z-[100] font-bold text-sm transition-opacity duration-500';
                toast.innerText = 'Thank you! Your feedback has been sent.';
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 500);
                }, 3000);
                
            } catch (err) {
                console.error("JavaScript caught an error during insert:", err);
                alert("Something went wrong. Check console.");
            } finally {
                fbBtn.disabled = false;
                fbBtn.innerHTML = '<span data-i18n="settings_feedback_submit">Submit</span>';
            }
        });
    }
});
