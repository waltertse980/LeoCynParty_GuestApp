document.addEventListener('DOMContentLoaded', () => {
    const btnOpenCamera = document.getElementById('btn-open-camera');
    const cameraFeed = document.getElementById('camera-feed');
    const scanAnimation = document.getElementById('scan-animation');
    const cameraPlaceholder = document.getElementById('camera-placeholder');

    let scanning = false;

    if (!btnOpenCamera) return;

    btnOpenCamera.addEventListener('click', async () => {
        // 1. Update UI
        cameraPlaceholder.classList.add('hidden');
        btnOpenCamera.classList.add('hidden');
        cameraFeed.classList.remove('hidden');
        scanAnimation.classList.remove('hidden');

        try {
            // 2. Request back-facing camera
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            
            cameraFeed.srcObject = stream;
            cameraFeed.setAttribute("playsinline", true); // Required for iOS Safari
            cameraFeed.play();
            
            scanning = true;
            requestAnimationFrame(tick);
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access the camera. Please check your device permissions.");
            
            // Revert UI on failure
            cameraPlaceholder.classList.remove('hidden');
            btnOpenCamera.classList.remove('hidden');
            cameraFeed.classList.add('hidden');
            scanAnimation.classList.add('hidden');
        }
    });

    function tick() {
        if (!scanning) return;

        // Ensure video is playing and has loaded data
        if (cameraFeed.readyState === cameraFeed.HAVE_ENOUGH_DATA) {
            // Create a hidden canvas to grab the current video frame
            const canvas = document.createElement("canvas");
            canvas.width = cameraFeed.videoWidth;
            canvas.height = cameraFeed.videoHeight;
            const ctx = canvas.getContext("2d");
            
            ctx.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // 3. Pass frame to jsQR
            const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            // If a QR code is detected
            if (code) {
                console.log("QR Code Scanned:", code.data);
                handleSuccessfulScan(code.data);
                return; // Stop the loop
            }
        }
        
        // Keep looping if nothing found yet
        requestAnimationFrame(tick);
    }

    async function handleSuccessfulScan(qrData) {
        // 1. Stop the scanning loop
        scanning = false;
        
        // 2. Grab all the UI elements we need to reset
        const scanAnimation = document.getElementById('scan-animation');
        const cameraFeed = document.getElementById('camera-feed');
        const cameraPlaceholder = document.getElementById('camera-placeholder');
        const btnOpenCamera = document.getElementById('btn-open-camera');

        // 3. Stop the camera tracks and clear the global stream lock
        if (window.currentStream) {
            window.currentStream.getTracks().forEach(track => track.stop());
            window.currentStream = null; // Frees the lock so it can be opened again!
        } else if (cameraFeed && cameraFeed.srcObject) {
            cameraFeed.srcObject.getTracks().forEach(track => track.stop());
        }

        // 4. RESET THE UI: Hide video, show placeholder, reset button
        if (scanAnimation) scanAnimation.classList.add('hidden');
        if (cameraFeed) cameraFeed.classList.add('hidden');
        if (cameraPlaceholder) cameraPlaceholder.classList.remove('hidden');
        if (btnOpenCamera) {
            btnOpenCamera.classList.remove('hidden', 'opacity-50', 'cursor-not-allowed');
            btnOpenCamera.textContent = btnOpenCamera.getAttribute('data-original-text') || "SCAN QR"; 
        }

        try {
            // 5. Directly access global variables (do not use window. prefix for let/const)
            if (typeof guestData === 'undefined' || !guestData || !guestData.uid) {
                console.error("Guest data is missing from scope!");
                return;
            }
            if (typeof db === 'undefined' || !db) {
                console.error("Database client (db) is missing from scope!");
                return;
            }

            const currentUid = guestData.uid;
            const now = new Date().toISOString();
            console.log('DB Update: Check-in! Scanned Station = ' + qrData);

            // 6. Update Mobile App's own status table
            const { error: statusErr } = await db.from('status')
                .update({ checkintime: now, stationqr: qrData })
                .eq('uid', currentUid);

            if (statusErr) throw statusErr;

            // 7. WAKE UP THE IPAD (reception table)
            const { error: receptionErr } = await db.from('reception')
                .update({ uid: currentUid, time: now })
                .eq('stationqr', qrData);

            if (receptionErr) {
                // Fallback: Upsert if the row doesn't exist
                await db.from('reception').upsert({ 
                    stationqr: qrData, 
                    uid: currentUid, 
                    time: now 
                });
            }

            // 8. Update local guest memory
            guestData.checkintime = now;
            guestData.stationqr = qrData;
            
            // 9. Update UI (Assuming you have this function in ui.js)
            if (typeof updateStatusCard === 'function') updateStatusCard();
            
            alert("Check-in Successful!");

        } catch (err) {
            console.error('Scan handling crashed:', err);
            alert('Could not sync scan with database. Please try again.');
        }
    }

});
