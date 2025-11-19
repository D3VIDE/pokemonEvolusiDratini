// =================================================================
// main.js (UPDATED: POV 'Q' Higher & Further)
// =================================================================

var groundGreen = [0.4, 0.8, 0.4, 1.0];
var earWhite = [0.9, 0.9, 1.0, 1.0];
var crystalBlue = [0.23, 0.3, 0.79, 1.0];
var SKY_COLOR = [0.53, 0.81, 0.92, 1.0];
var GROUND_Y = -3.5; 

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
    // Set ukuran awal full window
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
    if (!shaderProgram) return;
    
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
    myDragonair.animationState = "DYNAMIC_IDLE"; 
    
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

    myDragonair.setObstacles(myWorld.obstacles);

    var oriPointGeo = createSphere(0.1, 8, 8, [1.0, 0.0, 0.0, 1.0]);
    var oriPointBuffers = initBuffers(gl, programInfo, oriPointGeo);

    var projMatrix = new Matrix4();
    var viewMatrix = new Matrix4();
    var mvpMatrix = new Matrix4();
    
    // Init Proyeksi Awal
    projMatrix.setPerspective(45, canvas.width / canvas.height, 1, 1000);

    // --- KAMERA ---
    let cameraAngleX = 20.0;
    let cameraAngleY = 0.0;
    let cameraDistance = 45.0; 
    let cameraTarget = [0.0, 5.0, 0.0];
    let cameraPosition = [0.0, 0.0, 0.0];
    
    let isEatingCamActive = false;
    let isFruitCamActive = false; 
    let isDragonairPovActive = false; // Flag untuk POV Dragonair

    var currentScenario = "STATIC_IDLE"; 
    var isTransitioningCamera = false;
    
    const DragonairFocusY = 3.0;
    const DragonairFocusDistance = 15.0; 
    const DragonairFocusAngleX = 10.0;
    
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
    
    // --- EVENT LISTENERS ---
    canvas.onmousedown = function (ev) {
        let x = ev.clientX, y = ev.clientY;
        let rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            lastMouseX = x; lastMouseY = y; isDragging = true;
        }
    };
    canvas.onmouseup = function (ev) { isDragging = false; };
    canvas.onmouseleave = function (ev) { isDragging = false; };
    canvas.onmousemove = function (ev) {
        if (isEatingCamActive || isFruitCamActive || isDragonairPovActive) return; 
        if (!isDragging) return;
        let x = ev.clientX, y = ev.clientY;
        let deltaX = x - lastMouseX;
        let deltaY = y - lastMouseY;
        cameraAngleY += deltaX * mouseSensitivity;
        cameraAngleX -= deltaY * mouseSensitivity;
        cameraAngleX = Math.max(-89.0, Math.min(89.0, cameraAngleX));
        lastMouseX = x; lastMouseY = y;
        updateCamera();
    };
    canvas.onwheel = function (ev) {
        if (isEatingCamActive || isFruitCamActive || isDragonairPovActive) return;
        ev.preventDefault();
        let zoomSensitivity = 0.05;
        cameraDistance += ev.deltaY * zoomSensitivity;
        cameraDistance = Math.max(5.0, Math.min(200.0, cameraDistance));
        updateCamera();
    };

    document.onkeydown = function (ev) { 
        let key = ev.key.toLowerCase();
        keysPressed[key] = true; 
        
        if (key === '2') {
            // Aktifkan animasi tanpa mengunci kamera
            if (currentScenario !== "DRAGONAIR_ANIMATION") {
                currentScenario = "DRAGONAIR_ANIMATION";
                isTransitioningCamera = false; 
                isEatingCamActive = false;
                myDragonair.stateTimer = 10.0; // Trigger langsung
            }
        }
        if (key === 'q') {
            // Toggle POV Dragonair
            isDragonairPovActive = !isDragonairPovActive;
            if(isDragonairPovActive) {
                isEatingCamActive = false;
                isFruitCamActive = false;
                isTransitioningCamera = false;
            }
        }
        if (key === 'e') {
            isFruitCamActive = !isFruitCamActive;
            if(isFruitCamActive) isDragonairPovActive = false;
        }
    };
    document.onkeyup = function (ev) { keysPressed[ev.key.toLowerCase()] = false; };

    window.onresize = function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
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
        
        gl.viewport(0, 0, canvas.width, canvas.height);

        // =================================================================
        // LOGIKA KAMERA
        // =================================================================
        
        // 1. Prioritas: POV DRAGONAIR (Tombol Q)
        if (isDragonairPovActive) {
            let dPos = myDragonair.position;
            let radAngle = myDragonair.currentAngleY * Math.PI / 180.0;
            
            // --- [UPDATED] SETTING KAMERA POV ---
            // Jarak diperjauh (25.0) dan dipertinggi (14.0)
            let camDist = 10.0; 
            let camHeight = 10.0;
            
            // Posisi Kamera (Di belakang badan)
            cameraPosition[0] = dPos[0] - Math.sin(radAngle) * camDist;
            cameraPosition[1] = dPos[1] + camHeight;
            cameraPosition[2] = dPos[2] - Math.cos(radAngle) * camDist;

            // Target Kamera (Melihat ke depan Dragonair, agak jauh)
            let lookDist = 10.0;
            cameraTarget[0] = dPos[0] + Math.sin(radAngle) * lookDist;
            cameraTarget[1] = dPos[1] + 2.0; // Fokus tetap di sekitar tinggi kepala
            cameraTarget[2] = dPos[2] + Math.cos(radAngle) * lookDist;

            viewMatrix.setLookAt(cameraPosition[0], cameraPosition[1], cameraPosition[2], cameraTarget[0], cameraTarget[1], cameraTarget[2], 0, 1, 0);
        }
        // 2. Kamera Buah (Tombol E)
        else if (isFruitCamActive && window.myWorld && window.myWorld.fruitState.active) {
            let fPos = window.myWorld.fruitState.pos;
            let lerpSpeed = 5.0 * dt; 
            cameraTarget[0] += (fPos[0] - cameraTarget[0]) * lerpSpeed;
            cameraTarget[1] += (fPos[1] - cameraTarget[1]) * lerpSpeed;
            cameraTarget[2] += (fPos[2] - cameraTarget[2]) * lerpSpeed;

            let camOffsetX = 8.0; let camOffsetY = 5.0; let camOffsetZ = 8.0;
            let targetPosX = fPos[0] + camOffsetX;
            let targetPosY = fPos[1] + camOffsetY;
            let targetPosZ = fPos[2] + camOffsetZ;

            cameraPosition[0] += (targetPosX - cameraPosition[0]) * lerpSpeed;
            cameraPosition[1] += (targetPosY - cameraPosition[1]) * lerpSpeed;
            cameraPosition[2] += (targetPosZ - cameraPosition[2]) * lerpSpeed;

            viewMatrix.setLookAt(cameraPosition[0], cameraPosition[1], cameraPosition[2], cameraTarget[0], cameraTarget[1], cameraTarget[2], 0, 1, 0);
        } 
        // 3. FREE CAM (WASD)
        else {
            if (isEatingCamActive || (isFruitCamActive && !window.myWorld.fruitState.active)) {
                let dx = cameraPosition[0] - cameraTarget[0]; let dy = cameraPosition[1] - cameraTarget[1]; let dz = cameraPosition[2] - cameraTarget[2];
                cameraDistance = Math.sqrt(dx * dx + dy * dy + dz * dz); cameraAngleX = Math.asin(dy / cameraDistance) * (180 / Math.PI);
                if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) { cameraAngleY = Math.atan2(dx, dz) * (180 / Math.PI); }
                isEatingCamActive = false;
                if (!window.myWorld.fruitState.active) isFruitCamActive = false; 
            }
            let radY = (cameraAngleY * Math.PI) / 180.0; let backVector = [Math.sin(radY), 0, Math.cos(radY)]; let rightVector = [Math.cos(radY), 0, -Math.sin(radY)]; let moved = false; let actualMoveSpeed = moveSpeed * elapsed / 16.667; 
            if (keysPressed["w"]) { cameraTarget[0] -= backVector[0] * actualMoveSpeed; cameraTarget[2] -= backVector[2] * actualMoveSpeed; moved = true; }
            if (keysPressed["s"]) { cameraTarget[0] += backVector[0] * actualMoveSpeed; cameraTarget[2] += backVector[2] * actualMoveSpeed; moved = true; }
            if (keysPressed["a"]) { cameraTarget[0] -= rightVector[0] * actualMoveSpeed; cameraTarget[2] -= rightVector[2] * actualMoveSpeed; moved = true; }
            if (keysPressed["d"]) { cameraTarget[0] += rightVector[0] * actualMoveSpeed; cameraTarget[2] += rightVector[2] * actualMoveSpeed; moved = true; }
            if (keysPressed[" "]) { cameraTarget[1] += actualMoveSpeed; moved = true; }
            if (keysPressed["shift"]) { cameraTarget[1] -= actualMoveSpeed; moved = true; }
            if (moved || (!isEatingCamActive && !isFruitCamActive && !isDragonairPovActive)) { updateCamera(); }
        }
        
        // =================================================================
        // LOGIKA GAMEPLAY
        // =================================================================
        if (currentScenario === "DRAGONAIR_ANIMATION") {
            if (window.myWorld && window.myWorld.nodes.fallingFruit.enabled) {
                let fruitPos = window.myWorld.fruitState.pos;
                myDragonair.targetFruitPosition = [fruitPos[0], fruitPos[2]];
            }
            
            if (myDragonair.animationState === "DYNAMIC_IDLE") {
                if (myDragonair.stateTimer > 3.0) { 
                    let targetTree = myWorld.allTrees.find(t => Math.abs(t.position[0] - 60) < 1.0 && Math.abs(t.position[2] - 50) < 1.0);
                    if (!targetTree) targetTree = myWorld.allTrees[1]; 
                    myWorld.dropFruit(0, 0, targetTree); 
                    myDragonair.animationState = "START_WALK"; 
                    myDragonair.stateTimer = 0; 
                }
            }
        }

        myWorld.update(now, elapsed); myDragonair.update(now, groundY, elapsed); myDratini.update(elapsed, worldBounds); myDragonite.update(now, groundY, elapsed);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        drawSceneGraph(gl, programInfo, myWorld.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, null);
        drawSceneGraph(gl, programInfo, myDragonair.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
        drawSceneGraph(gl, programInfo, myDratini.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
        drawSceneGraph(gl, programInfo, myDragonite.getRootNode(), new Matrix4(), viewMatrix, projMatrix, mvpMatrix, oriPointBuffers);
        
        requestAnimationFrame(tick);
    };

    tick();
}

// ... (Fungsi Helper drawPart, initShaders, dll TETAP SAMA) ...
function drawPart(gl, program, buffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix) { if (!buffers || !buffers.vbo || !buffers.cbo || !buffers.ibo) return; gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vbo); gl.vertexAttribPointer(program.a_Position, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(program.a_Position); gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cbo); gl.vertexAttribPointer(program.a_Color, 4, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(program.a_Color); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.ibo); mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix); gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements); gl.drawElements(gl.TRIANGLES, buffers.n, gl.UNSIGNED_SHORT, 0); }
function initShaders(gl, vs_source, fs_source) { var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vs_source); var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fs_source); if (!vertexShader || !fragmentShader) return null; var program = gl.createProgram(); if (!program) return null; gl.attachShader(program, vertexShader); gl.attachShader(program, fragmentShader); gl.linkProgram(program); var linked = gl.getProgramParameter(program, gl.LINK_STATUS); if (!linked) { console.error("Gagal link program: " + gl.getProgramInfoLog(program)); gl.deleteProgram(program); gl.deleteShader(fragmentShader); gl.deleteShader(vertexShader); return null; } return program; }
function loadShader(gl, type, source) { var shader = gl.createShader(type); if (shader == null) { console.error("Gagal membuat shader"); return null; } gl.shaderSource(shader, source); gl.compileShader(shader); var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS); if (!compiled) { console.error("Gagal compile shader (" + (type === gl.VERTEX_SHADER ? "Vertex" : "Fragment") + "): " + gl.getShaderInfoLog(shader)); gl.deleteShader(shader); return null; } return shader; }
function initBuffers(gl, program, geo) { if (!geo || !geo.vertices || !geo.colors || !geo.indices) return null; var vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, geo.vertices, gl.STATIC_DRAW); var cbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cbo); gl.bufferData(gl.ARRAY_BUFFER, geo.colors, gl.STATIC_DRAW); var ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER, null); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null); return { vbo: vbo, cbo: cbo, ibo: ibo, n: geo.indices.length }; }
function normalizeVector(v) { let len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); if (len > 0.00001) { return [v[0] / len, v[1] / len, v[2] / len]; } else { return [0, 0, 0]; } }