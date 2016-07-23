'use strict';

function Game() {
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.viewAngle = 40;
    this.aspect = this.screenWidth/this.screenHeight;
    this.near = 0.1;
    this.far = 200;
    this.invMaxFps = 1/60;
    this.frameDelta = 0;
    this.objects = [];

    this.animate = this.animate.bind(this);
}

Game.prototype = {

    initScene: function() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(this.viewAngle, this.aspect, this.near, this.far);
        this.camera.position.set(32,25,35);
        this.camera.rotation.set(-2.5, -0.03, -3);
        this.scene.add(this.camera);

        const RED   = [1, 0, 0];
        const GREEN = [0, 1, 0];
        const BLUE  = [0, 0, 1];

        console.time('voxel ops');

        this.world = new Voxel(64, 8, 0.2); // worldSize, chunkSize, blockSize

        const ctr = this.world.worldSize/2;
        this.world.addSphere(ctr, ctr, ctr, ctr * 1.2, RED);
        this.world = this.world.getInversedCopy(BLUE);
        //this.world.addRect(0, 0, 0, 32, 16, 8, GREEN);

        //const rct = this.world.emptyClone();
        //rct.addRect(0, 0, 0, 32, 64, 64, GREEN);
        //this.world = rct;
        //this.world.subtract(rct, 0, 0, 0);
        console.timeEnd('voxel ops');



        console.time('voxel paint');

        // aux
        function mult(fn1, fn2) {
          return function(x, y, z) {
            const a = fn1(x, y, z);
            const b = fn2(x, y, z);
            return [
              a[0] * b[0],
              a[1] * b[1],
              a[2] * b[2]
            ];
          }
        }

        function dashN(i, n) {
          return ((i % n) < n/2);
        }


        // fns
        function dash4y(x, y, z) {
          return dashN(y, 8) ? RED : GREEN;
        }

        function checkered8(x, y, z) {
          let on = dashN(x, 16);
          on ^= dashN(y, 16);
          on ^= dashN(z, 16);
          return on ? RED : GREEN;
        }

        function gradientY64(x, y, z) {
          return [0.2, y/63, 0.2];
        }



        this.world.paint(checkered8); // dash4y checkered8 gradientY64
        //this.world.paint( mult(checkered8, gradientY64) ); // dash4y checkered8 gradientY64

        console.timeEnd('voxel paint');



        console.log('max els per chunk: %s', Math.pow(this.world.chunkSize, 3) );
        console.log('         # chunks: %s', this.world.chunks.length );


        console.time('voxel prepare');
        this.world.prepare();
        console.timeEnd('voxel prepare');

        if (false) {
          const planeSize = this.world.worldSize*(this.world.blockSize);
          const geo = new THREE.PlaneBufferGeometry(planeSize, planeSize, 1, 1);
          const mat = new THREE.MeshLambertMaterial({color: 0xEED6AF});
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(planeSize/2, 0, planeSize/2);
          mesh.rotation.x = -Math.PI/2;
          this.scene.add(mesh);
        }

    },

    init: function() {
        this.clock = new THREE.Clock();

        this.renderer = new THREE.WebGLRenderer( {antialias: false} );
        this.renderer.setSize(this.screenWidth, this.screenHeight);
        this.renderer.shadowMapEnabled = true;
        this.renderer.shadowMapType = THREE.PCFSoftShadowMap;
        this.keyboard = new THREEx.KeyboardState();
        this.container = document.getElementById('container');
        this.container.appendChild(this.renderer.domElement);

        this.scene.fog = new THREE.Fog( 0x333333, 40, 60 );
        this.renderer.setClearColor(0x333333, 1);
        this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );

        THREEx.WindowResize(this.renderer, this.camera);

        const ambientLight = new THREE.AmbientLight( 0x330000 );
        this.scene.add( ambientLight );

        const hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.9 );
        hemiLight.color.setHSL( 0.6, 1, 0.6 );
        hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
        hemiLight.position.set( 0, 500, 0 );
        this.scene.add( hemiLight );

        const dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
        dirLight.color.setHSL( 0.1, 1, 0.95 );
        dirLight.position.set( 10, 100.75, 10 );
        dirLight.position.multiplyScalar( 10 );
        this.scene.add( dirLight );

        dirLight.castShadow = true;

        dirLight.shadowMapWidth = 2048;
        dirLight.shadowMapHeight = 2048;

        const d = 150;

        dirLight.shadowCameraLeft = -d;
        dirLight.shadowCameraRight = d;
        dirLight.shadowCameraTop = d;
        dirLight.shadowCameraBottom = -d;

        dirLight.shadowCameraFar = 3500;
        dirLight.shadowBias = -0.0001;
        dirLight.shadowDarkness = 0.45;

        this.animate();
    },

    onWindowResize: function() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
    },

    render: function() {
        this.renderer.render(this.scene, this.camera);
    },

    animate: function() {
        requestAnimationFrame(this.animate);
        this.render();
        this.update();
    },

    update: function() {
        const delta = this.clock.getDelta(),
        time = this.clock.getElapsedTime() * 10;

        this.frameDelta += delta;

        while (this.frameDelta >= this.invMaxFps) {
            THREE.AnimationHandler.update(this.invMaxFps);
            for (let i = 0, I = this.objects.length; i < I; ++i) {
                if (this.objects[i] != undefined) {
                    if (this.objects[i].remove == 1) {
                        this.objects.splice(i, 1);
                    } else {
                        this.objects[i].Draw(time, this.invMaxFps, i);
                    }
                }
            }
            this.frameDelta -= this.invMaxFps;
        }
        this.controls.update();
    }

}
