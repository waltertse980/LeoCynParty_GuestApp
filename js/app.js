document.addEventListener('DOMContentLoaded', async function() {
    // --- SPLASH SCREEN LOGIC (Wrapped in a Promise so we can await it) ---
    const splashScreen = document.getElementById('splash-screen');
    const splashImage = document.getElementById('splash-image');

    const playSplashScreen = new Promise((resolve) => {
        // Check if we already played the splash screen this session
        if (sessionStorage.getItem('splashPlayed')) {
            // Already played: hide it instantly so they can use the app
            if (splashScreen) splashScreen.style.display = 'none';
            resolve(); // Immediately move on to app logic
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
                    resolve(); // Animation complete, move on to app logic
                }, 5000); 
            } else {
                resolve(); // Failsafe if HTML elements are missing
            }
        }
    });

    // 🛑 WAIT FOR SPLASH SCREEN TO FINISH BEFORE DOING ANYTHING ELSE 🛑
    await playSplashScreen;

    // Initial Language Detect
    const userLang = (navigator.language || navigator.userLanguage || "").toLowerCase();
    if (userLang.includes('en')) setLanguage('en');
    else setLanguage('zh');

    // 1. Run initial login check
    // If they are logged in, this will show the app. If not, it shows the login screen.
    checkExistingLogin();

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
            // If camera is already running, do nothing (or change this to stop the camera)
            if (window.currentStream) return;

            try {
                // 1. Request Camera Access from the browser (preferring the back camera)
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "environment" } 
                });
                
                // 2. If allowed, connect the stream to the <video> element
                window.currentStream = stream;
                videoFeed.srcObject = stream;
                
                // 3. Update the UI to show the video and hide the placeholder
                videoFeed.classList.remove('hidden');
                scanAnimation.classList.remove('hidden');
                cameraPlaceholder.classList.add('hidden');
                
                // Change button text to indicate it's scanning
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
                console.error("JavaScript caught an error during insert:", err);
                alert("Something went wrong. Check console.");
            } finally {
                fbBtn.disabled = false;
                fbBtn.innerHTML = '<span data-i18n="settings_feedback_submit">Submit</span>';
            }
        });
    }
});
