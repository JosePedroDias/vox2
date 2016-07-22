//==============================================================================
// Author: Nergal
// Date: 2014-11-17
//==============================================================================
"use strict";

function Game() {
    this.container;
    this.scene;
    this.camera;
    this.renderer;
    this.clock;
    this.controls;

    // Scene settings
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.viewAngle = 40;
    this.aspect = this.screenWidth/this.screenHeight;
    this.near = 0.1;
    this.far = 200;
    this.invMaxFps = 1/60;
    this.frameDelta = 0;

    // Object arrays
    this.objects = [];
    this.world = undefined;

    //==========================================================
    // InitScene
    //==========================================================
    Game.prototype.InitScene = function() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(this.viewAngle, this.aspect, this.near, this.far);
        this.camera.position.set(32,25,35);
        this.camera.rotation.set(-2.5, -0.03, -3);
        this.scene.add(this.camera);

        this.world = new Voxel(64, 16, 0.1); // worldSize, chunkSize, blockSize

        const ws = this.world.worldSize;
        const x2 = ws / 2;
        const y2 = ws / 2;
        const z2 = ws / 2;
        let x, y, z;
        for (z = 0; z < ws; ++z) {
          for (y = 0; y < ws; ++y) {
            for (x = 0; x < ws; ++x) {

              //if (Math.random() > 0.9) { continue; } // skip 10% of the blocks

              // draw a csg subtraction of an overly large sphere
              const dx = x - x2;
              const dy = y - y2;
              const dz = z - z2;
              if (Math.sqrt( dx*dx + dy*dy + dz*dz ) < x2*1.2) { continue; }

              this.world.AddBlock(x, y, z, x/ws, y/ws, z/ws);
            }
          }
        }

        this.world.RemoveBlock(0, 63, 63);

        this.world.Prepare();

        if (false) {
          var planeSize = this.world.worldSize*(this.world.blockSize);
          var geo = new THREE.PlaneBufferGeometry(planeSize, planeSize, 1, 1);
          var mat = new THREE.MeshLambertMaterial({color: 0xEED6AF});
          var mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(planeSize/2, 0, planeSize/2);
          mesh.rotation.x = -Math.PI/2;
          this.scene.add(mesh);
        }

    };

    //==========================================================
    // Init other stuff
    //==========================================================
    Game.prototype.Init = function(mapId) {
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

        var ambientLight = new THREE.AmbientLight( 0x330000 );
        this.scene.add( ambientLight );

        var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.9 );
        hemiLight.color.setHSL( 0.6, 1, 0.6 );
        hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
        hemiLight.position.set( 0, 500, 0 );
        this.scene.add( hemiLight );

        var dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
        dirLight.color.setHSL( 0.1, 1, 0.95 );
        dirLight.position.set( 10, 100.75, 10 );
        dirLight.position.multiplyScalar( 10 );
        this.scene.add( dirLight );

        dirLight.castShadow = true;

        dirLight.shadowMapWidth = 2048;
        dirLight.shadowMapHeight = 2048;

        var d = 150;

        dirLight.shadowCameraLeft = -d;
        dirLight.shadowCameraRight = d;
        dirLight.shadowCameraTop = d;
        dirLight.shadowCameraBottom = -d;

        dirLight.shadowCameraFar = 3500;
        dirLight.shadowBias = -0.0001;
        dirLight.shadowDarkness = 0.45;

        this.animate();
    };

    Game.prototype.onWindowResize = function() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
    };

    //==========================================================
    // Render
    //==========================================================
    Game.prototype.render = function() {
        this.renderer.render(this.scene, this.camera);
    };

    //==========================================================
    // Animate
    //==========================================================
    Game.prototype.animate = function() {
        this.animId = requestAnimationFrame(this.animate.bind(this));
        this.render();
        this.update();
    };

    //==========================================================
    // Update
    //==========================================================
    Game.prototype.update = function() {
        var delta = this.clock.getDelta(),
        time = this.clock.getElapsedTime() * 10;

        this.frameDelta += delta;

        while(this.frameDelta >= this.invMaxFps) {
            THREE.AnimationHandler.update(this.invMaxFps);
            for(var i = 0; i < this.objects.length; i++) {
                if(this.objects[i] != undefined) {
                    if(this.objects[i].remove == 1) {
                        this.objects.splice(i, 1);
                    } else {
                        this.objects[i].Draw(time, this.invMaxFps, i);
                    }
                }
            }
            this.frameDelta -= this.invMaxFps;
        }
        this.controls.update();
    };

}
