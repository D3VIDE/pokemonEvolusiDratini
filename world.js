// =================================================================
// world.js (FULL CODE + MOVING CLOUDS)
// =================================================================

var SKY_COLOR = [0.53, 0.81, 0.92, 1.0]; 
var MOUNTAIN_SNOW = [0.95, 0.95, 0.98, 1.0]; 
var MOUNTAIN_ROCK = [0.4, 0.45, 0.5, 1.0]; 
var GRASS_GREEN = [0.35, 0.65, 0.25, 1.0]; 
var WATER_SURFACE = [0.1, 0.6, 0.8, 0.7]; 
var WATER_BED = [0.15, 0.4, 0.6, 1.0]; 
var TREE_TRUNK = [0.55, 0.4, 0.3, 1.0]; 
var TREE_LEAVES = [0.2, 0.55, 0.15, 1.0]; 
var ROCK_COLOR = [0.5, 0.5, 0.5, 1.0]; 
var FRUIT_COLOR = [0.9, 0.5, 0.1, 1.0]; 
var CLOUD_COLOR = [0.95, 0.95, 0.95, 0.9]; // Warna Awan
var CLOUD_SPEED_BASE = 5.0; // Kecepatan Awan

var WORLD_BOUNDS = 400.0; 
var WORLD_Y_OFFSET = -3.5; 
var GROUND_Y_LEVEL = 0.0; 
var WATER_SURFACE_Y = -0.5; 

var TREE_TRUNK_HEIGHT = 20.0; 
var TREE_LEAVES_RADIUS = 6.0;
var TREE_TRUNK_RADIUS = 1.2;
var LAKE_RADIUS = 30.0; 
var LAKE_ASPECT_RATIO = 1.3; 
var ROCK_IN_LAKE_COUNT = 6; 

// =================================================================
// GEOMETRY HELPERS
// =================================================================
function createPlane(width, depth, color) {
    var halfW = width / 2;
    var halfD = depth / 2;
    var vertices = new Float32Array([ -halfW, 0, halfD, halfW, 0, halfD, halfW, 0, -halfD, -halfW, 0, -halfD ]);
    var colors = new Float32Array([ color[0], color[1], color[2], color[3] || 1.0, color[0], color[1], color[2], color[3] || 1.0, color[0], color[1], color[2], color[3] || 1.0, color[0], color[1], color[2], color[3] || 1.0 ]);
    var indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    return { vertices: vertices, colors: colors, indices: indices };
}

function createLowPolyMountain(baseRadius, height, numSegments, numLayers, snowHeightRatio) {
    let vertices = []; let colors = []; let indices = []; let vertexOffset = 0; const snowHeight = height * snowHeightRatio;
    vertices.push(0, 0, 0); colors.push(MOUNTAIN_ROCK[0], MOUNTAIN_ROCK[1], MOUNTAIN_ROCK[2], 1.0); vertexOffset++;
    for (let layer = 0; layer <= numLayers; layer++) {
        let currentHeight = height * (layer / numLayers);
        let currentRadius = baseRadius * (1 - (layer / numLayers)); 
        currentRadius += (Math.random() - 0.5) * baseRadius * 0.2; currentRadius = Math.max(0, currentRadius); 
        if (layer === numLayers) { vertices.push(0, height, 0); colors.push(MOUNTAIN_SNOW[0], MOUNTAIN_SNOW[1], MOUNTAIN_SNOW[2], 1.0); vertexOffset++; break; }
        for (let i = 0; i < numSegments; i++) {
            let angle = (i / numSegments) * Math.PI * 2;
            let x = Math.cos(angle) * currentRadius + (Math.random() - 0.5) * (baseRadius * 0.1);
            let z = Math.sin(angle) * currentRadius + (Math.random() - 0.5) * (baseRadius * 0.1);
            let y = currentHeight + (Math.random() - 0.5) * (height * 0.05); 
            vertices.push(x, y, z);
            if (y > snowHeight) { colors.push(MOUNTAIN_SNOW[0], MOUNTAIN_SNOW[1], MOUNTAIN_SNOW[2], 1.0); } else { colors.push(MOUNTAIN_ROCK[0], MOUNTAIN_ROCK[1], MOUNTAIN_ROCK[2], 1.0); }
            vertexOffset++;
        }
    }
    let centerBaseIdx = 0;
    for (let i = 0; i < numSegments; i++) { indices.push(centerBaseIdx, 1 + ((i + 1) % numSegments), 1 + i); }
    for (let layer = 0; layer < numLayers; layer++) {
        let currentLayerStartIdx = 1 + layer * numSegments; let nextLayerStartIdx = 1 + (layer + 1) * numSegments;
        for (let i = 0; i < numSegments; i++) {
            let i0 = currentLayerStartIdx + i; let i1 = currentLayerStartIdx + ((i + 1) % numSegments);
            let i2 = nextLayerStartIdx + ((i + 1) % numSegments); let i3 = nextLayerStartIdx + i;
            if (layer < numLayers -1) { indices.push(i0, i1, i2); indices.push(i0, i2, i3); } else { let peakIdx = vertexOffset - 1; indices.push(i0, i1, peakIdx); }
        }
    }
    return { vertices: new Float32Array(vertices), colors: new Float32Array(colors), indices: new Uint16Array(indices) };
}

function createFruit(radius, segments, rings, color) { return createSphere(radius, segments, rings, color); }

// =================================================================
// TREE LOGIC
// =================================================================
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
    this.trunk.localMatrix.setIdentity().translate(0, TREE_TRUNK_HEIGHT / 2, 0); 
    this.leaves.localMatrix.setIdentity().translate(0, TREE_TRUNK_HEIGHT + 5.0, 0).scale(1.5, 1.3, 1.6); 
    this.root.children.push(this.trunk, this.leaves);

    for(let i = 0; i < 5; i++) {
        this.fruitSpawnPoints.push({ y: TREE_TRUNK_HEIGHT + 2.0 + Math.random() * 2.0 });
    }
}

// =================================================================
// WORLD ENVIRONMENT CLASS
// =================================================================
function WorldEnvironment(gl, programInfo) {
    this.gl = gl; this.programInfo = programInfo;
    this.rootNode = new SceneNode(null); this.nodes = {}; this.buffers = {}; 
    this.allTrees = []; this.mainTree = null;
    this.fruitState = { active: false, phase: 'IDLE', pos: [0,0,0], vel: [0,0,0], scale: 0.0, timer: 0 }; 
    this.obstacles = [];
    this.clouds = []; // Array penyimpan awan
}

WorldEnvironment.prototype.init = function() {
    var gl = this.gl; var info = this.programInfo;
    
    // --- 1. Init Buffers ---
    var lakeGeo = createSphere(LAKE_RADIUS, 30, 30, WATER_SURFACE); this.buffers.lake = initBuffers(gl, info, lakeGeo);
    var lakeBedGeo = createSphere(LAKE_RADIUS, 30, 30, WATER_BED); this.buffers.lakeBed = initBuffers(gl, info, lakeBedGeo);
    var groundGeo = createPlane(WORLD_BOUNDS, WORLD_BOUNDS, GRASS_GREEN); this.buffers.ground = initBuffers(gl, info, groundGeo);
    var mountainGeo1 = createLowPolyMountain(30, 40, 8, 3, 0.6); this.buffers.mountain1 = initBuffers(gl, info, mountainGeo1);
    var mountainGeo2 = createLowPolyMountain(25, 35, 7, 3, 0.5); this.buffers.mountain2 = initBuffers(gl, info, mountainGeo2);
    var rockGeo = createSphere(1.0, 6, 6, ROCK_COLOR); this.buffers.rock = initBuffers(gl, info, rockGeo);
    var treeTrunkGeo = createCylinder(TREE_TRUNK_RADIUS, TREE_TRUNK_HEIGHT, 8, TREE_TRUNK); this.buffers.treeTrunk = initBuffers(gl, info, treeTrunkGeo);
    var treeLeavesGeo = createSphere(TREE_LEAVES_RADIUS, 10, 10, TREE_LEAVES); this.buffers.treeLeaves = initBuffers(gl, info, treeLeavesGeo);
    var fruitGeo = createFruit(0.3, 10, 10, FRUIT_COLOR); this.buffers.fruit = initBuffers(gl, info, fruitGeo);

    // [BARU] Buffer Awan
    var cloudGeo = createSphere(1.0, 8, 8, CLOUD_COLOR); 
    this.buffers.cloudPuff = initBuffers(gl, info, cloudGeo);

    // --- 2. Scene Graph ---
    this.rootNode.localMatrix.setIdentity();

    // [BARU] Node Grup Langit (Masukkan sebelum ground agar rapi secara struktur)
    this.nodes.sky = new SceneNode(null);
    this.rootNode.children.push(this.nodes.sky);

    this.nodes.ground = new SceneNode(this.buffers.ground);
    this.nodes.ground.localMatrix.setIdentity().translate(0, WORLD_Y_OFFSET, 0); 
    this.rootNode.children.push(this.nodes.ground);

    this.nodes.lakeBed = new SceneNode(this.buffers.lakeBed);
    this.nodes.lakeBed.localMatrix.setIdentity().translate(0, WATER_SURFACE_Y - 1.0, 0).scale(1, 0.15, 1);
    this.nodes.ground.children.push(this.nodes.lakeBed);
    this.nodes.lakeSurface = new SceneNode(this.buffers.lake);
    this.nodes.lakeSurface.localMatrix.setIdentity().translate(0, WATER_SURFACE_Y, 0).scale(1, 0.05, 1);
    this.nodes.ground.children.push(this.nodes.lakeSurface);
    this.nodes.rocks = new SceneNode(null); this.nodes.ground.children.push(this.nodes.rocks);
    
    for (let i = 0; i < ROCK_IN_LAKE_COUNT; i++) {
        let angle = Math.random() * 2 * Math.PI; let radius = Math.random() * (LAKE_RADIUS * 0.7); 
        this._addRock(radius * Math.cos(angle) * LAKE_ASPECT_RATIO, WATER_SURFACE_Y - 0.5, radius * Math.sin(angle), 1.0 + Math.random() * 0.5); 
    }

    this.nodes.mountains = new SceneNode(null); this.nodes.ground.children.push(this.nodes.mountains);
    this._addMountain(this.buffers.mountain1, -50, GROUND_Y_LEVEL, -70, 1.35); this.obstacles.push({ x: -50, z: -70, radius: 30 * 1.35 }); 
    this._addMountain(this.buffers.mountain2, 30, GROUND_Y_LEVEL, -85, 1.35); this.obstacles.push({ x: 30, z: -85, radius: 25 * 1.35 });

    this.nodes.trees = new SceneNode(null); this.nodes.ground.children.push(this.nodes.trees);
    
    // Tree 0 (Main Tree)
    let tree0 = new TreeNode(this.buffers.treeTrunk, this.buffers.treeLeaves, -20, GROUND_Y_LEVEL, 25, 1.5, 1.2);
    this.nodes.trees.children.push(tree0.root); this.allTrees.push(tree0); this.mainTree = tree0; 
    this.obstacles.push({ x: -20, z: 25, radius: TREE_LEAVES_RADIUS * 1.5 });

    // Other Trees
    this.allTrees.push(this._addTreeCustom(60, GROUND_Y_LEVEL, 50, 1.2, 1.0));
    this.allTrees.push(this._addTreeCustom(-45, GROUND_Y_LEVEL, 40, 0.9, 0.9));
    this.allTrees.push(this._addTreeCustom(75, GROUND_Y_LEVEL, -20, 1.1, 1.1));
    this.allTrees.push(this._addTreeCustom(-10, GROUND_Y_LEVEL, 65, 1.0, 1.0));
    this.allTrees.push(this._addTreeCustom(100, GROUND_Y_LEVEL, 70, 0.8, 0.7));
    this.allTrees.push(this._addTreeCustom(-80, GROUND_Y_LEVEL, 10, 1.0, 1.0));
    this.allTrees.push(this._addTreeCustom(20, GROUND_Y_LEVEL, -50, 1.1, 0.9));
    this.allTrees.push(this._addTreeCustom(-110, GROUND_Y_LEVEL, -10, 0.9, 1.1));
    this.allTrees.push(this._addTreeCustom(100, GROUND_Y_LEVEL, -40, 0.9, 1.0));
    this.allTrees.push(this._addTreeCustom(-20, GROUND_Y_LEVEL, -110, 1.0, 1.2));
    this.allTrees.push(this._addTreeCustom(130, GROUND_Y_LEVEL, 10, 0.7, 0.8));
    this.allTrees.push(this._addTreeCustom(-130, GROUND_Y_LEVEL, 50, 0.7, 0.9));
    this.allTrees.push(this._addTreeCustom(10, GROUND_Y_LEVEL, 100, 0.8, 0.8));
    this.allTrees.push(this._addTreeCustom(-35, GROUND_Y_LEVEL, 100, 0.8, 0.8));
    this.allTrees.push(this._addTreeCustom(-70, GROUND_Y_LEVEL, 100, 0.8, 0.8));

    this.nodes.fallingFruit = new SceneNode(this.buffers.fruit);
    this.nodes.fallingFruit.enabled = false; 
    this.nodes.ground.children.push(this.nodes.fallingFruit);
    
    // Rocks
    this._addRock(25, GROUND_Y_LEVEL, 5, 1.5); this._addRock(-50, GROUND_Y_LEVEL, 20, 1.0);
    this._addRock(15, GROUND_Y_LEVEL, -30, 1.2); this._addRock(-30, GROUND_Y_LEVEL, -5, 0.8);
    this._addRock(5, GROUND_Y_LEVEL, 20, 0.9); this._addRock(35, GROUND_Y_LEVEL, 80, 0.7);
    this._addRock(-80, GROUND_Y_LEVEL, -30, 1.1); this._addRock(80, GROUND_Y_LEVEL, -70, 0.6);
    this._addRock(-10, WATER_SURFACE_Y - 1.0, 10, 2.0); this._addRock(-30, WATER_SURFACE_Y, -5, 0.8);    
    this._addRock(25, WATER_SURFACE_Y, 5, 1.5);     

    // [BARU] 3. Generate Clouds (Looping)
    var cloudCount = 20; 
    var skyHeight = 50.0; 
    var spread = 350.0; 
    
    for(var i=0; i<cloudCount; i++) {
        var cx = (Math.random() - 0.5) * spread;
        var cz = (Math.random() - 0.5) * spread;
        var cy = skyHeight + (Math.random() * 20.0);
        var cScale = 3.0 + Math.random() * 3.0;
        
        this._createCloud(cx, cy, cz, cScale);
    }
};

WorldEnvironment.prototype._createCloud = function(x, y, z, scale) {
    // Node utama awan
    var cloudRoot = new SceneNode(null);
    
    // Simpan data untuk animasi
    var cloudData = {
        node: cloudRoot,
        x: x,
        y: y,
        z: z,
        baseY: y,
        scale: scale,
        speed: CLOUD_SPEED_BASE + (Math.random() * 1.5), 
        wobbleOffset: Math.random() * 100 
    };

    // Buat 3 sampai 5 gumpalan (puff) per awan
    var numPuffs = 3 + Math.floor(Math.random() * 3);
    
    for (var i = 0; i < numPuffs; i++) {
        var puffNode = new SceneNode(this.buffers.cloudPuff);
        var px = (Math.random() - 0.5) * 4.0 * scale;
        var py = (Math.random() - 0.5) * 1.5 * scale;
        var pz = (Math.random() - 0.5) * 2.0 * scale;
        var pScale = (0.8 + Math.random() * 0.6) * scale;

        puffNode.localMatrix.setIdentity()
            .translate(px, py, pz)
            .scale(pScale, pScale * 0.8, pScale); 
            
        cloudRoot.children.push(puffNode);
    }

    // Set posisi awal
    cloudRoot.localMatrix.setIdentity().translate(x, y, z);
    this.nodes.sky.children.push(cloudRoot);
    this.clouds.push(cloudData);
};

WorldEnvironment.prototype._addTreeCustom = function(x, y, z, scaleFactor, heightFactor) {
    let treeNode = new TreeNode(this.buffers.treeTrunk, this.buffers.treeLeaves, x, y, z, scaleFactor, heightFactor);
    this.nodes.trees.children.push(treeNode.root);
    this.obstacles.push({ x: x, z: z, radius: TREE_LEAVES_RADIUS * scaleFactor });
    return treeNode;
};

WorldEnvironment.prototype._addMountain = function(buffers, x, y, z, scale) {
    var g = new SceneNode(buffers); g.localMatrix.setIdentity().translate(x, y, z).scale(scale, scale, scale);
    this.nodes.mountains.children.push(g);
};

WorldEnvironment.prototype._addRock = function(x, y, z, scaleFactor) {
    var rockNode = new SceneNode(this.buffers.rock);
    const rockHeightScaled = scaleFactor * 0.8; 
    rockNode.localMatrix.setIdentity().translate(x, y + (rockHeightScaled/2), z).scale(scaleFactor, rockHeightScaled, scaleFactor);
    this.nodes.rocks.children.push(rockNode);
};

// =================================================================
// FRUIT & UPDATE LOGIC
// =================================================================
WorldEnvironment.prototype.dropFruit = function(targetX, targetZ, sourceTree) {
    let treeToUse = sourceTree || this.mainTree; 
    if (!treeToUse) return;

    let dirToCenterX = 0 - treeToUse.position[0];
    let dirToCenterZ = 0 - treeToUse.position[2];
    let baseAngle = Math.atan2(dirToCenterX, dirToCenterZ); 

    let spawnAngle = baseAngle + (Math.random() - 0.5) * 1.0;
    let surfaceRadius = 5.5; 
    let fixedLocalX = Math.sin(spawnAngle) * surfaceRadius;
    let fixedLocalZ = Math.cos(spawnAngle) * surfaceRadius;
    let randomYRef = treeToUse.fruitSpawnPoints[Math.floor(Math.random() * treeToUse.fruitSpawnPoints.length)].y;

    let startX = treeToUse.position[0] + fixedLocalX * treeToUse.scale[0];
    let startY = treeToUse.position[1] + (randomYRef - 1.0) * treeToUse.scale[1]; 
    let startZ = treeToUse.position[2] + fixedLocalZ * treeToUse.scale[0];

    let horizontalSpeed = 8.0 + Math.random() * 3.0; 

    this.fruitState = {
        active: true, phase: 'SPAWN', pos: [startX, startY, startZ],
        vel: [Math.sin(spawnAngle) * horizontalSpeed, 0, Math.cos(spawnAngle) * horizontalSpeed], 
        scale: 0.0, timer: 0.0, groundY: 0.5 
    };
    
    this.nodes.fallingFruit.enabled = true;
};

WorldEnvironment.prototype.updateFruitFall = function(dt) {
    if (!this.fruitState || !this.fruitState.active) return;
    const GRAVITY = -30.0; const BOUNCE_FACTOR = 0.5; 

    switch (this.fruitState.phase) {
        case 'SPAWN':
            this.fruitState.timer += dt;
            let popDuration = 0.5; let progress = Math.min(1.0, this.fruitState.timer / popDuration);
            let scale = Math.sin(progress * Math.PI * 0.5); if (progress >= 1.0) scale = 1.0;
            this.fruitState.scale = scale;
            if (progress >= 1.0) { this.fruitState.phase = 'FALL'; this.fruitState.vel[1] = 0; }
            break;
        case 'FALL':
        case 'BOUNCE':
            this.fruitState.vel[1] += GRAVITY * dt;
            this.fruitState.pos[0] += this.fruitState.vel[0] * dt;
            this.fruitState.pos[1] += this.fruitState.vel[1] * dt;
            this.fruitState.pos[2] += this.fruitState.vel[2] * dt;
            this.fruitState.scale = 1.0;
            if (this.fruitState.pos[1] <= this.fruitState.groundY) {
                this.fruitState.pos[1] = this.fruitState.groundY; 
                this.fruitState.vel[1] = -this.fruitState.vel[1] * BOUNCE_FACTOR;
                this.fruitState.vel[0] *= 0.8; this.fruitState.vel[2] *= 0.8;
                if (Math.abs(this.fruitState.vel[1]) < 1.0) { this.fruitState.phase = 'REST'; this.fruitState.vel = [0,0,0]; } else { this.fruitState.phase = 'BOUNCE'; }
            }
            break;
        case 'REST': this.fruitState.scale = 1.0; break;
    }
    this.nodes.fallingFruit.localMatrix.setIdentity().translate(this.fruitState.pos[0], this.fruitState.pos[1], this.fruitState.pos[2]).scale(this.fruitState.scale * 2.0, this.fruitState.scale * 2.0, this.fruitState.scale * 2.0);
};

WorldEnvironment.prototype.getRootNode = function() { return this.rootNode; };

WorldEnvironment.prototype.update = function(now, elapsed) {
    var dt = elapsed / 1000.0;
    var waveY = Math.cos(now * 0.001) * 0.05;
    
    // Update Danau
    if (this.nodes.lakeSurface) { 
        this.nodes.lakeSurface.localMatrix.setIdentity()
            .translate(0, WATER_SURFACE_Y + waveY, 0)
            .scale(1, 0.05, 1); 
    }
    
    // Update Buah Jatuh
    this.updateFruitFall(dt); 

    // [BARU] Logic Pergerakan Awan
    var bounds = 200.0; // Batas layar kanan sebelum reset ke kiri
    
    if (this.clouds) {
        for(var i = 0; i < this.clouds.length; i++) {
            var c = this.clouds[i];
            
            // 1. Gerak ke arah X (Maju)
            c.x += c.speed * dt;
            
            // 2. Efek Wobble (Naik turun halus biar terlihat mengambang)
            var wobble = Math.sin((now * 0.001) + c.wobbleOffset) * 0.5;
            
            // 3. Looping (Reset posisi jika lewat batas kanan)
            if (c.x > bounds) {
                c.x = -bounds; // Pindah ke paling kiri
                c.z = (Math.random() - 0.5) * 300.0; // Acak posisi Z lagi biar variatif
            }

            // 4. Update Matrix Awan
            c.node.localMatrix.setIdentity()
                .translate(c.x, c.baseY + wobble, c.z);
        }
    }
};

function isPositionBlocked(x, z, modelRadius = 1.0) { return false; }