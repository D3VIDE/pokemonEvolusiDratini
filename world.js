// =================================================================
// world.js (FINAL VERSION - Fixes: Fruit Visibility, Collision Logic)
// **MODIFIED: Taller/Wider Trees**
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

// --- WARNA BUAH BARU (Contoh: Berry Oranye) ---
var FRUIT_COLOR = [0.9, 0.5, 0.1, 1.0]; 

// --- KONSTANTA FISIK & UKURAN ---
var WORLD_BOUNDS = 400.0; 

// KONSTANTA KETINGGIAN KONSISTEN
var WORLD_Y_OFFSET = -3.5; // Offset Y global untuk visualisasi kamera
var GROUND_Y_LEVEL = 0.0; // Y referensi untuk dasar daratan
var WATER_SURFACE_Y = -0.5; // Y referensi untuk permukaan air (di bawah daratan)

// **[PERBAIKAN] Batang lebih tinggi
var TREE_TRUNK_HEIGHT = 24.0; // (Semula: 8.0)

var LAKE_RADIUS = 30.0; 
var LAKE_ASPECT_RATIO = 1.3; 
var ROCK_IN_LAKE_COUNT = 6; 
// =================================================================
// FUNGSI GEOMETRI DASAR (TIDAK BERUBAH)
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

/** Membuat geometri bola untuk buah. */
function createFruit(radius, segments, rings, color) {
    // Asumsikan createSphere tersedia secara global (dari libs.js / di tempat lain)
    return createSphere(radius, segments, rings, color); 
}

/** Class untuk mengelola sebuah pohon dengan posisi buah yang potensial. */
function TreeNode(trunkBuffers, leavesBuffers, x, y, z, scaleFactor, heightFactor) {
    this.root = new SceneNode(null);
    this.trunk = new SceneNode(trunkBuffers);
    this.leaves = new SceneNode(leavesBuffers);
    this.position = [x, y, z];
    this.scale = [scaleFactor, heightFactor, scaleFactor];
    this.fruitSpawnPoints = []; 
    this.init(y);
}

TreeNode.prototype.init = function(yBase) {
    this.root.localMatrix.setIdentity().translate(this.position[0], yBase, this.position[2]).scale(this.scale[0], this.scale[1], this.scale[2]);
    
    // **[PERBAIKAN] Y Batang: Diangkat setengah tinggi baru (12.0 / 2 = 6.0)
    this.trunk.localMatrix.setIdentity().translate(0, 6, 0); // (Semula: 4)
    
    // **[PERBAIKAN] Y Daun: Disesuaikan dengan tinggi batang baru (Top Batang 12.0 + offset 5.0 = 17.0)
    this.leaves.localMatrix.setIdentity().translate(0, 17, 0).scale(1.5, 1.3, 1.6); // (Semula: 13)
    this.root.children.push(this.trunk, this.leaves);

    // Tentukan 5 posisi potensial buah (relatif terhadap leaves)
    // Logika spawn point buah tidak perlu diubah, karena masih relatif terhadap daun
    for(let i = 0; i < 5; i++) {
        let angle = Math.random() * 2 * Math.PI;
        let r = Math.random() * 3.5;
        this.fruitSpawnPoints.push({
            x: r * Math.cos(angle),
            y: 0.5 + Math.random() * 2.0, // Y relatif di dalam daun
            z: r * Math.sin(angle),
            // y_world_relative (dihapus karena tidak terpakai di world.js)
        });
    }
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
    this.allTrees = [];
    this.mainTree = null;
    this.fruitState = { active: false, fallTime: 0, totalDuration: 1.0 }; 
}

/** Inisialisasi geometri dan scene graph World. */
WorldEnvironment.prototype.init = function() {
    var gl = this.gl;
    var info = this.programInfo;

    // --- 1. GEOMETRI & BUFFERS STATIS ---
    var lakeGeo = createSphere(LAKE_RADIUS, 30, 30, WATER_SURFACE); 
    this.buffers.lake = initBuffers(gl, info, lakeGeo);
    var lakeBedGeo = createSphere(LAKE_RADIUS, 30, 30, WATER_BED); 
    this.buffers.lakeBed = initBuffers(gl, info, lakeBedGeo);
    var groundGeo = createPlane(WORLD_BOUNDS, WORLD_BOUNDS, GRASS_GREEN);
    this.buffers.ground = initBuffers(gl, info, groundGeo);
    var mountainGeo1 = createLowPolyMountain(30, 40, 8, 3, 0.6); 
    this.buffers.mountain1 = initBuffers(gl, info, mountainGeo1);
    var mountainGeo2 = createLowPolyMountain(25, 35, 7, 3, 0.5); 
    this.buffers.mountain2 = initBuffers(gl, info, mountainGeo2);
    var rockGeo = createSphere(1.0, 6, 6, ROCK_COLOR);
    this.buffers.rock = initBuffers(gl, info, rockGeo);
    
    // **[PERBAIKAN] Batang lebih lebar (radius 1.2) dan tinggi (menggunakan konstanta baru)
    var treeTrunkGeo = createCylinder(1.2, TREE_TRUNK_HEIGHT, 12, TREE_TRUNK); // (Semula: 0.8)
    this.buffers.treeTrunk = initBuffers(gl, info, treeTrunkGeo);
    
    // **[PERBAIKAN] Daun sedikit lebih besar (radius 6) agar proporsional
    var treeLeavesGeo = createSphere(6, 10, 10, TREE_LEAVES); // (Semula: 5)
    this.buffers.treeLeaves = initBuffers(gl, info, treeLeavesGeo);
    
    // **BUFFER BUAH BARU**
    var fruitGeo = createFruit(0.3, 10, 10, FRUIT_COLOR);
    this.buffers.fruit = initBuffers(gl, info, fruitGeo);

    // --- 2. BANGUN SCENE GRAPH ---

    this.rootNode.localMatrix.setIdentity();
    this.nodes.ground = new SceneNode(this.buffers.ground);
    this.nodes.ground.localMatrix.setIdentity().translate(0, WORLD_Y_OFFSET, 0); 
    this.rootNode.children.push(this.nodes.ground);

    // Node Danau & Batu 
    this.nodes.lakeBed = new SceneNode(this.buffers.lakeBed);
    this.nodes.lakeBed.localMatrix.setIdentity().translate(0, WATER_SURFACE_Y - 1.0, 0).scale(1, 0.15, 1);
    this.nodes.ground.children.push(this.nodes.lakeBed);
    this.nodes.lakeSurface = new SceneNode(this.buffers.lake);
    this.nodes.lakeSurface.localMatrix.setIdentity().translate(0, WATER_SURFACE_Y, 0).scale(1, 0.05, 1);
    this.nodes.ground.children.push(this.nodes.lakeSurface);
    this.nodes.rocks = new SceneNode(null); 
    this.nodes.ground.children.push(this.nodes.rocks);
    for (let i = 0; i < ROCK_IN_LAKE_COUNT; i++) {
        let angle = Math.random() * 2 * Math.PI;
        let radius = Math.random() * (LAKE_RADIUS * 0.7); 
        let x = radius * Math.cos(angle) * LAKE_ASPECT_RATIO;
        let z = radius * Math.sin(angle);
        this._addRock(x, WATER_SURFACE_Y - 0.5, z, 1.0 + Math.random() * 0.5); 
    }

    // Node Gunung (Sama)
    this.nodes.mountains = new SceneNode(null);
    this.nodes.ground.children.push(this.nodes.mountains);
    const mountainScale = 1.35; 
    this._addMountain(this.buffers.mountain1, -50, GROUND_Y_LEVEL, -70, mountainScale); 
    this._addMountain(this.buffers.mountain2, 30, GROUND_Y_LEVEL, -85, mountainScale); 

    // Node Container Pohon BARU
    this.nodes.trees = new SceneNode(null);
    this.nodes.ground.children.push(this.nodes.trees);
    const treeYBase = GROUND_Y_LEVEL+5; 
    
    // POHON UTAMA (Dragonair akan berinteraksi di dekat pohon ini)
    let tree0 = new TreeNode(this.buffers.treeTrunk, this.buffers.treeLeaves, -20, treeYBase, 25, 1.5, 1.2);
    this.nodes.trees.children.push(tree0.root);
    this.allTrees.push(tree0);
    this.mainTree = tree0; // SET POHON UTAMA

    // POHON LAIN (menggunakan _addTreeCustom yang baru)
    this.allTrees.push(this._addTreeCustom(60, treeYBase, 50, 1.2, 1.0));
    this.allTrees.push(this._addTreeCustom(-45, treeYBase, 40, 0.9, 0.9));
    this.allTrees.push(this._addTreeCustom(75, treeYBase, -20, 1.1, 1.1));
    this.allTrees.push(this._addTreeCustom(-10, treeYBase, 65, 1.0, 1.0));
    this.allTrees.push(this._addTreeCustom(100, treeYBase, 70, 0.8, 0.7));
    this.allTrees.push(this._addTreeCustom(-80, treeYBase, 10, 1.0, 1.0));
    this.allTrees.push(this._addTreeCustom(20, treeYBase, -50, 1.1, 0.9));
    this.allTrees.push(this._addTreeCustom(-110, treeYBase, -10, 0.9, 1.1));
    this.allTrees.push(this._addTreeCustom(100, treeYBase, -40, 0.9, 1.0));
    this.allTrees.push(this._addTreeCustom(-20, treeYBase, -110, 1.0, 1.2));
    this.allTrees.push(this._addTreeCustom(130, treeYBase, 10, 0.7, 0.8));
    this.allTrees.push(this._addTreeCustom(-130, treeYBase, 50, 0.7, 0.9));
    this.allTrees.push(this._addTreeCustom(10, treeYBase, 100, 0.8, 0.8));
    this.allTrees.push(this._addTreeCustom(-70, treeYBase, -60, 1.0, 1.0));
    this.allTrees.push(this._addTreeCustom(50, treeYBase, -90, 1.1, 1.0));

    // **NODE BUAH JATUH BARU**
    this.nodes.fallingFruit = new SceneNode(this.buffers.fruit);
    this.nodes.fallingFruit.enabled = false; 
    this.nodes.ground.children.push(this.nodes.fallingFruit);
    
    // Node Batu Daratan (Sama)
    this._addRock(25, GROUND_Y_LEVEL, 5, 1.5);    
    this._addRock(-50, GROUND_Y_LEVEL, 20, 1.0);
    this._addRock(15, GROUND_Y_LEVEL, -30, 1.2);
    this._addRock(-30, GROUND_Y_LEVEL, -5, 0.8);
    this._addRock(5, GROUND_Y_LEVEL, 20, 0.9);
    this._addRock(35, GROUND_Y_LEVEL, 80, 0.7);
    this._addRock(-80, GROUND_Y_LEVEL, -30, 1.1);
    this._addRock(80, GROUND_Y_LEVEL, -70, 0.6);
    this._addRock(-10, WATER_SURFACE_Y - 1.0, 10, 2.0); 
    this._addRock(-30, WATER_SURFACE_Y, -5, 0.8);   
    this._addRock(25, WATER_SURFACE_Y, 5, 1.5);     
};

// =================================================================
// FUNGSI BANTU & MEKANISME BUAH JATUH
// =================================================================

/** Fungsi bantu untuk menambahkan Pohon (menggunakan TreeNode baru). */
WorldEnvironment.prototype._addTreeCustom = function(x, y, z, scaleFactor, heightFactor) {
    let treeNode = new TreeNode(this.buffers.treeTrunk, this.buffers.treeLeaves, x, y, z, scaleFactor, heightFactor);
    this.nodes.trees.children.push(treeNode.root);
    return treeNode;
};

/** Fungsi bantu untuk menambahkan Gunung Low-Poly ke Scene Graph. */
WorldEnvironment.prototype._addMountain = function(buffers, x, y, z, scale) {
    var g = new SceneNode(buffers);
    g.localMatrix.setIdentity().translate(x, y, z).scale(scale, scale, scale);
    this.nodes.mountains.children.push(g);
};

/** Fungsi bantu untuk menambahkan Batu ke Scene Graph. */
WorldEnvironment.prototype._addRock = function(x, y, z, scaleFactor) {
    var rockNode = new SceneNode(this.buffers.rock);
    const rockHeightScaled = scaleFactor * 0.8; 
    const rockYCenter = y + (rockHeightScaled / 2);
    rockNode.localMatrix.setIdentity()
        .translate(x, rockYCenter, z)
        .scale(scaleFactor, rockHeightScaled, scaleFactor);
    this.nodes.rocks.children.push(rockNode);
};

/** Memicu buah untuk jatuh dari pohon terpilih ke target X/Z. (Logika ini sudah benar dari fix sebelumnya) */
WorldEnvironment.prototype.dropFruit = function(targetX, targetZ, sourceTree) {
    let treeToUse = sourceTree || this.mainTree; 
    
    if (!treeToUse) { console.error("Tidak ada pohon untuk menjatuhkan buah!"); return; }

    // 1. Pilih posisi Buah (di daun Pohon TERPILIH)
    let spawnPoint = treeToUse.fruitSpawnPoints[Math.floor(Math.random() * treeToUse.fruitSpawnPoints.length)];
    
    // 2. Hitung posisi awal buah (x, y, z relatif ke world-root dari pohon TERPILIH)
    
    // **[PERBAIKAN] Logika Y Awal Buah disesuaikan dengan tinggi daun baru**
    // Y daun (17) * Y scale daun (1.3) * Y scale root (scale[1]) + Y relatif (spawnPoint.y)
    // Untuk amannya, kita set saja Y statis yang tinggi agar terlihat jatuh
    
    let fruitX = treeToUse.position[0] + spawnPoint.x * treeToUse.scale[0] * 1.5;
    // Y awal buah dibuat konsisten tinggi di 15 unit di atas world offset
    let fruitY = WORLD_Y_OFFSET + 15.0; // (Semula: + 10)
    let fruitZ = treeToUse.position[2] + spawnPoint.z * treeToUse.scale[0] * 1.6;

    this.fruitState = {
        active: true,
        startX: fruitX,
        startY: fruitY,
        startZ: fruitZ,
        targetX: targetX,
        targetZ: targetZ,
        currentY: fruitY,
        fallTime: 0,
        totalDuration: 1.5, 
        groundY: 0 + 0.1 
    };

    this.nodes.fallingFruit.enabled = true;
};

/** Update logika buah jatuh per frame. */
WorldEnvironment.prototype.updateFruitFall = function(dt) {
    if (!this.fruitState || !this.fruitState.active) return;

    this.fruitState.fallTime += dt;
    let t = this.fruitState.fallTime / this.fruitState.totalDuration;
    t = Math.min(1.0, t); // Clamp ke 1.0

    // Interpolasi posisi X dan Z
    let currentX = this.fruitState.startX + (this.fruitState.targetX - this.fruitState.startX) * t;
    let currentZ = this.fruitState.startZ + (this.fruitState.targetZ - this.fruitState.startZ) * t;
    
    // Interpolasi posisi Y (Melambat di akhir)
    let yDelta = this.fruitState.startY - this.fruitState.groundY;
    // Menggunakan kurva sederhana (1-t)^2 untuk melambat di akhir
    let currentY = this.fruitState.groundY + yDelta * (1 - t) * (1 - t);

    if (t >= 1.0) {
        this.fruitState.active = false;
        // JANGAN SEMBUNYIKAN SEGERA. Biarkan Dragonair yang melakukannya di state EATING.
    } 

    // **MODIFIKASI: Skala buah yang lebih besar dan terlihat**
    let scale = 1.0 + 0.5 * Math.sin(t * Math.PI); 
    this.nodes.fallingFruit.localMatrix.setIdentity()
        .translate(currentX, currentY, currentZ)
        .scale(scale * 2.0, scale * 2.0, scale * 2.0); // Skala 2.0x agar jelas terlihat
};

/** Getter sederhana untuk mendapatkan node akar World. */
WorldEnvironment.prototype.getRootNode = function() {
    return this.rootNode;
};

/** Update World (untuk animasi air/awan dan buah jatuh) */
WorldEnvironment.prototype.update = function(now, elapsed) {
    var dt = elapsed / 1000.0;
    
    // Animasi permukaan air
    var waveScale = 1 + Math.sin(now * 0.001) * 0.005;
    var waveYOffset = Math.cos(now * 0.001) * 0.05;
    var waveZOffset = Math.cos(now * 0.003) * 0.05;
    if (this.nodes.lakeSurface) {
        this.nodes.lakeSurface.localMatrix.setIdentity()
            .translate(0, WATER_SURFACE_Y + waveYOffset, waveZOffset)
            .scale(1, 0.05 * waveScale, 1);
    }
    
    // **UPDATE BUAH JATUH**
    this.updateFruitFall(dt); 
};

// =================================================================
// HELPER GLOBAL - Untuk Collision Sederhana (Blocking Lake)
// =================================================================
// Note: Ini harusnya di file libs.js atau di scope global main.js
// Digunakan untuk memblokir Dragonair memasuki danau.

function isPositionBlocked(x, z) {
    // Danau berada di sekitar [0, 0] dengan radius 30 (LAKE_RADIUS)
    const LAKE_RADIUS_SQUARED = 30 * 30; 
    
    // Cek Danau (area tengah)
    if ((x * x + z * z) < LAKE_RADIUS_SQUARED) {
        return true; // Blok area danau
    }
    
    // Tambahkan cek batas peta jika perlu
    if (x < -200 || x > 200 || z < -200 || z > 200) {
        return true; 
    }

    return false;
}