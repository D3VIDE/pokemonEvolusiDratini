// =================================================================
// LOGIKA UTAMA WEBGL & PEMBUATAN GEOMETRI DRAGONAIR
// =================================================================

// Warna global
var blue = [0.4, 0.6, 1.0, 1.0];
var white = [1.0, 1.0, 1.0, 1.0];
var darkPurple = [0.2, 0.0, 0.2, 1.0];
var groundGreen = [0.4, 0.8, 0.4, 1.0];

function main() {
    // 1. Setup kanvas dan konteks WebGL
    var canvas = document.getElementById('webgl');
    var gl = canvas.getContext('webgl');
    if (!gl) {
        console.log('Gagal mendapatkan konteks WebGL');
        return;
    }

    // 2. Setup shader
    var vsSource = document.getElementById('shader-vs').innerText;
    var fsSource = document.getElementById('shader-fs').innerText;
    var shaderProgram = initShaders(gl, vsSource, fsSource);
    if (!shaderProgram) {
        console.log('Gagal inisialisasi shader.');
        return;
    }
    
    // Simpan lokasi atribut dan uniform
    var programInfo = {
        program: shaderProgram,
        a_Position: gl.getAttribLocation(shaderProgram, 'a_Position'),
        a_Color: gl.getAttribLocation(shaderProgram, 'a_Color'),
        u_MvpMatrix: gl.getUniformLocation(shaderProgram, 'u_MvpMatrix'),
    };

    // 3. Buat geometri untuk setiap bagian
    // Geometri Kepala
    var headGeo = createSphere(1.0, 30, 30, blue);
    var snoutGeo = createSphere(0.6, 20, 20, blue);
    var hornGeo = createCone(0.3, 1.0, 10, white);
    var earGeo = createSphere(0.35, 10, 10, white);
    var eyeGeo = createSphere(0.15, 10, 10, darkPurple);

    // Buffer Kepala
    var headBuffers = initBuffers(gl, programInfo, headGeo);
    var snoutBuffers = initBuffers(gl, programInfo, snoutGeo);
    var hornBuffers = initBuffers(gl, programInfo, hornGeo);
    var earBuffers = initBuffers(gl, programInfo, earGeo);
    var eyeBuffers = initBuffers(gl, programInfo, eyeGeo);
    
    // Geometri Tubuh Mulus
    var bodySegmentsCount = 20;
    var segmentLength = 0.5;
    var startRadius = 0.6;
    var maxRadius = 0.8; 
    var endRadius = 0.1; 

    var bodyData = createSmoothBody(
        bodySegmentsCount, 
        segmentLength, 
        startRadius, 
        maxRadius, 
        endRadius 
    );
    
    var bodyBuffers = initBuffers(gl, programInfo, bodyData);
    var finalBodyPos = bodyData.finalSpinePos; 

    // Geometri Bola Ekor
    var tailBall1Geo = createSphere(0.2, 10, 10, blue);
    var tailBall2Geo = createSphere(0.15, 10, 10, blue);
    var tailBall3Geo = createSphere(0.1, 10, 10, blue); 
    var tailBallBuffers = [
        initBuffers(gl, programInfo, tailBall1Geo),
        initBuffers(gl, programInfo, tailBall2Geo),
        initBuffers(gl, programInfo, tailBall3Geo)
    ];

    // Geometri Daratan
    var groundPlaneGeo = createPlane(50, 50, groundGreen);
    var groundPlaneBuffers = initBuffers(gl, programInfo, groundPlaneGeo);

    // 4. Setup matriks untuk kamera
    var projMatrix = new Matrix4();
    var viewMatrix = new Matrix4();
    var modelMatrix = new Matrix4();
    var mvpMatrix = new Matrix4();
    
    projMatrix.setPerspective(45, canvas.width / canvas.height, 1, 100);
    viewMatrix.setLookAt(0, 7, 25, 0, 0, 0, 0, 1, 0);  
                         
    // 5. Pengaturan render
    gl.clearColor(0.8, 0.8, 0.8, 1.0); 
    gl.enable(gl.DEPTH_TEST); 
    gl.useProgram(shaderProgram);

    // 6. Mulai loop animasi
    var currentAngle = 0.0;
    var tick = function() {
        currentAngle = animate(currentAngle); 
        
        var globalModelMatrix = new Matrix4();
        globalModelMatrix.translate(0, 1, -5) 
                         .rotate(currentAngle, 0, 1, 0); 

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Gambar Daratan
        var groundModelMatrix = new Matrix4();
        groundModelMatrix.translate(0, -3.5, -5) 
                       .rotate(currentAngle, 0, 1, 0); 
        drawPart(gl, programInfo, groundPlaneBuffers, groundModelMatrix, viewMatrix, projMatrix, mvpMatrix);


        // --- Gambar Kepala ---
        modelMatrix.set(globalModelMatrix)
                   .translate(0, 2.0, 0) 
                   .scale(1.0, 1.0, 1.3); 
        drawPart(gl, programInfo, headBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

        modelMatrix.set(globalModelMatrix)
                   .translate(0, 1.8, 1.0)
                   .scale(1.0, 0.8, 1.0);
        drawPart(gl, programInfo, snoutBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

        modelMatrix.set(globalModelMatrix)
                   .translate(0, 3.0, 0.2)
                   .rotate(-10, 1, 0, 0);
        drawPart(gl, programInfo, hornBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

        modelMatrix.set(globalModelMatrix)
                   .translate(-1.0, 2.3, 0.1);
        drawPart(gl, programInfo, earBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);
        
        modelMatrix.set(globalModelMatrix)
                   .translate(1.0, 2.3, 0.1);
        drawPart(gl, programInfo, earBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

        modelMatrix.set(globalModelMatrix)
                   .translate(-0.5, 2.1, 1.1);
        drawPart(gl, programInfo, eyeBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

        modelMatrix.set(globalModelMatrix)
                   .translate(0.5, 2.1, 1.1);
        drawPart(gl, programInfo, eyeBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

        // --- Gambar Tubuh ---
        modelMatrix.set(globalModelMatrix); 
        drawPart(gl, programInfo, bodyBuffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix);

        // --- Gambar Bola Ekor ---
        let tailMatrix1 = new Matrix4(globalModelMatrix);
        tailMatrix1.translate(finalBodyPos[0], finalBodyPos[1] - 0.2, finalBodyPos[2]);
        drawPart(gl, programInfo, tailBallBuffers[0], tailMatrix1, viewMatrix, projMatrix, mvpMatrix);

        let tailMatrix2 = new Matrix4(globalModelMatrix);
        tailMatrix2.translate(finalBodyPos[0], finalBodyPos[1] - 0.2 - 0.2 - 0.15, finalBodyPos[2]);
        drawPart(gl, programInfo, tailBallBuffers[1], tailMatrix2, viewMatrix, projMatrix, mvpMatrix);
        
        let tailMatrix3 = new Matrix4(globalModelMatrix);
        tailMatrix3.translate(finalBodyPos[0], finalBodyPos[1] - 0.2 - 0.2 - 0.15 - 0.15 - 0.1, finalBodyPos[2]);
        drawPart(gl, programInfo, tailBallBuffers[2], tailMatrix3, viewMatrix, projMatrix, mvpMatrix);

        requestAnimationFrame(tick); 
    };

    tick();
}

function drawPart(gl, program, buffers, modelMatrix, viewMatrix, projMatrix, mvpMatrix) {
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
        console.error('Gagal link program: ' + gl.getProgramInfoLog(program));
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
        console.error('Gagal membuat shader');
        return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
        console.error('Gagal compile shader: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initBuffers(gl, program, geo) {
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

var g_last = Date.now();
function animate(angle) {
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;
    var newAngle = angle + (30 * elapsed) / 1000.0; 
    return newAngle %= 360;
}

function createPlane(width, depth, color) {
    var halfWidth = width / 2;
    var halfDepth = depth / 2;
    var vertices = new Float32Array([-halfWidth, 0.0, -halfDepth, halfWidth, 0.0, -halfDepth, halfWidth, 0.0, halfDepth, -halfWidth, 0.0, halfDepth]);
    var colors = new Float32Array([color[0], color[1], color[2], color[3], color[0], color[1], color[2], color[3], color[0], color[1], color[2], color[3], color[0], color[1], color[2], color[3]]);
    var indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    return { vertices: vertices, colors: colors, indices: indices };
}

function createSmoothBody(segments, segmentLength, startRadius, maxRadius, endRadius) {
    var vertices = [];
    var colors = [];
    var indices = [];
    var ringSegments = 16; 
    var spineMatrices = []; 
    var currentSpineMatrix = new Matrix4();
    currentSpineMatrix.translate(0, 1.15, 0); 
    currentSpineMatrix.rotate(-15, 1, 0, 0);
    spineMatrices.push(new Matrix4(currentSpineMatrix)); 
    let totalBendAngle = 110; 
    let totalCurveAngle = 60; 

    for (let i = 0; i < segments; i++) {
        let p = i / (segments - 1);
        let angleX_deg = 0;
        let angleY_deg = 0;

        if (p < 0.2) {
            // Lurus
        } else if (p < 0.5) {
            let p_bend = (p - 0.2) / 0.3;
            angleX_deg = (totalBendAngle / segments) * 2.5 * p_bend;
            angleY_deg = (totalCurveAngle / segments) * p_bend;
        } else if (p < 0.8) {
            let p_body = (p - 0.5) / 0.3;
            angleX_deg = (totalBendAngle / segments) * (1.0 - p_body);
            angleY_deg = totalCurveAngle / segments;
        // ===============================================
        // ** INI LOGIKA YANG BENAR UNTUK MENURUNKAN EKOR **
        // ===============================================
        } else {
            let p_tail = (p - 0.8) / 0.2;
            angleX_deg = (totalBendAngle / segments) * 0.8 * p_tail; // POSITIF = Turun
            angleY_deg = 0; 
        }
        // ===============================================
        
        currentSpineMatrix.rotate(angleX_deg, 1, 0, 0); 
        currentSpineMatrix.rotate(angleY_deg, 0, 1, 0); 
        currentSpineMatrix.translate(0, -segmentLength, 0); 
        spineMatrices.push(new Matrix4(currentSpineMatrix));
    }
    
    var vertexIndex = 0;
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
            let y = 0;
            let z = currentRadius * Math.sin(angle);
            var new_x = e[0] * x + e[4] * y + e[8] * z + e[12];
            var new_y = e[1] * x + e[5] * y + e[9] * z + e[13];
            var new_z = e[2] * x + e[6] * y + e[10] * z + e[14];
            vertices.push(new_x, new_y, new_z);
            let z_local_normalized = Math.sin(angle);
            let mixFactor = Math.max(0.0, z_local_normalized);
            let r = blue[0] * (1.0 - mixFactor) + white[0] * mixFactor;
            let g = blue[1] * (1.0 - mixFactor) + white[1] * mixFactor;
            let b = blue[2] * (1.0 - mixFactor) + white[2] * mixFactor;
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
    var finalMatrix = spineMatrices[spineMatrices.length - 1].elements;
    var finalPos = [finalMatrix[12], finalMatrix[13], finalMatrix[14]];
    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices),
        finalSpinePos: finalPos
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
            colors.push(color[0], color[1], color[2], color[3]);
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
    vertices.push(0, height, 0);
    colors.push(color[0], color[1], color[2], color[3]);
    for (var i = 0; i <= segments; i++) {
        var angle = (i * 2 * Math.PI) / segments;
        var x = baseRadius * Math.cos(angle);
        var z = baseRadius * Math.sin(angle);
        vertices.push(x, 0, z);
        colors.push(color[0], color[1], color[2], color[3]);
    }
    for (var i = 1; i <= segments; i++) {
        indices.push(0, i, i + 1);
    }
    return { vertices: new Float32Array(vertices), colors: new Float32Array(colors), indices: new Uint16Array(indices) };
}