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
        // 1. Instantly stop the scanning loop and hide animations
        scanning = false;
        const scanAnimation = document.getElementById('scan-animation');
        if (scanAnimation) scanAnimation.classList.add('hidden');
        
        // 2. Shut off the camera hardware to prevent freezing
        const cameraFeed = document.getElementById('camera-feed');
        if (cameraFeed && cameraFeed.srcObject) {
            cameraFeed.srcObject.getTracks().forEach(track => track.stop());
        }

        try {
            // 3. Safely grab the global variables
            const currentUid = (typeof window.guestData !== 'undefined' && window.guestData) ? window.guestData.uid : null;
            if (!currentUid) {
                console.error("Guest data not found in global scope.");
                return;
            }

            const now = new Date().toISOString();
            console.log('DB Update: Check-in! Scanned Station = ' + qrData);

            // 4. Update Mobile App's own record (status table)
            const { error: statusErr } = await window.db.from('status')
                .update({ checkintime: now, stationqr: qrData })
                .eq('uid', currentUid);

            if (statusErr) throw statusErr;

            // 5. WAKE UP THE IPAD (reception table)
            // The iPad specifically listens for an UPDATE event on this table 
            // matching its current station ID.
            const { error: receptionErr } = await window.db.from('reception')
                .update({ uid: currentUid, time: now })
                .eq('stationqr', qrData);

            if (receptionErr) {
                // Fallback: Upsert if the iPad somehow hasn't created the row yet
                await window.db.from('reception').upsert({ 
                    stationqr: qrData, 
                    uid: currentUid, 
                    time: now 
                });
            }

            // 6. Update local guest memory
            window.guestData.checkintime = now;
            window.guestData.stationqr = qrData;
            
            // 7. Update UI and return to the main tab
            if (typeof window.updateStatusCard === 'function') window.updateStatusCard();
            
            // Simulate a click on the Home tab to transition the user away from the camera screen
            const homeTabBtn = document.getElementById('tab-btn-home'); // Update ID if your tab trigger differs
            if (homeTabBtn) homeTabBtn.click();

        } catch (err) {
            console.error('Scan handling crashed:', err);
            alert('Could not sync scan with database. Please try again.');
        }
    }
});
