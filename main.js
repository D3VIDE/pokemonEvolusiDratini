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

    // 3. (Permintaan Anda) Gambar Titik Origin (oriPoint) di posisi node ini
    if (oriPointBuffers) {
        // Kita bisa skala sedikit agar tidak terlalu besar
        var oriMatrix = new Matrix4(node.worldMatrix).scale(0.5, 0.5, 0.5);
        drawPart(gl, programInfo, oriPointBuffers, oriMatrix, viewMatrix, projMatrix, mvpMatrix);
    }

    // 4. Panggil fungsi ini secara rekursif untuk semua anak
    for (var i = 0; i < node.children.length; i++) {
        drawSceneGraph(gl, programInfo, node.children[i], node.worldMatrix, viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
    }
}

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

    // 3. Buat Geometri & Buffer
    var headGeo = createSphere(1.0, 30, 30, blue);
    var snoutGeo = createSphere(0.6, 20, 20, snoutBlue);
    var hornGeo = createCone(0.3, 1.0, 10, white);
    var earBaseGeo = createSphere(0.25, 10, 10, earWhite); 
    var earWingGeo = createEllipticParaboloid(0.8, 0.15, 1.2, 12, 5, earWhite);
    var eyeGeo = createSphere(0.15, 10, 10, darkPurple);
    var tailBall1Geo = createSphere(0.2, 10, 10, blue);
    var tailBall2Geo = createSphere(0.15, 10, 10, blue);
    var tailBall3Geo = createSphere(0.1, 10, 10, blue);
    var groundPlaneGeo = createPlane(500, 500, groundGreen);

    // ===============================================
    // ** BARU: Inisialisasi Geometri oriPoint **
    // ===============================================
    // Bola merah kecil untuk menandai origin
    var oriPointGeo = createSphere(0.1, 8, 8, [1.0, 0.0, 0.0, 1.0]); 

    // Inisialisasi buffer

    var earBaseBuffers = initBuffers(gl, programInfo, earBaseGeo);
    var earWingBuffers = initBuffers(gl, programInfo, earWingGeo);
    var headBuffers = initBuffers(gl, programInfo, headGeo);
    var snoutBuffers = initBuffers(gl, programInfo, snoutGeo);
    var hornBuffers = initBuffers(gl, programInfo, hornGeo);
    var eyeBuffers = initBuffers(gl, programInfo, eyeGeo);
    var tailBallBuffers = [
        initBuffers(gl, programInfo, tailBall1Geo),
        initBuffers(gl, programInfo, tailBall2Geo),
        initBuffers(gl, programInfo, tailBall3Geo)
    ];
    var groundPlaneBuffers = initBuffers(gl, programInfo, groundPlaneGeo);
    
    // ===============================================
    // ** BARU: Inisialisasi Buffer oriPoint **
    // ===============================================
    var oriPointBuffers = initBuffers(gl, programInfo, oriPointGeo);

    // Variabel tubuh (tetap sama)
    var bodySegmentsCount = 20;
    var segmentLength = 0.5;
    var startRadius = 0.6;
    var maxRadius = 0.8;
    var endRadius = 0.1;
    var bodyBuffers = null; // Akan di-init di dalam tick
    var finalBodyMatrix = null;
    var bodyData = null;

    // 4. Setup matriks untuk kamera
    var projMatrix = new Matrix4();
    var viewMatrix = new Matrix4();
    // modelMatrix dan mvpMatrix akan dikelola oleh SceneGraph
    var mvpMatrix = new Matrix4(); 
    projMatrix.setPerspective(45, canvas.width / canvas.height, 1, 1000);

    // Pengaturan Kamera Interaktif (tetap sama)
    let cameraAngleX = 20.0;
    let cameraAngleY = 0.0;
    let cameraDistance = 25.0;
    let cameraTarget = [0.0, 1.0, 0.0];
    let cameraPosition = [0.0, 0.0, 0.0];
    let isDragging = false;
    let lastMouseX = -1, lastMouseY = -1;
    const mouseSensitivity = 0.3;
    const moveSpeed = 0.1;
    let keysPressed = {};
    function updateCamera() { /* ... kode updateCamera tetap sama ... */ 
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

    // Event Listener (tetap sama)
    canvas.onmousedown = function(ev) { /* ... kode onmousedown tetap sama ... */ 
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
    canvas.onmousemove = function(ev) { /* ... kode onmousemove tetap sama ... */ 
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
    document.onkeydown = function(ev) { keysPressed[ev.key.toLowerCase()] = true; };
    document.onkeyup = function(ev) { keysPressed[ev.key.toLowerCase()] = false; };

    canvas.onwheel = function(ev) {
        ev.preventDefault(); // Mencegah halaman web ikut ter-scroll

        // Tentukan seberapa sensitif zoom
        let zoomSensitivity = 0.05;
        
        // ev.deltaY positif jika scroll ke bawah (zoom out)
        // ev.deltaY negatif jika scroll ke atas (zoom in)
        cameraDistance += ev.deltaY * zoomSensitivity;

        // Batasi jarak zoom (misalnya, min 5, max 100)
        cameraDistance = Math.max(5.0, Math.min(100.0, cameraDistance));

        updateCamera(); // Perbarui matriks kamera
    };


    document.onkeydown = function(ev) { 
    keysPressed[ev.key.toLowerCase()] 
    = true; 
    };

    // ===============================================
    // Setup Hirarki Scene Graph **
    // ===============================================
    
    // Induk dari semua bagian Dragonair
    var dragonairRoot = new SceneNode(null); 
    
    // Node untuk tubuh (buffers-nya akan di-update di tick)
    var bodyNode = new SceneNode(null);
    dragonairRoot.children.push(bodyNode);

    // Node untuk kepala (buffers-nya dari headBuffers)
    var headNode = new SceneNode(headBuffers);
    dragonairRoot.children.push(headNode);
    
    // Anak-anak dari kepala
    var snoutNode = new SceneNode(snoutBuffers);
    headNode.children.push(snoutNode); // Anak dari headNode
    
    var hornNode = new SceneNode(hornBuffers);
    headNode.children.push(hornNode); // Anak dari headNode

    var earLNode = new SceneNode(null); // Induk Kiri (kosong)
    headNode.children.push(earLNode); 

    var earLBaseNode = new SceneNode(earBaseBuffers); // Pangkal bola
    earLNode.children.push(earLBaseNode);
    
    var earLWing1Node = new SceneNode(earWingBuffers); // Bulu Besar
    earLNode.children.push(earLWing1Node);
    var earLWing2Node = new SceneNode(earWingBuffers); // Bulu Sedang
    earLNode.children.push(earLWing2Node);
    var earLWing3Node = new SceneNode(earWingBuffers); // Bulu Kecil
    earLNode.children.push(earLWing3Node);

    // ===================================
    // Hirarki Telinga Kanan
    // ===================================
    var earRNode = new SceneNode(null); // Induk Kanan (kosong)
    headNode.children.push(earRNode);

    var earRBaseNode = new SceneNode(earBaseBuffers); // Pangkal bola
    earRNode.children.push(earRBaseNode);
    
    var earRWing1Node = new SceneNode(earWingBuffers); // Bulu Besar
    earRNode.children.push(earRWing1Node);
    var earRWing2Node = new SceneNode(earWingBuffers); // Bulu Sedang
    earRNode.children.push(earRWing2Node);
    var earRWing3Node = new SceneNode(earWingBuffers); // Bulu Kecil
    earRNode.children.push(earRWing3Node);


    var eyeLNode = new SceneNode(eyeBuffers);
    headNode.children.push(eyeLNode); // Anak dari headNode
    
    var eyeRNode = new SceneNode(eyeBuffers);
    headNode.children.push(eyeRNode); // Anak dari headNode

    // Node untuk pangkal ekor (matriksnya di-update di tick)
    var tailRootNode = new SceneNode(null);
    dragonairRoot.children.push(tailRootNode);

    // Node untuk bola-bola ekor (saling berantai)
    var tailBall1Node = new SceneNode(tailBallBuffers[0]);
    tailRootNode.children.push(tailBall1Node); // Anak dari tailRootNode

    var tailBall2Node = new SceneNode(tailBallBuffers[1]);
    tailBall1Node.children.push(tailBall2Node); // Anak dari tailBall1Node

    var tailBall3Node = new SceneNode(tailBallBuffers[2]);
    tailBall2Node.children.push(tailBall3Node); // Anak dari tailBall2Node

    // ===============================================

    // 5. Pengaturan render
    gl.clearColor(0.8, 0.8, 0.8, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(shaderProgram);

    // 6. Mulai loop animasi
    var g_lastTickTime = Date.now();

    var tick = function() {
        let now = Date.now();
        let elapsed = now - g_lastTickTime;
        g_lastTickTime = now;

        // --- Gerakan Kamera WASD ---
        // (kode kamera tetap sama)
        let radY = cameraAngleY * Math.PI / 180.0;
        let forward = [Math.sin(radY), 0, Math.cos(radY)];
        let right = [Math.cos(radY), 0, -Math.sin(radY)];
        let moved = false;
        if (keysPressed['w']) { cameraTarget[0] += forward[0] * moveSpeed; cameraTarget[2] += forward[2] * moveSpeed; moved = true; }
        if (keysPressed['s']) { cameraTarget[0] -= forward[0] * moveSpeed; cameraTarget[2] -= forward[2] * moveSpeed; moved = true; }
        if (keysPressed['a']) { cameraTarget[0] -= right[0] * moveSpeed; cameraTarget[2] -= right[2] * moveSpeed; moved = true; }
        if (keysPressed['d']) { cameraTarget[0] += right[0] * moveSpeed; cameraTarget[2] += right[2] * moveSpeed; moved = true; }
        if (moved) { updateCamera(); }


        // --- ANIMASI: Buat ulang tubuh (tetap sama) ---
        bodyData = createSmoothBody(
            bodySegmentsCount, segmentLength, startRadius, maxRadius, endRadius, now
        );
        if (!bodyData) { console.error("Gagal membuat bodyData"); requestAnimationFrame(tick); return; }
        bodyBuffers = initBuffers(gl, programInfo, bodyData); // Buat buffer baru
        if (!bodyBuffers) { console.error("Gagal init bodyBuffers"); requestAnimationFrame(tick); return; }
        finalBodyMatrix = bodyData.finalSpineMatrix;
        if(!finalBodyMatrix){ finalBodyMatrix = new Matrix4(); }
        
        var groundY = -3.5;
        
        // --- Hitung Posisi Y (tetap sama) ---
        if (bodyData.minY === undefined) { console.error("bodyData.minY tidak terdefinisi!"); requestAnimationFrame(tick); return; }
        var modelY = groundY - bodyData.minY + 0.01; 


        // ===============================================
        // ** BARU: Update Matriks Lokal di Scene Graph **
        // ===============================================
        
        // Alih-alih menggambar, kita HANYA update matriks lokal.
        
        // 1. Update Root (posisi global model)
        dragonairRoot.localMatrix.setIdentity().translate(0, modelY, -5);

        // 2. Update Body (ganti buffer-nya dengan yang baru dibuat)
        bodyNode.buffers = bodyBuffers;
        // bodyNode.localMatrix tetap identity (sudah benar)

        // 3. Update Head (relatif ke root)
        let headBaseY = startRadius; 
        let headBaseZ = 0;
        headNode.localMatrix.setIdentity()
                    .translate(0, headBaseY, headBaseZ)
                    .scale(1.0, 1.0, 1.3);

        // 4. Update anak-anak kepala (RELATIF KE KEPALA)
        // Perhatikan translasinya sekarang relatif terhadap (0,0,0) kepala
        snoutNode.localMatrix.setIdentity()
                    .translate(0, -0.3, 0.8)
                    .scale(1.0, 0.8, 1.0);
                    
        
        hornNode.localMatrix.setIdentity()
                    .translate(0, 0.8, 0.5)
                    .rotate(15, 1, 0, 0);



//!! ** TODO: Fix Bug Telinga** 

        earLNode.localMatrix.setIdentity()
               .translate(-0.8, 0.4, -0.2); 

        earLBaseNode.localMatrix.setIdentity()
            .scale(0.7, 0.7, 0.7);

        earLWing1Node.localMatrix.setIdentity()
               .translate(0, 0, 0)    
            .rotate(10, 0, 1, 0)   
            .rotate(90, 0, 0, 1)   
               .scale(1.0, 1.0, 0.4);   

        earLWing2Node.localMatrix.setIdentity()
               .translate(0, 0, -0.05) 
            .rotate(15, 0, 1, 0)     
            .rotate(85, 0, 0, 1)    
               .scale(0.8, 0.8, 0.8)    
               .scale(1.0, 1.0, 0.4);  

        earLWing3Node.localMatrix.setIdentity()
               .translate(0, 0, -0.1) 
            .rotate(20, 0, 1, 0)    
            .rotate(80, 0, 0, 1)     
               .scale(0.6, 0.6, 0.6)    
               .scale(1.0, 1.0, 0.4);  

        earRNode.localMatrix.setIdentity()
               .translate(0.8, 0.4, -0.2) 
            .scale(-1, 1, 1);          

        earRBaseNode.localMatrix.setIdentity()
            .scale(0.7, 0.7, 0.7);

        earRWing1Node.localMatrix.setIdentity()
               .translate(0, 0, 0)
            .rotate(10, 0, 1, 0)
            .rotate(90, 0, 0, 1)     
               .scale(1.0, 1.0, 0.4);

        earRWing2Node.localMatrix.setIdentity()
               .translate(0, 0, -0.05)
            .rotate(15, 0, 1, 0)
            .rotate(85, 0, 0, 1)     
               .scale(0.8, 0.8, 0.8)
               .scale(1.0, 1.0, 0.4);

        earRWing3Node.localMatrix.setIdentity()
               .translate(0, 0, -0.1)
            .rotate(20, 0, 1, 0)
            .rotate(80, 0, 0, 1)    
               .scale(0.6, 0.6, 0.6)
               .scale(1.0, 1.0, 0.4);

        eyeLNode.localMatrix.setIdentity()
                    .translate(-0.6, 0.1, 0.75)
                    .scale(1.0, 1.2, 0.5);

        eyeRNode.localMatrix.setIdentity()
                    .translate(0.6, 0.1, 0.75)
                    .scale(1.0, 1.2, 0.5);

        // 5. Update Pangkal Ekor (relatif ke root)
        tailRootNode.localMatrix.set(finalBodyMatrix);

        // 6. Update Bola Ekor (RELATIF KE INDUKNYA)
        tailBall1Node.localMatrix.setIdentity().translate(0, 0, -0.3); // Relatif ke tailRoot
        tailBall2Node.localMatrix.setIdentity().translate(0, 0, -0.4); // Relatif ke tailBall1
        tailBall3Node.localMatrix.setIdentity().translate(0, 0, -0.3); // Relatif ke tailBall2

        // ===============================================
        // ** Proses Gambar **
        // ===============================================

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Gambar Daratan (bukan bagian dari hirarki Dragonair)
        var groundModelMatrix = new Matrix4();
        groundModelMatrix.translate(0, groundY, -5);
        drawPart(gl, programInfo, groundPlaneBuffers, groundModelMatrix, viewMatrix, projMatrix, mvpMatrix);

        // Gambar SELURUH hirarki Dragonair dengan satu panggilan!
        // Mulai dari root, dengan matriks induk berupa identity matrix.
        // Kita juga berikan oriPointBuffers untuk di-render.
        drawSceneGraph(gl, programInfo, dragonairRoot, new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);

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

    if (!(mvpMatrix instanceof Matrix4)) { console.error("mvpMatrix bukan instance Matrix4"); return; }
    if (!(viewMatrix instanceof Matrix4)) { console.error("viewMatrix bukan instance Matrix4"); return; }
    if (!(modelMatrix instanceof Matrix4)) { console.error("modelMatrix bukan instance Matrix4"); return; }

    mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);

    if (program.u_MvpMatrix === null) { console.error("Lokasi uniform u_MvpMatrix tidak ditemukan."); return; }
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.drawElements(gl.TRIANGLES, buffers.n, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
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
     if (!vbo) { console.error("Gagal membuat VBO"); return null; }
     gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
     gl.bufferData(gl.ARRAY_BUFFER, geo.vertices, gl.STATIC_DRAW);

     var cbo = gl.createBuffer();
      if (!cbo) { console.error("Gagal membuat CBO"); return null; }
     gl.bindBuffer(gl.ARRAY_BUFFER, cbo);
     gl.bufferData(gl.ARRAY_BUFFER, geo.colors, gl.STATIC_DRAW);

     var ibo = gl.createBuffer();
      if (!ibo) { console.error("Gagal membuat IBO"); return null; }
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);

     gl.bindBuffer(gl.ARRAY_BUFFER, null);
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

     return { vbo: vbo, cbo: cbo, ibo: ibo, n: geo.indices.length };
}

