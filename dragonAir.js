    // Warna global khusus Dragonair
var blue = [0.4, 0.6, 1.0, 1.0];
var white = [1.0, 1.0, 1.0, 1.0];
var darkPurple = [0.2, 0.0, 0.2, 1.0];
var groundGreen = [0.4, 0.8, 0.4, 1.0];
var earWhite = [0.9, 0.9, 1.0, 1.0];
var snoutBlue = [0.6, 0.75, 1.0, 1.0];

function createSmoothBody(segments, segmentLength, startRadius, maxRadius, endRadius, currentAngle) {
    var vertices = [];
    var colors = [];
    var indices = [];
    var ringSegments = 16;
    var spineMatrices = [];
    var currentSpineMatrix = new Matrix4();

    currentSpineMatrix.translate(0, 0.5, 0); 
    spineMatrices.push(new Matrix4(currentSpineMatrix));

    let headLiftAngle = -15.0; // Sudut angkat kepala
    let s_curve_amplitude = 12.0;
    let s_curve_freq = 2.5;
    let time = currentAngle * 0.004;

    for (let i = 0; i < segments; i++) {
        let p = i / (segments - 1); // progress (0.0 s.d 1.0)
        let angleX_deg = 0.0;
        let angleY_deg = 0.0;

        // Gerakan S-curve horizontal (rotasi Y)
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

            // Cincin VERTIKAL (XY plane) - "Tidak Gepenk"
            let x = currentRadius * Math.cos(angle);
            let y = currentRadius * Math.sin(angle); 
            let z = 0; 

            var new_x = e[0] * x + e[4] * y + e[8] * z + e[12];
            var new_y = e[1] * x + e[5] * y + e[9] * z + e[13];
            var new_z = e[2] * x + e[6] * y + e[10] * z + e[14];
            vertices.push(new_x, new_y, new_z);

            // Hitung minY *setelah* transformasi
            if (new_y < minY) minY = new_y;

            // Warna perut berdasarkan Y lokal
            let y_local_normalized = Math.sin(angle);
            let mixFactor = Math.max(0.0, -y_local_normalized); 
            let r = blue[0] * (1.0 - mixFactor) + white[0] * mixFactor;
            let g = blue[1] * (1.0 - mixFactor) + white[1] * mixFactor;
            let b = blue[2] * (1.0 - mixFactor) + white[2] * mixFactor;
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
        for (var i = 0; i <= segments; i++) {
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
            var nextIndex = (i === segments) ? 1 : i + 1;
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
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices)
    };
}