// === Inisialisasi DOM & state ===
const video = document.getElementById('video');
const toggleBtn = document.getElementById('toggle-camera');
const captureBtn = document.getElementById("capture-photo");
const countdownText = document.getElementById("countdown-text");
const snapshotCanvas = document.getElementById("snapshot-canvas");
const landmarkCanvas = document.getElementById("landmark-canvas");
const cameraPlaceholder = document.getElementById("camera-placeholder");
const closeBtn = document.getElementById("close-preview");
const hurufButtons = document.querySelectorAll('.huruf-section .huruf-btn');
const ctx = snapshotCanvas.getContext("2d");
const lctx = landmarkCanvas.getContext("2d");

let stream = null;
let isCameraOn = false;
let mpCamera = null;
let hurufDipilih = null;
let isPredicting = false;
let isCheckingKeypoints = false;
let keypointCheckCallback = null

// === MediaPipe Setup ===
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
hands.onResults(onResults);

async function onResults(results) {
  lctx.save();
  lctx.clearRect(0, 0, landmarkCanvas.width, landmarkCanvas.height);
  lctx.drawImage(results.image, 0, 0, landmarkCanvas.width, landmarkCanvas.height);

  if (results.multiHandLandmarks) {
    for (const landmarks of results.multiHandLandmarks) {
      drawConnectors(lctx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
      drawLandmarks(lctx, landmarks, { color: '#FF0000', lineWidth: 1 });
    }
  }

  lctx.restore();

  // Validasi sebelum countdown
  if (isCheckingKeypoints && typeof keypointCheckCallback === 'function') {
    isCheckingKeypoints = false;
    keypointCheckCallback(results.multiHandLandmarks && results.multiHandLandmarks.length > 0);
  }

  // Setelah snapshot → prediksi
  if (isPredicting) {
    isPredicting = false;

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      alert("Gagal memproses gambar: tidak ada tangan yang terdeteksi.");

      // Reset tampilan snapshot
      closeBtn.style.display = "none";
      snapshotCanvas.style.display = "none";
      resetPredictionButtons();

      // Aktifkan tombol lagi
      captureBtn.disabled = false;
      captureBtn.classList.remove("disabled");
      toggleBtn.disabled = false;
      toggleBtn.classList.remove("disabled");

      // Tampilkan ulang kamera
      video.style.display = "block";
      landmarkCanvas.style.display = "block";
      cameraPlaceholder.style.display = "none";

      // 🔁 Restart MediaPipe camera jika perlu
      if (!mpCamera) {
        mpCamera = new Camera(video, {
          onFrame: async () => {
            await hands.send({ image: video });
          },
          width: video.videoWidth,
          height: video.videoHeight
        });
      }
      mpCamera.start();

      return;
    }

    // Jika ada tangan → Lanjut stop kamera dan tampilkan snapshot
    stopCamera();
    video.style.display = "none";
    landmarkCanvas.style.display = "none";
    cameraPlaceholder.style.display = "none";
    snapshotCanvas.style.display = "block";
    closeBtn.style.display = "block";
    captureBtn.disabled = true;
    captureBtn.classList.add("disabled");
    toggleBtn.disabled = true;
    toggleBtn.classList.add("disabled");

    predictLandmarkAndDisplayResult(results);
  }
}

function extractKeypointsFromResults(results) {
  let keypoints = [];

  if (results.multiHandLandmarks) {
    const handsData = [];

    for (const handLandmarks of results.multiHandLandmarks.slice(0, 2)) {
      const coords = handLandmarks.map(lm => [lm.x, lm.y, lm.z]);
      const xAvg = coords.reduce((sum, val) => sum + val[0], 0) / coords.length;
      handsData.push([xAvg, coords.flat()]);
    }

    // Urutkan tangan dari kiri (x kecil) ke kanan (x besar)
    handsData.sort((a, b) => a[0] - b[0]);

    for (const [, flat] of handsData) {
      keypoints.push(flat);
    }
  }

  while (keypoints.length < 2) {
    keypoints.push(new Array(21 * 3).fill(0));
  }

  return keypoints.flat();
}


async function predictLandmarkAndDisplayResult(results) {
  const keypoints = extractKeypointsFromResults(results);

  try {
    const res = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keypoints: keypoints })
    });

    const data = await res.json();
    if (data.prediction) {
      highlightPrediction(data.prediction);
      console.log("Prediksi:", data.prediction, "Confidence:", data.confidence.toFixed(2));
    } else {
      alert("Prediksi gagal: " + (data.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Fetch error:", err);
    alert("Gagal terhubung ke server prediksi");
  }
}

function highlightPrediction(huruf) {
  console.log("Highlight:", huruf);
  const hasilButtons = document.querySelectorAll('.hasil-buttons .huruf-btn');
  hasilButtons.forEach(btn => {
    console.log("Comparing", btn.textContent, huruf);
    if (btn.textContent.toLowerCase() === huruf.toLowerCase()) {
      btn.classList.add('active');
      console.log("✔ Button activated:", btn.textContent);
    } else {
      btn.classList.remove('active');
    }
  });
}

function resetPredictionButtons() {
  const hasilButtons = document.querySelectorAll('.hasil-buttons .huruf-btn');
  hasilButtons.forEach(btn => btn.classList.remove('active'));

  hurufButtons.forEach(btn => btn.classList.remove('active'));
  hurufDipilih = null;
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15, max: 20 }
      }
    });

    video.srcObject = stream;

    video.onloadedmetadata = async () => {
      const width = video.videoWidth;
      const height = video.videoHeight;

      landmarkCanvas.width = width;
      landmarkCanvas.height = height;
      snapshotCanvas.width = width;
      snapshotCanvas.height = height;

      await video.play();

      video.style.display = "block";
      landmarkCanvas.style.display = "block";
      cameraPlaceholder.style.display = "none";

      mpCamera = new Camera(video, {
        onFrame: async () => {
          await hands.send({ image: video });
        },
        width,
        height
      });

      mpCamera.start();

      isCameraOn = true;
      toggleBtn.textContent = "Stop Kamera";
      toggleBtn.classList.add("btn-stop");
      toggleBtn.classList.remove("btn-start");
    };

  } catch (err) {
    alert("Gagal membuka kamera: " + err.message);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    stream = null;
  }

  if (mpCamera) {
    mpCamera.stop();
    mpCamera = null;
  }

  isCameraOn = false;
  toggleBtn.textContent = "Buka Kamera";
  toggleBtn.classList.add("btn-start");
  toggleBtn.classList.remove("btn-stop");

  video.style.display = "none";
  landmarkCanvas.style.display = "none";
  cameraPlaceholder.style.display = "block";
}

toggleBtn.addEventListener("click", () => {
  if (isCameraOn) {
    stopCamera();
  } else {
    startCamera();
  }
});

captureBtn.addEventListener("click", () => {
  if (!stream) {
    alert("Kamera belum aktif!");
    return;
  }

  // Mulai proses pengecekan tangan
  isCheckingKeypoints = true;
  keypointCheckCallback = (foundKeypoints) => {
    if (!foundKeypoints) {
      alert("Tidak terdeteksi tangan. Pastikan tangan terlihat jelas di kamera.");
      return;
    }

    // Jika tangan terdeteksi → lanjut countdown dan snapshot
    let countdown = 3;
    countdownText.textContent = `Akan mengambil gambar dalam ${countdown}...`;

    const countdownInterval = setInterval(async () => {
      countdown--;
      if (countdown > 0) {
        countdownText.textContent = `Akan mengambil gambar dalam ${countdown}...`;
      } else {
        clearInterval(countdownInterval);
        countdownText.textContent = "";

        // Ambil snapshot
        ctx.drawImage(video, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

        // Jangan stop kamera dulu, tunggu hasil prediksi
        isPredicting = true;
        await hands.send({ image: snapshotCanvas });
      }
    }, 1000);
  };
});

closeBtn.addEventListener("click", async () => {
  closeBtn.style.display = "none";
  snapshotCanvas.style.display = "none";

  resetPredictionButtons(); // 🔥 Reset tombol prediksi & pilihan huruf

  await startCamera();

  captureBtn.disabled = false;
  captureBtn.classList.remove("disabled");
  toggleBtn.disabled = false;
  toggleBtn.classList.remove("disabled");
});


hurufButtons.forEach(button => {
  button.addEventListener('click', () => {
    hurufButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    hurufDipilih = button.textContent;
    console.log('Huruf yang dipilih untuk diprediksi:', hurufDipilih);
  });
});
