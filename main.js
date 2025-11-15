// =================================================================
// Variabel Warna Global (Diambil dari WorldEnvironment untuk Konsistensi)
// =================================================================

// Variabel warna global yang digunakan oleh model (dipertahankan dari kode Anda)
var groundGreen = [0.4, 0.8, 0.4, 1.0];
var earWhite = [0.9, 0.9, 1.0, 1.0];
var crystalBlue = [0.23, 0.3, 0.79, 1.0];

// Warna World yang didefinisikan di world.js (HARUS SAMA)
var SKY_COLOR = [0.53, 0.81, 0.92, 1.0]; // Biru Langit Cerah
var GROUND_Y = -3.5; // Ketinggian Y daratan yang konsisten

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
 * @param {WebGLRenderingContext} gl - Konteks WebGL.
 * @param {object} programInfo - Informasi shader.
 * @param {SceneNode} node - Node yang akan digambar.
 * @param {Matrix4} parentWorldMatrix - Matriks dunia dari induk node ini.
 * @param {Matrix4} viewMatrix - Matriks View.
 * @param {Matrix4} projMatrix - Matriks Proyeksi.
 * @param {Matrix4} mvpMatrix - Matriks Model-View-Proyeksi (dibuat ulang di drawPart).
 * @param {object} oriPointBuffers - Buffer untuk menggambar titik origin (untuk debug).
 */
function drawSceneGraph(gl, programInfo, node, parentWorldMatrix, viewMatrix, projMatrix, mvpMatrix, oriPointBuffers) {
    // 1. Hitung matriks dunia (world matrix) untuk node ini:
    // worldMatrix = parentWorldMatrix * localMatrix
    node.worldMatrix.set(parentWorldMatrix).multiply(node.localMatrix);

    // 2. Gambar geometri node ini (jika ada)
    if (node.buffers) {
        // Periksa apakah node ini di-disable
        if (node.enabled !== false) { 
            drawPart(gl, programInfo, node.buffers, node.worldMatrix, viewMatrix, projMatrix, mvpMatrix);
        }
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
// FUNGSI UTAMA (MAIN)
// =================================================================

function main() {
    // 1. Setup kanvas dan konteks WebGL
    var canvas = document.getElementById("webgl");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        console.log("Gagal mendapatkan konteks WebGL");
        return;
    }

    // 2. Setup shader
    var vsSource = document.getElementById("shader-vs").innerText;
    var fsSource = document.getElementById("shader-fs").innerText;
    var shaderProgram = initShaders(gl, vsSource, fsSource);
    if (!shaderProgram) {
        console.log("Gagal inisialisasi shader.");
        return;
    }

    // Simpan lokasi atribut dan uniform
    var programInfo = {
        program: shaderProgram,
        a_Position: gl.getAttribLocation(shaderProgram, "a_Position"),
        a_Color: gl.getAttribLocation(shaderProgram, "a_Color"),
        u_MvpMatrix: gl.getUniformLocation(shaderProgram, "u_MvpMatrix"),
    };

    // ===============================================
    // ** OOP: Buat Instance Model & World **
    // ===============================================

    // Ukuran Batas Dunia (Digunakan oleh model pergerakan)
    var worldBounds = 400;

    // 1. Inisialisasi Model Pokémon
    var myDragonair = new Dragonair(gl, programInfo);
    myDragonair.init();
    myDragonair.position = [10, 0, 0]; // Posisi awal disesuaikan

    var myDratini = new DratiniModel(gl, programInfo);
    myDratini.init();
    myDratini.position = [-20, 0, -10];
    myDratini.globalRotationY = 0;
    myDratini.targetRotation = 0;

    var myDragonite = new Dragonite(gl, programInfo);
    myDragonite.init();
    
    // 2. Inisialisasi World Environment BARU
    var myWorld = new WorldEnvironment(gl, programInfo);
    myWorld.init(); 

    // Bola merah kecil untuk menandai origin (untuk debug)
    var oriPointGeo = createSphere(0.1, 8, 8, [1.0, 0.0, 0.0, 1.0]);
    var oriPointBuffers = initBuffers(gl, programInfo, oriPointGeo);

    // 4. Setup matriks untuk kamera
    var projMatrix = new Matrix4();
    var viewMatrix = new Matrix4();
    var mvpMatrix = new Matrix4();
    projMatrix.setPerspective(45, canvas.width / canvas.height, 1, 1000);

    // Pengaturan Kamera Interaktif (Tetap sama)
    let cameraAngleX = 20.0;
    let cameraAngleY = 0.0;
    let cameraDistance = 35.0;
    let cameraTarget = [0.0, 5.0, 0.0];
    let cameraPosition = [0.0, 0.0, 0.0];
    let isDragging = false;
    let lastMouseX = -1, lastMouseY = -1;
    const mouseSensitivity = 0.3;
    const moveSpeed = 0.5; // Disesuaikan agar pergerakan lebih cepat
    let keysPressed = {};
    
    function updateCamera() {
        let radX = (cameraAngleX * Math.PI) / 180.0;
        let radY = (cameraAngleY * Math.PI) / 180.0;
        cameraPosition[0] = cameraTarget[0] + cameraDistance * Math.sin(radY) * Math.cos(radX);
        cameraPosition[1] = cameraTarget[1] + cameraDistance * Math.sin(radX);
        cameraPosition[2] = cameraTarget[2] + cameraDistance * Math.cos(radY) * Math.cos(radX);
        viewMatrix.setLookAt(cameraPosition[0], cameraPosition[1], cameraPosition[2], cameraTarget[0], cameraTarget[1], cameraTarget[2], 0, 1, 0);
    }
    updateCamera();

    // Event Listener (Tetap sama)
    canvas.onmousedown = function (ev) {
        let x = ev.clientX, y = ev.clientY;
        let rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            lastMouseX = x;
            lastMouseY = y;
            isDragging = true;
        }
    };
    canvas.onmouseup = function (ev) { isDragging = false; };
    canvas.onmouseleave = function (ev) { isDragging = false; };
    canvas.onmousemove = function (ev) {
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

    // Listener Zoom (Tetap sama)
    canvas.onwheel = function (ev) {
        ev.preventDefault();
        let zoomSensitivity = 0.05;
        cameraDistance += ev.deltaY * zoomSensitivity;
        cameraDistance = Math.max(5.0, Math.min(200.0, cameraDistance)); // Jarak maks diperluas
        updateCamera();
    };

    // Listener Keyboard (Tetap sama)
    document.onkeydown = function (ev) { keysPressed[ev.key.toLowerCase()] = true; };
    document.onkeyup = function (ev) { keysPressed[ev.key.toLowerCase()] = false; };

    // 5. Pengaturan render langit (Menggunakan warna dari world.js)
    gl.clearColor(SKY_COLOR[0], SKY_COLOR[1], SKY_COLOR[2], SKY_COLOR[3]);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(shaderProgram);

    // 6. Mulai loop animasi
    var g_lastTickTime = Date.now();
    var groundY = GROUND_Y; // Definisikan groundY di sini

    var tick = function () {
        let now = Date.now();
        let elapsed = now - g_lastTickTime;
        g_lastTickTime = now;
        
        // --- Gerakan Kamera WASD (DAN NAIK/TURUN) ---
        let radY = (cameraAngleY * Math.PI) / 180.0;
        let backVector = [Math.sin(radY), 0, Math.cos(radY)];
        let rightVector = [Math.cos(radY), 0, -Math.sin(radY)];
        let moved = false;
        
        let actualMoveSpeed = moveSpeed * elapsed / 16.667; // Normalisasi kecepatan

        if (keysPressed["w"]) { cameraTarget[0] -= backVector[0] * actualMoveSpeed; cameraTarget[2] -= backVector[2] * actualMoveSpeed; moved = true; }
        if (keysPressed["s"]) { cameraTarget[0] += backVector[0] * actualMoveSpeed; cameraTarget[2] += backVector[2] * actualMoveSpeed; moved = true; }
        if (keysPressed["a"]) { cameraTarget[0] -= rightVector[0] * actualMoveSpeed; cameraTarget[2] -= rightVector[2] * actualMoveSpeed; moved = true; }
        if (keysPressed["d"]) { cameraTarget[0] += rightVector[0] * actualMoveSpeed; cameraTarget[2] += rightVector[2] * actualMoveSpeed; moved = true; }
        if (keysPressed[" "]) { cameraTarget[1] += actualMoveSpeed; moved = true; }
        if (keysPressed["shift"]) { cameraTarget[1] -= actualMoveSpeed; moved = true; }

        if (moved) {
            updateCamera();
        }

        // ===============================================
        // ** OOP: Update World dan Model **
        // ===============================================
        myWorld.update(now, elapsed); // Update animasi World (air, awan, dll.)
        
        // Panggil 'update' pada instance Pokemon
        myDragonair.update(now, groundY, elapsed);
        myDratini.update(elapsed, worldBounds);
        myDragonite.update(now, groundY, elapsed);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // --- Gambar World DULU ---
        // Gambar World (Daratan, Danau, Gunung, Pohon)
        drawSceneGraph(gl, programInfo, myWorld.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, null);

        // --- Gambar Model ---
        // Gambar Dragonair
        drawSceneGraph(gl, programInfo, myDragonair.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);

        // Gambar Dratini
        drawSceneGraph(gl, programInfo, myDratini.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);

        // Gambar Dragonite
        drawSceneGraph(gl, programInfo, myDragonite.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
        
        requestAnimationFrame(tick);
    };

    tick();
}

// =================================================================
// FUNGSI HELPER (Setup WebGL, Gambar)
// =================================================================

function drawPart(gl, program, buffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix) {
    if (!buffers || !buffers.vbo || !buffers.cbo || !buffers.ibo) {
        // console.error("Buffer tidak valid:", buffers); // Nonaktifkan karena beberapa node memang null
        return;
    }
    
    // Bind Position Buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vbo);
    gl.vertexAttribPointer(program.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.a_Position);

    // Bind Color Buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cbo);
    gl.vertexAttribPointer(program.a_Color, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.a_Color);

    // Bind Index Buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.ibo);

    // Hitung MVP Matrix: Proj * View * Model
    mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    
    // Gambar
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
    if (!linked) {
        console.error("Gagal link program: " + gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        gl.deleteShader(fragmentShader);
        gl.deleteShader(vertexShader);
        return null;
    }
    return program;
}

function loadShader(gl, type, source) {
    var shader = gl.createShader(type);
    if (shader == null) {
        console.error("Gagal membuat shader");
        return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
        console.error("Gagal compile shader (" + (type === gl.VERTEX_SHADER ? "Vertex" : "Fragment") + "): " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initBuffers(gl, program, geo) {
    if (!geo || !geo.vertices || !geo.colors || !geo.indices) {
        // console.error("Data geometri tidak valid:", geo); // Nonaktifkan, karena beberapa geo memang null
        return null;
    }
    
    // Vertex Buffer Object (VBO)
    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, geo.vertices, gl.STATIC_DRAW);

    // Color Buffer Object (CBO)
    var cbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cbo);
    gl.bufferData(gl.ARRAY_BUFFER, geo.colors, gl.STATIC_DRAW);

    // Index Buffer Object (IBO)
    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);

    // Unbind buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return { vbo: vbo, cbo: cbo, ibo: ibo, n: geo.indices.length };
}

function normalizeVector(v) {
    let len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (len > 0.00001) {
        return [v[0] / len, v[1] / len, v[2] / len];
    } else {
        return [0, 0, 0];
    }
}