// =================================================================
// DRATINI_IN_DRAGONAIR_CLASS.JS - Dratini dengan struktur Dragonair
// Menggunakan badan dan kepala Dragonair, tapi fitur wajah Dratini
// Gerakan Diubah Menjadi Angka 8 (Lemniscate)
// =================================================================

// Pastikan Anda telah menyertakan library 'cuon-matrix.js' di HTML Anda
// Juga pastikan fungsi SceneNode, initBuffers, drawPart, dan utility WebGL lainnya tersedia.

// =================================================================
// ASUMSI UTILITIES (PLACEHOLDER)
// =================================================================

// ASUMSI: Class Matrix4 dari 'cuon-matrix.js' sudah tersedia secara global.

// ASUMSI: Implementasi dasar SceneNode
function SceneNode(buffers) {
    this.buffers = buffers; // Buffer geometri (untuk drawPart)
    this.localMatrix = new Matrix4();
    this.children = [];
}

// ASUMSI: Fungsi WebGL utilities (HANYA PLACEHOLDER)
function initBuffers(gl, programInfo, geometryData) {
    if (!geometryData || !geometryData.indices) return null;
    return {
        vertexBuffer: 'VBO_DUMMY',
        colorBuffer: 'CBO_DUMMY',
        indexBuffer: 'IBO_DUMMY',
        normalBuffer: 'NBO_DUMMY',
        numIndices: geometryData.indices.length
    };
}
var gl = gl || null; // Hanya placeholder
var programInfo = programInfo || null; // Hanya placeholder

// Warna global (Warna DRATINI)
var dratiniBlue = [0.65, 0.8, 0.95, 1.0]; // Biru Dratini yang lebih muda dan cerah
var dratiniWhite = [1.0, 1.0, 1.0, 1.0];
var dratiniEye = [0.4, 0.0, 0.6, 1.0]; 
// =================================================================
// FUNGSI GEOMETRI DRATINI (untuk bagian wajah)
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

// =================================================================
// FUNGSI GEOMETRI BADAN (dari dragonAir.js)
// =================================================================

function createSmoothBody(segments, segmentLength, startRadius, maxRadius, endRadius, currentAngle) {
    var vertices = [];
    var colors = [];
    var indices = [];
    var ringSegments = 16; //mengontrol seberapa benyak halus/bulat 1 cincin
    var spineMatrices = [];
    var currentSpineMatrix = new Matrix4();

    currentSpineMatrix.translate(0, 0.5, 0); //y untuk kepala
    spineMatrices.push(new Matrix4(currentSpineMatrix));

    let headLiftAngle = -15.0; // Sudut angkat kepala 0 makan menyentuh tanah
    let s_curve_amplitude = 12.0; //lekukan
    let s_curve_freq = 2.5; //banyak lekukan dalam tubuh
    let time = currentAngle * 0.004;

    //*looping untuk menghasilkan liukan
    for (let i = 0; i < segments; i++) { //tiap 1 looping menghasilkan 1 matrix
        let p = i / (segments - 1); // progress (0.0 s.d 1.0)
        let angleX_deg = 0.0;
        let angleY_deg = 0.0;
    
        angleY_deg = s_curve_amplitude * Math.sin(p * Math.PI * s_curve_freq + time);
        
        // PERBAIKAN: Leher naik, badan rata di tanah
        let neckEnd = 0.3; // Titik di mana leher selesai naik (30% tubuh)
        let bodyFlat = 0.6; // Titik di mana badan kembali rata (60% tubuh)

        if (p < neckEnd) {
            // 1. LEHER NAIK (p dari 0.0 -> 0.3)
            angleX_deg = headLiftAngle * (1.0 - (p / neckEnd));
        } else if (p < bodyFlat) {
            // 2. BADAN TURUN (p dari 0.3 -> 0.6)
            let p_down = (p - neckEnd) / (bodyFlat - neckEnd);
            angleX_deg = -headLiftAngle * (1.0 - p_down);
        }

        // Terapkan rotasi: Y dulu (belok), baru X (naik/turun)
        currentSpineMatrix.rotate(angleY_deg, 0, 1, 0); // Rotasi Y
        currentSpineMatrix.rotate(angleX_deg, 1, 0, 0); // Rotasi X
        currentSpineMatrix.translate(0, 0, -segmentLength); // Bergerak maju

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
            currentRadius = startRadius + (maxRadius - startRadius) * (progress * 2); //membesar
        } else {
            currentRadius = maxRadius - (maxRadius - endRadius) * ((progress - 0.5) * 2); //mengecil
        }

        for (let j = 0; j <= ringSegments; j++) {
            let angle = (j * 2 * Math.PI) / ringSegments;

            // Cincin VERTIKAL (XY plane)
            let x = currentRadius * Math.cos(angle);
            let y = currentRadius * Math.sin(angle); 
            let z = 0; 
 
            var new_x = e[0] * x + e[4] * y + e[8] * z + e[12];
            var new_y = e[1] * x + e[5] * y + e[9] * z + e[13];
            var new_z = e[2] * x + e[6] * y + e[10] * z + e[14];
            vertices.push(new_x, new_y, new_z);

            // Hitung minY setelah transformasi 
            if (new_y < minY) minY = new_y;

            // Warna perut berdasarkan Y lokal (gradient putih biru)
            let y_local_normalized = Math.sin(angle);
            let mixFactor = Math.max(0.0, -y_local_normalized); 
            let r = dratiniBlue[0] * (1.0 - mixFactor) + dratiniWhite[0] * mixFactor;
            let g = dratiniBlue[1] * (1.0 - mixFactor) + dratiniWhite[1] * mixFactor;
            let b = dratiniBlue[2] * (1.0 - mixFactor) + dratiniWhite[2] * mixFactor;
            colors.push(r, g, b, 1.0);
        }

        // Buat segitiga (indices)
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

// =================================================================
// CLASS DRATINI (Menggunakan struktur Dragonair dengan fitur wajah Dratini)
// =================================================================

function DratiniModel(gl, programInfo) {
    this.gl = gl;
    this.programInfo = programInfo;

    this.rootNode = null;
    this.nodes = {};
    this.bodyData = null;
    this.bodyBuffers = null;
    
    // Variabel tubuh (dari dragonAir.js)
    // ************************************************************
    // PERUBAHAN: Perkecil panjang dan lebar badan total 20%
    const bodyScaleFactor = 0.8; // Mengurangi 20%
    this.bodySegmentsCount = 20;
    this.segmentLength = 0.9 * bodyScaleFactor; 
    this.startRadius = 0.6 * bodyScaleFactor;  
    this.maxRadius = 0.8 * bodyScaleFactor;    
    this.endRadius = 0.1 * bodyScaleFactor;    
    // ************************************************************

    // Variabel untuk gerakan angka 8 (dari dratini.js)
    this.position = [0, 0, 0];
    this.globalRotationY = 0;
    this.currentAngle = 0.0;
    this.radiusX = 15.0;
    this.radiusZ = 10.0;
    this.angularSpeed = 0.0005;
    this.waveAnimPhase = 0.0;
}

DratiniModel.prototype.init = function() {
    var gl = this.gl;
    var programInfo = this.programInfo;
    
    // 1. Buat Geometri Statis
    // Kepala menggunakan ukuran Dragonair, warna Dratini
    var headGeo = createSphere(1.0, 30, 30, dratiniBlue);
    
    // Fitur wajah menggunakan geometri Dratini
    var snoutGeo = createSphere(0.4, 15, 15, dratiniWhite);
    var earGeo = createEllipticParaboloid(0.35, 0.08, 1.2, 12, 10, dratiniWhite);
    var eyeGeo = createSphere(0.1, 8, 8, dratiniEye);
    var foreheadDotGeo = createSphere(0.08, 6, 6, dratiniWhite);

    // 2. Inisialisasi Buffer Statis
    var headBuffers = initBuffers(gl, programInfo, headGeo);
    var snoutBuffers = initBuffers(gl, programInfo, snoutGeo);
    var earBuffers = initBuffers(gl, programInfo, earGeo);
    var eyeBuffers = initBuffers(gl, programInfo, eyeGeo);
    var foreheadDotBuffers = initBuffers(gl, programInfo, foreheadDotGeo);

    // 3. Bangun Scene Graph (struktur Dragonair dengan fitur wajah Dratini)
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

    // Telinga Dratini (Node Sirip Atas)
    this.nodes.earL = new SceneNode(earBuffers);
    this.nodes.head.children.push(this.nodes.earL);
    this.nodes.earR = new SceneNode(earBuffers);
    this.nodes.head.children.push(this.nodes.earR);

    // Tambahkan Node untuk Sirip Tengah (BARU)
    this.nodes.earL_middle = new SceneNode(earBuffers);
    this.nodes.head.children.push(this.nodes.earL_middle);
    this.nodes.earR_middle = new SceneNode(earBuffers);
    this.nodes.head.children.push(this.nodes.earR_middle);

    // Tambahkan Node untuk Sirip Bawah
    this.nodes.earL_bottom = new SceneNode(earBuffers);
    this.nodes.head.children.push(this.nodes.earL_bottom);
    this.nodes.earR_bottom = new SceneNode(earBuffers);
    this.nodes.head.children.push(this.nodes.earR_bottom);

    // Mata Dratini
    this.nodes.eyeL = new SceneNode(eyeBuffers);
    this.nodes.head.children.push(this.nodes.eyeL);
    this.nodes.eyeR = new SceneNode(eyeBuffers);
    this.nodes.head.children.push(this.nodes.eyeR);
};

DratiniModel.prototype.update = function(elapsed, worldBounds) {
    var gl = this.gl;
    var programInfo = this.programInfo;
    var dt = elapsed / 1000.0;
    
    // --- 1. Update Posisi dan Rotasi untuk Gerakan Angka 8 (Lemniscate) ---
    this.currentAngle += this.angularSpeed * elapsed;
    this.currentAngle %= (2 * Math.PI);

    // Rumus Lissajous 2:1 untuk membuat pola Angka 8 di bidang XZ
    var angleX = 2 * this.currentAngle;
    var angleZ = this.currentAngle;

    var newX = this.radiusX * Math.cos(angleX);
    var newZ = this.radiusZ * Math.sin(angleZ);

    this.position[0] = newX;
    this.position[2] = newZ;

    // Hitung Rotasi Global (Menghadap ke arah garis singgung)
    var dX_dt = -this.radiusX * Math.sin(angleX) * 2;
    var dZ_dt = this.radiusZ * Math.cos(angleZ);
    
    this.globalRotationY = Math.atan2(dX_dt, dZ_dt) * 180 / Math.PI;
    
    // --- 2. ANIMASI: Buat ulang tubuh menggunakan fungsi dari dragonAir.js ---
    this.waveAnimPhase = (this.waveAnimPhase + dt * 100) % 360;
    
    this.bodyData = createSmoothBody(
        this.bodySegmentsCount, this.segmentLength, this.startRadius, 
        this.maxRadius, this.endRadius, this.waveAnimPhase
    );

    if (!this.bodyData) { 
        console.error("Gagal membuat bodyData"); 
        return;
    }
    
    this.bodyBuffers = initBuffers(gl, programInfo, this.bodyData);
    if (!this.bodyBuffers) { 
        console.error("Gagal init bodyBuffers");
        return; 
    }
    
    var groundY = 0; // Asumsi ground Y = 0
    if (this.bodyData.minY === undefined) { 
        console.error("bodyData.minY tidak terdefinisi!"); 
        return;
    }
    var modelGroundY = groundY - this.bodyData.minY + 0.01;

    // --- 3. Update Matriks Lokal di Scene Graph ---
    
    // 1. Update Root (rotasi dan posisi global)
    this.rootNode.localMatrix.setIdentity()
        .translate(this.position[0], modelGroundY, this.position[2])
        .rotate(this.globalRotationY, 0, 1, 0);

    // 2. Update Body (buffer baru)
    this.nodes.body.buffers = this.bodyBuffers;
    this.nodes.body.localMatrix.setIdentity();
    
    // 3. Update Head (relatif ke root) - menggunakan skala Dragonair
    // ************************************************************
    // PERUBAHAN: Skala kepala juga diperkecil 20%
    const overallScaleFactor = 0.8; // Skala keseluruhan Dratini (80% dari ukuran sebelumnya)
    const headBaseScaleZ = 1.3; // Skala Z dasar kepala Dragonair
    
    this.nodes.head.localMatrix.setIdentity()
        .translate(0, this.startRadius, 0) // Posisi kepala di atas badan (startRadius sudah diskalakan)
        .scale(overallScaleFactor, overallScaleFactor, headBaseScaleZ * overallScaleFactor); 
    // ************************************************************

    // Variabel untuk Penyesuaian Skala
    const currentHeadScaleFactor = overallScaleFactor; // Faktor skala kepala (sama dengan badan)
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

    // --- KODE TELINGA YANG DIMODIFIKASI AGAR MIRIP DRATINI ASLI DENGAN SIRIP GANDA ---
    
    // Parameter umum sirip
    // ************************************************************
    // PERUBAHAN: Semua sirip telinga diperbesar 2x lagi (total 4x dari asli)
    const earMagnificationFactor = 4.0; // Total 4x dari ukuran aslinya
    const earMagnificationFactor_TOP = earMagnificationFactor; 
    const earMagnificationFactor_MIDDLE = earMagnificationFactor; 
    const earMagnificationFactor_BOTTOM = earMagnificationFactor; 
    // ************************************************************
    
    // Posisi & Rotasi Sirip
    var earOffsetX = 0.8; 
    // ************************************************************
    // PERUBAHAN: Menyesuaikan Y offset agar lebih rapat dan menyatu
    var earOffsetY_TOP = 0.75; 
    var earOffsetY_MIDDLE = 0.6; 
    var earOffsetY_BOTTOM = 0.45; 
    // ************************************************************
    var earOffsetZ = 0.0; 
    
    var earRotateX = 10; 
    var earRotateY = -20; 
    var earRotateZ = -45; 
    
    var earScaleFlat = 0.1; 
    var earScaleWidth = 1.0; 
    var earScaleHeight = 1.2; 

    // --- SIRIP ATAS ---
    this.nodes.earL.localMatrix.setIdentity()
        .translate(-earOffsetX * headScaleX, earOffsetY_TOP * headScaleY, earOffsetZ * headScaleZ) 
        .rotate(earRotateX, 1, 0, 0)  
        .rotate(earRotateY, 0, 1, 0)  
        .rotate(earRotateZ, 0, 0, 1)  
        .scale(earScaleWidth * earMagnificationFactor_TOP, earScaleHeight * earMagnificationFactor_TOP, earScaleFlat * earMagnificationFactor_TOP); 

    this.nodes.earR.localMatrix.setIdentity()
        .translate(earOffsetX * headScaleX, earOffsetY_TOP * headScaleY, earOffsetZ * headScaleZ) 
        .rotate(earRotateX, 1, 0, 0)  
        .rotate(-earRotateY, 0, 1, 0) 
        .rotate(-earRotateZ, 0, 0, 1) 
        .scale(earScaleWidth * earMagnificationFactor_TOP, earScaleHeight * earMagnificationFactor_TOP, earScaleFlat * earMagnificationFactor_TOP); 

    // --- SIRIP TENGAH ---
    this.nodes.earL_middle.localMatrix.setIdentity()
        .translate(-earOffsetX * headScaleX, earOffsetY_MIDDLE * headScaleY, earOffsetZ * headScaleZ) 
        .rotate(earRotateX, 1, 0, 0)  
        .rotate(earRotateY, 0, 1, 0)  
        .rotate(earRotateZ, 0, 0, 1)  
        .scale(earScaleWidth * earMagnificationFactor_MIDDLE, earScaleHeight * earMagnificationFactor_MIDDLE, earScaleFlat * earMagnificationFactor_MIDDLE); 

    this.nodes.earR_middle.localMatrix.setIdentity()
        .translate(earOffsetX * headScaleX, earOffsetY_MIDDLE * headScaleY, earOffsetZ * headScaleZ) 
        .rotate(earRotateX, 1, 0, 0)  
        .rotate(-earRotateY, 0, 1, 0) 
        .rotate(-earRotateZ, 0, 0, 1) 
        .scale(earScaleWidth * earMagnificationFactor_MIDDLE, earScaleHeight * earMagnificationFactor_MIDDLE, earScaleFlat * earMagnificationFactor_MIDDLE); 

    // --- SIRIP BAWAH ---
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
    
    // --- END KODE TELINGA YANG DIMODIFIKASI ---

    // Mata kiri Dratini
    this.nodes.eyeL.localMatrix.setIdentity()
        .translate(-0.6, 0.1, 0.75)
        .scale(1.0, 1.2, 0.5);

    // Mata kanan Dratini
    this.nodes.eyeR.localMatrix.setIdentity()
        .translate(0.6, 0.1, 0.75)
        .scale(1.0, 1.2, 0.5);
};
DratiniModel.prototype.getRootNode = function() {
    return this.rootNode;
};

// =================================================================
// FUNGSI UTAMA (MAIN)
// =================================================================

function main() {
    console.log("Memulai inisialisasi Dratini 3D (Hybrid Version) dengan gerakan Angka 8...");
    
    if (!window.gl || !window.programInfo) {
        console.warn("gl atau programInfo tidak terdefinisi. Pastikan WebGL utilities dimuat.");
    }

    var dratini = new DratiniModel(gl, programInfo);
    try {
        dratini.init(); 
    } catch (e) {
        console.error("Gagal inisialisasi Dratini. Pastikan cuon-matrix.js dan SceneNode, initBuffers telah didefinisikan.", e);
        return;
    }

    console.log("Dratini model hybrid berhasil diinisialisasi");

    var g_last = Date.now();
    
    var tick = function() {
        var now = Date.now();
        var elapsed = now - g_last;
        g_last = now;
        
        // Update state Dratini
        dratini.update(elapsed, 0);

        // Rendering (DIHILANGKAN - Ganti dengan fungsi render WebGL Anda)
        // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // drawSceneGraph(dratini.getRootNode(), programInfo, viewMatrix, projMatrix);

        requestAnimationFrame(tick); 
    };

    tick();
    console.log("Animasi Dratini (Hybrid Version) berjalan! Dratini bergerak dalam pola Angka 8.");
}

// Catatan: Hapus tanda // di depan 'main()' untuk menjalankan, setelah memastikan
// semua dependensi WebGL (cuon-matrix.js, gl, programInfo, drawSceneGraph) dimuat.
main();