    // Warna global khusus Dragonair
var dragonairBlue = [0.4, 0.6, 1.0, 1.0];
var dragonairWhite = [1.0, 1.0, 1.0, 1.0];
var dragonairDarkPurple = [0.2, 0.0, 0.2, 1.0];
var dragonairGroundGreen = [0.4, 0.8, 0.4, 1.0];
var dragonairEarWhite = [0.9, 0.9, 1.0, 1.0];
var dragonairSnoutBlue = [0.6, 0.75, 1.0, 1.0];



//segment ini bodySegmentCount = 20
function createDragonairSmoothBody(segments, segmentLength, startRadius, maxRadius, endRadius, currentAngle) {
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
        
        
        // ===============================================
        // ** PERBAIKAN: Leher naik, badan rata di tanah **
        // ===============================================
        
        let neckEnd = 0.3; // Titik di mana leher selesai naik (30% tubuh)
        let bodyFlat = 0.6; // Titik di mana badan kembali rata (60% tubuh)

        if (p < neckEnd) {
            // 1. LEHER NAIK (p dari 0.0 -> 0.3)
            // Terapkan rotasi negatif (mengangkat)
            // Kurva (1.0 - p/0.3) akan bernilai 1.0 -> 0.0
            angleX_deg = headLiftAngle * (1.0 - (p / neckEnd));

        } else if (p < bodyFlat) {
            // 2. BADAN TURUN (p dari 0.3 -> 0.6)
            // Terapkan rotasi kebalikan (positif) untuk kembali ke tanah
            // Buat progress baru p_down dari 0.0 -> 1.0
            let p_down = (p - neckEnd) / (bodyFlat - neckEnd);
            // Gunakan kurva (1.0 - p_down) agar rotasi terbesar di awal (p=0.3)
            // dan 0 di akhir (p=0.6)
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
    let firstSpinePos = [firstMatrix[12], firstMatrix[13], firstMatrix[14]]; //X, Y, dan Z. dalam matrix

    for (let i = 0; i < spineMatrices.length; i++) { //mengontrol bentuk tubuh (disini seperti ular body besar di ekor mengecil)
        let matrix = spineMatrices[i];
        let e = matrix.elements;
        let progress = i / (spineMatrices.length - 1);
        let currentRadius;
        if (progress <= 0.5) {
            currentRadius = startRadius + (maxRadius - startRadius) * (progress * 2); //membesar
        } else {
            currentRadius = maxRadius - (maxRadius - endRadius) * ((progress - 0.5) * 2); //mengecil
        }

        /**  
         *  ?? yang membentuk 2d
        */
        for (let j = 0; j <= ringSegments; j++) { //16 iterasi 
            /**
             * ringSegments = 16 ⭕.
             * ringSegments = 8 🛑 --> tidak mulus
             */
            let angle = (j * 2 * Math.PI) / ringSegments;

            // Cincin VERTIKAL (XY plane) - "Tidak Gepenk"
            let x = currentRadius * Math.cos(angle);
            let y = currentRadius * Math.sin(angle); 
            let z = 0; 
 
            var new_x = e[0] * x + e[4] * y + e[8] * z + e[12]; //*mengubah dari 2d menjadi 3d
            var new_y = e[1] * x + e[5] * y + e[9] * z + e[13];
            var new_z = e[2] * x + e[6] * y + e[10] * z + e[14];
            vertices.push(new_x, new_y, new_z);

            // Hitung minY *setelah* transformasi 
            if (new_y < minY) minY = new_y;

            // Warna perut berdasarkan Y lokal (gradient putih biru)
            let y_local_normalized = Math.sin(angle);
            let mixFactor = Math.max(0.0, -y_local_normalized); 
            let r = dragonairBlue[0] * (1.0 - mixFactor) + dragonairWhite[0] * mixFactor;
            let g = dragonairBlue[1] * (1.0 - mixFactor) + dragonairWhite[1] * mixFactor;
            let b = dragonairBlue[2] * (1.0 - mixFactor) + dragonairWhite[2] * mixFactor;
            colors.push(r, g, b, 1.0);
        }

        //*Buat segitiga (indices) --> mulai dibuat tabung
        if (i > 0) {
            let ring1StartIndex = vertexIndex;
            let ring2StartIndex = vertexIndex - (ringSegments + 1);
            for (let j = 0; j < ringSegments; j++) {
                let v1 = ring1StartIndex + j;
                let v2 = ring2StartIndex + j;
                let v3 = ring1StartIndex + j + 1;
                let v4 = ring2StartIndex + j + 1;
                indices.push(v1, v2, v3); //segitiga garis 121
                indices.push(v2, v4, v3); //segitiga garis 212

                /**
                 * (Cincin 2)  (v2) *----------* (v4)
                                |            |
                                |            |
                (Cincin 1)  (v1) *----------* (v3)
                 */
            }
        }
        vertexIndex += (ringSegments + 1);
        // i=0 17 ; i=1 34 (17+17)
    }

    var finalMatrix = spineMatrices[spineMatrices.length - 1];
    var neckAttachMatrix = spineMatrices[1] || new Matrix4();

    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices),
        finalSpineMatrix: finalMatrix,
        neckAttachMatrix: neckAttachMatrix,
        minY: minY, // Nilai Y terendah (sangat penting!)
        firstSpinePos: firstSpinePos
    };
}


    function createSphere(radius, segments, rings, color) {
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
                // Pastikan warna diteruskan sebagai array
                if (Array.isArray(color) && color.length >= 3) {
                     colors.push(color[0], color[1], color[2], color[3] || 1.0); // Default alpha 1.0
                } else {
                     colors.push(1.0, 1.0, 1.0, 1.0); // Default putih jika warna salah
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
        var vertices = [], colors = [], indices = [];
        vertices.push(0, height, 0); // Puncak
         if (Array.isArray(color) && color.length >= 3) {
             colors.push(color[0], color[1], color[2], color[3] || 1.0);
         } else { colors.push(1.0, 1.0, 1.0, 1.0); }

        // Vertex dasar lingkaran
        for (var i = 0; i <= segments; i++) { //? segment dari body segment count
            var angle = (i * 2 * Math.PI) / segments;
            var x = baseRadius * Math.cos(angle);
            var z = baseRadius * Math.sin(angle);
            vertices.push(x, 0, z); // Y=0 untuk dasar
             if (Array.isArray(color) && color.length >= 3) {
                 colors.push(color[0], color[1], color[2], color[3] || 1.0);
             } else { colors.push(1.0, 1.0, 1.0, 1.0); }
        }

        // Indices untuk sisi kerucut 
        for (var i = 1; i <= segments; i++) {
            // Index vertex puncak adalah 0
            // Index vertex dasar saat ini adalah i
            // Index vertex dasar berikutnya (wrap around jika i == segments)
            var nextIndex = (i === segments) ? 1 : i + 1; //cek jika i == segment error handling
            indices.push(0, i, nextIndex);
        }

         // Indices untuk dasar kerucut (opsional)
         /*
         for (var i = 1; i < segments; i++) {
              indices.push(1, i + 1, i + 2); // Ini mungkin perlu disesuaikan
         }
         */

        return { vertices: new Float32Array(vertices), colors: new Float32Array(colors), indices: new Uint16Array(indices) };
    }

/**BARU/PASTIKAN ADA:** Membuat geometri telinga Dragonair yang lebih organik.
 * @param {number} baseScaleX - Skala dasar sumbu X.
 * @param {number} baseScaleY - Skala dasar sumbu Y.
 * @param {number} height - Tinggi total.
 * @param {number} radialSegments - Segmen radial.
 * @param {number} heightSegments - Segmen tinggi.
 * @param {Array} color - Warna [r, g, b, a].
 * @returns {object} Geometri telinga.
 */

//! masih ada bug
function createDragonairEarParaboloid(baseScaleX, baseScaleY, height, radialSegments, heightSegments, color) {
    var vertices = [], colors = [], indices = [];
    const twistFactor = 0.2; // Sedikit putaran
    const flareFactor = 0.3; // Sedikit mekar di tengah

    for (let i = 0; i <= heightSegments; i++) {
        const v = i / heightSegments; // Progress tinggi (0 ke 1)

        // Skala radius: Kecil -> Besar -> Kecil lagi
        let radiusScale;
        if (v < 0.3) { // Bagian pangkal
            radiusScale = (v / 0.3) * 0.7; // Mulai dari 0, naik ke 0.7
        } else if (v < 0.7) { // Bagian tengah (mekar)
            radiusScale = 0.7 + ((v - 0.3) / 0.4) * 0.3; // Dari 0.7 naik ke 1.0
        } else { // Bagian ujung (meruncing)
            radiusScale = 1.0 - ((v - 0.7) / 0.3) * 0.9; // Dari 1.0 turun ke 0.1
        }
        // Pastikan tidak negatif di ujung
         radiusScale = Math.max(0.05, radiusScale);


        const y = v * height; // Posisi Y aktual
        const twist = v * Math.PI * twistFactor; // Putaran berdasarkan tinggi

        for (let j = 0; j <= radialSegments; j++) {
            const u = j / radialSegments; // Progress keliling (0 ke 1)
            const theta = u * Math.PI * 2 + twist; // Sudut keliling + putaran

            // Gunakan baseScaleY untuk Z (ketebalan) dan baseScaleX untuk X (lebar)
            const x = Math.cos(theta) * baseScaleX * radiusScale;
            const z = Math.sin(theta) * baseScaleY * radiusScale; // Lebih tipis

            vertices.push(x, y, z); // Tambahkan vertex

            // Tambahkan warna
            if (Array.isArray(color) && color.length >= 3) {
                colors.push(color[0], color[1], color[2], color[3] || 1.0);
            } else {
                colors.push(0.9, 0.95, 1.0, 1.0); // Default earWhite
            }
        }
    }

    // Generate indices (sama seperti sphere/cylinder)
    for (let i = 0; i < heightSegments; i++) {
        for (let j = 0; j < radialSegments; j++) {
            const first = (i * (radialSegments + 1)) + j;
            const second = first + radialSegments + 1;
            indices.push(first, second, first + 1); //sisi segitiga 1
            indices.push(second, second + 1, first + 1); // segitiga 2
        }
    }
    /**
    * (i+1)  second --- second+1
                /|       /|
              /  |      / |
    (i)   first - first+1

        first ------ first+1
       |         /
      |       /
    second  /
        
    Contoh:
    Ring 1 (i=0): vertices 0,1,2,3,4
    Ring 2 (i=1): vertices 5,6,7,8,9  
    Ring 3 (i=2): vertices 10,11,12,13,14
    Untuk i=0, j=0:

    first = 0, second = 5, first+1 = 1, second+1 = 6

    Segitiga 1: 0, 5, 1

    Segitiga 2: 5, 6, 1
    */

    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices)
    };
}

// =================================================================
// Class OOP untuk DRAGONAIR
// =================================================================

/**
 * Class OOP untuk Dragonair.
 * Mengurus pembuatan geometri, buffer, scene graph, dan update animasi.
 * @param {WebGLRenderingContext} gl - Konteks WebGL.
 * @param {object} programInfo - Informasi shader (lokasi atribut/uniform).
 */
function Dragonair(gl, programInfo) {
    this.gl = gl;
    this.programInfo = programInfo;

    this.rootNode = null;     // Ini akan menjadi 'dragonairRoot'
    this.nodes = {};          // Tempat menyimpan semua node (headNode, snoutNode, dll)
    this.bodyData = null;     // Menyimpan data tubuh (minY, finalSpineMatrix)
    this.bodyBuffers = null;  // Buffer untuk tubuh (di-update tiap frame)
    
    // Variabel tubuh (sekarang jadi properti instance)
    this.bodySegmentsCount = 20;
    this.segmentLength = 0.9;
    this.startRadius = 0.6;
    this.maxRadius = 0.8;
    this.endRadius = 0.1;

    //**untuk animasi jalan
    this.position = [0, 0, 0];       // Posisi X, Y (di ground), Z di dunia
    this.targetPosition = null;     // Target [x, z] berikutnya
    this.currentAngleY = 0;         // Sudut hadap saat ini (derajat)
    this.targetAngleY = 0;          // Sudut target hadap (derajat)
    this.moveSpeed = 5.0;           // Unit per detik
    this.turnSpeed = 90.0;          // Derajat per detik
    this.worldBounds = 400;         // Batas dunia (samakan dengan di main)
    this.targetReachedThreshold = 2.0; // Jarak minimum untuk ganti target
    this.facingThreshold = 5.0;       // Toleransi sudut sebelum bergerak maju
}

/**
 * Membuat semua geometri statis, buffer, dan membangun scene graph
 * untuk Dragonair.
 */
Dragonair.prototype.init = function() {
    var gl = this.gl;
    var programInfo = this.programInfo;
    

    // 1. Buat Geometri Statis
    // (Geometri tubuh dibuat di 'update')
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

    // 2. Inisialisasi Buffer Statis
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


    /*
    Visualisasi Root: 
    this.rootNode = kosongan (empty tanpa buffer)
    ├── nodes.body (Badan utuh yang meliuk 🐍)
    ├── nodes.neckOrb (Bola di leher 💎)
    ├── nodes.tailRoot (Pangkal ekor, menempel di ujung badan)
    │   └── nodes.tailBall1 (Bola ekor 1)
    │       └── nodes.tailBall2 (Bola ekor 2)
    │           └── nodes.tailBall3 (Bola ekor 3)
    │
    └── nodes.head (Kepala ⚪)
        ├── nodes.snout (Moncong)
        ├── nodes.horn (Tanduk)
        ├── nodes.eyeL (Mata Kiri)
        ├── nodes.eyeR (Mata Kanan)
        │
        ├── nodes.earL (Grup Telinga Kiri - node 'kosong' untuk grup)
        │   ├── nodes.earLBase (Pangkal telinga)
        │   ├── nodes.earLWing1 (Sayap telinga 1)
        │   ├── nodes.earLWing2 (Sayap telinga 2)
        │   └── nodes.earLWing3 (Sayap telinga 3)
        │
        └── nodes.earR (Grup Telinga Kanan - node 'kosong' untuk grup)
            ├── nodes.earRBase
            ├── nodes.earRWing1
            ├── nodes.earRWing2
            └── nodes.earRWing3

    */

    // 3. Bangun Scene Graph
    // Simpan semua node di 'this.nodes' agar bisa di-update
    this.rootNode = new SceneNode(null); // 'dragonairRoot'
    this.nodes.body = new SceneNode(null); // Buffer di-update di tick
    this.rootNode.children.push(this.nodes.body);

    this.nodes.head = new SceneNode(headBuffers);
    this.rootNode.children.push(this.nodes.head);

    this.nodes.snout = new SceneNode(snoutBuffers);
    this.nodes.head.children.push(this.nodes.snout);
    
    this.nodes.horn = new SceneNode(hornBuffers);
    this.nodes.head.children.push(this.nodes.horn);

    // Telinga Kiri
    this.nodes.earL = new SceneNode(null);
    this.nodes.head.children.push(this.nodes.earL);
    this.nodes.earLBase = new SceneNode(earBaseBuffers);
    this.nodes.earL.children.push(this.nodes.earLBase);
    this.nodes.earLWing1 = new SceneNode(earWingBuffers);
    this.nodes.earL.children.push(this.nodes.earLWing1);
    this.nodes.earLWing2 = new SceneNode(earWingBuffers);
    this.nodes.earL.children.push(this.nodes.earLWing2);
    this.nodes.earLWing3 = new SceneNode(earWingBuffers);
    this.nodes.earL.children.push(this.nodes.earLWing3);

    // Telinga Kanan
    this.nodes.earR = new SceneNode(null);
    this.nodes.head.children.push(this.nodes.earR);
    this.nodes.earRBase = new SceneNode(earBaseBuffers);
    this.nodes.earR.children.push(this.nodes.earRBase);
    this.nodes.earRWing1 = new SceneNode(earWingBuffers);
    this.nodes.earR.children.push(this.nodes.earRWing1);
    this.nodes.earRWing2 = new SceneNode(earWingBuffers);
    this.nodes.earR.children.push(this.nodes.earRWing2);
    this.nodes.earRWing3 = new SceneNode(earWingBuffers);
    this.nodes.earR.children.push(this.nodes.earRWing3);

    // Mata
    this.nodes.eyeL = new SceneNode(eyeBuffers);
    this.nodes.head.children.push(this.nodes.eyeL);
    this.nodes.eyeR = new SceneNode(eyeBuffers);
    this.nodes.head.children.push(this.nodes.eyeR);

    //orb
    this.nodes.neckOrb = new SceneNode(neckOrbBuffers);
    this.rootNode.children.push(this.nodes.neckOrb);
    // Ekor
    this.nodes.tailRoot = new SceneNode(null);
    this.rootNode.children.push(this.nodes.tailRoot);
    this.nodes.tailBall1 = new SceneNode(tailBallBuffers[0]);
    this.nodes.tailRoot.children.push(this.nodes.tailBall1);
    this.nodes.tailBall2 = new SceneNode(tailBallBuffers[1]);
    this.nodes.tailBall1.children.push(this.nodes.tailBall2);
    this.nodes.tailBall3 = new SceneNode(tailBallBuffers[2]);
    this.nodes.tailBall2.children.push(this.nodes.tailBall3);


};

/**
 * Meng-update matriks lokal untuk animasi dan membuat ulang buffer tubuh.
 * @param {number} now - Waktu saat ini (misalnya dari Date.now()).
 * @param {number} groundY - Posisi Y dari daratan.
 */
Dragonair.prototype.update = function(now, groundY,elapsed) {
    var gl = this.gl;
    var programInfo = this.programInfo;
    var dt = elapsed / 1000.0; // Waktu delta dalam detik

    // --- ANIMASI: Buat ulang tubuh ---
    this.bodyData = createDragonairSmoothBody(
        this.bodySegmentsCount, this.segmentLength, this.startRadius, 
        this.maxRadius, this.endRadius, now
    );

    if (!this.bodyData) { 
    console.error("Gagal membuat bodyData"); 
    return;
     }
    
    
    // untuk mencegah kebocoran memori (memory leak)
    // if (this.bodyBuffers) { gl.deleteBuffer(this.bodyBuffers.vbo); ... }
    this.bodyBuffers = initBuffers(gl, programInfo, this.bodyData); 
    if (!this.bodyBuffers) { 
    console.error("Gagal init bodyBuffers");
     return; 
    }
    
    var finalBodyMatrix = this.bodyData.finalSpineMatrix;
    if(!finalBodyMatrix)
    { 
        finalBodyMatrix = new Matrix4(); 
    }
    
    var neckAttachMatrix = this.bodyData.neckAttachMatrix || new Matrix4();
    if(!neckAttachMatrix){
        neckAttachMatrix = new Matrix4();
    }
    // --- Hitung Posisi Y ---
    if (this.bodyData.minY === undefined) 
    { 
        console.error("bodyData.minY tidak terdefinisi!"); 
        return;
     }
    var modelGroundY = groundY - this.bodyData.minY + 0.01; 

 if (this.bodyData.minY === undefined) {
        console.error("bodyData.minY tidak terdefinisi!");
        return;
    }
    var modelGroundY = groundY - this.bodyData.minY + 0.01;

    //* Logika Dragon air berjalan
    if (this.targetPosition === null) {
        let padding = 30;
        this.targetPosition = [
            (Math.random() * (this.worldBounds - padding * 2)) - (this.worldBounds / 2 - padding),
            (Math.random() * (this.worldBounds - padding * 2)) - (this.worldBounds / 2 - padding)
        ];
    }

    let dx = this.targetPosition[0] - this.position[0];
    let dz = this.targetPosition[1] - this.position[2]; // `targetPosition[1]` (Z) - `position[2]` (Z)
    let distToTarget = Math.sqrt(dx * dx + dz * dz);

    if (distToTarget > this.targetReachedThreshold) {
        // A. Hitung SUDUT TARGET
        let targetAngleRad = Math.atan2(dx, dz);
        this.targetAngleY = targetAngleRad * 180.0 / Math.PI;

        // B. Hitung perbedaan sudut
        let angleDiff = this.targetAngleY - this.currentAngleY;
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;

        // Cek: Apakah kita SUDAH menghadap target?
        if (Math.abs(angleDiff) < this.facingThreshold) {
            
            // E. YA: Terapkan GERAK MAJU
            let currentAngleRad = this.currentAngleY * Math.PI / 180.0;
            let moveDirX = Math.sin(currentAngleRad);
            let moveDirZ = Math.cos(currentAngleRad);
            let moveAmount = this.moveSpeed * dt;
            
            if (moveAmount > distToTarget) {
                moveAmount = distToTarget;
            }

            // Update posisi (bergerak maju lurus)
            this.position[0] += moveDirX * moveAmount;
            this.position[2] += moveDirZ * moveAmount;

        } else {
            
            // C. TIDAK: Terapkan BELOK
            let turnAmount = this.turnSpeed * dt;
            
            if (Math.abs(angleDiff) < turnAmount) {
                this.currentAngleY = this.targetAngleY;
            } else if (angleDiff > 0) {
                this.currentAngleY += turnAmount;
            } else {
                this.currentAngleY -= turnAmount;
            }
            
            while (this.currentAngleY > 180) this.currentAngleY -= 360;
            while (this.currentAngleY < -180) this.currentAngleY += 360;
        }

    } else {
        // ========================================================
        // ** PERBAIKAN 1: Logika "Teleport" di Border (YANG BARU) **
        // Target tercapai. Cek apakah kita di pinggir.
        // ========================================================
        let halfBounds = this.worldBounds / 2;
        let borderPadding = 40.0; // Padding deteksi (harus > padding spawn)
        
        if (this.position[0] > halfBounds - borderPadding ||
            this.position[0] < -halfBounds + borderPadding ||
            this.position[2] > halfBounds - borderPadding ||
            this.position[2] < -halfBounds + borderPadding) {
            
            // YA: Target ada di pinggir. "Muter" (target baru adalah di tengah)
            this.targetPosition = [
                (Math.random() * 50) - 25, // Target X acak dekat pusat (0,0)
                (Math.random() * 50) - 25  // Target Z acak dekat pusat (0,0)
            ];
        } else {
            // TIDAK: Target aman di tengah. "Teleport" (cari target acak baru)
            this.targetPosition = null; // INI AKAN MENCARI TARGET RANDOM BARU
        }
    }
    
    // --- Update Matriks Lokal di Scene Graph ---
    
    // ========================================================
    // ** PERBAIKAN 2: Bug "Jalan Mundur/Menyamping" (YANG BARU) **
    // Urutan harus: Pindah (Translate) DULU, baru Putar (Rotate). T * R
    // ========================================================
    
    this.rootNode.localMatrix.setIdentity(); // Reset matriks (M = I)
    this.rootNode.localMatrix.translate(this.position[0], modelGroundY, this.position[2]); // (M = I * T)
    this.rootNode.localMatrix.rotate(this.currentAngleY, 0, 1, 0); // (M = (I * T) * R)
        

    // 2. Update Body (ganti buffer-nya dengan yang baru dibuat)
    this.nodes.body.buffers = this.bodyBuffers; // Ganti buffer

    // 3. Update Head (relatif ke root)
    let headBaseY = this.startRadius; 
    let headBaseZ = 0;
    this.nodes.head.localMatrix.setIdentity()
        .translate(0, headBaseY, headBaseZ)
        .scale(1.0, 1.0, 1.3);

    // 4. Update anak-anak kepala (RELATIF KE KEPALA)
    this.nodes.snout.localMatrix.setIdentity()
        .translate(0, -0.3, 0.8)
        .scale(1.0, 1.0, 1.3); // Hanya skala
    
    this.nodes.horn.localMatrix.setIdentity()
        .translate(0, 0.8, 0.5) // Posisi tanduk
        .rotate(15, 1, 0, 0); // Rotasi tanduk

    this.nodes.earL.localMatrix.setIdentity()
        .translate(-0.75, 0.45, -0.15); // Sedikit disesuaikan
    this.nodes.earLBase.localMatrix.setIdentity()
        .scale(0.7, 0.7, 0.7);

    // Wing 1 (Paling Besar & Bawah)
    this.nodes.earLWing1.localMatrix.setIdentity()
        .translate(0, 0, 0)
        .rotate(25, 0, 1, 0)        // Sapu ke belakang (Y)
        .rotate(20, 0, 0, 1)        // **Miringkan ke LUAR** (Z positif)
        .rotate(-15, 1, 0, 0)       // Sedikit angkat ke atas (X negatif kecil)
        .scale(1.0, 1.0, 1.0);

    // Wing 2 (Medium & Tengah)
    this.nodes.earLWing2.localMatrix.setIdentity()
        .translate(0.05, 0.05, -0.1) // Sedikit penyesuaian posisi
        .rotate(35, 0, 1, 0)        // Sapu lebih ke belakang
        .rotate(15, 0, 0, 1)        // Miringkan ke luar (sedikit lebih tegak)
        .rotate(-15, 1, 0, 0)       // Angkat sedikit
        .scale(0.8, 0.8, 0.8);

    // Wing 3 (Paling Kecil & Atas/Belakang)
    this.nodes.earLWing3.localMatrix.setIdentity()
        .translate(0.1, 0.1, -0.2) // Sedikit penyesuaian posisi
        .rotate(45, 0, 1, 0)        // Sapu paling belakang
        .rotate(10, 0, 0, 1)        // Miringkan ke luar (paling tegak)
        .rotate(-15, 1, 0, 0)       // Angkat sedikit
        .scale(0.6, 0.6, 0.6);

    // Telinga Kanan (mirror)
    this.nodes.earR.localMatrix.setIdentity()
        .translate(0.75, 0.45, -0.15) // Mirror posisi X
        .scale(-1, 1, 1);           // Mirror sumbu X lokal
    this.nodes.earRBase.localMatrix.setIdentity()
        .scale(0.7, 0.7, 0.7);

    // Gunakan transformasi relatif yang sama
    this.nodes.earRWing1.localMatrix.setIdentity()
        .translate(0, 0, 0)
        .rotate(25, 0, 1, 0)
        .rotate(20, 0, 0, 1)
        .rotate(-15, 1, 0, 0)
        .scale(1.0, 1.0, 1.0);

    this.nodes.earRWing2.localMatrix.setIdentity()
        .translate(0.05, 0.05, -0.1)
        .rotate(35, 0, 1, 0)
        .rotate(15, 0, 0, 1)
        .rotate(-15, 1, 0, 0)
        .scale(0.8, 0.8, 0.8);

    this.nodes.earRWing3.localMatrix.setIdentity()
        .translate(0.1, 0.1, -0.2)
        .rotate(45, 0, 1, 0)
        .rotate(10, 0, 0, 1)
        .rotate(-15, 1, 0, 0)
        .scale(0.6, 0.6, 0.6);
    // Mata
    this.nodes.eyeL.localMatrix.setIdentity()
        .translate(-0.6, 0.1, 0.75)
        .scale(1.0, 1.2, 0.5);
    this.nodes.eyeR.localMatrix.setIdentity()
        .translate(0.6, 0.1, 0.75)
        .scale(1.0, 1.2, 0.5);


    this.nodes.neckOrb.localMatrix
            .set(neckAttachMatrix)       // Mulai dari posisi & orientasi segmen leher
            .translate(0, -1.2, -1);

        // 5. Update Pangkal Ekor (relatif ke root)
    this.nodes.tailRoot.localMatrix.set(finalBodyMatrix);

    // 6. Update Bola Ekor (RELATIF KE INDUKNYA)
    this.nodes.tailBall1.localMatrix.setIdentity()
        .translate(0, 0, -0.3);
    this.nodes.tailBall2.localMatrix.setIdentity()
        .translate(0, 0, -0.4);
    this.nodes.tailBall3.localMatrix.setIdentity()
        .translate(0, 0, -0.3);
};

/**
 * Getter sederhana untuk mendapatkan node akar dari scene graph.
 */
Dragonair.prototype.getRootNode = function() {
    return this.rootNode;
};
