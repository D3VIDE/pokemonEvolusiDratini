var groundGreen = [0.4, 0.8, 0.4, 1.0];
var earWhite = [0.9, 0.9, 1.0, 1.0];
var crystalBlue = [0.23, 0.3, 0.79, 1.0];
var SKY_COLOR = [0.53, 0.81, 0.92, 1.0];
var GROUND_Y = -3.5;

// [MODIFIED] Konstanta Kamera Dratini
const DRATINI_SIDE_DIST = 20.0; // Jarak standar POV samping Dratini (Diperbanyak)
const DRATINI_SIDE_HEIGHT = 5.0; 
const DRATINI_FLAME_ZOOM_OUT_DIST = 50.0; // Jarak maksimum saat zoom-out (Diperbanyak)

function SceneNode(buffers, localMatrix) {
  this.buffers = buffers;
  this.localMatrix = localMatrix || new Matrix4();
  this.worldMatrix = new Matrix4();
  this.children = [];
  this.enabled = true; // Ditambahkan untuk kontrol Flamethrower/lainnya
}

function drawSceneGraph(gl, programInfo, node, parentWorldMatrix, viewMatrix, projMatrix, mvpMatrix, oriPointBuffers) {
  node.worldMatrix.set(parentWorldMatrix).multiply(node.localMatrix);
  
  // Hanya gambar jika node di-enable
  if (node.enabled !== false) {
      if (node.buffers) {
        drawPart(gl, programInfo, node.buffers, node.worldMatrix, viewMatrix, projMatrix, mvpMatrix);
      }
      if (oriPointBuffers) {
        var oriMatrix = new Matrix4(node.worldMatrix).scale(0.5, 0.5, 0.5);
        drawPart(gl, programInfo, oriPointBuffers, oriMatrix, viewMatrix, projMatrix, mvpMatrix);
      }
      for (var i = 0; i < node.children.length; i++) {
        drawSceneGraph(gl, programInfo, node.children[i], node.worldMatrix, viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
      }
  }
}

// =================================================================
// FUNGSI UTAMA (MAIN)
// =================================================================

function main() {
  var canvas = document.getElementById("webgl");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  var gl = canvas.getContext("webgl");
  if (!gl) {
    console.log("Gagal mendapatkan konteks WebGL");
    return;
  }

  var vsSource = document.getElementById("shader-vs").innerText;
  var fsSource = document.getElementById("shader-fs").innerText;
  var shaderProgram = initShaders(gl, vsSource, fsSource);
  if (!shaderProgram) return;

  var programInfo = {
    program: shaderProgram,
    a_Position: gl.getAttribLocation(shaderProgram, "a_Position"),
    a_Color: gl.getAttribLocation(shaderProgram, "a_Color"),
    u_MvpMatrix: gl.getUniformLocation(shaderProgram, "u_MvpMatrix"),
  };

  var worldBounds = 400;

  var myDragonair = new Dragonair(gl, programInfo);
  myDragonair.init();
  myDragonair.position = [10, 0, 0];
  myDragonair.animationState = "DYNAMIC_IDLE";

  var myDratini = new DratiniModel(gl, programInfo);
  myDratini.init();
  myDratini.position = [-20, 0, -10];

  var myDragonite = new Dragonite(gl, programInfo);
  myDragonite.init();
  myDragonite.position = [0, 13, -9];

  var myWorld = new WorldEnvironment(gl, programInfo);
  myWorld.init();

  window.myWorld = myWorld;
  window.myDragonair = myDragonair;
  window.myDratini = myDratini; // Buat global untuk akses di console

  myDragonair.setObstacles(myWorld.obstacles);

  var oriPointGeo = createSphere(0.1, 8, 8, [1.0, 0.0, 0.0, 1.0]);
  var oriPointBuffers = initBuffers(gl, programInfo, oriPointGeo);

  var projMatrix = new Matrix4();
  var viewMatrix = new Matrix4();
  var mvpMatrix = new Matrix4();

  projMatrix.setPerspective(45, canvas.width / canvas.height, 1, 1000);

  // --- KAMERA ---
  let cameraAngleX = 20.0;
  let cameraAngleY = 0.0;
  let cameraDistance = 45.0;
  let cameraTarget = [0.0, 5.0, 0.0];
  let cameraPosition = [0.0, 0.0, 0.0];

  let isEatingCamActive = false;
  let isFruitCamActive = false;
  let isDragonairPovActive = false;
  
  // [BARU] Variabel Kamera Khusus
  let isDratiniPovActive = false;
  let isDragonitePovActive = false;
  let isDratiniSkillCamActive = false; // BARU: Untuk Cinematic Flamethrower/Tackle

  // --- VARIABEL CINEMATIC ---
  let isCinematicActive = false;
  let cinematicAngle = 0;
  let cinematicTargetObj = null;

  let isPaused = false;

  var currentScenario = "STATIC_IDLE";
  var isTransitioningCamera = false;

  let isDragging = false;
  let lastMouseX = -1,
    lastMouseY = -1;
  const mouseSensitivity = 0.3;
  const moveSpeed = 0.5;
  let keysPressed = {};

  // Variabel Timer Kamera Awal
  let cameraStartTimer = 0.0;
  let animationTimerID = null;
  
  // Fungsi Reset Kamera POV
  function resetCameraPov() {
      isDragonairPovActive = false;
      isDratiniPovActive = false;
      isDragonitePovActive = false;
      isEatingCamActive = false;
      isFruitCamActive = false;
      isCinematicActive = false;
      isPaused = false;
      isDratiniSkillCamActive = false; // BARU: Reset skill cam
  }

  function updateCamera() {
    let radX = (cameraAngleX * Math.PI) / 180.0;
    let radY = (cameraAngleY * Math.PI) / 180.0;
    cameraPosition[0] = cameraTarget[0] + cameraDistance * Math.sin(radY) * Math.cos(radX);
    cameraPosition[1] = cameraTarget[1] + cameraDistance * Math.sin(radX);
    cameraPosition[2] = cameraTarget[2] + cameraDistance * Math.cos(radY) * Math.cos(radX);
    viewMatrix.setLookAt(cameraPosition[0], cameraPosition[1], cameraPosition[2], cameraTarget[0], cameraTarget[1], cameraTarget[2], 0, 1, 0);
  }
  updateCamera();

  // --- EVENT LISTENERS ---
  canvas.onmousedown = function (ev) {
    let x = ev.clientX,
      y = ev.clientY;
    let rect = ev.target.getBoundingClientRect();
    if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
      lastMouseX = x;
      lastMouseY = y;
      isDragging = true;
    }
  };
  canvas.onmouseup = function (ev) {
    isDragging = false;
  };
  canvas.onmouseleave = function (ev) {
    isDragging = false;
  };
  canvas.onmousemove = function (ev) {
    if ((isEatingCamActive || isFruitCamActive || isDragonairPovActive || isDratiniPovActive || isDragonitePovActive || isCinematicActive || isDratiniSkillCamActive) && !isPaused) return;

    if (!isDragging) return;
    let x = ev.clientX,
      y = ev.clientY;
    let deltaX = x - lastMouseX;
    let deltaY = y - lastMouseY;
    cameraAngleY += deltaX * mouseSensitivity;
    cameraAngleX -= deltaY * mouseSensitivity;
    cameraAngleX = Math.max(-89.0, Math.min(89.0, cameraAngleX));
    lastMouseX = x;
    lastMouseY = y;
    updateCamera();
  };
  canvas.onwheel = function (ev) {
    if ((isEatingCamActive || isFruitCamActive || isDragonairPovActive || isDratiniPovActive || isDragonitePovActive || isCinematicActive || isDratiniSkillCamActive) && !isPaused) return;
    ev.preventDefault();
    let zoomSensitivity = 0.05;
    cameraDistance += ev.deltaY * zoomSensitivity;
    cameraDistance = Math.max(5.0, Math.min(200.0, cameraDistance));
    updateCamera();
  };

  document.onkeydown = function (ev) {
    let key = ev.key.toLowerCase();
    keysPressed[key] = true;

    // Tombol P untuk Pause/Unpause
    if (key === "p") {
      isPaused = !isPaused;
      console.log("Freeze Mode:", isPaused);
      return; // Jangan jalankan aksi lain saat tombol P
    }
    
    // =================================================================
    // NEW CAMERA SHORTCUTS (1, 2, 3)
    // =================================================================
    if (key === "1") {
      resetCameraPov();
      isDratiniPovActive = true;
      console.log("Kamera POV: Dratini (Samping)");
    }

    if (key === "2") {
      resetCameraPov();
      isDragonairPovActive = true;
      console.log("Kamera POV: Dragonair");
    }
    
    if (key === "3") {
      resetCameraPov();
      isDragonitePovActive = true;
      console.log("Kamera POV: Dragonite");
    }
    
    // =================================================================
    // SHORTCUT Q (TIDAK BERUBAH - POV DRAGONAIR)
    // =================================================================
    if (key === "q") {
      resetCameraPov();
      isDragonairPovActive = true;
      console.log("Kamera POV: Dragonair (Shortcut Q)");
    }
    
    // =================================================================
    // SHORTCUT R (TOGGLE CLIMBING)
    // =================================================================
    if (key === "r") {
        if (!myDragonite.isClimbing) {
            console.log("Mulai Memanjat Gunung!");
            myDragonite.startClimbing();
            resetCameraPov();
            isCinematicActive = true;
            cinematicAngle = 45;
            cinematicTargetObj = myDragonite;
        } else {
            console.log("Menghentikan Animasi Memanjat.");
            myDragonite.stopClimbing();
            isCinematicActive = false; // Kembali ke free cam
            cinematicTargetObj = null;
        }
    }
    
    // =================================================================
    // SHORTCUT E (DRATINI FLAMETHROWER) - Memicu Cinematic
    // =================================================================
    if (key === "e") {
      myDratini.startFlamethrower();
      resetCameraPov();
      isDratiniPovActive = false; // Pastikan POV standar mati
      isDratiniSkillCamActive = true; // AKTIFKAN CINEMATIC
      console.log("Dratini: Flamethrower Ditembakkan! Cinematic aktif.");
    }
    
    // =================================================================
    // SHORTCUT T (DRATINI TACKLE) - Memicu Cinematic
    // =================================================================
    if (key === "t") {
      myDratini.startTackle();
      resetCameraPov();
      isDratiniPovActive = false; // Pastikan POV standar mati
      isDratiniSkillCamActive = true; // AKTIFKAN CINEMATIC (akan ditangani di tick())
      console.log("Dratini: Tackle Ditembakkan! Cinematic aktif.");
    }
    
    // =================================================================
    // SHORTCUT G (TIDAK DIPAKAI/GANTI)
    // =================================================================
    if (key === "g") {
      console.log("Tombol G sekarang digantikan oleh Tombol R untuk aksi Dragonite.");
    }
    
    // Tombol F untuk Cinematic Fruit Drop (Tetap sama)
    if (key === "f") {
      if (!isCinematicActive) {
        // Logika Drop Fruit Dragonair
        currentScenario = "DRAGONAIR_ANIMATION";
        if (animationTimerID) clearTimeout(animationTimerID);

        resetCameraPov(); // Reset semua kamera
        isPaused = false;

        let targetTree = myWorld.allTrees.find((t) => Math.abs(t.position[0] - 60) < 1.0 && Math.abs(t.position[2] - 50) < 1.0);
        if (!targetTree) targetTree = myWorld.allTrees[1];
        myWorld.dropFruit(0, 0, targetTree);

        let fPos = myWorld.fruitState.pos;
        myDragonair.targetFruitPosition = [fPos[0], fPos[2]];

        myDragonair.animationState = "WAITING";
        myDragonair.stateTimer = 0;
        
        // Aktifkan Fruit Cam Otomatis
        isFruitCamActive = true;
        
        console.log("Buah Jatuh! Dragonair Menunggu...");
      }
    }
    
    // Tombol 0 untuk Reset/Free Cam
    if (key === "0") {
        resetCameraPov();
        cameraTarget = [0.0, 5.0, 0.0];
        cameraDistance = 45.0;
        updateCamera();
        console.log("Kamera Reset ke Free Cam Default");
    }
    
  };
  document.onkeyup = function (ev) {
    keysPressed[ev.key.toLowerCase()] = false;
  };

  window.onresize = function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    projMatrix.setPerspective(45, canvas.width / canvas.height, 1, 1000);
  };

  gl.clearColor(SKY_COLOR[0], SKY_COLOR[1], SKY_COLOR[2], SKY_COLOR[3]);
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(shaderProgram);

  var g_lastTickTime = Date.now();
  var groundY = GROUND_Y_LEVEL;

  var tick = function () {
    let now = Date.now();
    let elapsed = now - g_lastTickTime;
    g_lastTickTime = now;
    let dt = elapsed / 1000.0;

    gl.viewport(0, 0, canvas.width, canvas.height);

    cameraStartTimer += dt;

    // =================================================================
    // LOGIKA KAMERA (Diperbarui)
    // =================================================================
    
    // --- Prioritas 1: DRATINI SKILL CINEMATIC CAMERA (E atau T) ---
    if (isDratiniSkillCamActive) {
        let dPos = myDratini.position;
        let dRotY = myDratini.globalRotationY || 0;
        
        let maxDuration;
        if (myDratini.animationState === 'FLAMETHROWER' || myDratini.animationState === 'FLAMETHROWER_PREP') {
            maxDuration = myDratini.prepDuration + myDratini.flameDuration;
        } else if (myDratini.animationState === 'TACKLE') {
            maxDuration = myDratini.tackleDuration;
        } else {
             // Selesai skill, matikan cinematic
             isDratiniSkillCamActive = false;
             isDratiniPovActive = true; // Kembali ke POV samping standar
             console.log("Cinematic Dratini Skill selesai. Kembali ke Dratini POV.");
             // Lanjutkan ke logika berikutnya (POV Pokémon Aktif)
        }
        
        if (isDratiniSkillCamActive) {
            let lerpSpeed = 5.0 * dt;
            let zoomProgress = myDratini.stateTimer;
            let currentDist;
            
            // Logika zoom: Awal (dekat) -> Tengah (jauh) -> Akhir (dekat)
            let halfDuration = maxDuration / 2;
            if (zoomProgress < halfDuration) {
                let progress = zoomProgress / halfDuration;
                currentDist = DRATINI_SIDE_DIST + (DRATINI_FLAME_ZOOM_OUT_DIST - DRATINI_SIDE_DIST) * progress;
            } else {
                let returnProgress = zoomProgress - halfDuration;
                let progress = returnProgress / halfDuration;
                currentDist = DRATINI_FLAME_ZOOM_OUT_DIST - (DRATINI_FLAME_ZOOM_OUT_DIST - DRATINI_SIDE_DIST) * progress;
            }
            
            currentDist = Math.max(DRATINI_SIDE_DIST, Math.min(DRATINI_FLAME_ZOOM_OUT_DIST, currentDist));
            
            // Target: Fokus di kepala Dratini
            let lookX = dPos[0]; 
            let lookY = dPos[1] + 1.5; 
            let lookZ = dPos[2];
            
            // Posisi Kamera: 90 derajat ke samping (kanan Dratini)
            let sideAngle = (dRotY - 90) * Math.PI / 180.0;
            
            let camX = lookX + Math.sin(sideAngle) * currentDist;
            let camY = lookY + DRATINI_SIDE_HEIGHT;
            let camZ = lookZ + Math.cos(sideAngle) * currentDist;

            // Lerp untuk transisi halus
            cameraPosition[0] += (camX - cameraPosition[0]) * lerpSpeed;
            cameraPosition[1] += (camY - cameraPosition[1]) * lerpSpeed;
            cameraPosition[2] += (camZ - cameraPosition[2]) * lerpSpeed;
            
            cameraTarget[0] += (lookX - cameraTarget[0]) * lerpSpeed;
            cameraTarget[1] += (lookY - cameraTarget[1]) * lerpSpeed;
            cameraTarget[2] += (lookZ - cameraTarget[2]) * lerpSpeed;

            viewMatrix.setLookAt(cameraPosition[0], cameraPosition[1], cameraPosition[2], cameraTarget[0], cameraTarget[1], cameraTarget[2], 0, 1, 0);
        }
    }
    
    // --- Prioritas 2: POV Pokémon Aktif (1, 2, 3, Q) ---
    else if (isDratiniPovActive || isDragonairPovActive || isDragonitePovActive) {
        
        let targetObject = null;
        let camDist = 25.0;
        let camHeight = 14.0;
        let lookDist = 15.0;
        let lookOffset = 2.0;
        let isSideView = false;
        
        if (isDratiniPovActive) {
            targetObject = myDratini;
            isSideView = true;
            camDist = DRATINI_SIDE_DIST; // 20.0
            camHeight = DRATINI_SIDE_HEIGHT; // 5.0
            lookOffset = 1.0;
        } else if (isDragonairPovActive) {
            targetObject = myDragonair;
            camDist = 25.0;
            camHeight = 14.0;
            lookDist = 15.0;
            lookOffset = 2.0;
        } else if (isDragonitePovActive) {
            targetObject = myDragonite;
            camDist = 25.0;
            camHeight = 20.0;
            lookDist = 15.0;
            lookOffset = 5.0;
        }

        if (targetObject) {
            let dPos = targetObject.position;
            let dRotY = targetObject.globalRotationY || 0;
            let radAngle = (dRotY * Math.PI) / 180.0;
            
            if (isSideView) {
                // LOGIKA POV SAMPING (Dratini - 1)
                let sideAngle = (dRotY - 90) * Math.PI / 180.0;

                cameraPosition[0] = dPos[0] + Math.sin(sideAngle) * camDist;
                cameraPosition[1] = dPos[1] + camHeight;
                cameraPosition[2] = dPos[2] + Math.cos(sideAngle) * camDist;
                
                // Titik Fokus (Di tengah badan)
                cameraTarget[0] = dPos[0];
                cameraTarget[1] = dPos[1] + lookOffset;
                cameraTarget[2] = dPos[2];
            } else {
                // LOGIKA POV BELAKANG (Dragonair, Dragonite)
                cameraPosition[0] = dPos[0] - Math.sin(radAngle) * camDist;
                cameraPosition[1] = dPos[1] + camHeight;
                cameraPosition[2] = dPos[2] - Math.cos(radAngle) * camDist;
                
                cameraTarget[0] = dPos[0] + Math.sin(radAngle) * lookDist;
                cameraTarget[1] = dPos[1] + lookOffset;
                cameraTarget[2] = dPos[2] + Math.cos(radAngle) * lookDist;
            }
            
            viewMatrix.setLookAt(cameraPosition[0], cameraPosition[1], cameraPosition[2], cameraTarget[0], cameraTarget[1], cameraTarget[2], 0, 1, 0);
        }
    }
    // --- Prioritas 3: GENERIC CINEMATIC CAMERA (R - Dragonite Climb) ---
    else if (isCinematicActive && cinematicTargetObj) {
        // ... (Logika Cinematic Climb tetap sama)
        let radius = 32.0; 
        let camHeightOffset = 0.5; 
        let rotateSpeed = 60.0; 

        if (cinematicTargetObj.isClimbing) {
            let progress = Math.min(1.0, cinematicAngle / 300.0);
            let startDist = 10.0; 
            let endDist = 90.0; 
            radius = startDist + (endDist - startDist) * progress;
            let startHeight = 5.0;
            let endHeight = 40.0; 
            camHeightOffset = startHeight + (endHeight - startHeight) * progress;
            rotateSpeed = 45.0; 
        }

        cinematicAngle += rotateSpeed * dt;
        let targetPos = cinematicTargetObj.position;
        let rad = (cinematicAngle * Math.PI) / 180.0;

        let camX = targetPos[0] + Math.sin(rad) * radius;
        let camY = targetPos[1] + camHeightOffset; 
        let camZ = targetPos[2] + Math.cos(rad) * radius;

        let lookX = targetPos[0];
        let lookY = targetPos[1] + 2.0; 
        let lookZ = targetPos[2];

        viewMatrix.setLookAt(camX, camY, camZ, lookX, lookY, lookZ, 0, 1, 0);

        cameraPosition = [camX, camY, camZ];
        cameraTarget = [lookX, lookY, lookZ];

        if (cinematicTargetObj.isClimbing === false && cinematicAngle >= 360) {
          isCinematicActive = false;
          cinematicAngle = 0;
          cinematicTargetObj = null;
          console.log("Cinematic Climb Finished");
        }
    }
    // --- Prioritas 4: Kamera Buah (F) / Auto Cam Dragonair (EATING/LOVE_LOVE) ---
    else if ((isFruitCamActive && window.myWorld && window.myWorld.fruitState.active) || 
             ((myDragonair.animationState === "EATING" || myDragonair.animationState === "LOVE_LOVE") && !isPaused)) {
        
        let dPos = myDragonair.position;
        let radAngle = (myDragonair.currentAngleY * Math.PI) / 180.0;
        let lerpSpeed = 3.0 * dt;
        let targetCamX, targetCamY, targetCamZ, lookX, lookY, lookZ;
        
        if (isFruitCamActive) {
            let fPos = window.myWorld.fruitState.pos;
            lerpSpeed = 5.0 * dt;
            lookX = fPos[0]; lookY = fPos[1]; lookZ = fPos[2];
            let camOffsetX = 8.0, camOffsetY = 5.0, camOffsetZ = 8.0;
            targetCamX = fPos[0] + camOffsetX;
            targetCamY = fPos[1] + camOffsetY;
            targetCamZ = fPos[2] + camOffsetZ;
        } else { // EATING / LOVE_LOVE
            let frontDist = 12.0;
            let camHeight = 4.0;
            targetCamX = dPos[0] + Math.sin(radAngle) * frontDist;
            targetCamZ = dPos[2] + Math.cos(radAngle) * frontDist;
            targetCamY = dPos[1] + camHeight;
            lookX = dPos[0]; lookY = dPos[1] + 3.0; lookZ = dPos[2];
        }

        cameraPosition[0] += (targetCamX - cameraPosition[0]) * lerpSpeed;
        cameraPosition[1] += (targetCamY - cameraPosition[1]) * lerpSpeed;
        cameraPosition[2] += (targetCamZ - cameraPosition[2]) * lerpSpeed;

        cameraTarget[0] += (lookX - cameraTarget[0]) * lerpSpeed;
        cameraTarget[1] += (lookY - cameraTarget[1]) * lerpSpeed;
        cameraTarget[2] += (lookZ - cameraTarget[2]) * lerpSpeed;

        viewMatrix.setLookAt(cameraPosition[0], cameraPosition[1], cameraPosition[2], cameraTarget[0], cameraTarget[1], cameraTarget[2], 0, 1, 0);

        let dx = cameraPosition[0] - cameraTarget[0];
        let dy = cameraPosition[1] - cameraTarget[1];
        let dz = cameraPosition[2] - cameraTarget[2];
        cameraDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        cameraAngleX = Math.asin(dy / cameraDistance) * (180 / Math.PI);
        if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
          cameraAngleY = Math.atan2(dx, dz) * (180 / Math.PI);
        }
    }
    // Prioritas 5: Free Cam (Default)
    else {
        let radY = (cameraAngleY * Math.PI) / 180.0;
        let backVector = [Math.sin(radY), 0, Math.cos(radY)];
        let rightVector = [Math.cos(radY), 0, -Math.sin(radY)];

        let moved = false;
        let actualMoveSpeed = (moveSpeed * elapsed) / 16.667;

        if (keysPressed["w"]) {
          cameraTarget[0] -= backVector[0] * actualMoveSpeed;
          cameraTarget[2] -= backVector[2] * actualMoveSpeed;
          moved = true;
        }
        if (keysPressed["s"]) {
          cameraTarget[0] += backVector[0] * actualMoveSpeed;
          cameraTarget[2] += backVector[2] * actualMoveSpeed;
          moved = true;
        }
        if (keysPressed["a"]) {
          cameraTarget[0] -= rightVector[0] * actualMoveSpeed;
          cameraTarget[2] -= rightVector[2] * actualMoveSpeed;
          moved = true;
        }
        if (keysPressed["d"]) {
          cameraTarget[0] += rightVector[0] * actualMoveSpeed;
          cameraTarget[2] += rightVector[2] * actualMoveSpeed;
          moved = true;
        }
        if (keysPressed[" "]) {
          cameraTarget[1] += actualMoveSpeed;
          moved = true;
        }
        if (keysPressed["shift"]) {
          cameraTarget[1] -= actualMoveSpeed;
          moved = true;
        }

        if (moved) {
          updateCamera();
        }
    }


    // =================================================================
    // LOGIKA GAMEPLAY
    // =================================================================
    if (!isPaused) {
      myWorld.update(now, elapsed);
      myDragonair.update(now, groundY, elapsed);
      // Dratini hanya bergerak jika IDLE
      myDratini.update(elapsed, worldBounds); 
      myDragonite.update(now, groundY, elapsed);
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawSceneGraph(gl, programInfo, myWorld.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, null);
    drawSceneGraph(gl, programInfo, myDragonair.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
    drawSceneGraph(gl, programInfo, myDratini.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
    drawSceneGraph(gl, programInfo, myDragonite.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);

    requestAnimationFrame(tick);
  };

  tick();
}

// ... (Fungsi Helper drawPart, initShaders, dll TETAP SAMA) ...
function drawPart(gl, program, buffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix) {
  if (!buffers || !buffers.vbo || !buffers.cbo || !buffers.ibo) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vbo);
  gl.vertexAttribPointer(program.a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(program.a_Position);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cbo);
  gl.vertexAttribPointer(program.a_Color, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(program.a_Color);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.ibo);
  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
  gl.drawElements(gl.TRIANGLES, buffers.n, gl.UNSIGNED_SHORT, 0);
}
function initShaders(gl, vs_source, fs_source) {
  var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vs_source);
  var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fs_source);
  if (!vertexShader || !fragmentShader) return null;
  var program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    console.error("Gagal link program: " + gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    gl.deleteShader(fragmentShader);
    gl.deleteShader(vertexShader);
    return null;
  }
  return program;
}
function loadShader(gl, type, source) {
  var shader = gl.createShader(type);
  if (shader == null) {
    console.error("Gagal membuat shader");
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    console.error("Gagal compile shader (" + (type === gl.VERTEX_SHADER ? "Vertex" : "Fragment") + "): " + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}
function initBuffers(gl, program, geo) {
  if (!geo || !geo.vertices || !geo.colors || !geo.indices) return null;
  var vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, geo.vertices, gl.STATIC_DRAW);
  var cbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cbo);
  gl.bufferData(gl.ARRAY_BUFFER, geo.colors, gl.STATIC_DRAW);
  var ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  return { vbo: vbo, cbo: cbo, ibo: ibo, n: geo.indices.length };
}
function normalizeVector(v) {
  let len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len > 0.00001) {
    return [v[0] / len, v[1] / len, v[2] / len];
  } else {
    return [0, 0, 0];
  }
}