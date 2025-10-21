// =================================================================
// KELAS MATRIX4 (diambil dari cuon-matrix.js)
// =================================================================
var Matrix4 = function(opt_src) {
  var i, s, d;
  if (opt_src && typeof opt_src === 'object' && opt_src.hasOwnProperty('elements')) {
    s = opt_src.elements;
    d = new Float32Array(16);
    for (i = 0; i < 16; ++i) {
      d[i] = s[i];
    }
    this.elements = d;
  } else {
    this.elements = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  }
};
Matrix4.prototype.setIdentity = function() {
  var e = this.elements;
  e[0] = 1; e[4] = 0; e[8] = 0; e[12] = 0;
  e[1] = 0; e[5] = 1; e[9] = 0; e[13] = 0;
  e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
  e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
  return this;
};
Matrix4.prototype.set = function(src) {
  var i, s, d;
  s = src.elements;
  d = this.elements;
  if (s === d) { return; }
  for (i = 0; i < 16; ++i) {
    d[i] = s[i];
  }
  return this;
};
Matrix4.prototype.multiply = function(other) {
  var i, e, a, b, ai0, ai1, ai2, ai3;
  e = this.elements; a = this.elements; b = other.elements;
  if (e === b) {
    b = new Float32Array(16);
    for (i = 0; i < 16; ++i) { b[i] = e[i]; }
  }
  for (i = 0; i < 4; i++) {
    ai0=a[i]; ai1=a[i+4]; ai2=a[i+8]; ai3=a[i+12];
    e[i]    = ai0 * b[0]  + ai1 * b[1]  + ai2 * b[2]  + ai3 * b[3];
    e[i+4]  = ai0 * b[4]  + ai1 * b[5]  + ai2 * b[6]  + ai3 * b[7];
    e[i+8]  = ai0 * b[8]  + ai1 * b[9]  + ai2 * b[10] + ai3 * b[11];
    e[i+12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
  }
  return this;
};
Matrix4.prototype.concat = Matrix4.prototype.multiply;
Matrix4.prototype.translate = function(x, y, z) {
  var e = this.elements;
  e[12] += e[0] * x + e[4] * y + e[8] * z;
  e[13] += e[1] * x + e[5] * y + e[9] * z;
  e[14] += e[2] * x + e[6] * y + e[10] * z;
  e[15] += e[3] * x + e[7] * y + e[11] * z;
  return this;
};
Matrix4.prototype.rotate = function(angle, x, y, z) {
  return this.multiply(new Matrix4().setRotate(angle, x, y, z));
};
Matrix4.prototype.setRotate = function(angle, x, y, z) {
  var e, s, c, len, rlen, nc, xy, yz, zx, xs, ys, zs;
  angle = Math.PI * angle / 180;
  e = this.elements;
  s = Math.sin(angle);
  c = Math.cos(angle);
  if (0 !== x && 0 === y && 0 === z) {
    if (x < 0) { s = -s; }
    e[0] = 1;  e[4] = 0;  e[8] = 0;  e[12] = 0;
    e[1] = 0;  e[5] = c;  e[9] = -s; e[13] = 0;
    e[2] = 0;  e[6] = s;  e[10] = c; e[14] = 0;
    e[3] = 0;  e[7] = 0;  e[11] = 0; e[15] = 1;
  } else if (0 === x && 0 !== y && 0 === z) {
    if (y < 0) { s = -s; }
    e[0] = c;  e[4] = 0;  e[8] = s;  e[12] = 0;
    e[1] = 0;  e[5] = 1;  e[9] = 0;  e[13] = 0;
    e[2] = -s; e[6] = 0;  e[10] = c; e[14] = 0;
    e[3] = 0;  e[7] = 0;  e[11] = 0; e[15] = 1;
  } else if (0 === x && 0 === y && 0 !== z) {
    if (z < 0) { s = -s; }
    e[0] = c;  e[4] = -s; e[8] = 0;  e[12] = 0;
    e[1] = s;  e[5] = c;  e[9] = 0;  e[13] = 0;
    e[2] = 0;  e[6] = 0;  e[10] = 1; e[14] = 0;
    e[3] = 0;  e[7] = 0;  e[11] = 0; e[15] = 1;
  } else {
    len = Math.sqrt(x*x + y*y + z*z);
    if (len !== 1) {
      rlen = 1 / len;
      x *= rlen; y *= rlen; z *= rlen;
    }
    nc = 1 - c;
    xy = x * y; yz = y * z; zx = z * x;
    xs = x * s; ys = y * s; zs = z * s;
    e[0] = x*x*nc + c;
    e[1] = xy*nc + zs;
    e[2] = zx*nc - ys;
    e[3] = 0;
    e[4] = xy*nc - zs;
    e[5] = y*y*nc + c;
    e[6] = yz*nc + xs;
    e[7] = 0;
    e[8] = zx*nc + ys;
    e[9] = yz*nc - xs;
    e[10] = z*z*nc + c;
    e[11] = 0;
    e[12] = 0;
    e[13] = 0;
    e[14] = 0;
    e[15] = 1;
  }
  return this;
};
Matrix4.prototype.scale = function(x, y, z) {
  var e = this.elements;
  e[0] *= x;  e[4] *= y;  e[8] *= z;
  e[1] *= x;  e[5] *= y;  e[9] *= z;
  e[2] *= x;  e[6] *= y;  e[10] *= z;
  e[3] *= x;  e[7] *= y;  e[11] *= z;
  return this;
};
Matrix4.prototype.setPerspective = function(fovy, aspect, near, far) {
  var e, rd, s, ct;
  if (near === far || aspect === 0) { throw 'null frustum'; }
  if (near <= 0) { throw 'near <= 0'; }
  if (far <= 0) { throw 'far <= 0'; }
  fovy = Math.PI * fovy / 180 / 2;
  s = Math.sin(fovy);
  if (s === 0) { throw 'null frustum'; }
  rd = 1 / (far - near);
  ct = Math.cos(fovy) / s;
  e = this.elements;
  e[0]  = ct / aspect;
  e[1]  = 0;
  e[2]  = 0;
  e[3]  = 0;
  e[4]  = 0;
  e[5]  = ct;
  e[6]  = 0;
  e[7]  = 0;
  e[8]  = 0;
  e[9]  = 0;
  e[10] = -(far + near) * rd;
  e[11] = -1;
  e[12] = 0;
  e[13] = 0;
  e[14] = -2 * near * far * rd;
  e[15] = 0;
  return this;
};
Matrix4.prototype.setLookAt = function(eyeX, eyeY, eyeZ, atX, atY, atZ, upX, upY, upZ) {
  var e, fx, fy, fz, rlf, sx, sy, sz, rls, ux, uy, uz;
  fx = atX - eyeX;
  fy = atY - eyeY;
  fz = atZ - eyeZ;
  rlf = 1 / Math.sqrt(fx*fx + fy*fy + fz*fz);
  fx *= rlf; fy *= rlf; fz *= rlf;
  sx = fy * upZ - fz * upY;
  sy = fz * upX - fx * upZ;
  sz = fx * upY - fy * upX;
  rls = 1 / Math.sqrt(sx*sx + sy*sy + sz*sz);
  sx *= rls; sy *= rls; sz *= rls;
  ux = sy * fz - sz * fy;
  uy = sz * fx - sx * fz;
  uz = sx * fy - sy * fx;
  e = this.elements;
  e[0] = sx; e[4] = sy; e[8] = sz; e[12] = 0;
  e[1] = ux; e[5] = uy; e[9] = uz; e[14] = 0;
  e[2] = -fx; e[6] = -fy; e[10] = -fz; e[15] = 1;
  e[12] = -(sx * eyeX + sy * eyeY + sz * eyeZ);
  e[13] = -(ux * eyeX + uy * eyeY + uz * eyeZ);
  e[14] = -(-fx * eyeX + -fy * eyeY + -fz * eyeZ);
  return this;
};