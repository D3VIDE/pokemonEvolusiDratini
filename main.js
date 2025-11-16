// =================================================================
// main.js (FIXED: Random Walk State + Free Camera Control)
// =================================================================

// Variabel Warna Global (TETAP SAMA)
var groundGreen = [0.4, 0.8, 0.4, 1.0];
var earWhite = [0.9, 0.9, 1.0, 1.0];
var crystalBlue = [0.23, 0.3, 0.79, 1.0];
var SKY_COLOR = [0.53, 0.81, 0.92, 1.0]; 
var GROUND_Y = -3.5; 

// =================================================================
// Definisi Scene Graph (TETAP SAMA)
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

// =================================================================
// FUNGSI UTAMA (MAIN)
// =================================================================

function main() {
    var canvas = document.getElementById("webgl");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    var gl = canvas.getContext("webgl");
    if (!gl) {
        console.log("Gagal mendapatkan konteks WebGL");
        return;
    }

    var vsSource = document.getElementById("shader-vs").innerText;
    var fsSource = document.getElementById("shader-fs").innerText;
    var shaderProgram = initShaders(gl, vsSource, fsSource);
    if (!shaderProgram) {
        console.log("Gagal inisialisasi shader.");
        return;
    }

    var programInfo = {
        program: shaderProgram,
        a_Position: gl.getAttribLocation(shaderProgram, "a_Position"),
        a_Color: gl.getAttribLocation(shaderProgram, "a_Color"),
        u_MvpMatrix: gl.getUniformLocation(shaderProgram, "u_MvpMatrix"),
    };

    var worldBounds = 400;
    
    var myDragonair = new Dragonair(gl, programInfo);
    myDragonair.init();
    myDragonair.position = [10, 0, 0];
    
    // [PERBAIKAN 1] State awal diubah ke DYNAMIC_IDLE (untuk jalan acak)
    // Asumsi Anda menggunakan dragonAir.js dari respons saya sebelumnya
    myDragonair.animationState = "DYNAMIC_IDLE"; // (Semula: DYNAMIC_STATIC)
    
    var myDratini = new DratiniModel(gl, programInfo);
    myDratini.init();
    myDratini.position = [-20, 0, -10];
    
    var myDragonite = new Dragonite(gl, programInfo);
    myDragonite.init();
    myDragonite.position = [0, 10, -30];
    
    var myWorld = new WorldEnvironment(gl, programInfo);
    myWorld.init(); 

    window.myWorld = myWorld; 
    window.myDragonair = myDragonair; 

    var oriPointGeo = createSphere(0.1, 8, 8, [1.0, 0.0, 0.0, 1.0]);
    var oriPointBuffers = initBuffers(gl, programInfo, oriPointGeo);

    var projMatrix = new Matrix4();
    var viewMatrix = new Matrix4();
    var mvpMatrix = new Matrix4();
    projMatrix.setPerspective(45, canvas.width / canvas.height, 1, 1000);

    let cameraAngleX = 20.0;
    let cameraAngleY = 0.0;
    let cameraDistance = 45.0; 
    let cameraTarget = [0.0, 5.0, 0.0];
    let cameraPosition = [0.0, 0.0, 0.0];
    
    var currentScenario = "STATIC_IDLE"; 
    var isTransitioningCamera = false;
    
    const DragonairFocusY = 3.0;
    const DragonairFocusDistance = 15.0; 
    const DragonairFocusAngleX = 10.0;
    
    const inputElement = document.getElementById("input-text");
    const statusElement = document.getElementById("status");
    inputElement.focus();
    
    inputElement.addEventListener('change', function() {
        let value = this.value.trim();
        if (value === "2") {
            currentScenario = "DRAGONAIR_ANIMATION";
            isTransitioningCamera = true;
            statusElement.innerHTML = "STATUS: SCENARIO AKTIF (DRAGONAIR)";
            document.getElementById("input-overlay").style.display = 'none'; 
        } else {
            statusElement.innerHTML = "STATUS: INPUT SALAH. Coba lagi (2).";
            this.value = '';
        }
    });

    let isDragging = false;
    let lastMouseX = -1, lastMouseY = -1;
    const mouseSensitivity = 0.3;
    const moveSpeed = 0.5; 
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
    
    // [PERBAIKAN 2] Menghapus 'if (currentScenario === "STATIC_IDLE")'
    canvas.onmousedown = function (ev) {
        let x = ev.clientX, y = ev.clientY;
        let rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            lastMouseX = x; lastMouseY = y; isDragging = true;
        }
    };
    
    canvas.onmouseup = function (ev) { isDragging = false; };
    canvas.onmouseleave = function (ev) { isDragging = false; };
    
    // [PERBAIKAN 2] Menghapus '|| currentScenario !== "STATIC_IDLE"'
    canvas.onmousemove = function (ev) {
        if (!isDragging) return; // <-- Hanya cek ini
        let x = ev.clientX, y = ev.clientY;
        let deltaX = x - lastMouseX;
        let deltaY = y - lastMouseY;
        cameraAngleY += deltaX * mouseSensitivity;
        cameraAngleX -= deltaY * mouseSensitivity;
        cameraAngleX = Math.max(-89.0, Math.min(89.0, cameraAngleX));
        lastMouseX = x; lastMouseY = y;
        updateCamera();
    };

    // [PERBAIKAN 2] Menghapus 'if (currentScenario !== "STATIC_IDLE")'
    canvas.onwheel = function (ev) {
        ev.preventDefault();
        let zoomSensitivity = 0.05;
        cameraDistance += ev.deltaY * zoomSensitivity;
        cameraDistance = Math.max(5.0, Math.min(200.0, cameraDistance));
        updateCamera();
    };

    document.onkeydown = function (ev) { keysPressed[ev.key.toLowerCase()] = true; };
    document.onkeyup = function (ev) { keysPressed[ev.key.toLowerCase()] = false; };

    window.onresize = function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        projMatrix.setPerspective(45, canvas.width / canvas.height, 1, 1000);
    };

    gl.clearColor(SKY_COLOR[0], SKY_COLOR[1], SKY_COLOR[2], SKY_COLOR[3]);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(shaderProgram);

    var g_lastTickTime = Date.now();
    var groundY = GROUND_Y_LEVEL;

    var tick = function () {
        let now = Date.now();
        let elapsed = now - g_lastTickTime;
        g_lastTickTime = now;
        let dt = elapsed / 1000.0;
        
        // [PERBAIKAN 2] Logika WASD dipindah ke luar FSM agar selalu aktif
        let radY = (cameraAngleY * Math.PI) / 180.0;
        let backVector = [Math.sin(radY), 0, Math.cos(radY)];
        let rightVector = [Math.cos(radY), 0, -Math.sin(radY)];
        let moved = false;
        let actualMoveSpeed = moveSpeed * elapsed / 16.667; 
        
        if (keysPressed["w"]) { cameraTarget[0] -= backVector[0] * actualMoveSpeed; cameraTarget[2] -= backVector[2] * actualMoveSpeed; moved = true; }
        if (keysPressed["s"]) { cameraTarget[0] += backVector[0] * actualMoveSpeed; cameraTarget[2] += backVector[2] * actualMoveSpeed; moved = true; }
        if (keysPressed["a"]) { cameraTarget[0] -= rightVector[0] * actualMoveSpeed; cameraTarget[2] -= rightVector[2] * actualMoveSpeed; moved = true; }
        if (keysPressed["d"]) { cameraTarget[0] += rightVector[0] * actualMoveSpeed; cameraTarget[2] += rightVector[2] * actualMoveSpeed; moved = true; }
        if (keysPressed[" "]) { cameraTarget[1] += actualMoveSpeed; moved = true; }
        if (keysPressed["shift"]) { cameraTarget[1] -= actualMoveSpeed; moved = true; }
        
        if (moved) updateCamera(); // Update jika WASD/shift/space ditekan
        
        
        // --- LOGIKA FSM GLOBAL ---
        
        if (currentScenario === "STATIC_IDLE") {
            // [PERBAIKAN 2] Logika 'else' (auto-rotate) dihapus.
            // Kamera sekarang sepenuhnya dikontrol oleh user (WASD di atas, mouse di listener)
            // Dragonair akan tetap jalan acak karena state-nya DYNAMIC_IDLE.
            
        } else if (currentScenario === "DRAGONAIR_ANIMATION") {
            
            const targetPos = myDragonair.position;
            const targetY = targetPos[1] + DragonairFocusY;
            
            // Transisi kamera (hanya berjalan sekali saat 'isTransitioningCamera' true)
            if (isTransitioningCamera) {
                let lerpFactor = dt * 3.0;
                cameraTarget[0] += (targetPos[0] - cameraTarget[0]) * lerpFactor;
                cameraTarget[1] += (targetY - cameraTarget[1]) * lerpFactor;
                cameraTarget[2] += (targetPos[2] - cameraTarget[2]) * lerpFactor;
                
                cameraAngleX += (DragonairFocusAngleX - cameraAngleX) * lerpFactor;
                cameraDistance += (DragonairFocusDistance - cameraDistance) * lerpFactor;
                
                if (Math.abs(cameraTarget[0] - targetPos[0]) < 0.1 && Math.abs(cameraDistance - DragonairFocusDistance) < 0.5) {
                    isTransitioningCamera = false;
                    
                    // --- LOGIKA START ANIMASI (Memilih pohon acak) ---
                    let randomTreeIdx = Math.floor(Math.random() * myWorld.allTrees.length);
                    let randomTree = myWorld.allTrees[randomTreeIdx];
                    
                    const baseTreeX = randomTree.position[0];
                    const baseTreeZ = randomTree.position[2];
                    let targetX, targetZ;
                    let tries = 0;
                    
                    do {
                        targetX = baseTreeX + (Math.random() * 10 - 5); 
                        targetZ = baseTreeZ + (Math.random() * 10 - 5);
                        tries++;
                    } while (window.isPositionBlocked && window.isPositionBlocked(targetX, targetZ) && tries < 10); 
                    
                    myDragonair.targetFruitPosition = [targetX, targetZ];
                    myWorld.dropFruit(targetX, targetZ, randomTree); 
                    
                    myDragonair.animationState = "START_WALK"; // Memulai FSM makan buah
                }
                updateCamera(); // Update kamera selama transisi
            
            // [PERBAIKAN 2] Blok 'else' (auto-follow/auto-rotate) DIHAPUS.
            // } else { ... }
                
            } // Akhir dari if (isTransitioningCamera)

            // Cek jika Dragonair sudah selesai makan dan siap untuk putaran baru
            if (myDragonair.animationState === "IDLE_STATIC" && !isTransitioningCamera) {
                if (myDragonair.stateTimer > 3.0) {
                    
                    // Lakukan putaran baru
                    let randomTreeIdx = Math.floor(Math.random() * myWorld.allTrees.length);
                    let randomTree = myWorld.allTrees[randomTreeIdx];
                    
                    const baseTreeX = randomTree.position[0];
                    const baseTreeZ = randomTree.position[2];
                    let targetX, targetZ;
                    let tries = 0;
                    
                    do {
                        targetX = baseTreeX + (Math.random() * 10 - 5);
                        targetZ = baseTreeZ + (Math.random() * 10 - 5);
                        tries++;
                    } while (window.isPositionBlocked && window.isPositionBlocked(targetX, targetZ) && tries < 10);

                    myWorld.dropFruit(targetX, targetZ, randomTree);
                    myDragonair.targetFruitPosition = [targetX, targetZ];
                    myDragonair.animationState = "START_WALK";
                }
            }
        }


        // ===============================================
        // ** OOP: Update World dan Model **
        // ===============================================
        myWorld.update(now, elapsed); 
        
        myDragonair.update(now, groundY, elapsed);
        
        myDratini.update(elapsed, worldBounds);
        myDragonite.update(now, groundY, elapsed);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        drawSceneGraph(gl, programInfo, myWorld.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, null);

        drawSceneGraph(gl, programInfo, myDragonair.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
        drawSceneGraph(gl, programInfo, myDratini.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
        drawSceneGraph(gl, programInfo, myDragonite.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
        
        requestAnimationFrame(tick);
    };

    tick();
}

// =================================================================
// FUNGSI HELPER (SHADER & BUFFER)
// =================================================================

function drawPart(gl, program, buffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix) {
    if (!buffers || !buffers.vbo || !buffers.cbo || !buffers.ibo) {
        return;
    }
    
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
        return null;
    }
    
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

function normalizeVector(v) {
    let len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (len > 0.00001) {
        return [v[0] / len, v[1] / len, v[2] / len];
    } else {
        return [0, 0, 0];
    }
}