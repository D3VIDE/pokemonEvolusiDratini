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

    // 3. Buat geometri
    var headGeo = createSphere(1.0, 30, 30, blue);
    var snoutGeo = createSphere(0.6, 20, 20, blue);
    var hornGeo = createCone(0.3, 1.0, 10, white);
    var earGeo = createSphere(0.35, 10, 10, white);
    var eyeGeo = createSphere(0.15, 10, 10, darkPurple);

    var tailBall1Geo = createSphere(0.2, 10, 10, blue);
    var tailBall2Geo = createSphere(0.15, 10, 10, blue);
    var tailBall3Geo = createSphere(0.1, 10, 10, blue);

    var groundPlaneGeo = createPlane(500, 500, groundGreen);

    // Inisialisasi buffer
    var headBuffers = initBuffers(gl, programInfo, headGeo);
    var snoutBuffers = initBuffers(gl, programInfo, snoutGeo);
    var hornBuffers = initBuffers(gl, programInfo, hornGeo);
    var earBuffers = initBuffers(gl, programInfo, earGeo);
    var eyeBuffers = initBuffers(gl, programInfo, eyeGeo);
    var tailBallBuffers = [
        initBuffers(gl, programInfo, tailBall1Geo),
        initBuffers(gl, programInfo, tailBall2Geo),
        initBuffers(gl, programInfo, tailBall3Geo)
    ];
    var groundPlaneBuffers = initBuffers(gl, programInfo, groundPlaneGeo);

    // Variabel tubuh
    var bodySegmentsCount = 20;
    var segmentLength = 0.5;
    var startRadius = 0.6;
    var maxRadius = 0.8;
    var endRadius = 0.1;
    var bodyBuffers = null;
    var finalBodyMatrix = null;
    var bodyData = null;

    // 4. Setup matriks untuk kamera
    var projMatrix = new Matrix4();
    var viewMatrix = new Matrix4();
    var modelMatrix = new Matrix4();
    var mvpMatrix = new Matrix4();

    projMatrix.setPerspective(45, canvas.width / canvas.height, 1, 1000);

    // Pengaturan Kamera Interaktif
    let cameraAngleX = 20.0;
    let cameraAngleY = 0.0;
    let cameraDistance = 25.0;
    let cameraTarget = [0.0, 1.0, 0.0]; // Target lebih tinggi
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

    // Event Listener Mouse
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

    // Event Listener Keyboard
    document.onkeydown = function(ev) { keysPressed[ev.key.toLowerCase()] = true; };
    document.onkeyup = function(ev) { keysPressed[ev.key.toLowerCase()] = false; };

    // 5. Pengaturan render
    gl.clearColor(0.8, 0.8, 0.8, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(shaderProgram);

    // 6. Mulai loop animasi
   // 6. Mulai loop animasi
var g_lastTickTime = Date.now();

var tick = function() {
    let now = Date.now();
    let elapsed = now - g_lastTickTime;
    g_lastTickTime = now;

    // --- Gerakan Kamera WASD ---
    let radY = cameraAngleY * Math.PI / 180.0;
    let forward = [Math.sin(radY), 0, Math.cos(radY)];
    let right = [Math.cos(radY), 0, -Math.sin(radY)];
    let moved = false;
    if (keysPressed['w']) { cameraTarget[0] += forward[0] * moveSpeed; cameraTarget[2] += forward[2] * moveSpeed; moved = true; }
    if (keysPressed['s']) { cameraTarget[0] -= forward[0] * moveSpeed; cameraTarget[2] -= forward[2] * moveSpeed; moved = true; }
    if (keysPressed['a']) { cameraTarget[0] -= right[0] * moveSpeed; cameraTarget[2] -= right[2] * moveSpeed; moved = true; }
    if (keysPressed['d']) { cameraTarget[0] += right[0] * moveSpeed; cameraTarget[2] += right[2] * moveSpeed; moved = true; }
    if (moved) { updateCamera(); }

    // ANIMASI: Buat ulang tubuh setiap frame
    bodyData = createSmoothBody(
        bodySegmentsCount,
        segmentLength,
        startRadius,
        maxRadius,
        endRadius,
        now
    );
    if (!bodyData) { console.error("Gagal membuat bodyData"); requestAnimationFrame(tick); return; }
    bodyBuffers = initBuffers(gl, programInfo, bodyData);
    if (!bodyBuffers) { console.error("Gagal init bodyBuffers"); requestAnimationFrame(tick); return; }
    finalBodyMatrix = bodyData.finalSpineMatrix;
    if(!finalBodyMatrix){ finalBodyMatrix = new Matrix4(); }

    var globalModelMatrix = new Matrix4();
    var groundY = -3.5;

    // ===============================================
    // ** PERBAIKAN: Naikkan Dragonair di atas tanah **
    // ===============================================
    var modelY = groundY - bodyData.minY + 0.01; // Naikkan 2 unit di atas tanah

    globalModelMatrix.translate(0, modelY, -5);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Gambar Daratan (tetap di posisi asli)
    var groundModelMatrix = new Matrix4();
    groundModelMatrix.translate(0, groundY, -5);
    drawPart(gl, programInfo, groundPlaneBuffers, groundModelMatrix, viewMatrix, projMatrix, mvpMatrix);

    // --- Gambar Kepala ---
    let headBaseY = startRadius; // Kepala di atas tubuh
    let headBaseZ = 0;

    modelMatrix.set(globalModelMatrix)
               .translate(0, headBaseY, headBaseZ)
               .scale(1.0, 1.0, 1.3);
    drawPart(gl, programInfo, headBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

    modelMatrix.set(globalModelMatrix)
               .translate(0, headBaseY - 0.2, headBaseZ + 1.0)
               .scale(1.0, 0.8, 1.0);
    drawPart(gl, programInfo, snoutBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

    modelMatrix.set(globalModelMatrix)
               .translate(0, headBaseY + 0.8, headBaseZ + 0.2)
               .rotate(-10, 1, 0, 0);
    drawPart(gl, programInfo, hornBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

    modelMatrix.set(globalModelMatrix)
               .translate(-0.8, headBaseY + 0.3, headBaseZ + 0.1)
               .scale(0.8, 0.8, 0.8);
    drawPart(gl, programInfo, earBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

    modelMatrix.set(globalModelMatrix)
               .translate(0.8, headBaseY + 0.3, headBaseZ + 0.1)
               .scale(0.8, 0.8, 0.8);
    drawPart(gl, programInfo, earBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

    modelMatrix.set(globalModelMatrix)
               .translate(-0.4, headBaseY + 0.1, headBaseZ + 1.1)
               .scale(0.9, 0.9, 0.9);
    drawPart(gl, programInfo, eyeBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

    modelMatrix.set(globalModelMatrix)
               .translate(0.4, headBaseY + 0.1, headBaseZ + 1.1)
               .scale(0.9, 0.9, 0.9);
    drawPart(gl, programInfo, eyeBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

    // --- Gambar Tubuh ---
    modelMatrix.set(globalModelMatrix);
    drawPart(gl, programInfo, bodyBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

    // --- Gambar Bola Ekor ---
    let tailBaseMatrix = new Matrix4(globalModelMatrix).multiply(finalBodyMatrix);
    
    // Bola ekor 1
    let tailMatrix1 = new Matrix4(tailBaseMatrix);
    tailMatrix1.translate(0, 0, -0.3);
    drawPart(gl, programInfo, tailBallBuffers[0], tailMatrix1, viewMatrix, projMatrix, mvpMatrix);

    // Bola ekor 2
    let tailMatrix2 = new Matrix4(tailMatrix1);
    tailMatrix2.translate(0, 0, -0.4);
    drawPart(gl, programInfo, tailBallBuffers[1], tailMatrix2, viewMatrix, projMatrix, mvpMatrix);

    // Bola ekor 3
    let tailMatrix3 = new Matrix4(tailMatrix2);
    tailMatrix3.translate(0, 0, -0.3);
    drawPart(gl, programInfo, tailBallBuffers[2], tailMatrix3, viewMatrix, projMatrix, mvpMatrix);

    requestAnimationFrame(tick);
};
tick()
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

