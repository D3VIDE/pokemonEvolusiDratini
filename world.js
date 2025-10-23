   // Warna global khusus Dunia
    var groundGreen = [0.4, 0.8, 0.4, 1.0];
    var skyBlue = [0.52, 0.80, 0.92, 1.0];
    var grassGreen = [0.2,0.7,0.2,1.0];
    var mountainBrown = [0.55, 0.45, 0.3, 1.0];
    
    function createPlane(width, depth, color) {
        var halfWidth = width / 2;
        var halfDepth = depth / 2;
        var vertices = new Float32Array([
            -halfWidth, 0.0, -halfDepth, // kiri depan
             halfWidth, 0.0, -halfDepth, // kanan depan
             halfWidth, 0.0,  halfDepth, // kanan belakang
            -halfWidth, 0.0,  halfDepth  // kiri belakang
        ]);
        // Pastikan warna ada 4 komponen (RGBA) per vertex
        var colors = new Float32Array([
            color[0], color[1], color[2], color[3],
            color[0], color[1], color[2], color[3],
            color[0], color[1], color[2], color[3],
            color[0], color[1], color[2], color[3]
        ]);
        var indices = new Uint16Array([
            0, 1, 2,   // segitiga pertama
            0, 2, 3    // segitiga kedua
        ]);
        return { vertices: vertices, colors: colors, indices: indices };
    }
    

function createCloudClump(cloudBuffers, baseMatrix) {
    let cloudRoot = new SceneNode(null, baseMatrix);
    
    // Buat 3-5 gumpalan bola untuk 1 awan
    let m1 = new Matrix4().translate(0, 0, 0).scale(3, 2, 4);
    let n1 = new SceneNode(cloudBuffers, m1);
    cloudRoot.children.push(n1);

    let m2 = new Matrix4().translate(3, -1, 1).scale(2.5, 2.5, 2.5);
    let n2 = new SceneNode(cloudBuffers, m2);
    cloudRoot.children.push(n2);

    let m3 = new Matrix4().translate(-2.5, 0.5, -0.5).scale(2, 1.5, 2);
    let n3 = new SceneNode(cloudBuffers, m3);
    cloudRoot.children.push(n3);
    
    let m4 = new Matrix4().translate(1.5, -0.5, 3).scale(1.5, 1.5, 2);
    let n4 = new SceneNode(cloudBuffers, m4);
    cloudRoot.children.push(n4);

    return cloudRoot;
}

/**
 * BARU: Fungsi untuk membuat rumput secara efisien.
 * Ini membuat SATU geometri besar yang berisi ribuan rumput.
 */
function createRandomGrass(count, width, depth, height, color) {
    var vertices = [];
    var colors = [];
    var indices = [];
    var baseIndex = 0;
    
    const h = height;   // tinggi
    const w = height / 4; // lebar
    const r = color[0], g = color[1], b = color[2], a = color[3] || 1.0;

    for (let i = 0; i < count; i++) {
        // Tentukan posisi acak di daratan (XZ)
        let x = Math.random() * width - width / 2;
        let z = Math.random() * depth - depth / 2;
        // Y selalu 0 (di permukaan tanah)
        
        // Rotasi Y acak untuk setiap rumput
        let angle = Math.random() * Math.PI * 2;
        let c = Math.cos(angle);
        let s = Math.sin(angle);
        
        // -------- Quad 1 (tegak lurus Z) --------
        // v0 (bawah kiri)
        vertices.push(x + (-w*c), 0, z + (-w*s));
        // v1 (bawah kanan)
        vertices.push(x + (w*c), 0, z + (w*s));
        // v2 (atas)
        vertices.push(x, h, z); 
        
        // -------- Quad 2 (tegak lurus X, setelah rotasi) --------
        // v3 (bawah kiri)
        vertices.push(x + (-w*s), 0, z + (w*c));
        // v4 (bawah kanan)
        vertices.push(x + (w*s), 0, z + (-w*c));
        // v5 (atas) - vertex atas sama (v2)
        vertices.push(x, h, z);
        
        // Tambahkan warna untuk 6 vertex baru
        for(let j=0; j<6; j++) colors.push(r, g, b, a);
        
        // Tambahkan indices untuk 2 segitiga
        // Quad 1
        indices.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
        // Quad 2
        indices.push(baseIndex + 3, baseIndex + 4, baseIndex + 5);
        
        // Maju ke base index berikutnya (kita menambahkan 6 vertex)
        baseIndex += 6;
    } // Akhir loop for
    
    return { 
        vertices: new Float32Array(vertices), 
        colors: new Float32Array(colors), 
        indices: new Uint16Array(indices) 
    };
}
