// =================================================================
// dragonAir.js (FIXED: FSM Logic for Collision & Fruit)
// =================================================================

// ... (Kode warna global tidak berubah)
var dragonairBlue = [0.4, 0.6, 1.0, 1.0];
var dragonairWhite = [1.0, 1.0, 1.0, 1.0];
var dragonairDarkPurple = [0.2, 0.0, 0.2, 1.0];
var dragonairEarWhite = [0.9, 0.9, 1.0, 1.0];
var dragonairSnoutBlue = [0.6, 0.75, 1.0, 1.0];
var crystalBlue = [0.23, 0.3, 0.79, 1.0]; 
var LOVE_COLOR = [1.0, 0.5, 0.7, 1.0]; 

// =================================================================
// GEOMETRI DASAR (TIDAK BERUBAH)
// =================================================================
function createDragonairSmoothBody(segments, segmentLength, startRadius, maxRadius, endRadius, currentAngle) {
    // ... (Salin fungsi createDragonairSmoothBody Anda yang ada di sini) ...
    var vertices = [];
    var colors = [];
    var indices = [];
    var ringSegments = 16;
    var spineMatrices = [];
    var currentSpineMatrix = new Matrix4();
    currentSpineMatrix.translate(0, 0.5, 0);
    spineMatrices.push(new Matrix4(currentSpineMatrix));
    let headLiftAngle = -15.0;
    let s_curve_amplitude = 12.0;
    let s_curve_freq = 2.5;
    let time = currentAngle * 0.004;
    for (let i = 0; i < segments; i++) {
        let p = i / (segments - 1);
        let angleX_deg = 0.0;
        let angleY_deg = 0.0;
        angleY_deg = s_curve_amplitude * Math.sin(p * Math.PI * s_curve_freq + time);
        let neckEnd = 0.3;
        let bodyFlat = 0.6;
        if (p < neckEnd) {
            angleX_deg = headLiftAngle * (1.0 - (p / neckEnd));
        } else if (p < bodyFlat) {
            let p_down = (p - neckEnd) / (bodyFlat - neckEnd);
            angleX_deg = -headLiftAngle * (1.0 - p_down);
        }
        currentSpineMatrix.rotate(angleY_deg, 0, 1, 0);
        currentSpineMatrix.rotate(angleX_deg, 1, 0, 0);
        currentSpineMatrix.translate(0, 0, -segmentLength);
        spineMatrices.push(new Matrix4(currentSpineMatrix));
    }
    let minY = Number.POSITIVE_INFINITY;
    var vertexIndex = 0;
    let firstMatrix = spineMatrices[0].elements;
    let firstSpinePos = [firstMatrix[12], firstMatrix[13], firstMatrix[14]];
    for (let i = 0; i < spineMatrices.length; i++) {
        let matrix = spineMatrices[i];
        let e = matrix.elements;
        let progress = i / (spineMatrices.length - 1);
        let currentRadius;
        if (progress <= 0.5) {
            currentRadius = startRadius + (maxRadius - startRadius) * (progress * 2);
        } else {
            currentRadius = maxRadius - (maxRadius - endRadius) * ((progress - 0.5) * 2);
        }
        for (let j = 0; j <= ringSegments; j++) {
            let angle = (j * 2 * Math.PI) / ringSegments;
            let x = currentRadius * Math.cos(angle);
            let y = currentRadius * Math.sin(angle); 
            let z = 0; 
            var new_x = e[0] * x + e[4] * y + e[8] * z + e[12];
            var new_y = e[1] * x + e[5] * y + e[9] * z + e[13];
            var new_z = e[2] * x + e[6] * y + e[10] * z + e[14];
            vertices.push(new_x, new_y, new_z);
            if (new_y < minY) minY = new_y;
            let y_local_normalized = Math.sin(angle);
            let mixFactor = Math.max(0.0, -y_local_normalized); 
            let r = dragonairBlue[0] * (1.0 - mixFactor) + dragonairWhite[0] * mixFactor;
            let g = dragonairBlue[1] * (1.0 - mixFactor) + dragonairWhite[1] * mixFactor;
            let b = dragonairBlue[2] * (1.0 - mixFactor) + dragonairWhite[2] * mixFactor;
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
        vertexIndex += (ringSegments + 1);
    }
    var finalMatrix = spineMatrices[spineMatrices.length - 1];
    var neckAttachMatrix = spineMatrices[1] || new Matrix4();
    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices),
        finalSpineMatrix: finalMatrix,
        neckAttachMatrix: neckAttachMatrix,
        minY: minY,
        firstSpinePos: firstSpinePos
    };
}

function createSphere(radius, segments, rings, color) {
    // ... (Salin fungsi createSphere Anda yang ada di sini) ...
    var vertices = [], colors = [], indices = [];
    for (var latNumber = 0; latNumber <= rings; latNumber++) {
        var theta = latNumber * Math.PI / rings;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);
        for (var longNumber = 0; longNumber <= segments; longNumber++) {
            var phi = longNumber * 2 * Math.PI / segments;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            vertices.push(radius * x, radius * y, radius * z);
            if (Array.isArray(color) && color.length >= 3) {
                colors.push(color[0], color[1], color[2], color[3] || 1.0);
            } else {
                colors.push(1.0, 1.0, 1.0, 1.0);
            }
        }
    }
    for (var latNumber = 0; latNumber < rings; latNumber++) {
        for (var longNumber = 0; longNumber < segments; longNumber++) {
            var first = (latNumber * (segments + 1)) + longNumber;
            var second = first + segments + 1;
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }
    return { vertices: new Float32Array(vertices), colors: new Float32Array(colors), indices: new Uint16Array(indices) };
}

function createCone(baseRadius, height, segments, color) {
    // ... (Salin fungsi createCone Anda yang ada di sini) ...
    var vertices = [], colors = [], indices = [];
    vertices.push(0, height, 0); 
    if (Array.isArray(color) && color.length >= 3) {
        colors.push(color[0], color[1], color[2], color[3] || 1.0);
    } else { colors.push(1.0, 1.0, 1.0, 1.0); }
    for (var i = 0; i <= segments; i++) {
        var angle = (i * 2 * Math.PI) / segments;
        var x = baseRadius * Math.cos(angle);
        var z = baseRadius * Math.sin(angle);
        vertices.push(x, 0, z); 
        if (Array.isArray(color) && color.length >= 3) {
            colors.push(color[0], color[1], color[2], color[3] || 1.0);
        } else { colors.push(1.0, 1.0, 1.0, 1.0); }
    }
    for (var i = 1; i <= segments; i++) {
        var nextIndex = (i === segments) ? 1 : i + 1;
        indices.push(0, i, nextIndex);
    }
    return { vertices: new Float32Array(vertices), colors: new Float32Array(colors), indices: new Uint16Array(indices) };
}

function createDragonairEarParaboloid(baseScaleX, baseScaleY, height, radialSegments, heightSegments, color) {
    // ... (Salin fungsi createDragonairEarParaboloid Anda yang ada di sini) ...
    var vertices = [], colors = [], indices = [];
    const twistFactor = 0.2;
    const flareFactor = 0.3;
    for (let i = 0; i <= heightSegments; i++) {
        const v = i / heightSegments;
        let radiusScale;
        if (v < 0.3) {
            radiusScale = (v / 0.3) * 0.7;
        } else if (v < 0.7) {
            radiusScale = 0.7 + ((v - 0.3) / 0.4) * 0.3;
        } else {
            radiusScale = 1.0 - ((v - 0.7) / 0.3) * 0.9;
        }
        radiusScale = Math.max(0.05, radiusScale);
        const y = v * height;
        const twist = v * Math.PI * twistFactor;
        for (let j = 0; j <= radialSegments; j++) {
            const u = j / radialSegments;
            const theta = u * Math.PI * 2 + twist;
            const x = Math.cos(theta) * baseScaleX * radiusScale;
            const z = Math.sin(theta) * baseScaleY * radiusScale;
            vertices.push(x, y, z);
            if (Array.isArray(color) && color.length >= 3) {
                colors.push(color[0], color[1], color[2], color[3] || 1.0);
            } else {
                colors.push(0.9, 0.95, 1.0, 1.0);
            }
        }
    }
    for (let i = 0; i < heightSegments; i++) {
        for (let j = 0; j < radialSegments; j++) {
            const first = (i * (radialSegments + 1)) + j;
            const second = first + radialSegments + 1;
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }
    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices)
    };
}

// =================================================================
// Class OOP untuk DRAGONAIR
// =================================================================

function Dragonair(gl, programInfo) {
    this.gl = gl;
    this.programInfo = programInfo;

    this.rootNode = null;
    this.nodes = {};
    this.bodyData = null;
    this.bodyBuffers = null;
    
    this.bodySegmentsCount = 20;
    this.segmentLength = 0.9;
    this.startRadius = 0.6;
    this.maxRadius = 0.8;
    this.endRadius = 0.1;

    this.position = [0, 0, 0];
    this.currentAngleY = 0;
    this.targetAngleY = 0;
    this.moveSpeed = 5.0; 
    this.turnSpeed = 90.0;
    
    // [PERBAIKAN] Toleransi jarak untuk "sampai"
    this.targetReachedThreshold = 2.5; 
    
    this.facingThreshold = 5.0;

    // [PERBAIKAN] Properti untuk collision
    this.collisionRadius = 2.0; // Radius Dragonair (bisa disesuaikan)
    this.worldBounds = 180.0; // Batas jalan, lebih kecil dari plane (200)
    this.obstacles = []; // Daftar rintangan (diisi oleh main.js)

    this.animationState = "IDLE_STATIC"; 
    this.stateTimer = 0.0;
    this.targetFruitPosition = [10, 0]; // (Sesuai posisi awal di main.js)
    this.idleRadius = 50.0; // Radius jalan acak di sekitar (0,0)
    
    this.loveLoveParticles = [];
    this.loveLoveDuration = 2.0;
    this.loveLoveStartTime = 0;
}

// =================================================================
// Dragonair.prototype.init
// (TIDAK BERUBAH - Sama seperti yang Anda berikan)
// =================================================================
Dragonair.prototype.init = function() {
    // ... (Salin fungsi init() Anda yang ada di sini) ...
    var gl = this.gl;
    var programInfo = this.programInfo;
    var headGeo = createSphere(1.0, 30, 30, dragonairBlue);
    var snoutGeo = createSphere(0.6, 20, 20, dragonairSnoutBlue);
    var hornGeo = createCone(0.3, 1.0, 10, dragonairWhite);
    var earBaseGeo = createSphere(0.25, 10, 10, dragonairEarWhite);
    var earWingGeo = createDragonairEarParaboloid(0.8, 0.2, 1.5, 10, 6, dragonairEarWhite);
    var neckOrbGeo = createSphere(0.3, 12, 12, crystalBlue);
    var eyeGeo = createSphere(0.15, 10, 10, dragonairDarkPurple);
    var tailBall1Geo = createSphere(0.2, 10, 10, dragonairBlue);
    var tailBall2Geo = createSphere(0.15, 10, 10, dragonairBlue); 
    var tailBall3Geo = createSphere(0.1, 10, 10, dragonairBlue);
    var loveGeo = createSphere(0.15, 8, 8, LOVE_COLOR); 
    var headBuffers = initBuffers(gl, programInfo, headGeo);
    var snoutBuffers = initBuffers(gl, programInfo, snoutGeo);
    var hornBuffers = initBuffers(gl, programInfo, hornGeo);
    var earBaseBuffers = initBuffers(gl, programInfo, earBaseGeo);
    var earWingBuffers = initBuffers(gl, programInfo, earWingGeo);
    var eyeBuffers = initBuffers(gl, programInfo, eyeGeo);
    var tailBallBuffers = [
        initBuffers(gl, programInfo, tailBall1Geo),
        initBuffers(gl, programInfo, tailBall2Geo),
        initBuffers(gl, programInfo, tailBall3Geo)
    ];
    var neckOrbBuffers = initBuffers(gl, programInfo, neckOrbGeo);
    this.nodes.loveBuffer = initBuffers(gl, programInfo, loveGeo); 
    this.rootNode = new SceneNode(null);
    this.nodes.body = new SceneNode(null); 
    this.rootNode.children.push(this.nodes.body);
    this.nodes.head = new SceneNode(headBuffers);
    this.rootNode.children.push(this.nodes.head);
    this.nodes.snout = new SceneNode(snoutBuffers);
    this.nodes.head.children.push(this.nodes.snout);
    this.nodes.horn = new SceneNode(hornBuffers);
    this.nodes.head.children.push(this.nodes.horn);
    this.nodes.earL = new SceneNode(null); this.nodes.head.children.push(this.nodes.earL);
    this.nodes.earLBase = new SceneNode(earBaseBuffers); this.nodes.earL.children.push(this.nodes.earLBase);
    this.nodes.earLWing1 = new SceneNode(earWingBuffers); this.nodes.earL.children.push(this.nodes.earLWing1);
    this.nodes.earLWing2 = new SceneNode(earWingBuffers); this.nodes.earL.children.push(this.nodes.earLWing2);
    this.nodes.earLWing3 = new SceneNode(earWingBuffers); this.nodes.earL.children.push(this.nodes.earLWing3);
    this.nodes.earR = new SceneNode(null); this.nodes.head.children.push(this.nodes.earR);
    this.nodes.earRBase = new SceneNode(earBaseBuffers); this.nodes.earR.children.push(this.nodes.earRBase);
    this.nodes.earRWing1 = new SceneNode(earWingBuffers); this.nodes.earR.children.push(this.nodes.earRWing1);
    this.nodes.earRWing2 = new SceneNode(earWingBuffers); this.nodes.earR.children.push(this.nodes.earRWing2);
    this.nodes.earRWing3 = new SceneNode(earWingBuffers); this.nodes.earR.children.push(this.nodes.earRWing3);
    this.nodes.eyeL = new SceneNode(eyeBuffers); this.nodes.head.children.push(this.nodes.eyeL);
    this.nodes.eyeR = new SceneNode(eyeBuffers); this.nodes.head.children.push(this.nodes.eyeR);
    this.nodes.neckOrb = new SceneNode(neckOrbBuffers);
    this.rootNode.children.push(this.nodes.neckOrb);
    this.nodes.tailRoot = new SceneNode(null);
    this.rootNode.children.push(this.nodes.tailRoot);
    this.nodes.tailBall1 = new SceneNode(tailBallBuffers[0]);
    this.nodes.tailRoot.children.push(this.nodes.tailBall1);
    this.nodes.tailBall2 = new SceneNode(tailBallBuffers[1]);
    this.nodes.tailBall1.children.push(this.nodes.tailBall2);
    this.nodes.tailBall3 = new SceneNode(tailBallBuffers[2]);
    this.nodes.tailBall2.children.push(this.nodes.tailBall3);
    this.nodes.loveContainer = new SceneNode(null); 
    this.nodes.head.children.push(this.nodes.loveContainer);
};

// =================================================================
// [PERBAIKAN] FUNGSI BARU UNTUK COLLISION
// =================================================================

/** Menerima daftar rintangan dari main.js */
Dragonair.prototype.setObstacles = function(obstaclesList) {
    this.obstacles = obstaclesList;
}

/** Cek tabrakan internal (Batas Peta, Pohon, Gunung) 
 * [PERBAIKAN] Cek danau dihapus dari sini.
*/
Dragonair.prototype._isPositionBlocked = function(x, z) {
    // 1. Cek Batas Peta
    if (Math.abs(x) > this.worldBounds || Math.abs(z) > this.worldBounds) {
        return true; // Tabrak batas peta
    }

    // 2. Cek Pohon & Gunung (dari daftar obstacles)
    if (!this.obstacles) return false; // Pengaman jika obstacles belum di-set

    for (let i = 0; i < this.obstacles.length; i++) {
        const obs = this.obstacles[i];
        const dx = x - obs.x;
        const dz = z - obs.z;
        const distSquared = dx * dx + dz * dz;
        
        // Jarak minimum = radius rintangan + radius model
        const minCollisionDist = obs.radius + this.collisionRadius;
        
        if (distSquared < (minCollisionDist * minCollisionDist)) {
            return true; // Tabrakan!
        }
    }
    
    return false; // Aman
}

// =================================================================
// Dragonair.prototype.updateLoveLove
// (TIDAK BERUBAH - Sama seperti yang Anda berikan)
// =================================================================
Dragonair.prototype.updateLoveLove = function(nowSeconds, dt) {
    // ... (Salin fungsi updateLoveLove Anda yang ada di sini) ...
    if (this.animationState !== "LOVE_LOVE") {
        this.nodes.loveContainer.children = [];
        return;
    }
    if (this.loveLoveParticles.length === 0) {
        this.loveLoveStartTime = nowSeconds;
        for (let i = 0; i < 15; i++) {
            this.loveLoveParticles.push({
                x: (Math.random() - 0.5) * 0.5,
                y: 0.5,
                z: 0.7, 
                speedY: 2.0 + Math.random() * 1.5,
                life: 0,
                maxLife: this.loveLoveDuration * (0.8 + Math.random() * 0.4),
                scale: 0.5 + Math.random() * 0.5
            });
        }
    }
    this.nodes.loveContainer.children = [];
    let isFinished = true;
    this.loveLoveParticles.forEach(p => {
        p.life += dt;
        let lifeProgress = p.life / p.maxLife;
        if (lifeProgress < 1.0) {
            isFinished = false;
            p.y += p.speedY * dt * (1.0 - lifeProgress); 
            p.x += Math.sin(p.life * 5) * 0.1 * dt; 
            p.z += Math.cos(p.life * 5) * 0.1 * dt;
            let scaleFactor = p.scale * (1.0 - Math.pow(lifeProgress, 2));
            scaleFactor = Math.max(0.0, scaleFactor);
            if (scaleFactor > 0.01) {
                let loveNode = new SceneNode(this.nodes.loveBuffer);
                loveNode.localMatrix.setIdentity()
                    .translate(p.x, p.y, p.z)
                    .scale(scaleFactor, scaleFactor, scaleFactor);
                this.nodes.loveContainer.children.push(loveNode);
            }
        }
    });
    
    // [PERBAIKAN] Logika 'selesai' dipindah ke FSM
    if (isFinished && nowSeconds - this.loveLoveStartTime > this.loveLoveDuration + 1.0) {
        this.animationState = "IDLE_STATIC"; // Sinyal untuk FSM
        this.loveLoveParticles = [];
    }
};

// =================================================================
// Dragonair.prototype.update
// [PERBAIKAN] Logika FSM diperbarui untuk Cek Tabrakan
// =================================================================
Dragonair.prototype.update = function(now, groundY, elapsed) {
    var gl = this.gl;
    var programInfo = this.programInfo;
    var dt = elapsed / 1000.0;
    var nowSeconds = now / 1000.0;
    this.stateTimer += dt;
    
    let waveTimeFactor = now * 0.001; 

    switch (this.animationState) {
        case "IDLE_STATIC":
            // [PERBAIKAN] Ganti ke DYNAMIC_IDLE agar selalu bergerak
            this.animationState = "DYNAMIC_IDLE";
            this.stateTimer = 0; 
            break;

        // --- [PERBAIKAN] LOGIKA JALAN ACAK (WANDER) BARU ---
        
        case 'DYNAMIC_IDLE': // Ini adalah state "Pilih target baru"
            this.stateTimer = 0;
            
            // [PERBAIKAN] FSM "glitch" fix:
            // State ini HANYA memilih target baru.
            
            let angle = Math.random() * 2 * Math.PI;
            let newTargetX, newTargetZ;
            let tries = 0;
            
            do {
                // Cari target baru di sekitar POSISI SAAT INI
                let r = 20.0 + Math.random() * 30.0; // Jarak 20-50 unit
                newTargetX = this.position[0] + Math.cos(angle) * r;
                newTargetZ = this.position[2] + Math.sin(angle) * r;
                angle += 0.5; 
                tries++;
            } while (
                this._isPositionBlocked(newTargetX, newTargetZ) && tries < 20
            );

            this.targetFruitPosition[0] = newTargetX;
            this.targetFruitPosition[1] = newTargetZ; 
            this.animationState = "DYNAMIC_START_WALK"; // Selalu lanjut ke 'berbelok'
            
            waveTimeFactor = now * 0.008; 
            break;
        
        case "DYNAMIC_START_WALK":
            waveTimeFactor = now * 0.005;
            let dx_dyn = this.targetFruitPosition[0] - this.position[0];
            let dz_dyn = this.targetFruitPosition[1] - this.position[2];
            
            if (Math.abs(dx_dyn) < 0.01 && Math.abs(dz_dyn) < 0.01) {
                 this.animationState = "DYNAMIC_IDLE"; // Langsung cari target baru
                 break;
            }

            let targetAngleRad_dyn = Math.atan2(dx_dyn, dz_dyn);
            this.targetAngleY = targetAngleRad_dyn * 180.0 / Math.PI;
            let angleDiff_dyn = this.targetAngleY - this.currentAngleY;
            while (angleDiff_dyn > 180) angleDiff_dyn -= 360;
            while (angleDiff_dyn < -180) angleDiff_dyn += 360;
            let turnAmount_dyn = this.turnSpeed * dt * 0.7; 
            if (Math.abs(angleDiff_dyn) < this.facingThreshold || Math.abs(angleDiff_dyn) < turnAmount_dyn) {
                this.currentAngleY = this.targetAngleY; 
                this.animationState = "DYNAMIC_WALK_TO_TARGET"; 
            } else {
                this.currentAngleY += Math.sign(angleDiff_dyn) * turnAmount_dyn;
            }
            break;

        case "DYNAMIC_WALK_TO_TARGET":
            waveTimeFactor = now * 0.15; 

            let dx_dyn_walk = this.targetFruitPosition[0] - this.position[0];
            let dz_dyn_walk = this.targetFruitPosition[1] - this.position[2];
            let distToTarget_dyn_walk = Math.sqrt(dx_dyn_walk * dx_dyn_walk + dz_dyn_walk * dz_dyn_walk);
            
            if (distToTarget_dyn_walk < this.targetReachedThreshold) {
                this.animationState = "DYNAMIC_IDLE"; // <-- Sampai. Cari target baru.
                this.stateTimer = 0;
            } else {
                let currentAngleRad = this.currentAngleY * Math.PI / 180.0;
                let moveDirX = Math.sin(currentAngleRad);
                let moveDirZ = Math.cos(currentAngleRad);
                let moveAmount = this.moveSpeed * dt;
                let nextX = this.position[0] + moveDirX * moveAmount;
                let nextZ = this.position[2] + moveDirZ * moveAmount;

                if (this._isPositionBlocked(nextX, nextZ)) {
                    this.animationState = "DYNAMIC_IDLE"; // <-- Nabrak. Cari target baru.
                } else {
                    this.position[0] = nextX;
                    this.position[2] = nextZ;
                }
            }
            break;
        
        // --- AKHIR LOGIKA JALAN ACAK ---


        // --- LOGIKA MAKAN BUAH (Scenario 2) ---
            
        case "START_WALK":
            waveTimeFactor = now * 0.005;
            let dx = this.targetFruitPosition[0] - this.position[0];
            let dz = this.targetFruitPosition[1] - this.position[2];
            let distToTarget_start = Math.sqrt(dx * dx + dz * dz);
            
            if (distToTarget_start < this.targetReachedThreshold) {
                this.animationState = "EATING"; 
                this.stateTimer = 0;
                if (window.myWorld && window.myWorld.nodes.fallingFruit) {
                    window.myWorld.nodes.fallingFruit.enabled = false;
                }
                break;
            }
            
            let targetAngleRad = Math.atan2(dx, dz);
            this.targetAngleY = targetAngleRad * 180.0 / Math.PI;
            let angleDiff = this.targetAngleY - this.currentAngleY;
            while (angleDiff > 180) angleDiff -= 360;
            while (angleDiff < -180) angleDiff += 360;
            let turnAmount = this.turnSpeed * dt * 0.7; 
            if (Math.abs(angleDiff) < this.facingThreshold || Math.abs(angleDiff) < turnAmount) {
                this.currentAngleY = this.targetAngleY; 
                this.animationState = "WALK_TO_FRUIT"; 
            } else {
                this.currentAngleY += Math.sign(angleDiff) * turnAmount;
            }
            break;
            
        case "WALK_TO_FRUIT":
            waveTimeFactor = now * 0.15; 

            let dx_walk = this.targetFruitPosition[0] - this.position[0];
            let dz_walk = this.targetFruitPosition[1] - this.position[2];
            let distToTarget_walk = Math.sqrt(dx_walk * dx_walk + dz_walk * dz_walk);
            
            if (distToTarget_walk < this.targetReachedThreshold) {
                this.animationState = "EATING";
                this.stateTimer = 0;
                if (window.myWorld && window.myWorld.nodes.fallingFruit) {
                    window.myWorld.nodes.fallingFruit.enabled = false;
                 }        
            } else {
                // [PERBAIKAN] Logika collision dihapus agar dia BISA menembus
                // pohon untuk makan buah yang ada di dalamnya.
                
                let currentAngleRad = this.currentAngleY * Math.PI / 180.0;
                let moveDirX = Math.sin(currentAngleRad);
                let moveDirZ = Math.cos(currentAngleRad);
                let moveAmount = this.moveSpeed * dt;

                let nextX = this.position[0] + moveDirX * moveAmount;
                let nextZ = this.position[2] + moveDirZ * moveAmount;
                
                // Cek HANYA batas peta
                if (Math.abs(nextX) > this.worldBounds || Math.abs(nextZ) > this.worldBounds) {
                   // Nabrak batas, kembali jalan acak
                   this.animationState = "DYNAMIC_IDLE";
                } else {
                    // Aman dari batas, bergerak (boleh nabrak pohon)
                    this.position[0] = nextX;
                    this.position[2] = nextZ;
                }
            }
            break;

        case "EATING":
            if (this.stateTimer > 2.5) { 
                this.animationState = "LOVE_LOVE";
                this.stateTimer = 0;
            }
            break;

        case "LOVE_LOVE":
            this.updateLoveLove(nowSeconds, dt);
            // [PERBAIKAN] Setelah selesai love, kembali ke jalan acak
            if (this.animationState === "IDLE_STATIC") { // (updateLoveLove mengubah ini)
                this.animationState = "DYNAMIC_IDLE";
            }
            break;
    }
    
    // =================================================================
    // SISA FUNGSI UPDATE (PEMBUATAN BADAN & MATRIKS)
    // (TIDAK BERUBAH - Sama seperti yang Anda berikan)
    // =================================================================
    
    this.bodyData = createDragonairSmoothBody(
        this.bodySegmentsCount, this.segmentLength, this.startRadius, 
        this.maxRadius, this.endRadius, waveTimeFactor 
    );

    if (!this.bodyData) { console.error("Gagal membuat bodyData"); return; }
    
    if (this.bodyBuffers) {
    }
    
    this.bodyBuffers = initBuffers(gl, programInfo, this.bodyData); 
    if (!this.bodyBuffers) { console.error("Gagal init bodyBuffers"); return; }
    
    var finalBodyMatrix = this.bodyData.finalSpineMatrix || new Matrix4();
    var neckAttachMatrix = this.bodyData.neckAttachMatrix || new Matrix4();

    if (this.bodyData.minY === undefined) { console.error("bodyData.minY tidak terdefinisi!"); return; }
    var modelGroundY = groundY - this.bodyData.minY + 0.01; 

    this.rootNode.localMatrix.setIdentity();
    this.rootNode.localMatrix.translate(this.position[0], modelGroundY, this.position[2]); 
    this.rootNode.localMatrix.rotate(this.currentAngleY, 0, 1, 0); 
        
    this.nodes.body.buffers = this.bodyBuffers; 
    this.nodes.body.localMatrix.setIdentity();

    let headBaseY = this.startRadius; 
    this.nodes.head.localMatrix.setIdentity()
        .translate(0, headBaseY, 0)
        .scale(1.0, 1.0, 1.3);

    if (this.animationState === "EATING") {
        let eatProgress = Math.min(1.0, this.stateTimer / 2.5); 
        let eatAngle = -15 * Math.sin(eatProgress * Math.PI / 2); 
        this.nodes.head.localMatrix.rotate(eatAngle, 1, 0, 0);
    }

    this.nodes.snout.localMatrix.setIdentity().translate(0, -0.3, 0.8).scale(1.0, 1.0, 1.3);
    this.nodes.horn.localMatrix.setIdentity().translate(0, 0.8, 0.5).rotate(15, 1, 0, 0);

    this.nodes.earL.localMatrix.setIdentity().translate(-0.75, 0.45, -0.15);
    this.nodes.earLBase.localMatrix.setIdentity().scale(0.7, 0.7, 0.7);
    this.nodes.earLWing1.localMatrix.setIdentity().translate(0, 0, 0).rotate(25, 0, 1, 0).rotate(20, 0, 0, 1).rotate(-15, 1, 0, 0).scale(1.0, 1.0, 1.0);
    this.nodes.earLWing2.localMatrix.setIdentity().translate(0.05, 0.05, -0.1).rotate(35, 0, 1, 0).rotate(15, 0, 0, 1).rotate(-15, 1, 0, 0).scale(0.8, 0.8, 0.8);
    this.nodes.earLWing3.localMatrix.setIdentity().translate(0.1, 0.1, -0.2).rotate(45, 0, 1, 0).rotate(10, 0, 0, 1).rotate(-15, 1, 0, 0).scale(0.6, 0.6, 0.6);

    this.nodes.earR.localMatrix.setIdentity().translate(0.75, 0.45, -0.15).scale(-1, 1, 1);
    this.nodes.earRBase.localMatrix.setIdentity().scale(0.7, 0.7, 0.7);
    this.nodes.earRWing1.localMatrix.setIdentity().translate(0, 0, 0).rotate(25, 0, 1, 0).rotate(20, 0, 0, 1).rotate(-15, 1, 0, 0).scale(1.0, 1.0, 1.0);
    this.nodes.earRWing2.localMatrix.setIdentity().translate(0.05, 0.05, -0.1).rotate(35, 0, 1, 0).rotate(15, 0, 0, 1).rotate(-15, 1, 0, 0).scale(0.8, 0.8, 0.8);
    this.nodes.earRWing3.localMatrix.setIdentity().translate(0.1, 0.1, -0.2).rotate(45, 0, 1, 0).rotate(10, 0, 0, 1).rotate(-15, 1, 0, 0).scale(0.6, 0.6, 0.6);

    this.nodes.eyeL.localMatrix.setIdentity().translate(-0.6, 0.1, 0.75).scale(1.0, 1.2, 0.5);
    this.nodes.eyeR.localMatrix.setIdentity().translate(0.6, 0.1, 0.75).scale(1.0, 1.2, 0.5);

    this.nodes.neckOrb.localMatrix.set(neckAttachMatrix).translate(0, -1.2, -1);
    this.nodes.tailRoot.localMatrix.set(finalBodyMatrix);
    this.nodes.tailBall1.localMatrix.setIdentity().translate(0, 0, -0.3);
    this.nodes.tailBall2.localMatrix.setIdentity().translate(0, 0, -0.4);
    this.nodes.tailBall3.localMatrix.setIdentity().translate(0, 0, -0.3);
    
    this.nodes.loveContainer.localMatrix.setIdentity(); 
    this.updateLoveLove(nowSeconds, dt);
};

Dragonair.prototype.getRootNode = function() {
    return this.rootNode;
};

// =================================================================
// SCENE NODE & HELPER (TIDAK BERUBAH)
// =================================================================

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