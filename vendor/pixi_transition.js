var capturer = null;
var options = {
    /* Recording options */
    format: 'webm',
    framerate: '15FPS',
    start: () => { startRecording(); },
    stop: () => { stopRecording(); }
};

function initRecording(){
    capturer = new CCapture( {
      verbose: true,
      display: false,
      framerate: parseInt(options.framerate),
      motionBlurFrames: 0,
      quality: 100,
      format: options.format,
      workersPath: 'dist/src/',
      timeLimit: 0,
      frameLimit: 0,
      autoSaveTime: 0,
    } );
}
function startRecording(){
    initRecording();
    capturer.start();
}
function stopRecording(save){
    if (capturer) {
        capturer.stop();
        if (save) {
            capturer.save();
        }
    }
}
var recording = false;

var encoder = new Whammy.Video(50); 

var loaderEl = document.getElementById('loaderDiv');

window.addEventListener('load', async () => {

    gsap.registerPlugin(PixiPlugin);
    // give the plugin a reference to the PIXI object
    PixiPlugin.registerPIXI(PIXI);

    const textContainer = document.getElementById('animationName');

    document.getElementById('play').onclick = () => {

        document.getElementsByTagName('video')[0].play();
    };

    //initRecording();
    
    // The application will create a renderer using WebGL, if possible,
    // with a fallback to a canvas render. It will also setup the ticker
    // and the root stage PIXI.Container
    const app = new PIXI.Application();

    // The application will create a canvas element for you that you
    // can then insert into the DOM
    //document.body.appendChild(app.view);

    var renderer = PIXI.autoDetectRenderer(256, 256, {antialias: true, transparent: false});
    renderer.autoDensity = false;
    renderer.resize(window.innerWidth, window.innerHeight);
    
    /* Add the canvas to the HTML document */
    let c = document.getElementsByTagName("canvas")[0];
    if(c)
        document.body.removeChild(c);
    document.body.appendChild(renderer.view);

    /* Create a container object called the `stage` */
    stage = new PIXI.projection.Container2d();
    app.ticker.stop();

    var offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = renderer.width;
        offscreenCanvas.height = renderer.height;

    var ctx = offscreenCanvas.getContext('2d');

    // Display the offscreen canvas so we know something is drawn to it
    document.body.appendChild(offscreenCanvas);

    var loader = app.loader;
    var executeButton = document.getElementById('executeButton');
    executeButton.onclick = () => {

        clearStage();
        recording = true;
        //startRecording();
        setTimeout(() => {
            executeProgram(true);
        }, 0);
    };
    executeNoRecordButton.onclick = () => {

        clearStage();
        recording = false;
        executeProgram(false);
    };

    var instructionsText = document.getElementById('instructionsTextArea');
    instructionsText.value = `
            from url=image1.jpg;id=image1
            add id=bottle;url=sprite.png;position=0,0;opacity=0;rotation=0
            fadein id=bottle;duration=2000
            movesync id=bottle;position=400,20;duration=1000|rotate id=bottle;rotation=30;duration=1000
            zoomx id=bottle;factor=3;duration=2000;sync=true
            zoomy id=bottle;factor=3;duration=2000;sync=true
            zoomx id=bottle;factor=1;duration=2000|zoomy id=bottle;factor=1;duration=2000
            rotate id=bottle;rotation=45;anchor=center;duration=1500;sync=true
            rotate id=bottle;rotation=0;anchor=center;duration=1500;sync=true
            colorize id=bottle;color=#3374FF;duration=2000;sync=true
            horizontaltilt id=bottle;duration=2000;sync=true
            verticaltilt id=bottle;duration=2000;sync=true
            fadeout id=bottle;duration=2000
            transition url=image2.jpg;from=image1;id=image2;duration=3000;smoothness=0.5;name=directionalwipe
        `.replace('\t', '').trim();

    async function executeProgram(isRecording = false) {

        executeButton.disabled = true;
        var objects = [];

        var commands = parseInstructions(instructionsText.value);

        for (const instructions of commands) {

            var isParallel = instructions.length > 1;
            if (isParallel) {
                instructions[instructions.length - 1].params.sync = 'true';
                textContainer.innerText = instructions.map(i => i.name).join('|');
            }
            for (const instruction of instructions) {

                if (!isParallel) {
                    textContainer.innerText = instruction.name;
                }
                switch (instruction.name) {

                    case 'from':

                        await new Promise((resolve) => {

                            loader.add(instruction.params.id, instruction.params.url);
                            loader.load((loader, resources) => {
                                const image = new PIXI.Sprite(resources[instruction.params.id].texture);
                                image.anchor.x = 0.5;
                                image.anchor.y = 0.5;
                                image.x = app.renderer.width / 2;
                                image.y = app.renderer.height / 2;
                                Object.assign(image, {
                                    id: instruction.params.id
                                });
                                stage.addChild(image);
                                objects.push(image);
                                resolve();
                            });
                        });
                        break;
                    case 'add':

                        await new Promise((resolve) => {

                            loader.add(instruction.params.id, instruction.params.url);
                            loader.load((loader, resources) => {
                                const sprite = new PIXI.Sprite(resources[instruction.params.id].texture);
                                sprite.x = Number(instruction.params.position.split(',')[0]);
                                sprite.y = Number(instruction.params.position.split(',')[1]);
                                sprite.anchor.x = 0.5;
                                sprite.anchor.y = 0.5;
                                sprite.y += sprite.height / 2;
                                sprite.x += sprite.width / 2;
                                sprite.alpha = instruction.params.opacity;
                                Object.assign(sprite, {
                                    id: instruction.params.id
                                });
                                stage.addChild(sprite);
                                objects.push(sprite);
                                resolve();
                            });
                        });
                        break;
                    case 'fadein':

                        var obj = objects.find((object) => object.id === instruction.params.id);

                        if (obj) {

                            TweenMax.to(obj, instruction.params.duration / 1000, {
                                alpha: 1
                            });
                        }
                        break;
                    case 'movesync':

                        await new Promise((resolve) => {

                            var obj = objects.find((object) => object.id === instruction.params.id);
                            if (obj) {
                                var position = instruction.params.position.split(',');
                                TweenMax.to(obj, instruction.params.duration / 1000, {
                                    x: Number(position[0]) + obj.width/2,
                                    y: Number(position[1]) + obj.height/2,
                                    onComplete: () => {
                                        resolve();
                                    }
                                });
                            }
                        });
                        break;
                    case 'rotate':

                        var obj = objects.find((object) => object.id === instruction.params.id);
                        if (obj) {

                            if (instruction.params.sync === 'true') {
                                await new Promise((resolve) => {

                                    TweenMax.to(obj, instruction.params.duration / 1000, {
                                        angle: Number(instruction.params.rotation),
                                        onComplete: () => {
                                            resolve();
                                        }
                                    });
                                });
                            } else {
                                TweenMax.to(obj, instruction.params.duration / 1000, {
                                    angle: Number(instruction.params.rotation)
                                });
                            }
                        }
                        break;
                    case 'fadeout':

                        var obj = objects.find((object) => object.id === instruction.params.id);
                        if (obj) {

                            TweenMax.to(obj, instruction.params.duration / 1000, {
                                alpha: 0
                            });
                        }
                        break;

                    case 'zoomx':

                        var obj = objects.find((object) => object.id === instruction.params.id);
                        if (obj) {

                            if (instruction.params.sync === 'true') {
                                await new Promise((resolve) => {

                                    TweenMax.to(obj.scale, instruction.params.duration / 1000, {
                                        x: Number(instruction.params.factor),
                                        onComplete: () => {
                                            resolve();
                                        }
                                    });
                                });
                            } else {
                                TweenMax.to(obj.scale, instruction.params.duration / 1000, {
                                    x: Number(instruction.params.factor)
                                });
                            }
                            
                        }
                        break;

                    case 'colorize':

                        var obj = objects.find((object) => object.id === instruction.params.id);
                        if (obj) {


                            if (instruction.params.sync === 'true') {
                                await new Promise((resolve) => {

                                    TweenMax.to(obj, instruction.params.duration / 1000, {
                                        pixi: { colorize: instruction.params.color, colorizeAmount:1 },
                                        onComplete: () => {
                                            resolve();
                                        }
                                    });
                                });
                            } else {
                                TweenMax.to(obj.scale, instruction.params.duration / 1000, {
                                    pixi: { colorize: instruction.params.color, colorizeAmount:1 }
                                });
                            }
                            
                        }
                        break;

                    case 'zoomy':

                        var obj = objects.find((object) => object.id === instruction.params.id);
                        if (obj) {

                            if (instruction.params.sync === 'true') {
                                await new Promise((resolve) => {

                                    TweenMax.to(obj.scale, instruction.params.duration / 1000, {
                                        y: Number(instruction.params.factor),
                                        onComplete: () => {
                                            resolve();
                                        }
                                    });
                                });
                            } else {
                                TweenMax.to(obj.scale, instruction.params.duration / 1000, {
                                    y: Number(instruction.params.factor)
                                });
                            }
                        }
                        break;

                    case 'horizontaltilt':

                        var obj = objects.find((object) => object.id === instruction.params.id);
                        if (obj) {

                            obj.convertTo2d();
                            obj.proj.affine = PIXI.projection.AFFINE.AXIS_X;
                            if (instruction.params.anchor === 'left') {
                                obj.anchor.x = 0;
                                obj.anchor.y = 0;
                            }
                            if (instruction.params.sync === 'true') {
                                await new Promise((resolve) => {

                                    TweenMax.to(obj, instruction.params.duration / 1000, {
                                        rotation: Math.PI,
                                        onComplete: () => {
                                            resolve();
                                        }
                                    });
                                });
                            } else {
                                TweenMax.to(obj, instruction.params.duration / 1000, {
                                    rotation: 1
                                });
                            }
                        }
                        break;

                    case 'verticaltilt':

                        var obj = objects.find((object) => object.id === instruction.params.id);
                        if (obj) {

                            obj.convertTo2d();
                            obj.proj.affine = PIXI.projection.AFFINE.AXIS_Y;
                            if (instruction.params.sync === 'true') {
                                await new Promise((resolve) => {

                                    TweenMax.to(obj, instruction.params.duration / 1000, {
                                        rotation: -Math.PI,
                                        onComplete: () => {
                                            resolve();
                                        }
                                    });
                                });
                            } else {
                                TweenMax.to(obj, instruction.params.duration / 1000, {
                                    rotation: -Math.PI
                                });
                            }
                        }
                        break;

                    case 'transition':

                        await new Promise((resolve) => {

                            if (!loader.resources[instruction.params.id]) {
                                loader.add(instruction.params.id, instruction.params.url);
                            }
                            loader.load((loader, resources) => {
                                
                                var from = objects.find((object) => object.id === instruction.params.from);
                                var uniforms = {
                                    smoothness: instruction.params.smoothness,
                                    progress: 0
                                };
                                for (var i = 0; i < 2; i++) {
                                    uniforms['uTexture' + (i + 1)] = resources['image' + (i + 1)].texture;
                                }
                                var filter = new PIXI.Filter(null, getTransitionFragmentShader(instruction.params.name, 2), uniforms);
                                filter.apply = function (filterManager, input, output, clear) {
                                    var matrix = new PIXI.Matrix();
                                    this.uniforms.mappedMatrix = filterManager.calculateNormalizedScreenSpaceMatrix(matrix);

                                    PIXI.Filter.prototype.apply.call(this, filterManager, input, output, clear);
                                };
                                from.filters = [filter];
                                TweenMax.to(filter.uniforms, instruction.params.duration / 1000, {
                                    progress: 1,
                                    onComplete: () => {
                                        resolve();
                                    }
                                });
                            });
                        });
                        executeButton.disabled = false;
                        if (recording) {
                            recording = false;
                            loaderDiv.style.display = 'block';
                            loaderDiv.innerText = 'Loading video...';
                            encoder.compile(false, (output) => {
                                var url = (window.webkitURL || window.URL).createObjectURL(output);
                                loaderDiv.style.display = 'none';
                                loaderDiv.innerText = '';
                                var videoEl = document.getElementsByTagName('video')[0];
                                var a = document.createElement('a');
                                a.download = 'test_video.webm';
                                a.href = url;
                                a.style.display = 'none';
                                document.body.appendChild(a);
                                a.click();
                                setTimeout(() => a.remove());
                                videoEl.src = url;
                                videoEl.load();
                                videoEl.onloadeddata = () => {
                                    videoEl.play();
                                };
                            });
                        }
                        break;
                }
            }
        }
    }

    function clearStage() {
        loader.reset();
        for (var i = stage.children.length - 1; i >= 0; i--) {	stage.removeChild(stage.children[i]);};
    }

    var timerStart = performance.now();
    var frames = 0;
    function update(){

        /* Loop this function */
        requestAnimationFrame(update);

        /* Tell the `renderer` to `render` the `stage` */
        renderer.render(stage);

        /* Record Video */
        if(recording) {

            ctx.drawImage(renderer.view, 0, 0);
            frames++;
            encoder.add(ctx);
        }
    }
    update();

    // loader.add('image1', 'image1.jpg');
    // loader.add('image2', 'image2.jpg');
    // loader.add('sprite', 'sprite.png')

    // var imageCount = 2;

    // // load the texture we need
    // loader.load((loader, resources) => {

    //     var chooseTransitionSelect = document.getElementById('chooseTransitionSelect');
    //     chooseTransitionSelect.disabled = true;
    //     // This creates a texture from a 'bunny.png' image
    //     const image1 = new PIXI.Sprite(resources.image1.texture);
    //     image1.anchor.x = 0.5;
    //     image1.anchor.y = 0.5;
    //     image1.x = app.renderer.width / 2;
    //     image1.y = app.renderer.height / 2;

    //     var uniforms = {
    //         smoothness: 0.9,
    //         progress: 0
    //     };
    //     for (var i = 0; i < imageCount; i++) {
    //         uniforms['uTexture' + (i + 1)] = resources['image' + (i + 1)].texture;
    //     }

    //     var filter = new PIXI.Filter(null, getTransitionFragmentShader('doorway', imageCount), uniforms);

    //     filter.apply = function (filterManager, input, output, clear) {
    //         var matrix = new PIXI.Matrix();
    //         this.uniforms.mappedMatrix = filterManager.calculateNormalizedScreenSpaceMatrix(matrix);

    //         PIXI.Filter.prototype.apply.call(this, filterManager, input, output, clear);
    //     };

    //     image1.filters = [filter];

    //     // Add the bunny to the scene we are building
    //     stage.addChild(image1);

    //     // Listen for frame updates
    //     TweenMax.to(filter.uniforms, 3, {
    //         progress: 1,
    //         onComplete: () => { chooseTransitionSelect.disabled = false; }
    //     });
    //     const sprite1 = new PIXI.Sprite(resources.sprite.texture);
    //     const sprite2 = new PIXI.Sprite(resources.sprite.texture);

    //     sprite1.x = app.renderer.width/2 - sprite1.width/2;
    //     sprite1.y = app.renderer.height/2 - sprite1.height/2;

    //     sprite2.x = app.renderer.width/2 - sprite2.width/2;
    //     sprite2.y = app.renderer.height/2 - sprite2.height/2;

    //     stage.addChild(sprite1);
    //     stage.addChild(sprite2);

    //     TweenMax.to(sprite1, 3.5, {
    //         x: 0 - sprite1.width
    //     });
    //     TweenMax.to(sprite2, 3.5, {
    //         x: app.renderer.width
    //     });

    //     chooseTransitionSelect.onchange = () => {

    //         var transition = chooseTransitionSelect.options[chooseTransitionSelect.selectedIndex].value;

    //         filter = new PIXI.Filter(null, getTransitionFragmentShader(transition, imageCount), uniforms);
    //         filter.apply = function (filterManager, input, output, clear) {
    //             var matrix = new PIXI.Matrix();
    //             this.uniforms.mappedMatrix = filterManager.calculateNormalizedScreenSpaceMatrix(matrix);

    //             PIXI.Filter.prototype.apply.call(this, filterManager, input, output, clear);
    //         };
    //         filter.uniforms.progress = 0;

    //         image1.filters = [filter];
    //         chooseTransitionSelect.disabled = true;

    //         switch(transition) {
    //             case 'directionalwipe':
    //             case 'circleopen':
    //             case 'windowslice':
    //                 TweenMax.to(filter.uniforms, 3, {
    //                     progress: 1,
    //                     onComplete: () => { chooseTransitionSelect.disabled = false; }
    //                 });
    //                 break;
    //             case 'doorway':
    //                 TweenMax.to(filter.uniforms, 3, {
    //                     progress: 1,
    //                     onComplete: () => { chooseTransitionSelect.disabled = false; }
    //                 });
    //                 sprite1.x = app.renderer.width/2 - sprite1.width/2;
    //                 sprite1.y = app.renderer.height/2 - sprite1.height/2;

    //                 sprite2.x = app.renderer.width/2 - sprite2.width/2;
    //                 sprite2.y = app.renderer.height/2 - sprite2.height/2;
    //                 TweenMax.to(sprite1, 3.5, {
    //                     x: 0 - sprite1.width
    //                 });
    //                 TweenMax.to(sprite2, 3.5, {
    //                     x: app.renderer.width
    //                 });
    //                 break;
                
    //         }
    //     };
    // });
});
