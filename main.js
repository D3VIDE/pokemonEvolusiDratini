// =================================================================
// Variabel Warna Global
// =================================================================

var blue = [0.4, 0.6, 1.0, 1.0];
var snoutBlue = [0.6, 0.75, 1.0, 1.0]; // warna biru untuk moncong
var white = [1.0, 1.0, 1.0, 1.0];
var darkPurple = [0.2, 0.0, 0.2, 1.0];
var groundGreen = [0.4, 0.8, 0.4, 1.0];
var earWhite = [0.9, 0.9, 1.0, 1.0];
var crystalBlue = [0.23, 0.3, 0.79, 1.0];

// =================================================================
// Definisi Scene Graph
// =================================================================

/**
 * Class (fungsi konstruktor) untuk node dalam scene graph.
 * @param {object} buffers - Buffer geometri yang akan digambar (VBO, CBO, IBO, n).
 * @param {Matrix4} localMatrix - Matriks transformasi node ini RELATIF terhadap induknya.
 */
function SceneNode(buffers, localMatrix) {
  this.buffers = buffers; // Geometri untuk digambar (bisa null jika ini hanya grup)
  this.localMatrix = localMatrix || new Matrix4();
  this.worldMatrix = new Matrix4(); // Dihitung saat di-render
  this.children = [];
}

/**
 * Menggambar scene graph secara rekursif.
 * @param {SceneNode} node - Node yang akan digambar.
 * @param {Matrix4} parentWorldMatrix - Matriks dunia dari induk node ini.
 * @param {object} oriPointBuffers - Buffer untuk menggambar titik origin (untuk debug).
 */
function drawSceneGraph(gl, programInfo, node, parentWorldMatrix, viewMatrix, projMatrix, mvpMatrix, oriPointBuffers) {
  // 1. Hitung matriks dunia (world matrix) untuk node ini:
  // worldMatrix = parentWorldMatrix * localMatrix
  node.worldMatrix.set(parentWorldMatrix).multiply(node.localMatrix);

  // 2. Gambar geometri node ini (jika ada)
  if (node.buffers) {
    drawPart(gl, programInfo, node.buffers, node.worldMatrix, viewMatrix, projMatrix, mvpMatrix);
  }

  // 3. Gambar Titik Origin (oriPoint) di posisi node ini (untuk debug)
  if (oriPointBuffers) {
    var oriMatrix = new Matrix4(node.worldMatrix).scale(0.5, 0.5, 0.5);
    drawPart(gl, programInfo, oriPointBuffers, oriMatrix, viewMatrix, projMatrix, mvpMatrix);
  }

  // 4. Panggil fungsi ini secara rekursif untuk semua anak
  for (var i = 0; i < node.children.length; i++) {
    drawSceneGraph(gl, programInfo, node.children[i], node.worldMatrix, viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
  }
}

// =================================================================
// FUNGSI UTAMA (MAIN)
// =================================================================

function main() {
  // 1. Setup kanvas dan konteks WebGL
  var canvas = document.getElementById("webgl");
  var gl = canvas.getContext("webgl");
  if (!gl) {
    console.log("Gagal mendapatkan konteks WebGL");
    return;
  }

  // 2. Setup shader
  var vsSource = document.getElementById("shader-vs").innerText;
  var fsSource = document.getElementById("shader-fs").innerText;
  var shaderProgram = initShaders(gl, vsSource, fsSource);
  if (!shaderProgram) {
    console.log("Gagal inisialisasi shader.");
    return;
  }

  // Simpan lokasi atribut dan uniform
  var programInfo = {
    program: shaderProgram,
    a_Position: gl.getAttribLocation(shaderProgram, "a_Position"),
    a_Color: gl.getAttribLocation(shaderProgram, "a_Color"),
    u_MvpMatrix: gl.getUniformLocation(shaderProgram, "u_MvpMatrix"),
  };

  // ===============================================
  // ** OOP: Buat Instance Model **
  // ===============================================

  // Buat instance Dragonair baru
  var myDragonair = new Dragonair(gl, programInfo);
  // Panggil 'init' untuk membuat geometri, buffer, dan scene graph-nya
  myDragonair.init();
  myDragonair.position = [10, 0, 0];

  var myDratini = new DratiniModel(gl, programInfo);
  myDratini.init();
  // Inisialisasi posisi awal agar menghadap ke batas (misalnya X positif)
  myDratini.position = [-20, 0, -10]; // Mulai di X negatif
  myDratini.globalRotationY = 0; // Awalnya menghadap ke X positif (sudut 0)
  myDratini.targetRotation = 0;
  // myDratini.moveSpeed sudah 0.05
  // myDratini.direction tidak lagi diperlukan jika menggunakan globalRotationY dan targetRotation

  // Buat instance Dragonite baru
  var myDragonite = new Dragonite(gl, programInfo);
  myDragonite.init();
  // Dragonite akan tetap di posisi [0, 0, 0] (sesuai kode dragonite.js)
  // Di masa depan, Anda bisa tambahkan:
  // var myDratini = new Dratini(gl, programInfo);
  // myDratini.init();
  // myDratini.getRootNode().localMatrix.translate(10, 0, 0); // Pindahkan ke samping
  var worldBounds = 400;
  // ===============================================
  // ** Buat Aset Scene (Non-Model) **
  // ===============================================
  var groundPlaneGeo = createPlane(500, 500, groundGreen);
  var groundPlaneBuffers = initBuffers(gl, programInfo, groundPlaneGeo);

  var grassGeo = createRandomGrass(1500, worldBounds, worldBounds, 2.0, grassGreen);
  var grassBuffers = initBuffers(gl, programInfo, grassGeo);

  var cloudGeo = createSphere(1.0, 10, 8, white); // Geometri dasar awan
  var cloudBuffers = initBuffers(gl, programInfo, cloudGeo);
  var cloudRootNode = new SceneNode(null); // Induk untuk semua awan
  var numClouds = 15;

  for (let i = 0; i < numClouds; i++) {
    let x = Math.random() * worldBounds - worldBounds / 2;
    let y = Math.random() * 10 + 35; // Ketinggian awan
    let z = Math.random() * worldBounds - worldBounds / 2;
    let speed = Math.random() * 0.005 + 0.005; // Kecepatan acak

    var cloudClump = createCloudClump(cloudBuffers, new Matrix4().translate(x, y, z));
    cloudClump.speed = speed; // Simpan kecepatan di node
    cloudRootNode.children.push(cloudClump);
  }
  // Bola merah kecil untuk menandai origin (untuk debug)
  var oriPointGeo = createSphere(0.1, 8, 8, [1.0, 0.0, 0.0, 1.0]);
  var oriPointBuffers = initBuffers(gl, programInfo, oriPointGeo);

  // 4. Setup matriks untuk kamera
  var projMatrix = new Matrix4();
  var viewMatrix = new Matrix4();
  var mvpMatrix = new Matrix4();
  projMatrix.setPerspective(45, canvas.width / canvas.height, 1, 1000);

  // Pengaturan Kamera Interaktif
  let cameraAngleX = 20.0;
  let cameraAngleY = 0.0;
  let cameraDistance = 35.0;
  let cameraTarget = [0.0, 5.0, 0.0];
  let cameraPosition = [0.0, 0.0, 0.0];
  let isDragging = false;
  let lastMouseX = -1,
    lastMouseY = -1;
  const mouseSensitivity = 0.3;
  const moveSpeed = 0.1;
  let keysPressed = {};
  function updateCamera() {
    let radX = (cameraAngleX * Math.PI) / 180.0;
    let radY = (cameraAngleY * Math.PI) / 180.0;
    cameraPosition[0] = cameraTarget[0] + cameraDistance * Math.sin(radY) * Math.cos(radX);
    cameraPosition[1] = cameraTarget[1] + cameraDistance * Math.sin(radX);
    cameraPosition[2] = cameraTarget[2] + cameraDistance * Math.cos(radY) * Math.cos(radX);
    viewMatrix.setLookAt(cameraPosition[0], cameraPosition[1], cameraPosition[2], cameraTarget[0], cameraTarget[1], cameraTarget[2], 0, 1, 0);
  }
  updateCamera();

  // Event Listener
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

  // Listener Zoom
  canvas.onwheel = function (ev) {
    ev.preventDefault();
    let zoomSensitivity = 0.05;
    cameraDistance += ev.deltaY * zoomSensitivity;
    cameraDistance = Math.max(5.0, Math.min(100.0, cameraDistance));
    updateCamera();
  };

  // Listener Keyboard
  document.onkeydown = function (ev) {
    keysPressed[ev.key.toLowerCase()] = true;
  };
  document.onkeyup = function (ev) {
    keysPressed[ev.key.toLowerCase()] = false;
  };

  // 5. Pengaturan render langit
  gl.clearColor(skyBlue[0], skyBlue[1], skyBlue[2], skyBlue[3]);
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(shaderProgram);

  // 6. Mulai loop animasi
  var g_lastTickTime = Date.now();
  var groundY = -3.5; // Definisikan groundY di sini

  var tick = function () {
    let now = Date.now();
    let elapsed = now - g_lastTickTime;
    g_lastTickTime = now;

    // --- Gerakan Kamera WASD ---
    let radY = (cameraAngleY * Math.PI) / 180.0;
    let forward = [Math.sin(radY), 0, Math.cos(radY)];
    let right = [Math.cos(radY), 0, -Math.sin(radY)];
    let moved = false;
    if (keysPressed["w"]) {
      cameraTarget[0] += forward[0] * moveSpeed;
      cameraTarget[2] += forward[2] * moveSpeed;
      moved = true;
    }
    if (keysPressed["s"]) {
      cameraTarget[0] -= forward[0] * moveSpeed;
      cameraTarget[2] -= forward[2] * moveSpeed;
      moved = true;
    }
    if (keysPressed["a"]) {
      cameraTarget[0] -= right[0] * moveSpeed;
      cameraTarget[2] -= right[2] * moveSpeed;
      moved = true;
    }
    if (keysPressed["d"]) {
      cameraTarget[0] += right[0] * moveSpeed;
      cameraTarget[2] += right[2] * moveSpeed;
      moved = true;
    }
    if (moved) {
      updateCamera();
    }

    // ===============================================
    // ** OOP: Update Model **
    // ===============================================
    // Panggil 'update' pada instance Dragonair
    myDragonair.update(now, groundY, elapsed);
    myDratini.update(elapsed, worldBounds);
    myDragonite.update(now, groundY, elapsed);
    // ===============================================
    // ** Proses Gambar **
    // ===============================================
    let frameSpeed = elapsed / 16.667; // Normalisasi kecepatan
    let worldHalf = worldBounds / 2;
    for (let i = 0; i < cloudRootNode.children.length; i++) {
      let cloud = cloudRootNode.children[i];
      cloud.localMatrix.translate(cloud.speed * frameSpeed, 0, 0); // Gerak ke kanan (X+)
      let xPos = cloud.localMatrix.elements[12];
      if (xPos > worldHalf + 20) {
        // Wrap around
        cloud.localMatrix.elements[12] = -(worldHalf + 20);
      }
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Gambar Daratan
    var groundModelMatrix = new Matrix4();
    groundModelMatrix.translate(0, groundY, -5);
    drawPart(gl, programInfo, groundPlaneBuffers, groundModelMatrix, viewMatrix, projMatrix, mvpMatrix);
    drawPart(gl, programInfo, grassBuffers, groundModelMatrix, viewMatrix, projMatrix, mvpMatrix);
    drawSceneGraph(gl, programInfo, cloudRootNode, new Matrix4(), viewMatrix, projMatrix, mvpMatrix, null);

    // --- Gambar Model ---
    // 4. Gambar Dragonair
    drawSceneGraph(gl, programInfo, myDragonair.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);

    drawSceneGraph(gl, programInfo, myDratini.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);

    drawSceneGraph(gl, programInfo, myDragonite.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
    requestAnimationFrame(tick);
  };

  tick();
}

// =================================================================
// FUNGSI HELPER (Setup WebGL, Gambar)
// =================================================================

function drawPart(gl, program, buffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix) {
  if (!buffers || !buffers.vbo || !buffers.cbo || !buffers.ibo) {
    console.error("Buffer tidak valid:", buffers);
    return;
  }
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
  if (!geo || !geo.vertices || !geo.colors || !geo.indices) {
    console.error("Data geometri tidak valid:", geo);
    return null;
  }
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
    // Hindari pembagian dengan nol
    return [v[0] / len, v[1] / len, v[2] / len];
  } else {
    return [0, 0, 0];
  }
}
