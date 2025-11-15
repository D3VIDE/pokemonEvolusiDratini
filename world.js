// =================================================================
// world.js
// World Environment: Crystal Clear Lake and Mountain Sanctuary
// =================================================================

// --- WARNA WORLD (Sesuai Tema Crystal Clear) ---
var SKY_COLOR = [0.53, 0.81, 0.92, 1.0]; 
var MOUNTAIN_SNOW = [0.95, 0.95, 0.98, 1.0]; 
var MOUNTAIN_ROCK = [0.4, 0.45, 0.5, 1.0]; 
var GRASS_GREEN = [0.35, 0.65, 0.25, 1.0]; 
var WATER_SURFACE = [0.1, 0.6, 0.8, 0.7]; 
var WATER_BED = [0.15, 0.4, 0.6, 1.0]; 
var TREE_TRUNK = [0.55, 0.4, 0.3, 1.0]; 
var TREE_LEAVES = [0.2, 0.55, 0.15, 1.0]; 
var ROCK_COLOR = [0.5, 0.5, 0.5, 1.0]; 

// --- KONSTANTA FISIK & UKURAN ---
var WORLD_BOUNDS = 400.0; 

// KONSTANTA KETINGGIAN KONSISTEN
var WORLD_Y_OFFSET = -3.5; // Offset Y global untuk visualisasi kamera
var GROUND_Y_LEVEL = 0.0; // Y referensi untuk dasar daratan
var WATER_SURFACE_Y = -0.5; // Y referensi untuk permukaan air (di bawah daratan)

var TREE_TRUNK_HEIGHT = 8.0; 
var LAKE_RADIUS = 30.0; // Diperbesar 50% dari 20.0
var LAKE_ASPECT_RATIO = 1.3; // BARU: Untuk membuat danau lonjong (oval)
var ROCK_IN_LAKE_COUNT = 6;  // BARU: Jumlah batu di dalam danau
// =================================================================
// FUNGSI GEOMETRI DASAR (DIPERLUKAN)
// =================================================================

/** Membuat bidang datar (Plane) */
function createPlane(width, depth, color) {
    var halfW = width / 2;
    var halfD = depth / 2;
    var vertices = new Float32Array([
        -halfW, 0, halfD, 
        halfW, 0, halfD, 
        halfW, 0, -halfD, 
        -halfW, 0, -halfD 
    ]);
    var colors = new Float32Array([
        color[0], color[1], color[2], color[3] || 1.0, color[0], color[1], color[2], color[3] || 1.0, 
        color[0], color[1], color[2], color[3] || 1.0, color[0], color[1], color[2], color[3] || 1.0
    ]);
    var indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    return { vertices: vertices, colors: colors, indices: indices };
}

/** Membuat geometri low-poly mountain */
function createLowPolyMountain(baseRadius, height, numSegments, numLayers, snowHeightRatio) {
    let vertices = [];
    let colors = [];
    let indices = [];
    let vertexOffset = 0;
    const snowHeight = height * snowHeightRatio;
    vertices.push(0, 0, 0);
    colors.push(MOUNTAIN_ROCK[0], MOUNTAIN_ROCK[1], MOUNTAIN_ROCK[2], 1.0);
    vertexOffset++;
    for (let layer = 0; layer <= numLayers; layer++) {
        let currentHeight = height * (layer / numLayers);
        let currentRadius = baseRadius * (1 - (layer / numLayers)); 
        currentRadius += (Math.random() - 0.5) * baseRadius * 0.2; 
        currentRadius = Math.max(0, currentRadius); 
        if (layer === numLayers) {
            vertices.push(0, height, 0);
            colors.push(MOUNTAIN_SNOW[0], MOUNTAIN_SNOW[1], MOUNTAIN_SNOW[2], 1.0);
            vertexOffset++;
            break; 
        }
        for (let i = 0; i < numSegments; i++) {
            let angle = (i / numSegments) * Math.PI * 2;
            let x = Math.cos(angle) * currentRadius + (Math.random() - 0.5) * (baseRadius * 0.1);
            let z = Math.sin(angle) * currentRadius + (Math.random() - 0.5) * (baseRadius * 0.1);
            let y = currentHeight + (Math.random() - 0.5) * (height * 0.05); 
            vertices.push(x, y, z);
            if (y > snowHeight) {
                colors.push(MOUNTAIN_SNOW[0], MOUNTAIN_SNOW[1], MOUNTAIN_SNOW[2], 1.0);
            } else {
                colors.push(MOUNTAIN_ROCK[0], MOUNTAIN_ROCK[1], MOUNTAIN_ROCK[2], 1.0);
            }
            vertexOffset++;
        }
    }
    let centerBaseIdx = 0;
    for (let i = 0; i < numSegments; i++) {
        indices.push(centerBaseIdx, 1 + ((i + 1) % numSegments), 1 + i);
    }
    for (let layer = 0; layer < numLayers; layer++) {
        let currentLayerStartIdx = 1 + layer * numSegments;
        let nextLayerStartIdx = 1 + (layer + 1) * numSegments;
        for (let i = 0; i < numSegments; i++) {
            let i0 = currentLayerStartIdx + i;
            let i1 = currentLayerStartIdx + ((i + 1) % numSegments);
            let i2 = nextLayerStartIdx + ((i + 1) % numSegments);
            let i3 = nextLayerStartIdx + i;
            if (layer < numLayers -1) { 
                indices.push(i0, i1, i2);
                indices.push(i0, i2, i3);
            } else { 
                let peakIdx = vertexOffset - 1; 
                indices.push(i0, i1, peakIdx);
            }
        }
    }
    return { vertices: new Float32Array(vertices), colors: new Float32Array(colors), indices: new Uint16Array(indices) };
}


// =================================================================
// PENGELOLAAN WORLD SCENE GRAPH
// =================================================================

/** Class yang berisi semua geometri World. */
function WorldEnvironment(gl, programInfo) {
    this.gl = gl;
    this.programInfo = programInfo;
    this.rootNode = new SceneNode(null);
    this.nodes = {}; 
    this.buffers = {}; 
}

/** Inisialisasi geometri dan scene graph World. */
WorldEnvironment.prototype.init = function() {
    var gl = this.gl;
    var info = this.programInfo;

    // --- 1. GEOMETRI & BUFFERS STATIS ---

    // Danau/Sungai (UKURAN DIPERBESAR)
    var lakeGeo = createSphere(LAKE_RADIUS, 30, 30, WATER_SURFACE); 
    this.buffers.lake = initBuffers(gl, info, lakeGeo);
    var lakeBedGeo = createSphere(LAKE_RADIUS, 30, 30, WATER_BED); 
    this.buffers.lakeBed = initBuffers(gl, info, lakeBedGeo);
    
    // Daratan Utama
    var groundGeo = createPlane(WORLD_BOUNDS, WORLD_BOUNDS, GRASS_GREEN);
    this.buffers.ground = initBuffers(gl, info, groundGeo);

    // Gunung Low-Poly (Tetap sama)
    var mountainGeo1 = createLowPolyMountain(30, 40, 8, 3, 0.6); 
    this.buffers.mountain1 = initBuffers(gl, info, mountainGeo1);

    var mountainGeo2 = createLowPolyMountain(25, 35, 7, 3, 0.5); 
    this.buffers.mountain2 = initBuffers(gl, info, mountainGeo2);
    
    // Objek kecil lainnya
    var rockGeo = createSphere(1.0, 6, 6, ROCK_COLOR);
    this.buffers.rock = initBuffers(gl, info, rockGeo);

    // Batang pohon
    var treeTrunkGeo = createCylinder(0.8, TREE_TRUNK_HEIGHT, 8, TREE_TRUNK); 
    this.buffers.treeTrunk = initBuffers(gl, info, treeTrunkGeo);
    
    // Daun pohon (Sphere)
    var treeLeavesGeo = createSphere(5, 10, 10, TREE_LEAVES); 
    this.buffers.treeLeaves = initBuffers(gl, info, treeLeavesGeo);

    // --- 2. BANGUN SCENE GRAPH (Objek Statis) ---

    this.rootNode.localMatrix.setIdentity();

    // Node Daratan Utama (Y TRANSLASI MENGGUNAKAN WORLD_Y_OFFSET)
    this.nodes.ground = new SceneNode(this.buffers.ground);
    this.nodes.ground.localMatrix.setIdentity().translate(0, WORLD_Y_OFFSET, 0); 
    this.rootNode.children.push(this.nodes.ground);

    // Node Dasar Danau & Permukaan Air (Y TRANSLASI RELATIF TERHADAP GROUND_Y_LEVEL)
    this.nodes.lakeBed = new SceneNode(this.buffers.lakeBed);
    // Y: WATER_SURFACE_Y - 1.0. TIDAK ADA X/Z TRANSLASI (Danau di tengah 0,0)
    this.nodes.lakeBed.localMatrix.setIdentity().translate(0, WATER_SURFACE_Y - 1.0, 0).scale(1, 0.15, 1);
    this.nodes.ground.children.push(this.nodes.lakeBed);

    this.nodes.lakeSurface = new SceneNode(this.buffers.lake);
    // Y: WATER_SURFACE_Y. TIDAK ADA X/Z TRANSLASI (Danau di tengah 0,0)
    this.nodes.lakeSurface.localMatrix.setIdentity().translate(0, WATER_SURFACE_Y, 0).scale(1, 0.05, 1);
    this.nodes.ground.children.push(this.nodes.lakeSurface);
    
    this.nodes.rocks = new SceneNode(null); // Node ini sekarang memiliki .children
    this.nodes.ground.children.push(this.nodes.rocks);

for (let i = 0; i < ROCK_IN_LAKE_COUNT; i++) {
    let angle = Math.random() * 2 * Math.PI;
    let radius = Math.random() * (LAKE_RADIUS * 0.7); 
    let x = radius * Math.cos(angle) * LAKE_ASPECT_RATIO;
    let z = radius * Math.sin(angle);
    
    this._addRock(x, WATER_SURFACE_Y - 0.5, z, 1.0 + Math.random() * 0.5); 
}

    // Node Container Gunung Low-Poly (Y = GROUND_Y_LEVEL = 0.0)
    this.nodes.mountains = new SceneNode(null);
    this.nodes.ground.children.push(this.nodes.mountains);
    
    const mountainScale = 1.35; 
    this._addMountain(this.buffers.mountain1, -50, GROUND_Y_LEVEL, -70, mountainScale); 
    this._addMountain(this.buffers.mountain2, 30, GROUND_Y_LEVEL, -85, mountainScale); 

    // Node Container Pohon (Y = GROUND_Y_LEVEL = 0.0)
    this.nodes.trees = new SceneNode(null);
    this.nodes.ground.children.push(this.nodes.trees);
    
    const treeYBase = GROUND_Y_LEVEL; 
    
    this._addTree(60, treeYBase, 50, 1.2, 1.0);
    this._addTree(-45, treeYBase, 40, 0.9, 0.9);
    this._addTree(75, treeYBase, -20, 1.1, 1.1);
    this._addTree(-10, treeYBase, 65, 1.0, 1.0);
    this._addTree(100, treeYBase, 70, 0.8, 0.7);
    this._addTree(-80, treeYBase, 10, 1.0, 1.0);
    this._addTree(20, treeYBase, -50, 1.1, 0.9);
    this._addTree(-110, treeYBase, -10, 0.9, 1.1);
    this._addTree(100, treeYBase, -40, 0.9, 1.0);
    this._addTree(-20, treeYBase, -110, 1.0, 1.2);
    this._addTree(130, treeYBase, 10, 0.7, 0.8);
    this._addTree(-130, treeYBase, 50, 0.7, 0.9);
    this._addTree(10, treeYBase, 100, 0.8, 0.8);
    this._addTree(-70, treeYBase, -60, 1.0, 1.0);
    this._addTree(50, treeYBase, -90, 1.1, 1.0);

    // Node Container Batu (Y = GROUND_Y_LEVEL = 0.0)
    this.nodes.rocks = new SceneNode(null);
    this.nodes.ground.children.push(this.nodes.rocks);
    
    // Batu Daratan (Basis Y = GROUND_Y_LEVEL = 0.0)
    this._addRock(25, GROUND_Y_LEVEL, 5, 1.5);    
    this._addRock(-50, GROUND_Y_LEVEL, 20, 1.0);
    this._addRock(15, GROUND_Y_LEVEL, -30, 1.2);
    this._addRock(-30, GROUND_Y_LEVEL, -5, 0.8);
    this._addRock(5, GROUND_Y_LEVEL, 20, 0.9);
    this._addRock(35, GROUND_Y_LEVEL, 80, 0.7);
    this._addRock(-80, GROUND_Y_LEVEL, -30, 1.1);
    this._addRock(80, GROUND_Y_LEVEL, -70, 0.6);

    // Batu di Dasar Danau (Basis Y = WATER_SURFACE_Y - 1.0)
    this._addRock(-10, WATER_SURFACE_Y - 1.0, 10, 2.0); 
    
    // Batu Tepi Danau (Basis Y = WATER_SURFACE_Y = -0.5)
    this._addRock(-30, WATER_SURFACE_Y, -5, 0.8);  
    this._addRock(25, WATER_SURFACE_Y, 5, 1.5);    
};

// =================================================================
// FUNGSI BANTU TAMBAHAN
// =================================================================

/** Fungsi bantu untuk menambahkan Gunung Low-Poly ke Scene Graph. */
WorldEnvironment.prototype._addMountain = function(buffers, x, y, z, scale) {
    var g = new SceneNode(buffers);
    g.localMatrix.setIdentity().translate(x, y, z).scale(scale, scale, scale);
    this.nodes.mountains.children.push(g);
};

/** Fungsi bantu untuk menambahkan Pohon ke Scene Graph. */
WorldEnvironment.prototype._addTree = function(x, y, z, scaleFactor, heightFactor) {
    var treeRoot = new SceneNode(null);
    // Y root adalah GROUND_Y_LEVEL (0.0)
    treeRoot.localMatrix.setIdentity().translate(x, y, z).scale(scaleFactor, heightFactor, scaleFactor);
    
    // Y Batang: Diangkat setengah tinggi (4.0) agar dasarnya di Y=0.0
    var trunk = new SceneNode(this.buffers.treeTrunk);
    trunk.localMatrix.setIdentity().translate(0, 4, 0); 
    treeRoot.children.push(trunk);
    
    // Y Daun: Di atas batang, sedikit tumpang tindih.
    var leaves = new SceneNode(this.buffers.treeLeaves);
    leaves.localMatrix.setIdentity().translate(0, 13, 0).scale(1.5, 1.3, 1.6); 
    treeRoot.children.push(leaves);

    this.nodes.trees.children.push(treeRoot);
};

/** Fungsi bantu untuk menambahkan Batu ke Scene Graph. */
WorldEnvironment.prototype._addRock = function(x, y, z, scaleFactor) {
    var rockNode = new SceneNode(this.buffers.rock);
    
    // Tinggi batu setelah scaling adalah scaleFactor * 0.8
    const rockHeightScaled = scaleFactor * 0.8; 
    // Y translasi adalah y (dasar yang diinginkan) + setengah tinggi batu
    const rockYCenter = y + (rockHeightScaled / 2);
    
    rockNode.localMatrix.setIdentity()
        .translate(x, rockYCenter, z)
        .scale(scaleFactor, rockHeightScaled, scaleFactor);
    this.nodes.rocks.children.push(rockNode);
};

/** Getter sederhana untuk mendapatkan node akar World. */
WorldEnvironment.prototype.getRootNode = function() {
    return this.rootNode;
};

/** Update World (untuk animasi air/awan, jika ada) */
WorldEnvironment.prototype.update = function(now, elapsed) {
    // Animasi permukaan air
    var waveScale = 1 + Math.sin(now * 0.001) * 0.005;
    var waveYOffset = Math.cos(now * 0.001) * 0.05;
    var waveZOffset = Math.cos(now * 0.003) * 0.05;
    // Gunakan WATER_SURFACE_Y yang konsisten
    if (this.nodes.lakeSurface) {
        this.nodes.lakeSurface.localMatrix.setIdentity()
            .translate(0, WATER_SURFACE_Y + waveYOffset, waveZOffset)
            .scale(1, 0.05 * waveScale, 1);
    }
};