   // Warna global khusus Dunia
    var groundGreen = [0.4, 0.8, 0.4, 1.0];
    var skyBlue = [0.52, 0.80, 0.92, 1.0];

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
    
