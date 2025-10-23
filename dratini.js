// =================================================================
// DRATINI_IN_DRAGONAIR_CLASS.JS - DRATINI dengan struktur Class Dragonair
// =================================================================

// Pastikan Anda telah menyertakan library 'cuon-matrix.js' di HTML Anda
// Juga pastikan fungsi SceneNode, initBuffers, drawPart, dan utility WebGL lainnya tersedia.

// Warna global (Warna DRATINI)
var dratiniBlue = [0.4, 0.6, 1.0, 1.0]; // Biru Pastel
var dratiniWhite = [1.0, 1.0, 1.0, 1.0];
var dratiniEye = [0.4, 0.0, 0.6, 1.0]; // Ungu Gelap

// =================================================================
// FUNGSI GEOMETRI DRATINI (Disalin dari dratini.js)
// =================================================================

function createSphere(radius, segments, rings, color) {
  var vertices = [],
    colors = [],
    indices = [],
    normals = [];
  for (var latNumber = 0; latNumber <= rings; latNumber++) {
    var theta = (latNumber * Math.PI) / rings;
    var sinTheta = Math.sin(theta);
    var cosTheta = Math.cos(theta);
    for (var longNumber = 0; longNumber <= segments; longNumber++) {
      var phi = (longNumber * 2 * Math.PI) / segments;
      var sinPhi = Math.sin(phi);
      var cosPhi = Math.cos(phi);

      var x = cosPhi * sinTheta;
      var y = cosTheta;
      var z = sinPhi * sinTheta;

      vertices.push(radius * x, radius * y, radius * z);
      colors.push(color[0], color[1], color[2], color[3]);

      normals.push(x, y, z);
    }
  }
  for (var latNumber = 0; latNumber < rings; latNumber++) {
    for (var longNumber = 0; longNumber < segments; longNumber++) {
      var first = latNumber * (segments + 1) + longNumber;
      var second = first + segments + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }
  return {
    vertices: new Float32Array(vertices),
    colors: new Float32Array(colors),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

function createCone(baseRadius, height, segments, color) {
  var vertices = [],
    colors = [],
    indices = [],
    normals = [];

  // Titik Puncak
  vertices.push(0, height, 0);
  colors.push(color[0], color[1], color[2], color[3]);
  normals.push(0, 1.0, 0);

  for (var i = 0; i <= segments; i++) {
    var angle = (i * 2 * Math.PI) / segments;
    var x = baseRadius * Math.cos(angle);
    var z = baseRadius * Math.sin(angle);

    // Titik Dasar
    vertices.push(x, 0, z);
    colors.push(color[0], color[1], color[2], color[3]);

    var nx = Math.cos(angle);
    var ny = height / baseRadius;
    var nz = Math.sin(angle);
    var len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    normals.push(nx / len, ny / len, nz / len);
  }

  for (var i = 1; i <= segments; i++) {
    indices.push(0, i, i + 1);
  }

  // Basis Kerucut (tutup)
  var baseCenterIndex = vertices.length / 3;
  vertices.push(0, 0, 0);
  colors.push(color[0], color[1], color[2], color[3]);
  normals.push(0, -1.0, 0);

  for (var i = 1; i <= segments; i++) {
    indices.push(baseCenterIndex, i, i + 1);
  }

  return {
    vertices: new Float32Array(vertices),
    colors: new Float32Array(colors),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

function createEllipticParaboloid(a, b, c, segments, rings, color) {
  var vertices = [],
    colors = [],
    indices = [],
    normals = [];

  for (var i = 0; i <= rings; i++) {
    var u = i / rings;
    var u_squared = u * u;
    if (i === 0) {
      u = 0.001;
    }
    for (var j = 0; j <= segments; j++) {
      var v = (j * 2 * Math.PI) / segments;

      var x = a * u * Math.cos(v);
      var y = b * u * Math.sin(v);
      var z = c * u_squared;

      vertices.push(x, y, z);

      var nx = x;
      var ny = y;
      var nz = 0.0;
      var len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 0) {
        normals.push(nx / len, ny / len, nz / len);
      } else {
        normals.push(0.0, 0.0, 0.0);
      }

      if (Array.isArray(color) && color.length >= 3) {
        colors.push(color[0], color[1], color[2], color[3] || 1.0);
      } else {
        colors.push(1.0, 1.0, 1.0, 1.0);
      }
    }
  }

  for (var i = 0; i < rings; i++) {
    for (var j = 0; j < segments; j++) {
      var first = i * (segments + 1) + j;
      var second = first + segments + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    colors: new Float32Array(colors),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

function createSmoothBody(segments, segmentLength, startRadius, maxRadius, endRadius, currentAngle) {
  var vertices = [],
    colors = [],
    indices = [],
    normals = [];
  var ringSegments = 16;
  var spineMatrices = [];
  var currentSpineMatrix = new Matrix4();

  // START: Translasi awal (posisi pangkal leher/tubuh)
  currentSpineMatrix.translate(0, 1.0, 0).rotate(-10, 1, 0, 0);
  spineMatrices.push(new Matrix4(currentSpineMatrix));
  let totalBendAngle = 80; // Total rotasi X (membungkuk)
  let totalCurveAngle = 40; // Total rotasi Y (melengkung)
  let time = currentAngle * 0.004;

  let neckEnd = 0.3;
  let bodyEnd = 0.8;
  let waveAmplitude = 15.0; // Amplitudo gelombang sisi-ke-sisi
  let waveFreq = 1.5;

  for (let i = 0; i < segments; i++) {
    let p = i / (segments - 1);
    let angleX_deg = 0,
      angleY_deg = 0;

    // Gelombang sisi ke sisi (Rotasi Y)
    angleY_deg = waveAmplitude * Math.sin(p * Math.PI * waveFreq + time) * 0.5;

    // Kurva Bungkuk (Rotasi X) - Mirip Dratini.js asli
    if (p < 0.2) {
      angleX_deg = 0;
    } else if (p < 0.5) {
      let p_bend = (p - 0.2) / 0.3;
      angleX_deg = (totalBendAngle / segments) * 2.0 * p_bend;
    } else if (p < 0.8) {
      let p_body = (p - 0.5) / 0.3;
      angleX_deg = (totalBendAngle / segments) * (1.0 - p_body);
    } else {
      let p_tail = (p - 0.8) / 0.2;
      angleX_deg = (totalBendAngle / segments) * 0.6 * p_tail;
    }

    // Gabungkan
    currentSpineMatrix.rotate(angleY_deg, 0, 1, 0).rotate(angleX_deg, 1, 0, 0).translate(0, -segmentLength, 0); // Maju di sumbu Y lokal
    spineMatrices.push(new Matrix4(currentSpineMatrix));
  }

  var vertexIndex = 0;
  let minY = Number.POSITIVE_INFINITY;
  var firstSpinePos = [currentSpineMatrix.elements[12], currentSpineMatrix.elements[13], currentSpineMatrix.elements[14]];

  for (let i = 0; i < spineMatrices.length; i++) {
    let matrix = spineMatrices[i];
    let e = matrix.elements;
    let progress = i / (spineMatrices.length - 1);
    let currentRadius = progress <= 0.5 ? startRadius + (maxRadius - startRadius) * (progress * 2) : maxRadius - (maxRadius - endRadius) * ((progress - 0.5) * 2);

    for (let j = 0; j <= ringSegments; j++) {
      let angle = (j * 2 * Math.PI) / ringSegments;
      let x = currentRadius * Math.cos(angle);
      let y = 0; // Dratini.js menggunakan Y=0 untuk ring, mengandalkan Z untuk perut.
      let z = currentRadius * Math.sin(angle);

      // NORMAL: Normal ring (hanya X dan Z di ruang lokal ring)
      normals.push(Math.cos(angle), 0.0, Math.sin(angle));

      var new_x = e[0] * x + e[4] * y + e[8] * z + e[12];
      var new_y = e[1] * x + e[5] * y + e[9] * z + e[13];
      var new_z = e[2] * x + e[6] * y + e[10] * z + e[14];

      vertices.push(new_x, new_y, new_z);
      if (new_y < minY) minY = new_y; // Hitung minY

      // PERBAIKAN GRADIENT WARNA: Putih di perut (menggunakan Z lokal, bukan Y lokal)
      let ringZ = Math.sin(angle);
      let mixFactor = Math.max(0.0, ringZ);

      let r = dratiniBlue[0] * (1.0 - mixFactor) + dratiniWhite[0] * mixFactor;
      let g = dratiniBlue[1] * (1.0 - mixFactor) + dratiniWhite[1] * mixFactor;
      let b = dratiniBlue[2] * (1.0 - mixFactor) + dratiniWhite[2] * mixFactor;

      colors.push(r, g, b, 1.0);
    }
    if (i > 0) {
      let ring1StartIndex = vertexIndex;
      let ring2StartIndex = vertexIndex - (ringSegments + 1);
      for (let j = 0; j < ringSegments; j++) {
        let v1 = ring1StartIndex + j;
        let v2 = ring2StartIndex + j;
        let v3 = ring1StartIndex + j + 1;
        let v4 = ring2StartIndex + j + 1;
        indices.push(v1, v2, v3);
        indices.push(v2, v4, v3);
      }
    }
    vertexIndex += ringSegments + 1;
  }

  var finalMatrix = spineMatrices[spineMatrices.length - 1];
  var neckAttachMatrix = spineMatrices[0] || new Matrix4(); // Anggap segmen awal sebagai lampiran leher

  return {
    vertices: new Float32Array(vertices),
    colors: new Float32Array(colors),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
    finalSpineMatrix: finalMatrix,
    neckAttachMatrix: neckAttachMatrix,
    minY: minY,
    firstSpinePos: firstSpinePos,
  };
}

// =================================================================
// CLASS DRAGONAIR (Digunakan untuk Dratini)
// =================================================================

/**
 * Class OOP untuk Dratini dengan Scene Graph.
 * Menggunakan struktur Class Dragonair.
 */
function DratiniModel(gl, programInfo) {
  this.gl = gl;
  this.programInfo = programInfo;
  this.position = [-10, 0, -10]; // DIATUR di main.js, tapi disiapkan di sini
  this.globalRotationY = 0; // Rotasi Y global (mengatur arah)
  this.moveSpeed = 0.05; // Kecepatan gerakan
  this.direction = 1; // 1: Maju, -1: Mundur
  this.targetRotation = 0; // Rotasi Y target (0 atau 180)
  this.rotationSpeed = 100; // Kecepatan rotasi untuk berbalik (derajat per detik)
  this.currentRotation = 0.0;
  this.rootNode = null;
  this.nodes = {};
  this.bodyData = null;
  this.bodyBuffers = null;

  // Variabel tubuh (Dratini specific)
  this.bodySegmentsCount = 18;
  this.segmentLength = 0.4;
  this.startRadius = 0.4;
  this.maxRadius = 0.5;
  this.endRadius = 0.08;

  // Untuk animasi (disederhanakan dari Dragonair.js)
  this.currentRotation = 0.0;
}

/**
 * Membuat semua geometri statis, buffer, dan membangun scene graph
 * untuk Dratini.
 */
DratiniModel.prototype.init = function () {
  var gl = this.gl;
  var programInfo = this.programInfo;

  // 1. Buat Geometri Statis (Geometri Dratini)
  var headGeo = createSphere(0.7, 20, 20, dratiniBlue);
  var snoutGeo = createSphere(0.4, 15, 15, dratiniWhite);
  // Telinga Dratini (Paraboloid)
  var earGeo = createEllipticParaboloid(0.35, 0.08, 1.2, 12, 10, dratiniWhite);
  var eyeGeo = createSphere(0.1, 8, 8, dratiniEye);
  var foreheadDotGeo = createSphere(0.08, 6, 6, dratiniWhite);
  // Dratini tidak punya aksesoris ekor

  // 2. Inisialisasi Buffer Statis
  var headBuffers = initBuffers(gl, programInfo, headGeo);
  var snoutBuffers = initBuffers(gl, programInfo, snoutGeo);
  var earBuffers = initBuffers(gl, programInfo, earGeo);
  var eyeBuffers = initBuffers(gl, programInfo, eyeGeo);
  var foreheadDotBuffers = initBuffers(gl, programInfo, foreheadDotGeo);

  // 3. Bangun Scene Graph (disusun ulang seperti dratini.js)
  this.rootNode = new SceneNode(null); // 'dratiniRoot'

  // Node Kepala
  this.nodes.head = new SceneNode(headBuffers);
  this.rootNode.children.push(this.nodes.head);

  // Node Moncong
  this.nodes.snout = new SceneNode(snoutBuffers);
  this.nodes.head.children.push(this.nodes.snout);

  // Node Bulatan Dahi
  this.nodes.foreheadDot = new SceneNode(foreheadDotBuffers);
  this.nodes.head.children.push(this.nodes.foreheadDot);

  // Telinga Kiri
  this.nodes.earL = new SceneNode(earBuffers);
  this.nodes.head.children.push(this.nodes.earL);

  // Telinga Kanan
  this.nodes.earR = new SceneNode(earBuffers);
  this.nodes.head.children.push(this.nodes.earR);

  // Mata
  this.nodes.eyeL = new SceneNode(eyeBuffers);
  this.nodes.head.children.push(this.nodes.eyeL);
  this.nodes.eyeR = new SceneNode(eyeBuffers);
  this.nodes.head.children.push(this.nodes.eyeR);

  // Node Tubuh (buffer akan di-update di 'update')
  this.nodes.body = new SceneNode(null);
  this.rootNode.children.push(this.nodes.body);
};

/**
 * Meng-update matriks lokal untuk animasi dan membuat ulang buffer tubuh.
 */
DratiniModel.prototype.update = function (elapsed, worldBounds) {
  var gl = this.gl;
  var programInfo = this.programInfo;
  var dt = elapsed / 1000.0;
  const boundary = worldBounds / 2.0 - 5; // Batas, dikurangi sedikit margin

  // 1. Cek Batas dan Set Rotasi Target
  // Batas X positif
  if (this.position[0] > boundary && this.globalRotationY < 90) {
    this.targetRotation = 180;
  }
  // Batas X negatif
  else if (this.position[0] < -boundary && this.globalRotationY > 90) {
    this.targetRotation = 0;
  }

  // 2. Transisi Rotasi (Berbalik)
  if (this.globalRotationY !== this.targetRotation) {
    let diff = this.targetRotation - this.globalRotationY;

    // Atur agar rotasi bergerak melalui jalur terpendek (misalnya dari 350 ke 10, bukan 350 ke -350)
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    const rotationStep = this.rotationSpeed * dt;

    if (Math.abs(diff) < rotationStep) {
      this.globalRotationY = this.targetRotation;
    } else if (diff > 0) {
      this.globalRotationY += rotationStep;
    } else {
      this.globalRotationY -= rotationStep;
    }
    this.globalRotationY = this.globalRotationY % 360;
  }

  // 3. Gerakan Maju (Z lokal/ke depan)
  let moveDistance = this.moveSpeed * dt * 60; // Dikalikan 60 untuk FPS-independent speed

  // Hitung vektor arah berdasarkan rotasi Y
  let radY = (this.globalRotationY * Math.PI) / 180.0;
  // Dratini menghadap ke Z negatif di ruang lokal (biasanya), tetapi di sini diinterpretasikan sebagai arah ke X
  let forwardX = Math.sin(radY);
  let forwardZ = Math.cos(radY);

  this.position[0] += forwardX * moveDistance;
  this.position[2] += forwardZ * moveDistance;

  // --- ANIMASI: Buat ulang tubuh ---
  // Gunakan posisi X global sebagai input animasi gelombang
  this.currentRotation = this.position[0] * 20;

  this.bodyData = createSmoothBody(this.bodySegmentsCount, this.segmentLength, this.startRadius, this.maxRadius, this.endRadius, this.currentRotation);

  if (!this.bodyData) {
    console.error("Gagal membuat bodyData");
    return;
  }

  this.bodyBuffers = initBuffers(gl, programInfo, this.bodyData);
  if (!this.bodyBuffers) {
    console.error("Gagal init bodyBuffers");
    return;
  }

  //var headBaseY = 1.5;
  //var globalYOffset = 1.0;
  /** 
    // Update Rotasi Global
    this.currentRotation = (this.currentRotation + (30 * elapsed) / 1000.0) % 360;
    */
  // --- ANIMASI: Buat ulang tubuh ---
  this.bodyData = createSmoothBody(this.bodySegmentsCount, this.segmentLength, this.startRadius, this.maxRadius, this.endRadius, this.currentRotation);

  if (!this.bodyData) {
    console.error("Gagal membuat bodyData");
    return;
  }

  this.bodyBuffers = initBuffers(gl, programInfo, this.bodyData);
  if (!this.bodyBuffers) {
    console.error("Gagal init bodyBuffers");
    return;
  }

  var headBaseY = 1.5; // Tinggi kepala (dari dratini.js)
  var globalYOffset = 1.0; // Translasi global di dratini.js main()

  // --- Update Matriks Lokal di Scene Graph ---

  // 1. Update Root (rotasi animasi global)
  this.rootNode.localMatrix
    .setIdentity()
    .translate(this.position[0], globalYOffset, this.position[2]) // Posisi global di dratini.js
    .rotate(this.currentRotation, 0, 1, 0);

  // 2. Update Body (ganti buffer-nya dengan yang baru dibuat)
  this.nodes.body.buffers = this.bodyBuffers;
  // Matriks tubuh sudah dibuat di createSmoothBody dan relatif ke root/global.
  // Jika body dibuat RELATIF ke head, perlu penyesuaian di createSmoothBody.
  // Mengacu dratini.js asli, body dibuat independen dari head.
  this.nodes.body.localMatrix.setIdentity();

  // 3. Update Head (relatif ke root)
  this.nodes.head.localMatrix
    .setIdentity()
    .translate(0, headBaseY, 0) // Posisi kepala
    .scale(0.8, 0.8, 0.9); // Skala kepala

  // 4. Update anak-anak kepala (RELATIF KE KEPALA)
  this.nodes.snout.localMatrix
    .setIdentity()
    .translate(0, 1.3 - headBaseY, 0.6) // Translasi: 0, 1.3, 0.6 -> 0, -0.2, 0.6
    .scale(0.8 / 0.8, 0.5 / 0.8, 0.7 / 0.9); // Skala relatif: 0.8, 0.5, 0.7

  this.nodes.foreheadDot.localMatrix
    .setIdentity()
    .translate(0, 1.65 - headBaseY, 0.68)
    .scale(1.0 / 0.8, 1.0 / 0.8, 1.0 / 0.9);

  // Telinga Kiri (Sirip Kiri)
  var earScaleFactor = 1.0;
  var earDepthFactor = 0.7;
  this.nodes.earL.localMatrix
    .setIdentity()
    .translate(-0.8 / 0.8, 1.9 / 0.8 - headBaseY / 0.8, -0.1 / 0.9) // Posisi (-0.8, 1.9, -0.1) relatif ke kepala (0, 1.5, 0) dan diskalakan
    .rotate(90, 0, 1, 0)
    .rotate(15, 1, 0, 0)
    .rotate(-25, 0, 0, 1)
    .scale(earScaleFactor / 0.8, earScaleFactor / 0.8, earDepthFactor / 0.9);

  // Telinga Kanan (Sirip Kanan)
  this.nodes.earR.localMatrix
    .setIdentity()
    .translate(0.8 / 0.8, 1.9 / 0.8 - headBaseY / 0.8, -0.1 / 0.9)
    .scale(-earScaleFactor / 0.8, earScaleFactor / 0.8, earDepthFactor / 0.9) // Mirroring dan Skala
    .rotate(90, 0, 1, 0)
    .rotate(15, 1, 0, 0)
    .rotate(25, 0, 0, 1);

  // Mata kiri
  this.nodes.eyeL.localMatrix
    .setIdentity()
    .translate(-0.25 / 0.8, 1.5 / 0.8 - headBaseY / 0.8, 0.5 / 0.9)
    .scale(1.2 / 0.8, 1.2 / 0.8, 1.2 / 0.9);

  // Mata kanan
  this.nodes.eyeR.localMatrix
    .setIdentity()
    .translate(0.25 / 0.8, 1.5 / 0.8 - headBaseY / 0.8, 0.5 / 0.9)
    .scale(1.2 / 0.8, 1.2 / 0.8, 1.2 / 0.9);
};

DratiniModel.prototype.getRootNode = function () {
  return this.rootNode;
};

// =================================================================
// FUNGSI UTAMA (MAIN) - Diadaptasi
// =================================================================

function main() {
  console.log("Memulai inisialisasi Dratini 3D (Class Version)...");

  // 1. Setup kanvas dan konteks WebGL (DIHILANGKAN - Anggap ini sudah ada)
  // var canvas = document.getElementById('webgl'); ...
  // var gl = canvas.getContext('webgl') ...

  // 2. Setup shader (DIHILANGKAN - Anggap ini sudah ada)
  // var shaderProgram = initShaders(gl, vsSource, fsSource); ...

  // 3. Setup programInfo (DIHILANGKAN - Anggap ini sudah ada)

  // Asumsi: 'gl' dan 'programInfo' telah didefinisikan/diinisialisasi
  if (!gl || !programInfo) {
    console.error("gl atau programInfo tidak terdefinisi. Pastikan WebGL utilities dimuat.");
    // return;
  }

  // 4. Inisialisasi model Dratini
  var dratini = new DratiniModel(gl, programInfo);
  dratini.init();

  console.log("Dratini model class berhasil diinisialisasi");

  // 5. Setup matriks (DIHILANGKAN - Anggap ini di setup di luar)
  // var projMatrix = new Matrix4(); ...

  // 6. Pengaturan render (DIHILANGKAN - Anggap ini di setup di luar)
  // gl.clearColor(0.8, 0.8, 0.8, 1.0); ...

  // 7. Loop animasi
  var g_last = Date.now();

  var tick = function () {
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;

    // Update state Dratini (geometri dan matriks lokal)
    dratini.update(elapsed);

    // Rendering (DIHILANGKAN - Anggap drawSceneGraph(dratini.getRootNode(), ...) ada)
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // drawSceneGraph(dratini.getRootNode(), programInfo, viewMatrix, projMatrix);

    requestAnimationFrame(tick);
  };

  tick();
  console.log("Animasi Dratini (Class Version) berjalan!");
}

// Panggil main() setelah semua fungsi didefinisikan (DIHILANGKAN - Anggap skrip ini dieksekusi setelah DOMContentLoaded)
// main();

// Karena saya tidak memiliki SceneNode dan utility WebGL Anda,
// saya hanya menyediakan struktur logis yang dimodifikasi.
