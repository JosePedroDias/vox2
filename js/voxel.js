'use strict';

// Block: int32
//  1byte = colorMap to palette XXXX -> NOW IS 0xFFFFFF
//  2byte = x world position
//  3byte = y world position
//  4byte = z world position

function Block(p, c) {
    this.color = c;
    this.pos = p;
}

function Voxel(_worldSize, _chunkSize, _blockSize) {
    this.worldSize = _worldSize;
    this.chunkSize = _chunkSize;
    this.blockSize = _blockSize;
    // Faster to loop through array than using hashmap in JS. And we don't want to allocate 4096*4bytes just to keep chunkid 4096.
    this.chunkIdMap = []; // [incr++] = <chunkId>
    this.meshes = [];
    this.chunksActive = []; // active blocks
    this.chunks = []; // Chunks + blocks [chunkId][blocks]
}

Voxel.prototype = {

  prepare: function() {
      for (let i = 0, I = this.chunkIdMap.length; i < I; ++i) {
          if (this.chunks[i] !== undefined) {
              this.rebuildChunk(i);
          }
      }
  },

  getChunk: function(chunkId) {
      for (let i = 0, I = this.chunkIdMap.length; i < I; ++i) {
          if (this.chunkIdMap[i] === chunkId) {
              return this.chunks[i];
          }
      }
      return null;
  },

  getXYZFromBlockPos: function(pos) {
    return {
      x: (pos >> 24) & 0xFF,
      y: (pos >> 16) & 0xFF,
      z: (pos >>  8) & 0xFF,
    }
  },

  getBlockPosFromXYZ: function(x, y, z) {
    return (
      (x & 0xFF) << 24 |
      (y & 0xFF) << 16 |
      (z & 0xFF) <<  8
    );
  },

  getBlock: function(x, y, z) {
    const chunkId = this.getChunkId(x, y, z);
    const chunk = this.getChunk(chunkId);
    if (!chunk) { return; }

    const pos = this.getBlockPosFromXYZ(x, y, z)
    for (let i = 0, I = chunk.length; i < I; ++i) {
      const block = chunk[i];
      if (block.pos === pos) {
        return block;
      }
    }
  },

  removeBlock: function(x, y, z) {
    const chunkId = this.getChunkId(x, y, z);
    const chunk = this.getChunk(chunkId);
    if (!chunk) { return; }

    const pos = this.getBlockPosFromXYZ(x, y, z);
    const chunkPos = this.worldToChunkPosition(x, y, z);
    const cx = chunkPos.x;

    for (let i = 0, I = chunk.length; i < I; ++i) {
      const block = chunk[i];
      if (block.pos === pos) {
        chunk.splice(i, 1);

        // TODO not sure about this
        //this.chunksActive[chunkId][cx][chunkPos.y] = this.chunksActive[chunkId][cx][chunkPos.y] | ( 1 << chunkPos.z);
        this.chunksActive[chunkId][cx][chunkPos.y] = 0;
        return;
      }
    }
  },

  addBlock: function(x, y, z, r, g, b) { // r, g, b 0-1
      const color = new THREE.Color(r, g, b).getHex();

      // byte1 = color, byte2 = z, byte3 = y, byte4 = x
      const block = new Block(((x & 0xFF) << 24 | (y & 0xFF) << 16 | (z & 0xFF) << 8), color);

      const chunkId = this.getChunkId(x, y, z);

      const chunkPos = this.worldToChunkPosition(x, y, z);

      const chunk = this.getChunk(chunkId);
      if (chunk == null) {
          this.chunkIdMap.push(chunkId);
          this.chunks[this.chunkIdMap.length-1] = [];
          this.chunks[this.chunkIdMap.length-1].push(block);
      } else {
          for(var i = 0; i < chunk.length; i++) {
              if (chunk[i] == block) {
                  return; // block already exists
              }
          }
          chunk.push(block);
      }

      const cx = chunkPos.x;
      if (this.chunksActive[chunkId] === undefined) {
          this.chunksActive[chunkId] = [];
      }
      if (this.chunksActive[chunkId][cx] === undefined) {
          this.chunksActive[chunkId][cx] = [];
      }

      // TODO don't understand
      this.chunksActive[chunkId][cx][chunkPos.y] = this.chunksActive[chunkId][cx][chunkPos.y] | ( 1 << chunkPos.z);
      //this.chunksActive[chunkId][cx][chunkPos.y] = 1;
  },


  worldToChunkPosition: function(x, y ,z) {
    return {
      x: x-(this.chunkSize*Math.floor(x/this.chunkSize)),
      y: y-(this.chunkSize*Math.floor(y/this.chunkSize)),
      z: z-(this.chunkSize*Math.floor(z/this.chunkSize))
    };
  },

  getChunkId: function(x, y, z) {
      const offset = this.blockSize * this.chunkSize;
      const cx = Math.floor(x / this.chunkSize) * offset;
      const cy = Math.floor(y / this.chunkSize) * offset;
      const cz = Math.floor(z / this.chunkSize) * offset;
      return btoa( [cx, cy, cz].join(',') );
  },

  rebuildChunk: function(vcid) {
      var vertices = [];
      var colors = [];

      // Get chunk
      var rcid = this.chunkIdMap[vcid];

      // Get chunkPosition
      var res = atob(rcid).split(',');
      var chunkPosX = res[0];
      var chunkPosY = res[1];
      var chunkPosZ = res[2];

      var chunk = this.getChunk(rcid);
      if (chunk == null) { return; }

      // Get bitlist of active blocks in chunk
      var active = this.chunksActive[rcid];
      var x, y, z, color, lx, sides;
      var front, back, bottom, top, right, left;

      for (var i = 0; i < this.chunks[vcid].length; i++) {
          x = 0, y = 0, z = 0, c = 0, lx = 0, sides = 0;
          front = 0, back = 0, bottom = 0, top = 0, right = 0, left = 0;
          //  console.log(this.chunks[vcid]);
          x = (this.chunks[vcid][i].pos >> 24) & 0xFF; // X
          y = (this.chunks[vcid][i].pos >> 16) & 0xFF; // Y
          z = (this.chunks[vcid][i].pos >> 8) & 0xFF;  // Z
          //color = this.chunks[vcid][i].color & 0xFF;   // color
          color = this.chunks[vcid][i].color;   // color
          color = new THREE.Color(color);
          //console.log(color);

          var pos = this.worldToChunkPosition(x, y, z);
          if (pos.z+1 < 16) {
              front = (active[pos.x][pos.y] >> (pos.z+1) ) & 0x01;
          }
          // Check2: z-1 is active?
          if (pos.z-1 >= 0) {
              back = (active[pos.x][pos.y] >> (pos.z-1) ) & 0x01;
          }
          // Check3: y-1 is active?
          if (y == 0) {
              bottom = 1;
          } else {
              if (active[pos.x][pos.y-1] != undefined) {
                  bottom = (active[pos.x][pos.y-1] >> (pos.z) ) & 0x01;
              }
          }
          // Check4: y+1 is active?
          if (active[pos.x][pos.y+1] != undefined) {
              top = (active[pos.x][pos.y+1] >> (pos.z) ) & 0x01;
          }

          // Check5: x+1 is active?
          if (active[pos.x+1] != undefined) {
              right = (active[pos.x+1][pos.y] >> pos.z ) & 0x01;
          }
          // Check6: x-1 is active?
          if (active[pos.x-1] != undefined) {
              left = (active[pos.x-1][pos.y] >> pos.z ) & 0x01;
          }

          if ((front & back & bottom & top & right & left) == 1) {
              continue;
          }

          const bs = this.blockSize;

          if (!bottom) { //liggande
              vertices.push([pos.x*bs, pos.y*bs-bs, pos.z*bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs-bs, pos.z*bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs-bs, pos.z*bs-bs]);
              vertices.push([pos.x*bs, pos.y*bs-bs, pos.z*bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs-bs, pos.z*bs-bs]);
              vertices.push([pos.x*bs, pos.y*bs-bs, pos.z*bs-bs]);
              for(let n = 0; n < 6; n++) { colors.push(color); }
          }
          if (!top) {
              vertices.push([pos.x*bs, pos.y*bs, pos.z*bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs, pos.z*bs-bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs, pos.z*bs]);
              vertices.push([pos.x*bs, pos.y*bs, pos.z*bs]);
              vertices.push([pos.x*bs, pos.y*bs, pos.z*bs-bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs, pos.z*bs-bs]);
              sides += 6;
              for(let n = 0; n < 6; n++) { colors.push(color); }
          }
          if (!front) { // platta
              vertices.push([pos.x*bs, pos.y*bs, pos.z*bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs, pos.z*bs]);
              vertices.push([pos.x*bs, pos.y*bs-bs, pos.z*bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs, pos.z*bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs-bs, pos.z*bs]);
              vertices.push([pos.x*bs, pos.y*bs-bs, pos.z*bs]);
              sides += 6;
              for(let n = 0; n < 6; n++) { colors.push(color); }
          }
          if (!back) { // platta
              vertices.push([pos.x*bs, pos.y*bs, pos.z*bs-bs]);
              vertices.push([pos.x*bs, pos.y*bs-bs, pos.z*bs-bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs-bs, pos.z*bs-bs]);
              vertices.push([pos.x*bs, pos.y*bs, pos.z*bs-bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs-bs, pos.z*bs-bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs, pos.z*bs-bs]);
              sides += 6;
              for(let n = 0; n < 6; n++) { colors.push(color); }
          }
          if (!left) {
              vertices.push([pos.x*bs-bs, pos.y*bs-bs, pos.z*bs-bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs-bs, pos.z*bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs, pos.z*bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs-bs, pos.z*bs-bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs, pos.z*bs]);
              vertices.push([pos.x*bs-bs, pos.y*bs, pos.z*bs-bs]);
              sides += 6;
              for(let n = 0; n < 6; n++) { colors.push(color); }
          }
          if (!right) {
              vertices.push([pos.x*bs, pos.y*bs-bs, pos.z*bs-bs]);
              vertices.push([pos.x*bs, pos.y*bs, pos.z*bs]);
              vertices.push([pos.x*bs, pos.y*bs-bs, pos.z*bs]);
              vertices.push([pos.x*bs, pos.y*bs, pos.z*bs]);
              vertices.push([pos.x*bs, pos.y*bs-bs, pos.z*bs-bs]);
              vertices.push([pos.x*bs, pos.y*bs, pos.z*bs-bs]);
              sides += 6;
              for(let n = 0; n < 6; n++) { colors.push(color); }
          }

      }

      // Draw chunk
      var geometry = new THREE.BufferGeometry();
      var v = new THREE.BufferAttribute( new Float32Array( vertices.length * 3), 3 );
      for ( var i = 0; i < vertices.length; i++ ) {
          v.setXYZ(i, vertices[i][0], vertices[i][1], vertices[i][2]);
      }
      geometry.addAttribute('position', v);

      var c = new THREE.BufferAttribute(new Float32Array( colors.length * 3), 3 );
      for ( var i = 0; i < colors.length; i++ ) {
          var ci = colors[i];
          c.setXYZW(i, ci.r, ci.g, ci.b, 1);
      }
      geometry.addAttribute('color', c);

      geometry.computeVertexNormals();
      geometry.computeFaceNormals();
      var material = new THREE.MeshLambertMaterial({ vertexColors: THREE.VertexColors, wireframe: false});
      var mesh = new THREE.Mesh( geometry, material);

      mesh.position.set(chunkPosX, chunkPosY, chunkPosZ);

      // LIGHTS
      mesh.receiveShadow = true;
      mesh.castShadow = true;

      game.scene.add( mesh );
  },

  emptyClone: function() {
    return new Voxel(this.worldSize, this.chunkSize, this.blockSize);
  },

  addSphere: function(xc, yc, zc, r, clr) {
    const ws = this.worldSize;
    let x, y, z;
    for (z = 0; z < ws; ++z) {
      for (y = 0; y < ws; ++y) {
        for (x = 0; x < ws; ++x) {
          const dx = x - xc;
          const dy = y - yc;
          const dz = z - zc;
          if (Math.sqrt( dx*dx + dy*dy + dz*dz ) > r) { continue; }

          this.addBlock(x, y, z, clr[0], clr[1], clr[2]);
        }
      }
    }
  },

  addRect: function(x0, y0, z0, x1, y1, z1, clr) {
    const ws = this.worldSize;
    if (x0 < 0) { x0 = 0}
    if (y0 < 0) { y0 = 0}
    if (z0 < 0) { z0 = 0}
    if (x1 >= ws) { x1 = ws - 1; }
    if (y1 >= ws) { y1 = ws - 1; }
    if (z1 >= ws) { z1 = ws - 1; }
    let x, y, z;
    for (z = z0; z <= z1; ++z) {
      for (y = y0; y <= y1; ++y) {
        for (x = x0; x <= x1; ++x) {
          this.addBlock(x, y, z, clr[0], clr[1], clr[2]);
        }
      }
    }
  },

  getInversedCopy: function(clr) {
    const ws = this.worldSize;
    let x, y, z;
    const v = this.emptyClone();
    for (z = 0; z < ws; ++z) {
      for (y = 0; y < ws; ++y) {
        for (x = 0; x < ws; ++x) {
          if (this.getBlock(x, y, z)) { continue; }
          v.addBlock(x, y, z, clr[0], clr[1], clr[2]);
        }
      }
    }
    return v;
  },

  subtract: function(v, x0, y0, z0) { // TODO NOT WORKING?
    const ws = this.worldSize;
    const wsV = v.worldSize;
    let x, y, z, dx, dy, dz;
    for (dz = 0; dz < wsV; ++dz) {
      z = z0 + dz;
      if (z >= ws) { break; }
      for (dy = 0; dy < wsV; ++dy) {
        y = y0 + dy;
        if (y >= ws) { break; }
        for (dx = 0; dx < wsV; ++dx) {
          x = x0 + dx;
          if (x >= ws) { break; }
          if (!v.getBlock(x, y, z)) { continue; }
          v.removeBlock(x, y, z);
        }
      }
    }
    return v;
  },

  paint: function(fn) {
    const ws = this.worldSize;
    let x, y, z;
    for (z = 0; z < ws; ++z) {
      for (y = 0; y < ws; ++y) {
        for (x = 0; x < ws; ++x) {
          const block = this.getBlock(x, y, z);
          if (block) {
            const c = fn(x, y, z);
            block.color = new THREE.Color(c[0], c[1], c[2]).getHex();
          }
        }
      }
    }
  }

}
