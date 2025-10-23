// =================================================================
// Variabel Warna Global
// =================================================================

var blue = [0.4, 0.6, 1.0, 1.0];
var snoutBlue = [0.6, 0.75, 1.0, 1.0]; // warna biru untuk moncong
var white = [1.0, 1.0, 1.0, 1.0];
var darkPurple = [0.2, 0.0, 0.2, 1.0];
var groundGreen = [0.4, 0.8, 0.4, 1.0];
var earWhite = [0.9, 0.9, 1.0, 1.0];

// =================================================================
// Definisi Scene Graph
// =================================================================

/**
 * Class (fungsi konstruktor) untuk node dalam scene graph.
 * @param {object} buffers - Buffer geometri yang akan digambar (VBO, CBO, IBO, n).
 * @param {Matrix4} localMatrix - Matriks transformasi node ini RELATIF terhadap induknya.
 */
function SceneNode(buffers, localMatrix) {
    this.buffers = buffers; // Geometri untuk digambar (bisa null jika ini hanya grup)
    this.localMatrix = localMatrix || new Matrix4();
    this.worldMatrix = new Matrix4(); // Dihitung saat di-render
    this.children = [];
}

/**
 * Menggambar scene graph secara rekursif.
 * @param {SceneNode} node - Node yang akan digambar.
 * @param {Matrix4} parentWorldMatrix - Matriks dunia dari induk node ini.
 * @param {object} oriPointBuffers - Buffer untuk menggambar titik origin (untuk debug).
 */
function drawSceneGraph(gl, programInfo, node, parentWorldMatrix, viewMatrix, projMatrix, mvpMatrix, oriPointBuffers) {
    
    // 1. Hitung matriks dunia (world matrix) untuk node ini:
    // worldMatrix = parentWorldMatrix * localMatrix
    node.worldMatrix.set(parentWorldMatrix).multiply(node.localMatrix);

    // 2. Gambar geometri node ini (jika ada)
    if (node.buffers) {
        drawPart(gl, programInfo, node.buffers, node.worldMatrix, viewMatrix, projMatrix, mvpMatrix);
    }

    // 3. Gambar Titik Origin (oriPoint) di posisi node ini (untuk debug)
    if (oriPointBuffers) {
        var oriMatrix = new Matrix4(node.worldMatrix).scale(0.5, 0.5, 0.5);
        drawPart(gl, programInfo, oriPointBuffers, oriMatrix, viewMatrix, projMatrix, mvpMatrix);
    }

    // 4. Panggil fungsi ini secara rekursif untuk semua anak
    for (var i = 0; i < node.children.length; i++) {
        drawSceneGraph(gl, programInfo, node.children[i], node.worldMatrix, viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
    }
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
    this.segmentLength = 0.8;
    this.startRadius = 0.6;
    this.maxRadius = 0.8;
    this.endRadius = 0.1;
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
    var headGeo = createSphere(1.0, 30, 30, blue);
    var snoutGeo = createSphere(0.6, 20, 20, snoutBlue);
    var hornGeo = createCone(0.3, 1.0, 10, white);
    var earBaseGeo = createSphere(0.25, 10, 10, earWhite); 
    var earWingGeo = createEllipticParaboloid(0.8, 0.15, 1.2, 12, 5, earWhite);
    var eyeGeo = createSphere(0.15, 10, 10, darkPurple);
    var tailBall1Geo = createSphere(0.2, 10, 10, blue);
    var tailBall2Geo = createSphere(0.15, 10, 10, blue); //!! ** ini tidak digunakan untuk aksesories **
    var tailBall3Geo = createSphere(0.1, 10, 10, blue);

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
Dragonair.prototype.update = function(now, groundY) {
    var gl = this.gl;
    var programInfo = this.programInfo;

    // --- ANIMASI: Buat ulang tubuh ---
    this.bodyData = createSmoothBody(
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
    
    // --- Hitung Posisi Y ---
    if (this.bodyData.minY === undefined) 
    { 
        console.error("bodyData.minY tidak terdefinisi!"); 
        return;
     }
    var modelY = groundY - this.bodyData.minY + 0.01; 

    // --- Update Matriks Lokal di Scene Graph ---
    
    // 1. Update Root (posisi global model)
    this.rootNode.localMatrix.setIdentity().translate(0, modelY, -5);

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
        .translate(0, -0.3, 0.8) // Posisi moncong
        .scale(1.0, 0.8, 1.0); // Skala moncong
    
    this.nodes.horn.localMatrix.setIdentity()
        .translate(0, 0.8, 0.5) // Posisi tanduk
        .rotate(15, 1, 0, 0); // Rotasi tanduk

    // Telinga Kiri
    this.nodes.earL.localMatrix.setIdentity()
        .translate(-0.8, 0.4, -0.2); 
    this.nodes.earLBase.localMatrix.setIdentity()
        .scale(0.7, 0.7, 0.7);
    this.nodes.earLWing1.localMatrix.setIdentity()
        .translate(0, 0, 0)
        .rotate(10, 0, 1, 0)
        .rotate(90, 0, 0, 1)
        .scale(1.0, 1.0, 0.4); 
    this.nodes.earLWing2.localMatrix.setIdentity()
        .translate(0, 0, -0.05)
        .rotate(15, 0, 1, 0)
        .rotate(85, 0, 0, 1)
        .scale(0.8, 0.8, 0.8)
        .scale(1.0, 1.0, 0.4); 
    this.nodes.earLWing3.localMatrix.setIdentity()
        .translate(0, 0, -0.1)
        .rotate(20, 0, 1, 0)
        .rotate(80, 0, 0, 1)
        .scale(0.6, 0.6, 0.6)
        .scale(1.0, 1.0, 0.4); 

    // Telinga Kanan (mirror)
    this.nodes.earR.localMatrix.setIdentity()
        .translate(0.8, 0.4, -0.2).scale(-1, 1, 1); 
    this.nodes.earRBase.localMatrix.setIdentity()
        .scale(0.7, 0.7, 0.7);
    this.nodes.earRWing1.localMatrix.setIdentity()
        .translate(0, 0, 0)
        .rotate(10, 0, 1, 0)
        .rotate(90, 0, 0, 1)
        .scale(1.0, 1.0, 0.4);
    this.nodes.earRWing2.localMatrix.setIdentity()
        .translate(0, 0, -0.05).rotate(15, 0, 1, 0)
        .rotate(85, 0, 0, 1)
        .scale(0.8, 0.8, 0.8)
        .scale(1.0, 1.0, 0.4);
    this.nodes.earRWing3.localMatrix.setIdentity()
        .translate(0, 0, -0.1)
        .rotate(20, 0, 1, 0)
        .rotate(80, 0, 0, 1)
        .scale(0.6, 0.6, 0.6)
        .scale(1.0, 1.0, 0.4);

    // Mata
    this.nodes.eyeL.localMatrix.setIdentity()
        .translate(-0.6, 0.1, 0.75)
        .scale(1.0, 1.2, 0.5);
    this.nodes.eyeR.localMatrix.setIdentity()
        .translate(0.6, 0.1, 0.75)
        .scale(1.0, 1.2, 0.5);

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

// =================================================================
// FUNGSI UTAMA (MAIN)
// =================================================================

function main() {
    // 1. Setup kanvas dan konteks WebGL
    var canvas = document.getElementById('webgl');
    var gl = canvas.getContext('webgl');
    if (!gl) { console.log('Gagal mendapatkan konteks WebGL'); return; }

    // 2. Setup shader
    var vsSource = document.getElementById('shader-vs').innerText;
    var fsSource = document.getElementById('shader-fs').innerText;
    var shaderProgram = initShaders(gl, vsSource, fsSource);
    if (!shaderProgram) { console.log('Gagal inisialisasi shader.'); return; }

    // Simpan lokasi atribut dan uniform
    var programInfo = {
        program: shaderProgram,
        a_Position: gl.getAttribLocation(shaderProgram, 'a_Position'),
        a_Color: gl.getAttribLocation(shaderProgram, 'a_Color'),
        u_MvpMatrix: gl.getUniformLocation(shaderProgram, 'u_MvpMatrix'),
    };

    // ===============================================
    // ** OOP: Buat Instance Model **
    // ===============================================
    
    // Buat instance Dragonair baru
    var myDragonair = new Dragonair(gl, programInfo);
    // Panggil 'init' untuk membuat geometri, buffer, dan scene graph-nya
    myDragonair.init();

    // Di masa depan, Anda bisa tambahkan:
    // var myDratini = new Dratini(gl, programInfo);
    // myDratini.init();
    // myDratini.getRootNode().localMatrix.translate(10, 0, 0); // Pindahkan ke samping
    var worldBounds = 400;
    // ===============================================
    // ** Buat Aset Scene (Non-Model) **
    // ===============================================
    var groundPlaneGeo = createPlane(500, 500, groundGreen);
    var groundPlaneBuffers = initBuffers(gl, programInfo, groundPlaneGeo);
    

    var grassGeo = createRandomGrass(1500, worldBounds, worldBounds,2.0, grassGreen)
    var grassBuffers = initBuffers(gl,programInfo,grassGeo)

    var cloudGeo = createSphere(1.0, 10, 8, white); // Geometri dasar awan
    var cloudBuffers = initBuffers(gl, programInfo, cloudGeo);
    var cloudRootNode = new SceneNode(null); // Induk untuk semua awan
    var numClouds = 15;

    for (let i = 0; i < numClouds; i++) {
        let x = Math.random() * worldBounds - (worldBounds / 2);
        let y = Math.random() * 10 + 35; // Ketinggian awan
        let z = Math.random() * worldBounds - (worldBounds / 2);
        let speed = (Math.random() * 0.005) + 0.005; // Kecepatan acak

        var cloudClump = createCloudClump(cloudBuffers, new Matrix4().translate(x, y, z));
        cloudClump.speed = speed; // Simpan kecepatan di node
        cloudRootNode.children.push(cloudClump);
    }
    // Bola merah kecil untuk menandai origin (untuk debug)
    var oriPointGeo = createSphere(0.1, 8, 8, [1.0, 0.0, 0.0, 1.0]); 
    var oriPointBuffers = initBuffers(gl, programInfo, oriPointGeo);

    // 4. Setup matriks untuk kamera
    var projMatrix = new Matrix4();
    var viewMatrix = new Matrix4();
    var mvpMatrix = new Matrix4(); 
    projMatrix.setPerspective(45, canvas.width / canvas.height, 1, 1000);

    // Pengaturan Kamera Interaktif
    let cameraAngleX = 20.0;
    let cameraAngleY = 0.0;
    let cameraDistance = 35.0;
    let cameraTarget = [0.0, 5.0, 0.0];
    let cameraPosition = [0.0, 0.0, 0.0];
    let isDragging = false;
    let lastMouseX = -1, lastMouseY = -1;
    const mouseSensitivity = 0.3;
    const moveSpeed = 0.1;
    let keysPressed = {};
    function updateCamera() { 
        let radX = cameraAngleX * Math.PI / 180.0;
        let radY = cameraAngleY * Math.PI / 180.0;
        cameraPosition[0] = cameraTarget[0] + cameraDistance * Math.sin(radY) * Math.cos(radX);
        cameraPosition[1] = cameraTarget[1] + cameraDistance * Math.sin(radX);
        cameraPosition[2] = cameraTarget[2] + cameraDistance * Math.cos(radY) * Math.cos(radX);
        viewMatrix.setLookAt(
            cameraPosition[0], cameraPosition[1], cameraPosition[2],
            cameraTarget[0], cameraTarget[1], cameraTarget[2],
            0, 1, 0
        );
    }
    updateCamera();

    // Event Listener
    canvas.onmousedown = function(ev) { 
        let x = ev.clientX, y = ev.clientY;
        let rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            lastMouseX = x;
            lastMouseY = y;
            isDragging = true;
        }
    };
    canvas.onmouseup = function(ev) { isDragging = false; };
    canvas.onmouseleave = function(ev) { isDragging = false; };
    canvas.onmousemove = function(ev) { 
        if (!isDragging) return;
        let x = ev.clientX, y = ev.clientY;
        let deltaX = x - lastMouseX;
        let deltaY = y - lastMouseY;
        cameraAngleY += deltaX * mouseSensitivity;
        cameraAngleX -= deltaY * mouseSensitivity;
        cameraAngleX = Math.max(-89.0, Math.min(89.0, cameraAngleX));
        lastMouseX = x;
        lastMouseY = y;
        updateCamera();
    };
    
    // Listener Zoom
    canvas.onwheel = function(ev) {
        ev.preventDefault(); 
        let zoomSensitivity = 0.05;
        cameraDistance += ev.deltaY * zoomSensitivity;
        cameraDistance = Math.max(5.0, Math.min(100.0, cameraDistance));
        updateCamera(); 
    };
    
    // Listener Keyboard
    document.onkeydown = function(ev) { keysPressed[ev.key.toLowerCase()] = true; };
    document.onkeyup = function(ev) { keysPressed[ev.key.toLowerCase()] = false; };

    // 5. Pengaturan render langit
    gl.clearColor(skyBlue[0], skyBlue[1], skyBlue[2], skyBlue[3]);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(shaderProgram);

    // 6. Mulai loop animasi
    var g_lastTickTime = Date.now();
    var groundY = -3.5; // Definisikan groundY di sini

    var tick = function() {
        let now = Date.now();
        let elapsed = now - g_lastTickTime;
        g_lastTickTime = now;

        // --- Gerakan Kamera WASD ---
        let radY = cameraAngleY * Math.PI / 180.0;
        let forward = [Math.sin(radY), 0, Math.cos(radY)];
        let right = [Math.cos(radY), 0, -Math.sin(radY)];
        let moved = false;
        if (keysPressed['w']) 
        { 
            cameraTarget[0] += forward[0] * moveSpeed; 
            cameraTarget[2] += forward[2] * moveSpeed; 
            moved = true; 
        }
        if (keysPressed['s']) 
        {   cameraTarget[0] -= forward[0] * moveSpeed; 
            cameraTarget[2] -= forward[2] * moveSpeed; 
            moved = true; 
        }
        if (keysPressed['a']) 
        {   cameraTarget[0] -= right[0] * moveSpeed; 
            cameraTarget[2] -= right[2] * moveSpeed; 
            moved = true; 
        }
        if (keysPressed['d']) 
        {   cameraTarget[0] += right[0] * moveSpeed; 
            cameraTarget[2] += right[2] * moveSpeed; 
            moved = true; 
        }
        if (moved)
         { 
            updateCamera();
         }

        // ===============================================
        // ** OOP: Update Model **
        // ===============================================
        // Panggil 'update' pada instance Dragonair
        myDragonair.update(now, groundY);
        
        // ===============================================
        // ** Proses Gambar **
        // ===============================================
        let frameSpeed = elapsed / 16.667; // Normalisasi kecepatan
        let worldHalf = worldBounds / 2;
        for(let i = 0; i < cloudRootNode.children.length; i++) {
            let cloud = cloudRootNode.children[i];
            cloud.localMatrix.translate(cloud.speed * frameSpeed, 0, 0); // Gerak ke kanan (X+)
            let xPos = cloud.localMatrix.elements[12]; 
            if (xPos > worldHalf + 20) { // Wrap around
                cloud.localMatrix.elements[12] = -(worldHalf + 20);
            }
        }

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Gambar Daratan
        var groundModelMatrix = new Matrix4();
        groundModelMatrix.translate(0, groundY, -5);
        drawPart(gl, programInfo, groundPlaneBuffers, groundModelMatrix, viewMatrix, projMatrix, mvpMatrix);
        drawPart(gl, programInfo, grassBuffers, groundModelMatrix, viewMatrix, projMatrix, mvpMatrix);
        drawSceneGraph(gl, programInfo, cloudRootNode, new Matrix4(), viewMatrix, projMatrix, mvpMatrix, null); 

        // --- Gambar Model ---
        // 4. Gambar Dragonair
        drawSceneGraph(gl, programInfo, myDragonair.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
        

        requestAnimationFrame(tick);
    };

    tick();
}

// =================================================================
// FUNGSI HELPER (Setup WebGL, Gambar)
// =================================================================

function drawPart(gl, program, buffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix) {
    if (!buffers || !buffers.vbo || !buffers.cbo || !buffers.ibo) { console.error("Buffer tidak valid:", buffers); return; }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vbo);
    gl.vertexAttribPointer(program.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cbo);
    gl.vertexAttribPointer(program.a_Color, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.a_Color);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.ibo);

    mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.drawElements(gl.TRIANGLES, buffers.n, gl.UNSIGNED_SHORT, 0);
}

function initShaders(gl, vs_source, fs_source) {
     var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vs_source);
     var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fs_source);
     if (!vertexShader || !fragmentShader) return null;
     var program = gl.createProgram();
     if (!program) return null;
     gl.attachShader(program, vertexShader);
     gl.attachShader(program, fragmentShader);
     gl.linkProgram(program);
     var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
     if (!linked) { console.error('Gagal link program: ' + gl.getProgramInfoLog(program)); gl.deleteProgram(program); gl.deleteShader(fragmentShader); gl.deleteShader(vertexShader); return null; }
     return program;
}

function loadShader(gl, type, source) {
     var shader = gl.createShader(type);
     if (shader == null) { console.error('Gagal membuat shader'); return null; }
     gl.shaderSource(shader, source);
     gl.compileShader(shader);
     var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
     if (!compiled) { console.error('Gagal compile shader (' + (type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment') + '): ' + gl.getShaderInfoLog(shader)); gl.deleteShader(shader); return null; }
        return shader;
}

function initBuffers(gl, program, geo) {
      if (!geo || !geo.vertices || !geo.colors || !geo.indices) { console.error("Data geometri tidak valid:", geo); return null; }
     var vbo = gl.createBuffer();
     gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
     gl.bufferData(gl.ARRAY_BUFFER, geo.vertices, gl.STATIC_DRAW);

     var cbo = gl.createBuffer();
     gl.bindBuffer(gl.ARRAY_BUFFER, cbo);
     gl.bufferData(gl.ARRAY_BUFFER, geo.colors, gl.STATIC_DRAW);

     var ibo = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);

     gl.bindBuffer(gl.ARRAY_BUFFER, null);
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

     return { vbo: vbo, cbo: cbo, ibo: ibo, n: geo.indices.length };
}