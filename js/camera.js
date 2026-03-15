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

    function handleSuccessfulScan(qrData) {
        scanning = false;
        
        // Stop animation
        scanAnimation.classList.add('hidden');
        
        // Stop the camera stream to save battery and turn off the green light
        const stream = cameraFeed.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // =====================================
        // CHECK-IN & STATION LOGIC HAPPENS HERE
        // =====================================
        
        alert("Success! Scanned: " + qrData);
        
        // Example logic:
        // if (qrData === "GUEST_CHECK_IN") {
        //    // Update Supabase to mark guest as checked in
        // } else if (qrData === "STATION_1") {
        //    // Update mission progress
        // }
    }
});
