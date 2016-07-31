function AVoxel(size) {
  this.size = size;
  this.xx = size;
  this.yy = size;
  this.zz = size;
  this.xxyy = this.xx * this.yy;
  this.xyz = this.xx * this.yy * this.zz;
  this.data = new Uint32Array( this.xyz );
}

AVoxel.prototype = {

  add: function(x, y, z, clr) {
    this.data[ x + y*this.xx + z*xxyy ] = clr;
  },

  rem: function(x, y, z) {
    this.data[ x + y*this.xx + z*xxyy ] = 0;
  },

  get: function(x, y, z) {
    return this.data[ x + y*this.xx + z*xxyy ];
  },

  getClone: function() {
    return new AVoxel(this.size);
  },

  addBox: function(x0, y0, z0, x1, y1, z1) {},
  addSphere: function(xc, yc, r) {},

  invert: function(dst) {
    if (!dst) { dst = this.getClone(); }
    for (let i = 0; i < this.xyz; ++i) {
      const v = this.data[i];
      const V = (v === 0) ? 0xFFFFFF : 0;
      this.data[i] = V;
    }
    return dst;
  },

  subtract: function(dst) {

  },

  intersect: function(dst) {

  }

};
