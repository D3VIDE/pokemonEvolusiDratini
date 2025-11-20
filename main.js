// =================================================================
// main.js (FINAL: Smooth Camera Transition - No Jump after Eating)
// =================================================================

var groundGreen = [0.4, 0.8, 0.4, 1.0];
var earWhite = [0.9, 0.9, 1.0, 1.0];
var crystalBlue = [0.23, 0.3, 0.79, 1.0];
var SKY_COLOR = [0.53, 0.81, 0.92, 1.0];
var GROUND_Y = -3.5;

function SceneNode(buffers, localMatrix) {
  this.buffers = buffers;
  this.localMatrix = localMatrix || new Matrix4();
  this.worldMatrix = new Matrix4();
  this.children = [];
}

function drawSceneGraph(gl, programInfo, node, parentWorldMatrix, viewMatrix, projMatrix, mvpMatrix, oriPointBuffers) {
  node.worldMatrix.set(parentWorldMatrix).multiply(node.localMatrix);
  if (node.buffers) {
    if (node.enabled !== false) {
      drawPart(gl, programInfo, node.buffers, node.worldMatrix, viewMatrix, projMatrix, mvpMatrix);
    }
  }
  if (oriPointBuffers) {
    var oriMatrix = new Matrix4(node.worldMatrix).scale(0.5, 0.5, 0.5);
    drawPart(gl, programInfo, oriPointBuffers, oriMatrix, viewMatrix, projMatrix, mvpMatrix);
  }
  for (var i = 0; i < node.children.length; i++) {
    drawSceneGraph(gl, programInfo, node.children[i], node.worldMatrix, viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
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

  // --- VARIABEL CINEMATIC (Bisa untuk siapa saja) ---
  let isCinematicActive = false;
  let cinematicAngle = 0;
  let cinematicTargetObj = null; // <-- Ini kuncinya! Variabel kosong untuk menampung target

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
    // Block mouse saat animasi makan/love agar tidak fight dengan auto-camera
    if (((myDragonair.animationState === "EATING" || myDragonair.animationState === "LOVE_LOVE") && !isPaused) || isFruitCamActive || isDragonairPovActive) return;

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
    if (((myDragonair.animationState === "EATING" || myDragonair.animationState === "LOVE_LOVE") && !isPaused) || isFruitCamActive || isDragonairPovActive) return;
    ev.preventDefault();
    let zoomSensitivity = 0.05;
    cameraDistance += ev.deltaY * zoomSensitivity;
    cameraDistance = Math.max(5.0, Math.min(200.0, cameraDistance));
    updateCamera();
  };

  document.onkeydown = function (ev) {
    let key = ev.key.toLowerCase();
    keysPressed[key] = true;

    if (key === "1") {
      isPaused = !isPaused;
      console.log("Freeze Mode:", isPaused);
    }

    if (key === "2") {
      currentScenario = "DRAGONAIR_ANIMATION";
      if (animationTimerID) clearTimeout(animationTimerID);

      isTransitioningCamera = false;
      isEatingCamActive = false;
      isFruitCamActive = false;
      isDragonairPovActive = false;
      isPaused = false;

      let targetTree = myWorld.allTrees.find((t) => Math.abs(t.position[0] - 60) < 1.0 && Math.abs(t.position[2] - 50) < 1.0);
      if (!targetTree) targetTree = myWorld.allTrees[1];
      myWorld.dropFruit(0, 0, targetTree);

      let fPos = myWorld.fruitState.pos;
      myDragonair.targetFruitPosition = [fPos[0], fPos[2]];

      myDragonair.animationState = "WAITING";
      myDragonair.stateTimer = 0;

      console.log("Buah Jatuh! Menunggu...");
    }

    if (key === "q") {
      isDragonairPovActive = !isDragonairPovActive;
      if (isDragonairPovActive) {
        isEatingCamActive = false;
        isFruitCamActive = false;
        isTransitioningCamera = false;
      }
    }
    if (key === "e") {
      isFruitCamActive = !isFruitCamActive;
      if (isFruitCamActive) isDragonairPovActive = false;
    }
    if (key === "f") {
      // Cek apakah sedang tidak cinematic
      if (!isCinematicActive) {
        isCinematicActive = true;
        cinematicAngle = 0;

        // KITA SET TARGETNYA DI SINI:
        cinematicTargetObj = myDragonite;

        // Matikan kamera lain agar tidak bentrok (opsional, biar fokus)
        isDragonairPovActive = false;
        isFruitCamActive = false;

        console.log("Cinematic Mode: ON - Target: Dragonite");
      }
    }
    // --- [BARU] Tombol G untuk Memanjat ---
    if (key === "g") {
      console.log("Mulai Memanjat Gunung!");

      // Panggil fungsi di dragonite.js
      myDragonite.startClimbing();

      // Aktifkan Mode Kamera Cinematic (Gunakan target logic yang sudah kita buat)
      // Kita manfaatkan mode cinematic tapi nanti kita sesuaikan agar "follow"
      isCinematicActive = true;
      cinematicAngle = 45;
      // Atau 0 jika ingin lihat dari depan.
      // Kita atur logic khususnya di bawah.
      cinematicTargetObj = myDragonite;

      // Matikan kamera lain
      isDragonairPovActive = false;
      isFruitCamActive = false;
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
    // LOGIKA KAMERA
    // =================================================================

    if (cameraStartTimer < 1.5) {
      // Intro Delay (No Op)
    } else {
      // 1. POV Dragonair (Q)
      if (isDragonairPovActive) {
        let dPos = myDragonair.position;
        let radAngle = (myDragonair.currentAngleY * Math.PI) / 180.0;
        let camDist = 25.0;
        let camHeight = 14.0;
        cameraPosition[0] = dPos[0] - Math.sin(radAngle) * camDist;
        cameraPosition[1] = dPos[1] + camHeight;
        cameraPosition[2] = dPos[2] - Math.cos(radAngle) * camDist;
        let lookDist = 15.0;
        cameraTarget[0] = dPos[0] + Math.sin(radAngle) * lookDist;
        cameraTarget[1] = dPos[1] + 2.0;
        cameraTarget[2] = dPos[2] + Math.cos(radAngle) * lookDist;
        viewMatrix.setLookAt(cameraPosition[0], cameraPosition[1], cameraPosition[2], cameraTarget[0], cameraTarget[1], cameraTarget[2], 0, 1, 0);
      }
      // --- 2. GENERIC CINEMATIC CAMERA ---
      else if (isCinematicActive && cinematicTargetObj) {
        // 1. Tentukan Settingan Default (Untuk Tombol F / Close-up)
        let radius = 32.0; // Dekat
        let camHeightOffset = 0.5; // Sejajar mata
        let rotateSpeed = 60.0; // Cepat

        // 2. Cek: Apakah Target sedang Memanjat? (Untuk Tombol G)
        if (cinematicTargetObj.isClimbing) {
          // Hitung Progress Animasi (0.0 sampai 1.0) berdasarkan sudut putaran
          // Kita bagi dengan 300 (bukan 360) supaya di akhir dia sempat diam sebentar dalam posisi jauh
          let progress = Math.min(1.0, cinematicAngle / 300.0);

          // --- LOGIKA ZOOM OUT (Semakin Lama Semakin Jauh) ---
          let startDist = 10.0; // Jarak Awal (Dekat)
          let endDist = 90.0; // Jarak Akhir (Jauh sekali biar epik)

          // Rumus: Jarak Saat Ini = Awal + (Selisih * Progress)
          radius = startDist + (endDist - startDist) * progress;

          // --- LOGIKA NAIK KE ATAS (Drone Shot) ---
          // Biar tidak tertutup tanah, semakin jauh kamera harus semakin tinggi
          let startHeight = 5.0;
          let endHeight = 40.0; // Tinggi akhir
          camHeightOffset = startHeight + (endHeight - startHeight) * progress;

          rotateSpeed = 45.0; // Sedikit lebih cepat biar dramatis
        }

        // B. Update Sudut
        // Jika Dragonite sedang climbing, kita mungkin mau kamera berputar pelan
        // atau tetap di belakang. Kita biarkan berputar saja biar cinematic.
        cinematicAngle += rotateSpeed * dt;

        // C. Ambil Posisi Target (REAL TIME)
        // INI PENTING: Karena Dragonite bergerak naik, targetPos akan berubah tiap frame
        let targetPos = cinematicTargetObj.position;

        // D. Hitung Posisi Kamera
        let rad = (cinematicAngle * Math.PI) / 180.0;

        // Posisi Kamera mengikuti targetPos yang sedang naik
        let camX = targetPos[0] + Math.sin(rad) * radius;
        // Kita tambahkan offset Y agar kamera tidak terlalu mendongak
        let camY = targetPos[1] + 2.0;
        let camZ = targetPos[2] + Math.cos(rad) * radius;

        // Titik Fokus
        let lookX = targetPos[0];
        let lookY = targetPos[1] + 2.0; // Fokus ke badan
        let lookZ = targetPos[2];

        viewMatrix.setLookAt(camX, camY, camZ, lookX, lookY, lookZ, 0, 1, 0);

        // Update manual cam
        cameraPosition = [camX, camY, camZ];
        cameraTarget = [lookX, lookY, lookZ];

        // E. Cek Selesai
        // KITA UBAH LOGIC SELESAI:
        // Jangan matikan kamera hanya karena sudut 360, TAPI
        // matikan kamera jika Dragonite SUDAH SELESAI memanjat.

        // Cek properti isClimbing pada objek target (jika ada)
        if (cinematicTargetObj.isClimbing === false && cinematicAngle >= 360) {
          isCinematicActive = false;
          cinematicAngle = 0;
          cinematicTargetObj = null;
          console.log("Cinematic Climb Finished");
        }
      }
      // 2. Kamera Buah (E)
      else if (isFruitCamActive && window.myWorld && window.myWorld.fruitState.active) {
        let fPos = window.myWorld.fruitState.pos;
        let lerpSpeed = 5.0 * dt;
        if (!isPaused) {
          cameraTarget[0] += (fPos[0] - cameraTarget[0]) * lerpSpeed;
          cameraTarget[1] += (fPos[1] - cameraTarget[1]) * lerpSpeed;
          cameraTarget[2] += (fPos[2] - cameraTarget[2]) * lerpSpeed;
          let camOffsetX = 8.0;
          let camOffsetY = 5.0;
          let camOffsetZ = 8.0;
          let targetPosX = fPos[0] + camOffsetX;
          let targetPosY = fPos[1] + camOffsetY;
          let targetPosZ = fPos[2] + camOffsetZ;
          cameraPosition[0] += (targetPosX - cameraPosition[0]) * lerpSpeed;
          cameraPosition[1] += (targetPosY - cameraPosition[1]) * lerpSpeed;
          cameraPosition[2] += (targetPosZ - cameraPosition[2]) * lerpSpeed;
        }
        viewMatrix.setLookAt(cameraPosition[0], cameraPosition[1], cameraPosition[2], cameraTarget[0], cameraTarget[1], cameraTarget[2], 0, 1, 0);
      }
      // 3. Kamera Otomatis Saat MAKAN atau LOVE_LOVE (Auto Cam)
      else if ((myDragonair.animationState === "EATING" || myDragonair.animationState === "LOVE_LOVE") && !isPaused) {
        let dPos = myDragonair.position;
        let radAngle = (myDragonair.currentAngleY * Math.PI) / 180.0;

        // Kamera Depan Wajah
        let frontDist = 12.0;
        let camHeight = 4.0;

        let targetCamX = dPos[0] + Math.sin(radAngle) * frontDist;
        let targetCamZ = dPos[2] + Math.cos(radAngle) * frontDist;
        let targetCamY = dPos[1] + camHeight;

        let lookX = dPos[0];
        let lookY = dPos[1] + 3.0;
        let lookZ = dPos[2];

        let lerpSpeed = 3.0 * dt;

        // Lerp Posisi Kamera
        cameraPosition[0] += (targetCamX - cameraPosition[0]) * lerpSpeed;
        cameraPosition[1] += (targetCamY - cameraPosition[1]) * lerpSpeed;
        cameraPosition[2] += (targetCamZ - cameraPosition[2]) * lerpSpeed;

        cameraTarget[0] += (lookX - cameraTarget[0]) * lerpSpeed;
        cameraTarget[1] += (lookY - cameraTarget[1]) * lerpSpeed;
        cameraTarget[2] += (lookZ - cameraTarget[2]) * lerpSpeed;

        viewMatrix.setLookAt(cameraPosition[0], cameraPosition[1], cameraPosition[2], cameraTarget[0], cameraTarget[1], cameraTarget[2], 0, 1, 0);

        // [FIX] SINKRONISASI FREE CAM
        // Agar saat mode ini selesai, Free Cam tidak "loncat", kita update variabel free cam
        // mengikuti posisi kamera otomatis saat ini.
        let dx = cameraPosition[0] - cameraTarget[0];
        let dy = cameraPosition[1] - cameraTarget[1];
        let dz = cameraPosition[2] - cameraTarget[2];
        cameraDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        // Update Angle X & Y agar match
        cameraAngleX = Math.asin(dy / cameraDistance) * (180 / Math.PI);
        if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
          cameraAngleY = Math.atan2(dx, dz) * (180 / Math.PI);
        }
      }
      // 4. Free Cam (Default)
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

        if (moved || (!isEatingCamActive && !isFruitCamActive && !isDragonairPovActive)) {
          updateCamera();
        }
      }
    }

    // =================================================================
    // LOGIKA GAMEPLAY
    // =================================================================
    if (!isPaused) {
      myWorld.update(now, elapsed);
      myDragonair.update(now, groundY, elapsed);
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
