function SceneNode(buffers) {
    this.buffers = buffers; // Buffer geometri (untuk drawPart)
    this.localMatrix = new Matrix4();
    this.children = [];
    this.enabled = true; // Ditambahkan untuk kontrol Flamethrower
}

// ASUMSI: Fungsi WebGL utilities (HANYA PLACEHOLDER)
var gl = gl || {
    COLOR_BUFFER_BIT: 0x00004000,
    DEPTH_BUFFER_BIT: 0x00000100,
    clear: function() { console.log("WebGL: clear buffer"); },
}; // Hanya placeholder
var programInfo = programInfo || {
    uniformLocations: {
        modelViewProjectionMatrix: 'u_MvpMatrix'
    }
}; // Hanya placeholder

function initBuffers(gl, programInfo, geometryData) {
    if (!geometryData || !geometryData.indices) return null;
    return {
        // Hanya placeholder, aslinya ini adalah VBO, CBO, IBO, NBO
        vbo: 'VBO_DUMMY', 
        cbo: 'CBO_DUMMY',
        ibo: 'IBO_DUMMY',
        n: geometryData.indices.length,
        numIndices: geometryData.indices.length
    };
}

// ASUMSI: Fungsi drawPart (Sangat disederhanakan)
function drawPart(gl, programInfo, buffers, modelMatrix) {
    if (buffers) {
        // Implementasi nyata akan:
        // 1. Bind buffers (VBO, CBO, IBO)
        // 2. Hitung MVP Matrix: mvpMatrix = projectionMatrix * viewMatrix * modelMatrix
        // 3. Set uniform u_MvpMatrix
        // 4. gl.drawElements()
        // console.log("Drawing part with", buffers.numIndices, "indices at", modelMatrix.elements[12], modelMatrix.elements[13], modelMatrix.elements[14]);
    }
}

// ASUMSI: Fungsi untuk menggambar seluruh scene graph
function drawSceneGraph(node, gl, programInfo, currentMatrix) {
    var newMatrix = new Matrix4(currentMatrix).multiply(node.localMatrix);
    
    // Gambar bagian ini jika ada buffers
    if (node.buffers) {
        drawPart(gl, programInfo, node.buffers, newMatrix);
    }
    
    // Gambar anak-anak
    for (var i = 0; i < node.children.length; i++) {
        drawSceneGraph(node.children[i], gl, programInfo, newMatrix);
    }
}


// Warna global (Warna DRATINI)
var dratiniBlue = [0.65, 0.8, 0.95, 1.0]; // Biru Dratini yang lebih muda dan cerah
var dratiniWhite = [1.0, 1.0, 1.0, 1.0];
var dratiniEye = [0.4, 0.0, 0.6, 1.0]; 
var fireOrange = [1.0, 0.5, 0.0, 1.0]; // Warna api
var fireYellow = [1.0, 0.8, 0.0, 1.0]; // Warna tengah api

// =================================================================
// WARNA DAN GEOMETRI BARU UNTUK EFEK BUBBLE AIR & API
// =================================================================
var bubbleBlue = [0.1, 0.5, 0.9, 0.6]; // Biru transparan untuk gelembung
var numBubbles = 50; // Jumlah gelembung yang akan digambar
var bubbleMaxRadius = 0.2; // Radius maksimum gelembung

// =================================================================
// FUNGSI GEOMETRI DASAR
// =================================================================

function createSphere(radius, segments, rings, color) {
    var vertices = [], colors = [], indices = [], normals = []; 
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
            colors.push(color[0], color[1], color[2], color[3]);
            normals.push(x, y, z); 
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
    return { 
        vertices: new Float32Array(vertices), 
        colors: new Float32Array(colors), 
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices) 
    };
}

function createBubbleSphere(radius, segments, rings, color) {
    return createSphere(radius, segments, rings, color); 
}

// [BARU] Geometri Api (Gabungan kerucut dan silinder bergelombang)
function createFireGeometry(baseRadius, height, segments, colorOuter, colorInner) {
    var vertices = [], colors = [], indices = [], normals = []; 
    var center = [0, 0, 0];
    var indexOffset = 0;

    // Bagian Bawah (Kerucut / Cone)
    var baseSegments = segments;
    var tip = [0, height, 0];
    
    // Titik pusat alas (index 0)
    vertices.push(center[0], center[1], center[2]);
    colors.push(colorInner[0], colorInner[1], colorInner[2], 1.0);
    indexOffset++;

    // Lingkaran alas
    for (let i = 0; i <= baseSegments; i++) {
        let angle = (i / baseSegments) * Math.PI * 2;
        let x = baseRadius * Math.cos(angle);
        let z = baseRadius * Math.sin(angle);
        
        vertices.push(x, 0, z);
        colors.push(colorOuter[0], colorOuter[1], colorOuter[2], 1.0);
    }
    // Index alas
    for (let i = 0; i < baseSegments; i++) {
        indices.push(0, indexOffset + i, indexOffset + i + 1);
    }
    indexOffset += baseSegments + 1;

    // Titik puncak (index akhir)
    vertices.push(tip[0], tip[1], tip[2]);
    colors.push(colorInner[0], colorInner[1], colorInner[2], 1.0);
    var tipIndex = indexOffset;
    indexOffset++;

    // Sisi Kerucut
    var baseStartIndex = tipIndex - baseSegments - 1;
    for (let i = 0; i < baseSegments; i++) {
        indices.push(tipIndex, baseStartIndex + i, baseStartIndex + i + 1);
    }

    return { 
        vertices: new Float32Array(vertices), 
        colors: new Float32Array(colors), 
        indices: new Uint16Array(indices) 
    };
}

function createEllipticParaboloid(a, b, c, segments, rings, color) {
    var vertices = [], colors = [], indices = [], normals = []; 

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
            var len = Math.sqrt(nx*nx + ny*ny + nz*nz);
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
            var first = (i * (segments + 1)) + j;
            var second = first + segments + 1;
            
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    return { 
        vertices: new Float32Array(vertices), 
        colors: new Float32Array(colors), 
        normals: new Float32Array(normals), 
        indices: new Uint16Array(indices) 
    };
}

// [MODIFIED] Menambahkan parameter untuk menghentikan animasi S-Curve
function createDratiniSmoothBody(segments, segmentLength, startRadius, maxRadius, endRadius, currentAngle, isStatic, tackleProgress) {
    var vertices = [], colors = [], indices = [], ringSegments = 16;
    var spineMatrices = [], currentSpineMatrix = new Matrix4();

    currentSpineMatrix.translate(0, 0.5, 0); //y untuk kepala
    spineMatrices.push(new Matrix4(currentSpineMatrix));

    let headLiftAngle = isStatic ? -5.0 : -15.0; // Lebih datar saat Flamethrower
    let s_curve_amplitude = isStatic ? 0.0 : 12.0; // Amplitude 0 saat diam
    let s_curve_freq = 2.5;
    let time = currentAngle * 0.004;
    
    // Tackle: Rotasi badan saat memukul
    let bodyRotX = 0;
    if (tackleProgress > 0) {
        // Melompat ke depan (miringkan badan)
        bodyRotX = -35 * Math.sin(tackleProgress * Math.PI); // Mulai 0, Max 35 deg, End 0
    }

    // Terapkan rotasi tackle ke Root Spine
    currentSpineMatrix.rotate(bodyRotX, 1, 0, 0); 

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
        
        // Tackle: Pukulan Ekor
        let tailSegmentStart = 0.7;
        if (tackleProgress > 0 && p > tailSegmentStart) {
            // Segmen ekor memukul ke depan (Z negatif)
            let tailProgress = (p - tailSegmentStart) / (1.0 - tailSegmentStart);
            // Ekor mencambuk ke depan (Z)
            angleX_deg += 50 * Math.sin(tackleProgress * Math.PI) * tailProgress; 
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
        firstSpinePos: firstSpinePos,
        // Kita juga perlu mengembalikan matriks ekor
        tailMatrix: spineMatrices[spineMatrices.length - 2] || new Matrix4() 
    };
}

// =================================================================
// CLASS DRATINI 
// =================================================================

function DratiniModel(gl, programInfo) {
    this.gl = gl;
    this.programInfo = programInfo;

    this.rootNode = null;
    this.nodes = {};
    this.bodyData = null;
    this.bodyBuffers = null;
    
    // Variabel tubuh (dari dragonAir.js)
    const bodyScaleFactor = 0.8; 
    this.bodySegmentsCount = 20;
    this.segmentLength = 0.9 * bodyScaleFactor; 
    this.startRadius = 0.6 * bodyScaleFactor; 
    this.maxRadius = 0.8 * bodyScaleFactor; 
    this.endRadius = 0.1 * bodyScaleFactor; 

    // Variabel untuk gerakan angka 8 (dari dratini.js)
    this.position = [0, 0, 0];
    this.globalRotationY = 0;
    this.currentAngle = 0.0;
    this.radiusX = 15.0;
    this.radiusZ = 10.0;
    this.angularSpeed = 0.0005;
    this.waveAnimPhase = 0.0;
    this.currentYOffset = 0.0; // Offset Y untuk lompatan Tackle

    // ************************************************************
    // VARIABEL ANIMASI BUBBLE, SIRIP, FLAMETHROWER & TACKLE
    // ************************************************************
    this.finAnimPhase = 0.0; 
    this.finAmplitude = 5.0; 

    this.waterAnimPhase = 0.0;
    this.waterDuration = 1000;
    this.waterActive = false;
    
    // Status Animasi Skill
    this.animationState = 'IDLE'; // IDLE, FLAMETHROWER_PREP, FLAMETHROWER, TACKLE
    this.stateTimer = 0.0;
    this.prepDuration = 500; // 0.5 detik bersiap
    this.flameDuration = 1200; // 1.2 detik semburan
    this.tackleDuration = 1000; // 1.0 detik tackle

    // VARIABEL BUBBLE BARU
    this.bubbleParticles = []; 
    for (let i = 0; i < numBubbles; i++) {
        this.bubbleParticles.push({
            // Posisi awal acak dalam area kecil
            x: (Math.random() - 0.5) * 0.5, 
            y: (Math.random() - 0.5) * 0.5,
            z: (Math.random() - 0.5) * 0.5,
            // Kecepatan acak (bergerak maju ke Z)
            speedZ: 2.0 + Math.random() * 3.0,
            scale: 0.1 + Math.random() * (bubbleMaxRadius - 0.1),
            life: Math.random() * this.waterDuration, // Mulai dari fase kehidupan acak
            maxLife: this.waterDuration,
        });
    }
    // ************************************************************
}

DratiniModel.prototype.init = function() {
    var gl = this.gl;
    var programInfo = this.programInfo;
    
    // 1. Buat Geometri Statis
    var headGeo = createSphere(1.0, 30, 30, dratiniBlue);
    var snoutGeo = createSphere(0.4, 15, 15, dratiniWhite);
    var earGeo = createEllipticParaboloid(0.35, 0.08, 1.2, 12, 10, dratiniWhite);
    var eyeGeo = createSphere(0.1, 8, 8, dratiniEye);
    var foreheadDotGeo = createSphere(0.08, 6, 6, dratiniWhite);

    // ************************************************************
    // GEOMETRI BUBBLE & FIRE BARU
    // ************************************************************
    var bubbleGeo = createBubbleSphere(1.0, 8, 8, bubbleBlue);
    // Kerucut api untuk Flamethrower
    var flameGeo = createFireGeometry(1.0, 5.0, 16, fireOrange, fireYellow); 
    // ************************************************************

    // 2. Inisialisasi Buffer Statis
    var headBuffers = initBuffers(gl, programInfo, headGeo);
    var snoutBuffers = initBuffers(gl, programInfo, snoutGeo);
    var earBuffers = initBuffers(gl, programInfo, earGeo);
    var eyeBuffers = initBuffers(gl, programInfo, eyeGeo);
    var foreheadDotBuffers = initBuffers(gl, programInfo, foreheadDotGeo);

    // ************************************************************
    // BUFFER BUBBLE & FIRE BARU
    // ************************************************************
    this.nodes.bubbleBuffers = initBuffers(gl, programInfo, bubbleGeo); 
    this.nodes.flameBuffers = initBuffers(gl, programInfo, flameGeo);
    // ************************************************************

    // 3. Bangun Scene Graph
    this.rootNode = new SceneNode(null);
    this.nodes.body = new SceneNode(null);
    this.rootNode.children.push(this.nodes.body);

    this.nodes.head = new SceneNode(headBuffers);
    this.rootNode.children.push(this.nodes.head);

    // Fitur wajah Dratini
    this.nodes.snout = new SceneNode(snoutBuffers);
    this.nodes.head.children.push(this.nodes.snout);
    
    this.nodes.foreheadDot = new SceneNode(foreheadDotBuffers);
    this.nodes.head.children.push(this.nodes.foreheadDot);

    // Telinga Dratini (Sirip)
    this.nodes.earL = new SceneNode(earBuffers);
    this.nodes.head.children.push(this.nodes.earL);
    this.nodes.earR = new SceneNode(earBuffers);
    this.nodes.head.children.push(this.nodes.earR);

    // Sirip Tengah
    this.nodes.earL_middle = new SceneNode(earBuffers);
    this.nodes.head.children.push(this.nodes.earL_middle);
    this.nodes.earR_middle = new SceneNode(earBuffers);
    this.nodes.head.children.push(this.nodes.earR_middle);

    // Sirip Bawah
    this.nodes.earL_bottom = new SceneNode(earBuffers);
    this.nodes.head.children.push(this.nodes.earL_bottom);
    this.nodes.earR_bottom = new SceneNode(earBuffers);
    this.nodes.head.children.push(this.nodes.earR_bottom);

    // Mata Dratini
    this.nodes.eyeL = new SceneNode(eyeBuffers);
    this.nodes.head.children.push(this.nodes.eyeL);
    this.nodes.eyeR = new SceneNode(eyeBuffers);
    this.nodes.head.children.push(this.nodes.eyeR);
    
    // ************************************************************
    // NODE CONTAINER BUBBLE & FLAMETHROWER
    // ************************************************************
    this.nodes.bubbleContainer = new SceneNode(null); // Node dummy
    this.nodes.head.children.push(this.nodes.bubbleContainer);
    
    this.nodes.flamethrower = new SceneNode(this.nodes.flameBuffers);
    this.nodes.flamethrower.enabled = false; // Mulai nonaktif
    this.nodes.head.children.push(this.nodes.flamethrower);
    // ************************************************************
};

// =================================================================
// SKILL TRIGGERS
// =================================================================

DratiniModel.prototype.startFlamethrower = function() {
    if (this.animationState === 'IDLE' || this.animationState === 'FLAMETHROWER_PREP') {
        this.animationState = 'FLAMETHROWER_PREP';
        this.stateTimer = 0.0;
        console.log("Dratini mulai persiapan Flamethrower...");
    }
};

DratiniModel.prototype.startTackle = function() {
    if (this.animationState === 'IDLE') {
        this.animationState = 'TACKLE';
        this.stateTimer = 0.0;
        console.log("Dratini melancarkan Tackle!");
    }
};

// =================================================================
// UPDATE LOGIC
// =================================================================

DratiniModel.prototype.update = function(elapsed, worldBounds,waterLevelY) {
    var gl = this.gl;
    var programInfo = this.programInfo;
    var dt = elapsed / 1000.0;
    var groundY = waterLevelY || 0;
    
    // Angka 8 movement control
    let isMoving = (this.animationState === 'IDLE');
    let isStatic = (this.animationState !== 'IDLE');
    let tackleProgress = 0.0;
    
    // --- 1. Update State Timer ---
    if (isStatic) {
        this.stateTimer += elapsed;
    }

    // --- 2. Update Posisi dan Rotasi Global (Hanya saat IDLE) ---
    if (isMoving) {
        this.currentAngle += this.angularSpeed * elapsed;
        this.currentAngle %= (2 * Math.PI);

        var angleX = 2 * this.currentAngle;
        var angleZ = this.currentAngle;

        var newX = this.radiusX * Math.cos(angleX);
        var newZ = this.radiusZ * Math.sin(angleZ);

        this.position[0] = newX;
        this.position[2] = newZ;

        var dX_dt = -this.radiusX * Math.sin(angleX) * 2;
        var dZ_dt = this.radiusZ * Math.cos(angleZ);
        
        this.globalRotationY = Math.atan2(dX_dt, dZ_dt) * 180 / Math.PI;
    }
    
    // --- 3. LOGIKA STATE ANIMASI ---
    var headShake = 0.0;
    var windWave = 0.0;
    
    if (isMoving) {
        this.waveAnimPhase = (this.waveAnimPhase + dt * 100) % 360;
    }

    switch (this.animationState) {
        case 'IDLE':
            this.nodes.flamethrower.enabled = false;
            // Bubble Semburan Otomatis (Hanya saat IDLE)
            this.waterAnimPhase += elapsed; 
            if (this.waterAnimPhase > 4000) { 
                this.waterActive = true;
                this.waterAnimPhase = this.waterAnimPhase % 4000;
                this.bubbleParticles.forEach(p => {
                    p.x = (Math.random() - 0.5) * 0.5; 
                    p.y = (Math.random() - 0.5) * 0.5;
                    p.z = (Math.random() - 0.5) * 0.5;
                    p.life = 0;
                    p.speedZ = 2.0 + Math.random() * 3.0; 
                    p.scale = 0.1 + Math.random() * (bubbleMaxRadius - 0.1);
                });
            } else if (this.waterAnimPhase > this.waterDuration) {
                this.waterActive = false;
            }
            this.currentYOffset = 0;
            break;
            
        case 'FLAMETHROWER_PREP':
            this.nodes.flamethrower.enabled = false;
            this.waterActive = false;
            
            if (this.stateTimer < this.prepDuration) {
                // Goyangan persiapan (Kepala mundur dan bergetar)
                let prepTime = this.stateTimer / this.prepDuration;
                headShake = 0.5 * Math.sin(prepTime * 50); 
                this.currentYOffset = -1.5 * prepTime; 
                windWave = 20.0 * prepTime; // Sirip bergetar cepat
            } else {
                this.animationState = 'FLAMETHROWER';
                this.stateTimer = 0.0;
            }
            break;
            
        case 'FLAMETHROWER':
            this.nodes.flamethrower.enabled = true; // Aktifkan api
            
            if (this.stateTimer < this.flameDuration) {
                let progress = this.stateTimer / this.flameDuration;
                
                // Api bergetar (Horizontal Flamethrower)
                let flameRotX = 5 * Math.sin(this.stateTimer * 50);
                this.nodes.flamethrower.localMatrix.setIdentity()
                    // TRANSLASI: Maju ke moncong (Z) dan sedikit naik (Y)
                    .translate(0, 0.1, 1.2)
                    .rotate(90, 1, 0, 0) 
                    .rotate(flameRotX, 0, 1, 0) // Goyangan api (Rotasi ringan Y)
                    .scale(3.0, 3.0, 3.0); // Api besar

                windWave = 10.0; // Sirip statis karena dorongan
                headShake = 0.08 * Math.sin(this.stateTimer * 100); 
                this.currentYOffset = 0;

            } else {
                this.animationState = 'IDLE';
                this.stateTimer = 0.0;
                this.nodes.flamethrower.enabled = false;
                console.log("Dratini: Flamethrower selesai!");
            }
            break;
            
        case 'TACKLE':
            this.nodes.flamethrower.enabled = false;
            this.waterActive = false;
            if (this.stateTimer < this.tackleDuration) {
                tackleProgress = this.stateTimer / this.tackleDuration;
                
                // Lompatan Y (parabola)
                let jumpHeight = 5.0;
                this.currentYOffset = jumpHeight * Math.sin(tackleProgress * Math.PI);
                
                windWave = 0.0;
                headShake = 0.0;
            } else {
                this.animationState = 'IDLE';
                this.stateTimer = 0.0;
                tackleProgress = 0.0;
                this.currentYOffset = 0;
            }
            break;
    }
    
    // --- 3. Animasi Sirip dan Body ---
    this.finAnimPhase = (this.finAnimPhase + dt * 1500) % 360; 
    var finAngle = (this.finAmplitude + windWave) * Math.sin(this.finAnimPhase * Math.PI / 180.0);

    // Buat ulang tubuh (tergantung apakah sedang diam atau bergerak/tackle)
    this.bodyData = createDratiniSmoothBody(
        this.bodySegmentsCount, this.segmentLength, this.startRadius, 
        this.maxRadius, this.endRadius, this.waveAnimPhase, isStatic, tackleProgress
    );

    if (!this.bodyData) { console.error("Gagal membuat bodyData"); return; }
    
    this.bodyBuffers = initBuffers(gl, programInfo, this.bodyData);
    if (!this.bodyBuffers) { console.error("Gagal init bodyBuffers"); return; }
    
    var modelGroundY = groundY - this.bodyData.minY + 0.01;

    // --- 4. Update Matriks Lokal di Scene Graph ---
    
    // 1. Update Root (rotasi dan posisi global + offset lompatan)
    this.rootNode.localMatrix.setIdentity()
        .translate(this.position[0], modelGroundY + this.currentYOffset, this.position[2])
        .rotate(this.globalRotationY, 0, 1, 0);

    // 2. Update Body (buffer baru)
    this.nodes.body.buffers = this.bodyBuffers;
    this.nodes.body.localMatrix.setIdentity();
    
    // 3. Update Head (relatif ke root)
    const overallScaleFactor = 0.8; 
    const headBaseScaleZ = 1.3; 
    
    this.nodes.head.localMatrix.setIdentity()
        .translate(headShake, this.startRadius, 0) // Head shake applied
        .scale(overallScaleFactor, overallScaleFactor, headBaseScaleZ * overallScaleFactor); 

    const currentHeadScaleFactor = overallScaleFactor; 
    var headScaleX = currentHeadScaleFactor;
    var headScaleY = currentHeadScaleFactor;
    var headScaleZ = headBaseScaleZ * currentHeadScaleFactor;

    // 4. Update anak-anak kepala (RELATIF KE KEPALA)
    this.nodes.snout.localMatrix.setIdentity()
        .translate(0, -0.3, 0.8) 
        .scale(1.0, 1.0, 1.3);

    this.nodes.foreheadDot.localMatrix.setIdentity()
        .translate(0, 0.8, 0.5) 
        .scale(1.0, 1.0, 1.0);

    // --- KODE TELINGA (SIRIP) ---
    const earMagnificationFactor_TOP = 4.0; 
    const earMagnificationFactor_MIDDLE = 4.0; 
    const earMagnificationFactor_BOTTOM = 4.0; 
    var earOffsetX = 0.8; 
    var earOffsetY_TOP = 0.75; 
    var earOffsetY_MIDDLE = 0.6; 
    var earOffsetY_BOTTOM = 0.45; 
    var earOffsetZ = 0.0; 
    var earRotateX = 10; 
    var earRotateY = -20; 
    var earRotateZ = -45; 
    var earScaleFlat = 0.1; 
    var earScaleWidth = 1.0; 
    var earScaleHeight = 1.2; 

    // --- SIRIP ATAS
    this.nodes.earL.localMatrix.setIdentity()
        .translate(-earOffsetX * headScaleX, earOffsetY_TOP * headScaleY, earOffsetZ * headScaleZ) 
        .rotate(earRotateX, 1, 0, 0) 
        .rotate(earRotateY, 0, 1, 0) 
        .rotate(earRotateZ + finAngle, 0, 0, 1) 
        .scale(earScaleWidth * earMagnificationFactor_TOP, earScaleHeight * earMagnificationFactor_TOP, earScaleFlat * earMagnificationFactor_TOP); 

    this.nodes.earR.localMatrix.setIdentity()
        .translate(earOffsetX * headScaleX, earOffsetY_TOP * headScaleY, earOffsetZ * headScaleZ) 
        .rotate(earRotateX, 1, 0, 0) 
        .rotate(-earRotateY, 0, 1, 0) 
        .rotate(-earRotateZ - finAngle, 0, 0, 1) 
        .scale(earScaleWidth * earMagnificationFactor_TOP, earScaleHeight * earMagnificationFactor_TOP, earScaleFlat * earMagnificationFactor_TOP); 

    // --- SIRIP TENGAH
    this.nodes.earL_middle.localMatrix.setIdentity()
        .translate(-earOffsetX * headScaleX, earOffsetY_MIDDLE * headScaleY, earOffsetZ * headScaleZ) 
        .rotate(earRotateX, 1, 0, 0) 
        .rotate(earRotateY, 0, 1, 0) 
        .rotate(earRotateZ + finAngle * 0.5, 0, 0, 1) 
        .scale(earScaleWidth * earMagnificationFactor_MIDDLE, earScaleHeight * earMagnificationFactor_MIDDLE, earScaleFlat * earMagnificationFactor_MIDDLE); 

    this.nodes.earR_middle.localMatrix.setIdentity()
        .translate(earOffsetX * headScaleX, earOffsetY_MIDDLE * headScaleY, earOffsetZ * headScaleZ) 
        .rotate(earRotateX, 1, 0, 0) 
        .rotate(-earRotateY, 0, 1, 0) 
        .rotate(-earRotateZ - finAngle * 0.5, 0, 0, 1) 
        .scale(earScaleWidth * earMagnificationFactor_MIDDLE, earScaleHeight * earMagnificationFactor_MIDDLE, earScaleFlat * earMagnificationFactor_MIDDLE); 

    // --- SIRIP BAWAH
    this.nodes.earL_bottom.localMatrix.setIdentity()
        .translate(-earOffsetX * headScaleX, earOffsetY_BOTTOM * headScaleY, earOffsetZ * headScaleZ) 
        .rotate(earRotateX, 1, 0, 0) 
        .rotate(earRotateY, 0, 1, 0) 
        .rotate(earRotateZ, 0, 0, 1) 
        .scale(earScaleWidth * earMagnificationFactor_BOTTOM, earScaleHeight * earMagnificationFactor_BOTTOM, earScaleFlat * earMagnificationFactor_BOTTOM); 

    this.nodes.earR_bottom.localMatrix.setIdentity()
        .translate(earOffsetX * headScaleX, earOffsetY_BOTTOM * headScaleY, earOffsetZ * headScaleZ) 
        .rotate(earRotateX, 1, 0, 0) 
        .rotate(-earRotateY, 0, 1, 0) 
        .rotate(-earRotateZ, 0, 0, 1) 
        .scale(earScaleWidth * earMagnificationFactor_BOTTOM, earScaleHeight * earMagnificationFactor_BOTTOM, earScaleFlat * earMagnificationFactor_BOTTOM); 
    
    // Mata
    this.nodes.eyeL.localMatrix.setIdentity()
        .translate(-0.6, 0.1, 0.75)
        .scale(1.0, 1.2, 0.5);

    this.nodes.eyeR.localMatrix.setIdentity()
        .translate(0.6, 0.1, 0.75)
        .scale(1.0, 1.2, 0.5);

    // ************************************************************
    // UPDATE NODE BUBBLE CONTAINER
    // ************************************************************
    
    if (this.waterActive) {
        // Hapus node gelembung lama, akan diganti dengan yang baru
        this.nodes.bubbleContainer.children = [];
        
        // Update dan buat node gelembung baru
        this.bubbleParticles.forEach(p => {
            if (p.life < p.maxLife) {
                p.life += elapsed;
                let lifeProgress = p.life / p.maxLife;

                // Gerakan gelembung (maju di sumbu Z lokal, kecepatan berkurang)
                let zTravel = (p.speedZ * dt) * (1.0 - lifeProgress);
                p.z += zTravel;
                p.x += (Math.random() - 0.5) * 0.05 * dt * 10; // Dispersi X
                p.y += (Math.random() - 0.5) * 0.05 * dt * 10; // Dispersi Y

                // Skala gelembung (mengecil mendekati akhir)
                let scaleFactor = p.scale * (1.0 - Math.pow(lifeProgress, 2));
                scaleFactor = Math.max(0.0, scaleFactor);

                if (scaleFactor > 0.01) {
                    let bubbleNode = new SceneNode(this.nodes.bubbleBuffers);
                    bubbleNode.localMatrix.setIdentity()
                        .translate(p.x, p.y, p.z)
                        .scale(scaleFactor, scaleFactor, scaleFactor);
                    this.nodes.bubbleContainer.children.push(bubbleNode);
                }
            }
        });
    } else {
        // Kosongkan container saat tidak aktif
        this.nodes.bubbleContainer.children = [];
    }
    
    this.nodes.bubbleContainer.localMatrix.setIdentity()
        .translate(0, -0.3, 1.2); 
    // ************************************************************
};

DratiniModel.prototype.getRootNode = function() {
    return this.rootNode;
};