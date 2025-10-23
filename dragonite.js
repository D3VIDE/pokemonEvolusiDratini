// =================================================================
// dragonite.js
// Diadaptasi untuk arsitektur Scene Graph (a_Color, bukan a_Normal)
// =================================================================

// --- Warna Dragonite ---
const COLOR_BODY = [0.96, 0.76, 0.25, 1.0]; // Orange body
const COLOR_BELLY = [0.96, 0.96, 0.96, 1.0]; // White belly
const COLOR_EYE = [0.98, 0.98, 0.98, 1.0]; // White eyes
const COLOR_PUPIL = [0.03, 0.03, 0.03, 1.0]; // Black pupils
const COLOR_SNOUT_NOSTRIL = [0.1, 0.1, 0.1, 1.0]; // Nostril color
const COLOR_HORN = [0.88, 0.88, 0.88, 1.0]; // Light gray horns
const COLOR_WING = [0.85, 0.65, 0.15, 1.0]; // Darker orange wings
const COLOR_CLAW = [0.75, 0.75, 0.75, 1.0]; // Gray claws

// --- Warna Api ---
const COLOR_FIRE_CORE = [1.0, 0.8, 0.0, 1.0]; // Kuning terang
const COLOR_FIRE_MID = [1.0, 0.4, 0.0, 1.0]; // Oranye
const COLOR_FIRE_OUTER = [0.8, 0.1, 0.0, 1.0]; // Merah gelap
const COLOR_FIRE_SMOKE = [0.2, 0.2, 0.2, 0.5]; // Asap (dengan sedikit transparansi)

// =================================================================
// Fungsi Geometri (Diadaptasi untuk menghasilkan Warna, bukan Normal)
// =================================================================

// Disalin dari dragonAir.js agar konsisten
function createSphere(radius, segments, rings, color) {
  var vertices = [],
    colors = [],
    indices = [];
  var r = color[0],
    g = color[1],
    b = color[2],
    a = color[3] || 1.0;

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
      colors.push(r, g, b, a);
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
  return { vertices: new Float32Array(vertices), colors: new Float32Array(colors), indices: new Uint16Array(indices) };
}

// Disalin dari dragonAir.js agar konsisten
function createCone(baseRadius, height, segments, color) {
  var vertices = [],
    colors = [],
    indices = [];
  var r = color[0],
    g = color[1],
    b = color[2],
    a = color[3] || 1.0;

  vertices.push(0, height, 0); // Puncak
  colors.push(r, g, b, a);

  // Vertex dasar lingkaran
  for (var i = 0; i <= segments; i++) {
    var angle = (i * 2 * Math.PI) / segments;
    var x = baseRadius * Math.cos(angle);
    var z = baseRadius * Math.sin(angle);
    vertices.push(x, 0, z); // Y=0 untuk dasar
    colors.push(r, g, b, a);
  }

  // Indices untuk sisi kerucut
  for (var i = 1; i <= segments; i++) {
    var nextIndex = i === segments ? 1 : i + 1;
    indices.push(0, i, nextIndex);
  }
  return { vertices: new Float32Array(vertices), colors: new Float32Array(colors), indices: new Uint16Array(indices) };
}

// BARU: Adaptasi dari kode Dragonite
function createCylinder(radius, height, segments, color) {
  var vertices = [],
    colors = [],
    indices = [];
  var r = color[0],
    g = color[1],
    b = color[2],
    a = color[3] || 1.0;
  var half = height / 2;

  for (let i = 0; i <= segments; i++) {
    var theta = (i * 2 * Math.PI) / segments;
    var x = Math.cos(theta);
    var z = Math.sin(theta);
    // Vertex atas
    vertices.push(radius * x, half, radius * z);
    colors.push(r, g, b, a);
    // Vertex bawah
    vertices.push(radius * x, -half, radius * z);
    colors.push(r, g, b, a);
  }
  for (let i = 0; i < segments; i++) {
    var a = i * 2; // atas saat ini
    var b = i * 2 + 1; // bawah saat ini
    var c = (i + 1) * 2; // atas berikutnya
    var d = (i + 1) * 2 + 1; // bawah berikutnya
    indices.push(a, b, c);
    indices.push(b, d, c);
  }
  return { vertices: new Float32Array(vertices), colors: new Float32Array(colors), indices: new Uint16Array(indices) };
}

// BARU: Adaptasi dari kode Dragonite
function createEllipsoid(rx, ry, rz, segments, color) {
  var vertices = [],
    colors = [],
    indices = [];
  var r = color[0],
    g = color[1],
    b = color[2],
    a = color[3] || 1.0;
  const taperFactor = 0.5; // Tapering dari kode asli

  for (let lat = 0; lat <= segments; lat++) {
    const theta = (lat * Math.PI) / segments;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const taperingFactor = 1.0 - (taperFactor * (1.0 + cosT)) / 2.0;
    const currentRX = rx * taperingFactor;
    const currentRZ = rz * taperingFactor;

    for (let lon = 0; lon <= segments; lon++) {
      const phi = (lon * 2 * Math.PI) / segments;
      const sinP = Math.sin(phi);
      const cosP = Math.cos(phi);
      const x = cosP * sinT;
      const y = cosT;
      const z = sinP * sinT;
      vertices.push(currentRX * x, ry * y, currentRZ * z);
      colors.push(r, g, b, a);
    }
  }

  for (let lat = 0; lat < segments; lat++) {
    for (let lon = 0; lon < segments; lon++) {
      const first = lat * (segments + 1) + lon;
      const second = first + segments + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }
  return { vertices: new Float32Array(vertices), colors: new Float32Array(colors), indices: new Uint16Array(indices) };
}

// =================================================================
// Class OOP untuk DRAGONITE
// =================================================================

function Dragonite(gl, programInfo) {
  this.gl = gl;
  this.programInfo = programInfo;

  this.rootNode = null; // Ini akan menjadi 'dragoniteRoot'
  this.nodes = {}; // Tempat menyimpan semua node (body, head, armR, dll.)

  // Hitung titik terendah model secara manual berdasarkan kode build
  this.minY = -3.1;
  this.finalTailRadius = 0.18;
  this.tailSegmentsCount = 8;
  this.tailSegmentLength = 1.0;

  // Variabel Gerakan (disalin dari Dragonair)
  this.position = [0, 0, 0]; // Posisi X, Y (di ground), Z di dunia
  this.targetPosition = null; // Target [x, z] berikutnya
  this.currentAngleY = 0; // Sudut hadap saat ini (derajat)
  this.moveSpeed = 5.0; // Unit per detik
  this.worldBounds = 400; // Batas dunia (samakan dengan di main)
  this.targetReachedThreshold = 2.0; // Jarak minimum untuk ganti target

  // Variabel Animasi Api
  this.isBreathingFire = false;
  this.fireBreathStartTime = 0;
  this.fireBreathDuration = 1.5; // Durasi semburan api dalam detik
  this.fireInterval = 5.0; // Setiap berapa detik api akan menyembur
  this.lastFireTime = 0;

  // Variabel Animasi Kepak Sayap
  this.wingFlapInterval = 3.0; // Setiap 3 detik
  this.wingFlapDuration = 0.5; // Durasi kepak (cepat)
  this.lastWingFlapTime = 0;
  this.isFlapping = false;
  this.wingFlapStartTime = 0;

  // ==================================================
  // ** TAMBAHAN BARU: Variabel Animasi Kibas Ekor **
  // ==================================================
  this.tailWagInterval = 4.5; // Setiap 4.5 detik
  this.tailWagDuration = 0.8; // Durasi kibasan (agak cepat)
  this.lastTailWagTime = 0;
  this.isWagging = false;
  this.tailWagStartTime = 0;
}

/**
 * Membuat semua geometri statis, buffer, dan membangun scene graph
 * untuk Dragonite.
 */
Dragonite.prototype.init = function () {
  var gl = this.gl;
  var programInfo = this.programInfo;

  // 1. Buat Geometri Statis Dragonite
  var bodyModel = createEllipsoid(1.4, 1.7, 1.4, 30, COLOR_BODY);
  var bellyModel = createEllipsoid(1.2, 1.5, 1.2, 20, COLOR_BELLY);
  var shoulderModel = createSphere(0.75, 20, 20, COLOR_BODY);
  var neckCylModel = createCylinder(0.5, 0.5, 20, COLOR_BODY);
  var neckTopModel = createSphere(0.55, 18, 18, COLOR_BODY);
  var headCylModel = createCylinder(0.5, 0.8, 22, COLOR_BODY);
  var headTopModel = createSphere(0.5, 20, 20, COLOR_BODY);
  var snoutModel = createEllipsoid(0.35, 0.3, 0.4, 12, COLOR_BODY);
  var nostrilModel = createSphere(0.06, 8, 8, COLOR_SNOUT_NOSTRIL);
  var eyeModel = createSphere(0.15, 10, 10, COLOR_EYE);
  var pupilModel = createSphere(0.1, 8, 8, COLOR_PUPIL);
  var hornModel = createCone(0.1, 0.7, 8, COLOR_HORN);
  var armModel = createCylinder(0.25, 1.2, 12, COLOR_BODY);
  var armJointModel = createSphere(0.3, 10, 10, COLOR_BODY);
  var clawModel = createCone(0.1, 0.35, 6, COLOR_CLAW);
  var legModel = createEllipsoid(0.45, 1.2, 0.45, 14, COLOR_BODY);
  var footBaseModel = createEllipsoid(0.3, 0.2, 0.6, 10, COLOR_BODY);
  var wingModel = createEllipsoid(1.0, 1.8, 0.1, 12, COLOR_WING);
  var tailSegModel = createEllipsoid(0.35, this.tailSegmentLength, 0.35, 10, COLOR_BODY);
  var tailTipModel = createSphere(this.finalTailRadius * 1.2, 8, 8, COLOR_BODY);

  // 2. Buat Geometri Api
  var fireConeCoreModel = createCone(0.15, 0.5, 16, COLOR_FIRE_CORE);
  var fireConeMidModel = createCone(0.25, 0.7, 16, COLOR_FIRE_MID);
  var fireConeOuterModel = createCone(0.35, 0.9, 16, COLOR_FIRE_OUTER);
  var fireBallModel = createSphere(0.1, 8, 8, COLOR_FIRE_OUTER);
  var smokeBallModel = createSphere(0.2, 8, 8, COLOR_FIRE_SMOKE);

  // 3. Inisialisasi Buffer Statis Dragonite
  var bodyBuffers = initBuffers(gl, programInfo, bodyModel);
  var bellyBuffers = initBuffers(gl, programInfo, bellyModel);
  var shoulderBuffers = initBuffers(gl, programInfo, shoulderModel);
  var neckCylBuffers = initBuffers(gl, programInfo, neckCylModel);
  var neckTopBuffers = initBuffers(gl, programInfo, neckTopModel);
  var headCylBuffers = initBuffers(gl, programInfo, headCylModel);
  var headTopBuffers = initBuffers(gl, programInfo, headTopModel);
  var snoutBuffers = initBuffers(gl, programInfo, snoutModel);
  var nostrilBuffers = initBuffers(gl, programInfo, nostrilModel);
  var eyeBuffers = initBuffers(gl, programInfo, eyeModel);
  var pupilBuffers = initBuffers(gl, programInfo, pupilModel);
  var hornBuffers = initBuffers(gl, programInfo, hornModel);
  var armBuffers = initBuffers(gl, programInfo, armModel);
  var armJointBuffers = initBuffers(gl, programInfo, armJointModel);
  var clawBuffers = initBuffers(gl, programInfo, clawModel);
  var legBuffers = initBuffers(gl, programInfo, legModel);
  var footBaseBuffers = initBuffers(gl, programInfo, footBaseModel);
  var wingBuffers = initBuffers(gl, programInfo, wingModel);
  var tailSegBuffers = initBuffers(gl, programInfo, tailSegModel);
  var tailTipBuffers = initBuffers(gl, programInfo, tailTipModel);

  // 4. Inisialisasi Buffer Statis Api
  var fireConeCoreBuffers = initBuffers(gl, programInfo, fireConeCoreModel);
  var fireConeMidBuffers = initBuffers(gl, programInfo, fireConeMidModel);
  var fireConeOuterBuffers = initBuffers(gl, programInfo, fireConeOuterModel);
  var fireBallBuffers = initBuffers(gl, programInfo, fireBallModel);
  var smokeBallBuffers = initBuffers(gl, programInfo, smokeBallModel);

  // 5. Bangun Scene Graph (Hierarkis)
  this.rootNode = new SceneNode(null); // 'dragoniteRoot'
  var n = this.nodes; // shortcut

  // Tubuh Utama
  n.body = new SceneNode(bodyBuffers);
  this.rootNode.children.push(n.body);

  n.belly = new SceneNode(bellyBuffers);
  n.body.children.push(n.belly);
  n.shoulder = new SceneNode(shoulderBuffers);
  n.body.children.push(n.shoulder);

  // Leher & Kepala
  n.neck = new SceneNode(neckCylBuffers);
  n.shoulder.children.push(n.neck);
  n.neckTop = new SceneNode(neckTopBuffers);
  n.neck.children.push(n.neckTop);
  n.headCyl = new SceneNode(headCylBuffers);
  n.neckTop.children.push(n.headCyl);
  n.headTop = new SceneNode(headTopBuffers);
  n.headCyl.children.push(n.headTop);
  n.snout = new SceneNode(snoutBuffers);
  n.headCyl.children.push(n.snout);

  n.nostrilR = new SceneNode(nostrilBuffers);
  n.snout.children.push(n.nostrilR);
  n.nostrilL = new SceneNode(nostrilBuffers);
  n.snout.children.push(n.nostrilL);

  n.eyeR = new SceneNode(eyeBuffers);
  n.headCyl.children.push(n.eyeR);
  n.eyeL = new SceneNode(eyeBuffers);
  n.headCyl.children.push(n.eyeL);

  n.pupilR = new SceneNode(pupilBuffers);
  n.eyeR.children.push(n.pupilR); // Anak dari mata
  n.pupilL = new SceneNode(pupilBuffers);
  n.eyeL.children.push(n.pupilL); // Anak dari mata

  n.hornR = new SceneNode(hornBuffers);
  n.headTop.children.push(n.hornR);
  n.hornL = new SceneNode(hornBuffers);
  n.headTop.children.push(n.hornL);

  // Tangan (Anak dari Body)
  n.armPoseR = new SceneNode(null); // Node pose untuk grup
  n.body.children.push(n.armPoseR);
  n.armGeomR = new SceneNode(armBuffers);
  n.armPoseR.children.push(n.armGeomR);
  n.armJointR = new SceneNode(armJointBuffers);
  n.armPoseR.children.push(n.armJointR);
  n.armClawsR = [new SceneNode(clawBuffers), new SceneNode(clawBuffers), new SceneNode(clawBuffers)];
  n.armJointR.children.push(n.armClawsR[0], n.armClawsR[1], n.armClawsR[2]);

  n.armPoseL = new SceneNode(null); // Node pose untuk grup
  n.body.children.push(n.armPoseL);
  n.armGeomL = new SceneNode(armBuffers);
  n.armPoseL.children.push(n.armGeomL);
  n.armJointL = new SceneNode(armJointBuffers);
  n.armPoseL.children.push(n.armJointL);
  n.armClawsL = [new SceneNode(clawBuffers), new SceneNode(clawBuffers), new SceneNode(clawBuffers)];
  n.armJointL.children.push(n.armClawsL[0], n.armClawsL[1], n.armClawsL[2]);

  // Kaki (Anak dari Body)
  n.legR = new SceneNode(legBuffers);
  n.body.children.push(n.legR);
  n.footBaseR = new SceneNode(footBaseBuffers);
  n.legR.children.push(n.footBaseR);
  n.footClawsR = [new SceneNode(clawBuffers), new SceneNode(clawBuffers), new SceneNode(clawBuffers)];
  n.footBaseR.children.push(n.footClawsR[0], n.footClawsR[1], n.footClawsR[2]);

  n.legL = new SceneNode(legBuffers);
  n.body.children.push(n.legL);
  n.footBaseL = new SceneNode(footBaseBuffers);
  n.legL.children.push(n.footBaseL);
  n.footClawsL = [new SceneNode(clawBuffers), new SceneNode(clawBuffers), new SceneNode(clawBuffers)];
  n.footBaseL.children.push(n.footClawsL[0], n.footClawsL[1], n.footClawsL[2]);

  // Sayap (Anak dari Body)
  n.wingR = new SceneNode(wingBuffers);
  n.body.children.push(n.wingR);
  n.wingL = new SceneNode(wingBuffers);
  n.body.children.push(n.wingL);

  // Ekor (Berantai, anak dari Body)
  n.tailRoot = new SceneNode(null);
  n.body.children.push(n.tailRoot);
  n.tailSegs = [];
  var currentNode = n.tailRoot;
  for (let i = 0; i < this.tailSegmentsCount; i++) {
    var seg = new SceneNode(tailSegBuffers);
    n.tailSegs.push(seg);
    currentNode.children.push(seg);
    currentNode = seg;
  }
  n.tailTip = new SceneNode(tailTipBuffers);
  currentNode.children.push(n.tailTip); // Tip adalah anak dari segmen terakhir

  // Node Api (anak dari kepala, disembunyikan secara default)
  n.fire = new SceneNode(null); // Node grup untuk api
  n.snout.children.push(n.fire); // Api keluar dari moncong

  n.fireCone1 = new SceneNode(fireConeCoreBuffers);
  n.fire.children.push(n.fireCone1);
  n.fireCone2 = new SceneNode(fireConeMidBuffers);
  n.fire.children.push(n.fireCone2);
  n.fireCone3 = new SceneNode(fireConeOuterBuffers);
  n.fire.children.push(n.fireCone3);

  // Beberapa bola api/asap untuk efek
  n.fireBall1 = new SceneNode(fireBallBuffers);
  n.fire.children.push(n.fireBall1);
  n.fireBall2 = new SceneNode(fireBallBuffers);
  n.fire.children.push(n.fireBall2);
  n.smokeBall = new SceneNode(smokeBallBuffers);
  n.fire.children.push(n.smokeBall);
};

/**
 * Meng-update matriks lokal untuk animasi.
 * (MODIFIKASI: Kibas Ekor)
 */
Dragonite.prototype.update = function (now, groundY, elapsed) {
  var gl = this.gl;
  var programInfo = this.programInfo;
  var dt = elapsed / 1000.0;
  var n = this.nodes;
  var nowSeconds = now / 1000.0; // Waktu dalam detik

  // ==================================================
  // ** SKALA MODEL **
  // ==================================================
  var desiredScale = 2.0;

  // ==================================================
  // ** LOGIKA ANIMASI DIAM DI TEMPAT (DINONAKTIFKAN) **
  // ==================================================
  /*
  if (
    this.targetPosition === null ||
    (Math.abs(this.position[0] - this.targetPosition[0]) < this.targetReachedThreshold && Math.abs(this.position[2] - this.targetPosition[2]) < this.targetReachedThreshold)
  ) {
    let padding = 30;
    this.targetPosition = [(Math.random() * (this.worldBounds - padding * 2)) - (this.worldBounds / 2 - padding), (Math.random() * (this.worldBounds - padding * 2)) - (this.worldBounds / 2 - padding)];
  }
  let dx = this.targetPosition[0] - this.position[0];
  let dz = this.targetPosition[1] - this.position[2];
  let distToTarget = Math.sqrt(dx * dx + dz * dz);
  if (distToTarget > this.targetReachedThreshold) {
    let targetAngleRad = Math.atan2(dx, dz);
    this.currentAngleY = (targetAngleRad * 180.0) / Math.PI;
    while (this.currentAngleY > 180) this.currentAngleY -= 360;
    while (this.currentAngleY < -180) this.currentAngleY += 360;
    let moveAmount = this.moveSpeed * dt;
    if (moveAmount > distToTarget) moveAmount = distToTarget;
    let moveDir = normalizeVector([dx, 0, dz]);
    this.position[0] += moveDir[0] * moveAmount;
    this.position[2] += moveDir[2] * moveAmount;
  } else {
    this.targetPosition = null;
  }
  */

  // ==================================================
  // ** LOGIKA ANIMASI API **
  // ==================================================
  if (nowSeconds - this.lastFireTime > this.fireInterval) {
    this.isBreathingFire = true;
    this.fireBreathStartTime = nowSeconds;
    this.lastFireTime = nowSeconds;
  }
  if (this.isBreathingFire) {
    let fireElapsedTime = nowSeconds - this.fireBreathStartTime;
    if (fireElapsedTime > this.fireBreathDuration) {
      this.isBreathingFire = false;
    }
  }
  // Visibilitas api
  n.fireCone1.enabled = this.isBreathingFire;
  n.fireCone2.enabled = this.isBreathingFire;
  n.fireCone3.enabled = this.isBreathingFire;
  n.fireBall1.enabled = this.isBreathingFire;
  n.fireBall2.enabled = this.isBreathingFire;
  n.smokeBall.enabled = this.isBreathingFire;

  // ==================================================
  // ** LOGIKA ANIMASI KEPAK SAYAP **
  // ==================================================
  if (nowSeconds - this.lastWingFlapTime > this.wingFlapInterval) {
    this.isFlapping = true;
    this.wingFlapStartTime = nowSeconds;
    this.lastWingFlapTime = nowSeconds;
  }
  let flapAngle = 0; // Sudut flap tambahan (default 0)
  if (this.isFlapping) {
    let flapElapsedTime = nowSeconds - this.wingFlapStartTime;
    if (flapElapsedTime > this.wingFlapDuration) {
      this.isFlapping = false;
    } else {
      let flapAnimProgress = flapElapsedTime / this.wingFlapDuration; // 0.0 -> 1.0
      flapAngle = Math.sin(flapAnimProgress * Math.PI * 2.0) * 40;
    }
  }

  // ==================================================
  // ** LOGIKA ANIMASI KIBAS EKOR (BARU) **
  // ==================================================
  if (nowSeconds - this.lastTailWagTime > this.tailWagInterval) {
    this.isWagging = true;
    this.tailWagStartTime = nowSeconds;
    this.lastTailWagTime = nowSeconds;
  }
  let wagAngle = 0; // Sudut kibasan (rotasi Y)
  if (this.isWagging) {
    let wagElapsedTime = nowSeconds - this.tailWagStartTime;
    if (wagElapsedTime > this.tailWagDuration) {
      this.isWagging = false;
    } else {
      let wagAnimProgress = wagElapsedTime / this.tailWagDuration; // 0.0 -> 1.0
      // Math.PI * 4.0 = 2 siklus penuh (kiri-kanan-kiri-kanan)
      wagAngle = Math.sin(wagAnimProgress * Math.PI * 4.0) * 30; // 30 derajat
    }
  }

  // Perhitungan Y ground (disesuaikan dengan skala baru)
  var modelGroundY = groundY - this.minY * desiredScale + 0.01;

  // --- Update Matriks Lokal di Scene Graph ---

  // 1. Update Root (posisi global model)
  this.rootNode.localMatrix.setRotate(this.currentAngleY, 0, 1, 0).scale(desiredScale, desiredScale, desiredScale).translate(this.position[0], modelGroundY, this.position[2]);

  // 2. Update Body (relatif ke root)
  n.body.localMatrix.setIdentity().translate(0, -1, 0);

  // 3. Update Anak-anak Body
  n.belly.localMatrix.setIdentity().translate(0, -0.3, 0.45).scale(0.95, 0.9, 0.85);
  n.shoulder.localMatrix.setIdentity().translate(0, 0.6, 0.1);

  // 4. Update Leher & Kepala (relatif ke induknya)
  n.neck.localMatrix.setIdentity().translate(0, 0.25, 0);
  n.neckTop.localMatrix.setIdentity().translate(0, 0.25, 0);
  n.headCyl.localMatrix.setIdentity().translate(0, 0.35, 0.05);
  n.headTop.localMatrix.setIdentity().translate(0, 0.4, 0);
  n.snout.localMatrix.setIdentity().translate(0, -0.05, 0.6).scale(1.1, 1.0, 1.0);
  n.nostrilR.localMatrix.setIdentity().translate(0.12, -0.08, 0.24);
  n.nostrilL.localMatrix.setIdentity().translate(-0.12, -0.08, 0.24);
  n.eyeR.localMatrix.setIdentity().translate(0.35, 0.15, 0.35);
  n.eyeL.localMatrix.setIdentity().translate(-0.35, 0.15, 0.35);
  n.pupilR.localMatrix.setIdentity().translate(0, 0, 0.08);
  n.pupilL.localMatrix.setIdentity().translate(0, 0, 0.08);
  n.hornR.localMatrix.setIdentity().translate(0.2, 0.45, 0).rotate(-25, 0, 0, 1);
  n.hornL.localMatrix.setIdentity().translate(-0.2, 0.45, 0).rotate(25, 0, 0, 1);

  // 5. Tangan
  n.armPoseR.localMatrix.setIdentity().translate(0.9, 0.3, 0.2).rotate(-30, 1, 0, 0).rotate(40, 0, 0, 1);
  n.armGeomR.localMatrix.setIdentity().scale(0.9, 1.5, 1.0);
  n.armJointR.localMatrix.setIdentity().translate(0, -0.9, 0);
  var armClawSpacing = 0.1;
  for (let i = 0; i < 3; i++) {
    let xOffset = (i - 1) * armClawSpacing;
    n.armClawsR[i].localMatrix.setIdentity().translate(xOffset, -0.3, 0.1).rotate(180, 1, 0, 0);
  }
  n.armPoseL.localMatrix.setIdentity().translate(-0.9, 0.3, 0.2).rotate(-30, 1, 0, 0).rotate(-40, 0, 0, 1);
  n.armGeomL.localMatrix.setIdentity().scale(0.9, 1.5, 1.0);
  n.armJointL.localMatrix.setIdentity().translate(0, -0.9, 0);
  for (let i = 0; i < 3; i++) {
    let xOffset = (i - 1) * armClawSpacing;
    n.armClawsL[i].localMatrix.setIdentity().translate(xOffset, -0.3, 0.1).rotate(180, 1, 0, 0);
  }

  // 6. Kaki
  n.legR.localMatrix.setIdentity().translate(0.6, -1.0, 0.1).rotate(10, 1, 0, 0);
  n.footBaseR.localMatrix.setIdentity().translate(0, -1, 0.3).rotate(-10, 1, 0, 0);
  var clawSpacing = 0.1;
  for (let i = 0; i < 3; i++) {
    let xOffset = (i - 1) * clawSpacing;
    n.footClawsR[i].localMatrix.setIdentity().translate(xOffset, -0.1, 0.4).rotate(90, 1, 0, 0).rotate(10, 1, 0, 0);
  }
  n.legL.localMatrix.setIdentity().translate(-0.6, -1.0, 0.1).rotate(10, 1, 0, 0);
  n.footBaseL.localMatrix.setIdentity().translate(0, -1, 0.3).rotate(-10, 1, 0, 0);
  for (let i = 0; i < 3; i++) {
    let xOffset = (i - 1) * clawSpacing;
    n.footClawsL[i].localMatrix.setIdentity().translate(xOffset, -0.1, 0.4).rotate(90, 1, 0, 0).rotate(10, 1, 0, 0);
  }

  // 7. Sayap (POSISI NAIK + ANIMASI KEPAK)
  var wingOffsetY = 0.5; // Posisi Y dinaikkan
  var wingOffsetZ = -0.1;
  var wingRotZ = 114;
  var wingRotY = -10;
  var wingRotX_base = -15; // Posisi istirahat
  var animatedWingRotX = wingRotX_base + flapAngle; // Terapkan animasi

  n.wingR.localMatrix.setIdentity().translate(1.3, wingOffsetY, wingOffsetZ).rotate(wingRotZ, 0, 0, 1).rotate(wingRotY, 0, 1, 0).rotate(animatedWingRotX, 1, 0, 0); // Pakai rotasi X animasi

  n.wingL.localMatrix.setIdentity().translate(-1.3, wingOffsetY, wingOffsetZ).rotate(-wingRotZ, 0, 0, 1).rotate(-wingRotY, 0, 1, 0).rotate(animatedWingRotX, 1, 0, 0); // Pakai rotasi X animasi

  // 8. Ekor (ANIMASI KIBASAN DITAMBAHKAN)
  n.tailRoot.localMatrix
    .setIdentity()
    .translate(0, -1.0, -0.2)
    .rotate(wagAngle, 0, 1, 0) // <-- ROTASI Y UNTUK KIBASAN
    .rotate(30, 1, 0, 0); // Rotasi X untuk lengkungan

  var overlapDistance = this.tailSegmentLength * 0.3;
  var initialRadius = 0.35;
  var finalRadius = this.finalTailRadius;
  var power = 4.0;
  var curveAmount = 10;
  for (let i = 0; i < this.tailSegmentsCount; i++) {
    let t = i / (this.tailSegmentsCount - 1);
    let progress = Math.pow(t, power);
    let currentRadius = initialRadius - (finalRadius - finalRadius) * progress;
    let scale = currentRadius / 0.35;
    n.tailSegs[i].localMatrix.setIdentity().translate(0, -overlapDistance, 0).rotate(curveAmount, 1, 0, 0).scale(scale, 1.0, scale);
  }
  n.tailTip.localMatrix.setIdentity().translate(0, -0.1, 0);

  // 9. Animasi Api
  if (this.isBreathingFire) {
    let fireElapsedTime = now / 1000 - this.fireBreathStartTime;
    let animProgress = fireElapsedTime / this.fireBreathDuration;
    let fireScaleFactor = Math.sin(animProgress * Math.PI) * 1.5;
    if (fireScaleFactor < 0) fireScaleFactor = 0;
    let fireOffsetZ = 0.3 + animProgress * 1.5;
    let fireOffsetY = -0.1 + Math.sin(animProgress * Math.PI * 2) * 0.1;

    n.fire.localMatrix.setIdentity().translate(0, fireOffsetY, fireOffsetZ).rotate(90, 1, 0, 0).scale(fireScaleFactor, fireScaleFactor, fireScaleFactor);

    n.fireBall1.localMatrix
      .setIdentity()
      .translate(0.05, 0.05, 0.2 + animProgress * 0.5)
      .scale(1.0 - animProgress, 1.0 - animProgress, 1.0 - animProgress);
    n.fireBall2.localMatrix
      .setIdentity()
      .translate(-0.05, -0.05, 0.4 + animProgress * 0.7)
      .scale(0.8 - animProgress, 0.8 - animProgress, 0.8 - animProgress);
    let smokeProgress = Math.max(0, animProgress - 0.5) * 2;
    n.smokeBall.localMatrix
      .setIdentity()
      .translate(0, 0.2 + smokeProgress * 0.5, 0.5 + smokeProgress * 0.5)
      .scale(smokeProgress, smokeProgress, smokeProgress);
  } else {
    n.fire.localMatrix.setIdentity().scale(0, 0, 0);
  }
};

/**
 * Getter sederhana untuk mendapatkan node akar dari scene graph.
 */
Dragonite.prototype.getRootNode = function () {
  return this.rootNode;
};

// Fungsi utilitas yang mungkin tidak ada di libs.js tapi dibutuhkan untuk gerakan
function normalizeVector(v) {
  let len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len > 0) {
    return [v[0] / len, v[1] / len, v[2] / len];
  }
  return [0, 0, 0];
}
