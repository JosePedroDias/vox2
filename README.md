Forked from <https://github.com/Lallassu/vox2>

Blocks now store the voxel color themselves, instead of a palette index (as hex).
World has been renamed voxel.

Changed the voxel API to make it easy to add voxels programatically.

* `new Voxel(worldSize:number, chunkSize:number, blockSize:number)`
* `voxel.addBlock(x:number, y:number, z:number, r:number, g:number, b:number)`
* `voxel.removeBlock(x:number, y:number, z:number)`
* `voxel.cloneEmpty()`
* `voxel.prepare()` must be called before first render


Added methods to add geometry:

* `voxel.addSphere(xc:number, yc:number, zc:number, r:number, clr:Array<number>)`
* `voxel.addRect(x0:number, y0:number, z0:number, x1:number, y1:number, z1:number, clr:Array<number>)`


Added methods for CSG ops:

  * `voxel.getInversedCopy(clr:Array<number>)`
  * `voxel.subtract()`


Added paint method and color ops:

* `voxel.paint( (x:number, y:number, z:number)=>number )`
* check the `game.initScene()` method color ops
