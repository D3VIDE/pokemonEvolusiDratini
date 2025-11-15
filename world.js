// =================================================================
// world.js
// World Environment: Crystal Clear Lake and Mountain Sanctuary
// =================================================================

// --- WARNA WORLD (Sesuai Tema Crystal Clear) ---
var SKY_COLOR = [0.53, 0.81, 0.92, 1.0]; // Biru Langit Cerah
var MOUNTAIN_SNOW = [0.95, 0.95, 0.98, 1.0]; // Putih Salju
var MOUNTAIN_ROCK = [0.4, 0.45, 0.5, 1.0]; // Abu-abu Batu Gelap
var GRASS_GREEN = [0.35, 0.65, 0.25, 1.0]; // Hijau Padang Rumput
var WATER_SURFACE = [0.1, 0.6, 0.8, 0.7]; // Biru Air Kristal (Semi-transparan)
var WATER_BED = [0.15, 0.4, 0.6, 1.0]; // Biru Dasar Danau
var TREE_TRUNK = [0.55, 0.4, 0.3, 1.0]; // Cokelat Batang Pohon
var TREE_LEAVES = [0.2, 0.55, 0.15, 1.0]; // Hijau Daun
var ROCK_COLOR = [0.5, 0.5, 0.5, 1.0]; // Batu

// --- KONSTANTA FISIK & UKURAN ---
var WORLD_BOUNDS = 400.0; // Batas Dunia (sesuai di main.js)
var WATER_Y = -1.5; // Ketinggian Y permukaan air
var GROUND_Y = -3.5; // Ketinggian Y daratan di bawah air

// =================================================================
// FUNGSI GEOMETRI DASAR (DIPERLUKAN)
// =================================================================

/**
 * Membuat bidang datar (Plane) di bidang XZ.
 */
function createPlane(width, depth, color) {
    var halfW = width / 2;
    var halfD = depth / 2;

    var vertices = new Float32Array([
        -halfW, 0, halfD, // 0
        halfW, 0, halfD, // 1
        halfW, 0, -halfD, // 2
        -halfW, 0, -halfD // 3
    ]);

    var colors = new Float32Array([
        color[0], color[1], color[2], color[3] || 1.0,
        color[0], color[1], color[2], color[3] || 1.0,
        color[0], color[1], color[2], color[3] || 1.0,
        color[0], color[1], color[2], color[3] || 1.0
    ]);

    var indices = new Uint16Array([
        0, 1, 2, // Segitiga 1
        0, 2, 3 // Segitiga 2
    ]);

    return { vertices: vertices, colors: colors, indices: indices };
}

/**
 * Membuat Prisma Sederhana (untuk daun poly-rendah).
 */
function createPrism(baseSize, height, color) {
    var halfH = height / 2;
    var vertices = new Float32Array([
        0, halfH, 0,
        -baseSize / 2, -halfH, baseSize / 2,
        baseSize / 2, -halfH, baseSize / 2,

        0, halfH, 0,
        -baseSize / 2, -halfH, -baseSize / 2,
        baseSize / 2, -halfH, -baseSize / 2,
    ]);

    var colors = [];
    for (let i = 0; i < vertices.length / 3; i++) {
        colors.push(color[0], color[1], color[2], color[3] || 1.0);
    }
    colors = new Float32Array(colors);

    var indices = new Uint16Array([
        0, 2, 1, 
        3, 4, 5,
        0, 4, 1,
        3, 5, 2,
        0, 3, 4,
        0, 5, 2,

        1, 2, 5,
        1, 5, 4
    ]);

    return { vertices: vertices, colors: colors, indices: indices };
}

/**
 * Membuat geometri low-poly mountain dengan puncak bersalju (snow cap).
 * Mengganti konsep 'coral mountain'.
 * @param {number} radius - radius dasar gunung
 * @param {number} height - tinggi gunung
 */
function createLowPolyMountain(radius, height) {
    let vertices = [];
    let colors = [];
    let indices = [];

    // Puncak utama (Snow Cap)
    vertices.push(0, height, 0); 
    colors.push(MOUNTAIN_SNOW[0], MOUNTAIN_SNOW[1], MOUNTAIN_SNOW[2], 1);

    let segments = 12; // Jumlah segmen dasar (poly count)
    let baseIndexStart = 1;

    // Lingkaran dasar + warna (Rock Base)
    for (let i = 0; i < segments; i++) {
        let angle = (i / segments) * Math.PI * 2;
        
        // Tambahkan variasi acak pada radius dasar
        let r = radius * (0.7 + Math.random() * 0.3);
        let x = Math.cos(angle) * r;
        let z = Math.sin(angle) * r;
        let y = 0;

        vertices.push(x, y, z);

        // Bagian bawah = batu (abu)
        colors.push(MOUNTAIN_ROCK[0], MOUNTAIN_ROCK[1], MOUNTAIN_ROCK[2], 1);
    }

    // Buat segitiga puncak (sisi gunung)
    for (let i = 0; i < segments; i++) {
        let a = 0; // Puncak
        let b = baseIndexStart + i;
        let c = baseIndexStart + ((i + 1) % segments);
        indices.push(a, b, c);
        
        // Tambahkan satu layer snow cap lagi
        let d = a; // Puncak
        let e = baseIndexStart + i;
        let f = baseIndexStart + ((i + 1) % segments);
        
        // Untuk snow cap, hanya ubah warna vertex teratas
        colors[e * 4] = MOUNTAIN_SNOW[0];
        colors[e * 4 + 1] = MOUNTAIN_SNOW[1];
        colors[e * 4 + 2] = MOUNTAIN_SNOW[2];
    }

    // Tutup dasar (Rock Base - Center)
    let centerIdx = vertices.length / 3;
    vertices.push(0, 0, 0);
    colors.push(MOUNTAIN_ROCK[0], MOUNTAIN_ROCK[1], MOUNTAIN_ROCK[2], 1);

    for (let i = 0; i < segments; i++) {
        let a = centerIdx;
        let b = baseIndexStart + ((i + 1) % segments);
        let c = baseIndexStart + i;
        indices.push(a, b, c);
    }

    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices)
    };
}


// =================================================================
// PENGELOLAAN WORLD SCENE GRAPH
// =================================================================

/**
 * Class yang berisi semua geometri World.
 */
function WorldEnvironment(gl, programInfo) {
    this.gl = gl;
    this.programInfo = programInfo;
    this.rootNode = new SceneNode(null);
    this.nodes = {}; 
    this.buffers = {}; 
}

/**
 * Inisialisasi geometri dan scene graph World.
 */
WorldEnvironment.prototype.init = function() {
    var gl = this.gl;
    var info = this.programInfo;

    // --- 1. GEOMETRI & BUFFERS STATIS ---

    // Danau/Sungai
    var lakeGeo = createSphere(40.0, 30, 30, WATER_SURFACE);
    this.buffers.lake = initBuffers(gl, info, lakeGeo);
    var lakeBedGeo = createSphere(40.0, 30, 30, WATER_BED);
    this.buffers.lakeBed = initBuffers(gl, info, lakeBedGeo);
    
    // Daratan Utama
    var groundGeo = createPlane(WORLD_BOUNDS, WORLD_BOUNDS, GRASS_GREEN);
    this.buffers.ground = initBuffers(gl, info, groundGeo);

    // Gunung Low-Poly BARU (Mengganti Coral)
    var mountainGeo = createLowPolyMountain(40, 120); // Radius 40, Tinggi 120
    this.buffers.mountain = initBuffers(gl, info, mountainGeo);
    
    var rockGeo = createSphere(1.0, 6, 6, ROCK_COLOR);
    this.buffers.rock = initBuffers(gl, info, rockGeo);

    var treeTrunkGeo = createCylinder(1.0, 10.0, 8, TREE_TRUNK);
    this.buffers.treeTrunk = initBuffers(gl, info, treeTrunkGeo);
    var treeLeavesGeo = createPrism(10.0, 12.0, TREE_LEAVES);
    this.buffers.treeLeaves = initBuffers(gl, info, treeLeavesGeo);

    // --- 2. BANGUN SCENE GRAPH (Objek Statis) ---

    this.rootNode.localMatrix.setIdentity();

    // Node Daratan Utama
    this.nodes.ground = new SceneNode(this.buffers.ground);
    this.nodes.ground.localMatrix.setIdentity().translate(0, GROUND_Y, 0);
    this.rootNode.children.push(this.nodes.ground);

    // Node Dasar Danau & Permukaan Air
    this.nodes.lakeBed = new SceneNode(this.buffers.lakeBed);
    this.nodes.lakeBed.localMatrix.setIdentity().translate(0, WATER_Y - 5.0, 0).scale(1, 0.15, 1);
    this.nodes.ground.children.push(this.nodes.lakeBed);

    this.nodes.lakeSurface = new SceneNode(this.buffers.lake);
    this.nodes.lakeSurface.localMatrix.setIdentity().translate(0, WATER_Y, 0).scale(1, 0.05, 1);
    this.nodes.ground.children.push(this.nodes.lakeSurface);

    // Node Container Gunung Low-Poly
    this.nodes.mountains = new SceneNode(null);
    this.nodes.ground.children.push(this.nodes.mountains);
    
    // PERBAIKAN PENEMPATAN GUNUNG AGAR MIRIP GAMBAR
    // Gunung utama Kiri & Kanan (Jauh di belakang)
    this._addMountain(-90, GROUND_Y, -180, 3.0); // Gunung Kiri (Tinggi)
    this._addMountain(90, GROUND_Y, -160, 2.8); // Gunung Kanan (Sedikit lebih rendah/dekat)
    
    // Gunung kecil jauh di belakang
    this._addMountain(0, GROUND_Y, -250, 1.8);

    // Node Container Pohon
    this.nodes.trees = new SceneNode(null);
    this.nodes.ground.children.push(this.nodes.trees);
    
    this._addTree(50, GROUND_Y + 5.0, 60, 1.2, 1.0);
    this._addTree(-40, GROUND_Y + 5.0, 30, 0.9, 0.8);
    this._addTree(70, GROUND_Y + 5.0, -10, 1.0, 1.2);
    this._addTree(-10, GROUND_Y + 5.0, 70, 1.1, 1.1);
    this._addTree(120, GROUND_Y + 5.0, 80, 0.8, 0.7);

    // Node Container Batu
    this.nodes.rocks = new SceneNode(null);
    this.nodes.ground.children.push(this.nodes.rocks);
    
    this._addRock(25, WATER_Y, 5, 1.5);
    this._addRock(-10, WATER_Y - 1.0, 10, 2.0);
    this._addRock(-50, GROUND_Y + 1.0, 20, 1.0);
    this._addRock(15, GROUND_Y + 1.0, -30, 1.2);
    this._addRock(-30, WATER_Y + 0.5, -5, 0.8);
};

// =================================================================
// FUNGSI BANTU TAMBAHAN
// =================================================================

/**
 * Fungsi bantu untuk menambahkan Gunung Low-Poly ke Scene Graph.
 * @param {number} x - Posisi X.
 * @param {number} y - Posisi Y (GROUND_Y).
 * @param {number} z - Posisi Z.
 * @param {number} scale - Faktor skala homogen.
 */
WorldEnvironment.prototype._addMountain = function(x, y, z, scale) {
    var g = new SceneNode(this.buffers.mountain);
    g.localMatrix.setIdentity()
        .translate(x, y, z)
        .scale(scale, scale, scale);
    this.nodes.mountains.children.push(g);
};

/**
 * Fungsi bantu untuk menambahkan Pohon ke Scene Graph.
 */
WorldEnvironment.prototype._addTree = function(x, y, z, scaleFactor, heightFactor) {
    var treeRoot = new SceneNode(null);
    treeRoot.localMatrix.setIdentity().translate(x, y, z).scale(scaleFactor, heightFactor, scaleFactor);
    
    var trunk = new SceneNode(this.buffers.treeTrunk);
    trunk.localMatrix.setIdentity().translate(0, -5.0, 0).scale(0.5, 1.0, 0.5);
    treeRoot.children.push(trunk);
    
    var leaves = new SceneNode(this.buffers.treeLeaves);
    leaves.localMatrix.setIdentity().translate(0, 5.0, 0);
    treeRoot.children.push(leaves);

    this.nodes.trees.children.push(treeRoot);
};

/**
 * Fungsi bantu untuk menambahkan Batu ke Scene Graph.
 */
WorldEnvironment.prototype._addRock = function(x, y, z, scaleFactor) {
    var rockNode = new SceneNode(this.buffers.rock);
    rockNode.localMatrix.setIdentity().translate(x, y, z).scale(scaleFactor, scaleFactor * 0.8, scaleFactor);
    this.nodes.rocks.children.push(rockNode);
};

/**
 * Getter sederhana untuk mendapatkan node akar World.
 */
WorldEnvironment.prototype.getRootNode = function() {
    return this.rootNode;
};

/**
 * Update World (untuk animasi air/awan, jika ada)
 */
WorldEnvironment.prototype.update = function(now, elapsed) {
    // Animasi permukaan air
    var waveScale = 1 + Math.sin(now * 0.001) * 0.005;
    var waveYOffset = Math.cos(now * 0.001) * 0.05;

    if (this.nodes.lakeSurface) {
        this.nodes.lakeSurface.localMatrix.setIdentity()
            .translate(0, WATER_Y + waveYOffset, 0)
            .scale(1, 0.05 * waveScale, 1);
    }
};