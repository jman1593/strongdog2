"use strict";
var Engine;
(function (Engine) {
    var Asset = /** @class */ (function () {
        function Asset(path) {
            this.headerReceived = false;
            this.size = 0;
            this.downloadedSize = 0;
            this.path = Assets.root + path;
        }
        return Asset;
    }());
    var ImageAssetData = /** @class */ (function () {
        function ImageAssetData(xSize, ySize, xSizeSource, ySizeSource, imageData, bytes, filterable) {
            this.xSize = xSize;
            this.ySize = ySize;
            this.xSizeSource = xSizeSource;
            this.ySizeSource = ySizeSource;
            this.imageData = imageData;
            this.bytes = bytes;
            this.filterable = filterable;
        }
        return ImageAssetData;
    }());
    Engine.ImageAssetData = ImageAssetData;
    var Assets = /** @class */ (function () {
        function Assets() {
        }
        Assets.downloadNextAssetHeader = function () {
            Assets.currentAsset = Assets.assets[Assets.assetHeaderDownloadIndex];
            var xhr = new XMLHttpRequest();
            xhr.onloadstart = function () {
                this.responseType = "arraybuffer";
            };
            //xhr.responseType = "arraybuffer";
            xhr.open("GET", Assets.currentAsset.path, true);
            xhr.onreadystatechange = function () {
                if (this.readyState == this.HEADERS_RECEIVED) {
                    Assets.currentAsset.headerReceived = true;
                    if (this.getResponseHeader("Content-Length") != null) {
                        Assets.currentAsset.size = +this.getResponseHeader("Content-Length");
                    }
                    else {
                        Assets.currentAsset.size = 1;
                    }
                    this.abort();
                    Assets.assetHeaderDownloadIndex += 1;
                    if (Assets.assetHeaderDownloadIndex == Assets.assets.length) {
                        Assets.downloadNextAssetBlob();
                    }
                    else {
                        Assets.downloadNextAssetHeader();
                    }
                }
            };
            xhr.onerror = function () {
                //console.log("ERROR");
                Assets.downloadNextAssetHeader();
            };
            xhr.send();
        };
        Assets.downloadNextAssetBlob = function () {
            Assets.currentAsset = Assets.assets[Assets.assetBlobDownloadIndex];
            var xhr = new XMLHttpRequest();
            xhr.onloadstart = function () {
                if (Assets.currentAsset.path.indexOf(".json") > 0 || Assets.currentAsset.path.indexOf(".txt") > 0 || Assets.currentAsset.path.indexOf(".glsl") > 0) {
                    xhr.responseType = "text";
                }
                else {
                    xhr.responseType = "arraybuffer";
                }
            };
            /*
            if(Assets.currentAsset.path.indexOf(".json") > 0 || Assets.currentAsset.path.indexOf(".txt") > 0 || Assets.currentAsset.path.indexOf(".glsl") > 0){
                xhr.responseType = "text";
            }
            else{
                xhr.responseType = "arraybuffer";
            }
            */
            xhr.open("GET", Assets.currentAsset.path, true);
            xhr.onprogress = function (e) {
                Assets.currentAsset.downloadedSize = e.loaded;
                if (Assets.currentAsset.downloadedSize > Assets.currentAsset.size) {
                    Assets.currentAsset.downloadedSize = Assets.currentAsset.size;
                }
            };
            xhr.onreadystatechange = function () {
                if (this.readyState == XMLHttpRequest.DONE) {
                    if (this.status == 200 || this.status == 304 || this.status == 206 || (this.status == 0 && this.response)) {
                        Assets.currentAsset.downloadedSize = Assets.currentAsset.size;
                        if (Assets.currentAsset.path.indexOf(".png") > 0 || Assets.currentAsset.path.indexOf(".jpg") > 0 || Assets.currentAsset.path.indexOf(".jpeg") > 0 || Assets.currentAsset.path.indexOf(".jpe") > 0) {
                            Assets.currentAsset.blob = new Blob([new Uint8Array(this.response)]);
                            Assets.prepareImageAsset();
                        }
                        else if (Assets.currentAsset.path.indexOf(".m4a") > 0 || Assets.currentAsset.path.indexOf(".ogg") > 0 || Assets.currentAsset.path.indexOf(".wav") > 0) {
                            Assets.currentAsset.buffer = this.response;
                            Assets.prepareSoundAsset();
                        }
                        else if (Assets.currentAsset.path.indexOf(".json") > 0 || Assets.currentAsset.path.indexOf(".txt") > 0 || Assets.currentAsset.path.indexOf(".glsl") > 0) {
                            Assets.currentAsset.text = xhr.responseText;
                            Assets.stepAssetDownloadQueue();
                        }
                        else {
                            Assets.currentAsset.blob = this.response;
                            Assets.stepAssetDownloadQueue();
                        }
                    }
                    else {
                        //console.log("ERROR");
                        Assets.downloadNextAssetBlob();
                    }
                }
            };
            xhr.onerror = function () {
                //console.log("ERROR");
                Assets.downloadNextAssetBlob();
            };
            xhr.send();
        };
        Assets.stepAssetDownloadQueue = function () {
            Assets.assetBlobDownloadIndex += 1;
            if (Assets.assetBlobDownloadIndex == Assets.assets.length) {
                Assets.downloadingAssets = false;
            }
            else {
                Assets.downloadNextAssetBlob();
            }
        };
        Assets.prepareImageAsset = function () {
            Assets.currentAsset.image = document.createElement("img");
            Assets.currentAsset.image.onload = function () {
                Assets.currentAsset.blob = null;
                Assets.stepAssetDownloadQueue();
            };
            Assets.currentAsset.image.onerror = function () {
                //console.log("ERROR");
                Assets.prepareImageAsset();
            };
            Assets.currentAsset.image.src = URL.createObjectURL(Assets.currentAsset.blob);
        };
        Assets.prepareSoundAsset = function () {
            if (Engine.AudioManager.mode == Engine.AudioManagerMode.HTML) {
                Assets.currentAsset.blob = new Blob([new Uint8Array(Assets.currentAsset.buffer)]);
                Assets.currentAsset.audioURL = URL.createObjectURL(Assets.currentAsset.blob);
                Assets.stepAssetDownloadQueue();
            }
            else if (Engine.AudioManager.mode == Engine.AudioManagerMode.WEB) {
                //@ts-ignore
                Engine.AudioManager.context.decodeAudioData(Assets.currentAsset.buffer, function (buffer) {
                    Assets.currentAsset.audio = buffer;
                    Assets.currentAsset.buffer = null;
                    Assets.stepAssetDownloadQueue();
                }, function () {
                    //console.log("ERROR");
                    Assets.prepareSoundAsset();
                });
            }
            else {
                Assets.stepAssetDownloadQueue();
            }
        };
        Assets.queue = function (path) {
            if (Assets.downloadingAssets) {
                console.log("ERROR");
            }
            else {
                if (path.indexOf(".ogg") > 0 || path.indexOf(".m4a") > 0 || path.indexOf(".wav") > 0) {
                    console.log("ERROR");
                }
                else if (path.indexOf(".omw") > 0 || path.indexOf(".owm") > 0 || path.indexOf(".mow") > 0 || path.indexOf(".mwo") > 0 || path.indexOf(".wom") > 0 || path.indexOf(".wmo") > 0) {
                    path = Assets.findAudioExtension(path);
                    if (path == "") {
                        console.log("ERROR");
                        return;
                    }
                }
                Assets.assets.push(new Asset(path));
            }
        };
        Assets.download = function () {
            if (Assets.downloadingAssets) {
                console.log("ERROR");
            }
            else if (Assets.assetHeaderDownloadIndex >= Assets.assets.length) {
                console.log("ERROR");
            }
            else {
                Assets.assetQueueStart = Assets.assetHeaderDownloadIndex;
                Assets.downloadingAssets = true;
                Assets.downloadNextAssetHeader();
            }
        };
        Object.defineProperty(Assets, "downloadSize", {
            get: function () {
                var retSize = 0;
                for (var assetIndex = Assets.assetQueueStart; assetIndex < Assets.assets.length; assetIndex += 1) {
                    if (!Assets.assets[assetIndex].headerReceived) {
                        return 0;
                    }
                    retSize += Assets.assets[assetIndex].size;
                }
                return retSize;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Assets, "downloadedSize", {
            get: function () {
                var retSize = 0;
                for (var assetIndex = Assets.assetQueueStart; assetIndex < Assets.assets.length; assetIndex += 1) {
                    retSize += Assets.assets[assetIndex].downloadedSize;
                }
                return retSize;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Assets, "downloadedRatio", {
            get: function () {
                var size = Assets.downloadSize;
                if (size == 0) {
                    return 0;
                }
                return Assets.downloadedSize / size;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Assets, "downloadComplete", {
            get: function () {
                var size = Assets.downloadSize;
                if (size == 0) {
                    return false;
                }
                return Assets.downloadedSize == size && !Assets.downloadingAssets;
            },
            enumerable: false,
            configurable: true
        });
        Assets.findAsset = function (path) {
            path = Assets.root + path;
            for (var assetIndex = 0; assetIndex < Assets.assets.length; assetIndex += 1) {
                if (Assets.assets[assetIndex].path == path) {
                    return Assets.assets[assetIndex];
                }
            }
            console.log("error");
            return null;
        };
        Assets.isPOW2 = function (value) {
            return (value != 0) && ((value & (value - 1)) == 0);
        };
        Assets.getNextPOW = function (value) {
            var xSizePOW2 = 2;
            while (xSizePOW2 < value) {
                xSizePOW2 *= 2;
            }
            return xSizePOW2;
        };
        Assets.loadImage = function (path) {
            var asset = Assets.findAsset(path);
            if (asset == null || asset.image == null) {
                console.log("ERROR");
                return null;
            }
            else {
                if (Engine.Renderer.mode == Engine.RendererMode.CANVAS_2D) {
                    var canvas = document.createElement("canvas");
                    canvas.width = asset.image.width;
                    canvas.height = asset.image.height;
                    var ctx = canvas.getContext("2d");
                    ctx.drawImage(asset.image, 0, 0);
                    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    return new ImageAssetData(canvas.width, canvas.height, canvas.width, canvas.height, imageData, imageData.data, false);
                }
                else {
                    var xSize = asset.image.width;
                    var ySize = asset.image.height;
                    if (this.isPOW2(xSize) && this.isPOW2(ySize)) {
                        var canvas = document.createElement("canvas");
                        canvas.width = asset.image.width;
                        canvas.height = asset.image.height;
                        var ctx = canvas.getContext("2d");
                        ctx.drawImage(asset.image, 0, 0);
                        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        return new ImageAssetData(canvas.width, canvas.height, canvas.width, canvas.height, imageData, imageData.data, true);
                    }
                    else {
                        //@ts-ignore
                        var maxDim = Engine.Renderer.gl.getParameter(Engine.Renderer.gl.MAX_TEXTURE_SIZE);
                        if (xSize <= maxDim && ySize <= maxDim) {
                            var xSizePOW2 = Assets.getNextPOW(xSize);
                            var ySizePOW2 = Assets.getNextPOW(ySize);
                            var canvas = document.createElement("canvas");
                            canvas.width = xSizePOW2;
                            canvas.height = ySizePOW2;
                            var ctx = canvas.getContext("2d");
                            ctx.drawImage(asset.image, 0, 0);
                            var imageData = ctx.getImageData(0, 0, xSizePOW2, ySizePOW2);
                            return new ImageAssetData(canvas.width, canvas.height, xSize, ySize, imageData, imageData.data, true);
                        }
                        else {
                            var canvas = document.createElement("canvas");
                            canvas.width = asset.image.width;
                            canvas.height = asset.image.height;
                            var ctx = canvas.getContext("2d");
                            ctx.drawImage(asset.image, 0, 0);
                            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            return new ImageAssetData(canvas.width, canvas.height, canvas.width, canvas.height, imageData, imageData.data, false);
                        }
                    }
                }
            }
        };
        Assets.loadText = function (path) {
            var asset = Assets.findAsset(path);
            if (asset == null || asset.text == null) {
                console.log("ERROR");
                return null;
            }
            else {
                return asset.text;
            }
        };
        ;
        Assets.loadAudio = function (path) {
            var asset = Assets.findAsset(Assets.findAudioExtension(path));
            if (asset == null || asset.audio == null) {
                console.log("ERROR");
                return null;
            }
            else {
                return asset.audio;
            }
        };
        Assets.root = "";
        Assets.assets = new Array();
        Assets.assetQueueStart = 0;
        Assets.assetHeaderDownloadIndex = 0;
        Assets.assetBlobDownloadIndex = 0;
        Assets.downloadingAssets = false;
        Assets.findAudioExtension = function (path) {
            var extFind = "";
            var extReplace = "";
            if (path.indexOf(".omw") > 0) {
                extFind = ".omw";
                if (Engine.AudioManager.oggSupported) {
                    extReplace = ".ogg";
                }
                else if (Engine.AudioManager.aacSupported) {
                    extReplace = ".m4a";
                }
                else if (Engine.AudioManager.wavSupported) {
                    extReplace = ".wav";
                }
                else {
                    return "";
                }
            }
            else if (path.indexOf(".owm") > 0) {
                extFind = ".owm";
                if (Engine.AudioManager.oggSupported) {
                    extReplace = ".ogg";
                }
                else if (Engine.AudioManager.wavSupported) {
                    extReplace = ".wav";
                }
                else if (Engine.AudioManager.aacSupported) {
                    extReplace = ".m4a";
                }
                else {
                    return "";
                }
            }
            else if (path.indexOf(".mow") > 0) {
                extFind = ".mow";
                if (Engine.AudioManager.aacSupported) {
                    extReplace = ".m4a";
                }
                else if (Engine.AudioManager.oggSupported) {
                    extReplace = ".ogg";
                }
                else if (Engine.AudioManager.wavSupported) {
                    extReplace = ".wav";
                }
                else {
                    return "";
                }
            }
            else if (path.indexOf(".mwo") > 0) {
                extFind = ".mwo";
                if (Engine.AudioManager.aacSupported) {
                    extReplace = ".m4a";
                }
                else if (Engine.AudioManager.wavSupported) {
                    extReplace = ".wav";
                }
                else if (Engine.AudioManager.oggSupported) {
                    extReplace = ".ogg";
                }
                else {
                    return "";
                }
            }
            else if (path.indexOf(".wom") > 0) {
                extFind = ".wom";
                if (Engine.AudioManager.wavSupported) {
                    extReplace = ".wav";
                }
                else if (Engine.AudioManager.oggSupported) {
                    extReplace = ".ogg";
                }
                else if (Engine.AudioManager.aacSupported) {
                    extReplace = ".m4a";
                }
                else {
                    return "";
                }
            }
            else if (path.indexOf(".wmo") > 0) {
                extFind = ".wmo";
                if (Engine.AudioManager.wavSupported) {
                    extReplace = ".wav";
                }
                else if (Engine.AudioManager.aacSupported) {
                    extReplace = ".m4a";
                }
                else if (Engine.AudioManager.oggSupported) {
                    extReplace = ".ogg";
                }
                else {
                    return "";
                }
            }
            else {
                return "";
            }
            var folder = (extReplace == ".ogg" ? "OGG/" : (extReplace == ".m4a" ? "M4A/" : "WAV/"));
            var slashIndex = path.lastIndexOf("/") + 1;
            path = path.substr(0, slashIndex) + folder + path.substr(slashIndex);
            return path.substr(0, path.indexOf(extFind)) + extReplace;
        };
        return Assets;
    }());
    Engine.Assets = Assets;
})(Engine || (Engine = {}));
var Engine;
(function (Engine) {
    var AudioPlayer = /** @class */ (function () {
        function AudioPlayer(path) {
            this.loopStart = 0;
            this.loopEnd = 0;
            //TODO: NOT OPTIMAL, CHANGE THIS
            this.restoreVolume = 1;
            this._volume = 1;
            this._muted = false;
            if (!Engine.System.canCreateScene) {
                console.log("error");
            }
            //@ts-ignore
            Engine.AudioManager.players.push(this);
            this.path = path;
            if (Engine.AudioManager.mode == Engine.AudioManagerMode.WEB) {
                this.buffer = Engine.Assets.loadAudio(path);
                //@ts-ignore
                this.volumeGain = Engine.AudioManager.context.createGain();
                //@ts-ignore
                this.volumeGain.connect(Engine.AudioManager.context.destination);
                //@ts-ignore
                this.extraGain = Engine.AudioManager.context.createGain();
                this.extraGain.connect(this.volumeGain);
                //@ts-ignore
                this.gaingain = Engine.AudioManager.context.createGain();
                this.gaingain.connect(this.extraGain);
                //@ts-ignore
                this.muteGain = Engine.AudioManager.context.createGain();
                this.muteGain.connect(this.gaingain);
            }
            else if (Engine.AudioManager.mode == Engine.AudioManagerMode.HTML) {
                this.path = path;
                this.lockTime = -1;
                this.htmlAudio = new Audio();
                this.htmlAudio.src = Engine.Assets.findAsset(Engine.Assets.findAudioExtension(path)).audioURL;
                var that = this;
                this.htmlAudio.addEventListener('timeupdate', function () {
                    if (Engine.System.pauseCount > 0 && that.lockTime >= 0) {
                        this.currentTime = that.lockTime;
                    }
                    else {
                        if (that.loopEnd > 0 && (this.currentTime > that.loopEnd || that.htmlAudio.ended)) {
                            this.currentTime = that.loopStart;
                            this.play();
                        }
                    }
                }, false);
            }
            this.muted = false;
        }
        Object.defineProperty(AudioPlayer.prototype, "volume", {
            get: function () {
                return this._volume;
            },
            set: function (value) {
                if (Engine.AudioManager.mode == Engine.AudioManagerMode.WEB) {
                    this._volume = value;
                    this.volumeGain.gain.value = value;
                }
                else if (Engine.AudioManager.mode == Engine.AudioManagerMode.HTML) {
                    this._volume = value;
                    this.htmlAudio.volume = value;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AudioPlayer.prototype, "muted", {
            get: function () {
                return this._muted;
            },
            set: function (value) {
                if (Engine.AudioManager.mode == Engine.AudioManagerMode.WEB) {
                    this._muted = value;
                    //@ts-ignore
                    this.muteGain.gain.value = (this._muted || Engine.AudioManager._muted || Engine.System.pauseCount > 0) ? 0 : 1;
                }
                else if (Engine.AudioManager.mode == Engine.AudioManagerMode.HTML) {
                    this._muted = value;
                    //@ts-ignore
                    this.htmlAudio.muted = this._muted || Engine.AudioManager._muted || Engine.System.pauseCount > 0;
                }
            },
            enumerable: false,
            configurable: true
        });
        //@ts-ignore
        AudioPlayer.recycleAll = function () {
            var newPlayers = new Array();
            //@ts-ignore
            for (var _i = 0, _a = Engine.AudioManager.players; _i < _a.length; _i++) {
                var player = _a[_i];
                var owner = player;
                while (owner.owner != null) {
                    owner = owner.owner;
                }
                if (owner.preserved) {
                    newPlayers.push(player);
                }
                else {
                    player.destroy();
                }
            }
            //@ts-ignore
            Engine.AudioManager.players = newPlayers;
        };
        /*
        //@ts-ignore
        private verify(){
            if(AudioManager.mode == AudioManagerMode.WEB){
                
            }
            else if(AudioManager.mode == AudioManagerMode.HTML){
                if(this.autoplayed){
                    //@ts-ignore
                    this.autoplayed = false;
                    this.play();
                    if(System.pauseCount > 0){
                        this.lockTime = this.htmlAudio.currentTime;
                        this.muted = this._muted;
                    }
                }
            }
        }
        */
        //@ts-ignore
        AudioPlayer.prototype.pause = function () {
            if (Engine.AudioManager.mode == Engine.AudioManagerMode.WEB) {
            }
            else if (Engine.AudioManager.mode == Engine.AudioManagerMode.HTML) {
                if (this.played) {
                    this.lockTime = this.htmlAudio.currentTime;
                    this.muted = this._muted;
                }
            }
        };
        //@ts-ignore
        AudioPlayer.prototype.resume = function () {
            if (Engine.AudioManager.mode == Engine.AudioManagerMode.WEB) {
            }
            else if (Engine.AudioManager.mode == Engine.AudioManagerMode.HTML) {
                if (this.played) {
                    this.htmlAudio.currentTime = this.lockTime;
                    this.lockTime = -1;
                    this.muted = this._muted;
                }
            }
        };
        AudioPlayer.prototype.destroy = function () {
            this.muted = true;
            this.stop();
        };
        AudioPlayer.prototype.boxPlay = function (box, xExpand, yExpand, shake, pitch) {
            if (xExpand === void 0) { xExpand = 0; }
            if (yExpand === void 0) { yExpand = 0; }
            if (shake === void 0) { shake = false; }
            if (pitch === void 0) { pitch = 1; }
            if (AudioPlayer.viewBox == null) {
                AudioPlayer.viewBox = new Engine.Box();
            }
            AudioPlayer.viewBox.x = Game.pla.horcam - Engine.Renderer.xSizeView * 0.5 - xExpand * 0.5;
            AudioPlayer.viewBox.y = Game.pla.vercam - Engine.Renderer.ySizeView * 0.5 - yExpand * 0.5;
            AudioPlayer.viewBox.xSize = Engine.Renderer.xSizeView + xExpand;
            AudioPlayer.viewBox.ySize = Engine.Renderer.ySizeView + yExpand;
            if (AudioPlayer.viewBox.collideAgainst(box, null, true, 0, false, Engine.Box.LAYER_ALL)) {
                this.play(pitch);
                if (shake)
                    Game.LevelShake.instance.start(1);
            }
        };
        AudioPlayer.onScreen = function (box, xExpand, yExpand) {
            if (xExpand === void 0) { xExpand = 0; }
            if (yExpand === void 0) { yExpand = 0; }
            if (AudioPlayer.viewBox == null) {
                AudioPlayer.viewBox = new Engine.Box();
            }
            AudioPlayer.viewBox.x = Game.pla.horcam - Engine.Renderer.xSizeView * 0.5 - xExpand * 0.5;
            AudioPlayer.viewBox.y = Game.pla.vercam - Engine.Renderer.ySizeView * 0.5 - yExpand * 0.5;
            AudioPlayer.viewBox.xSize = Engine.Renderer.xSizeView + xExpand;
            AudioPlayer.viewBox.ySize = Engine.Renderer.ySizeView + yExpand;
            return AudioPlayer.viewBox.collideAgainst(box, null, true, 0, false, Engine.Box.LAYER_ALL) != null;
        };
        AudioPlayer.prototype.play = function (pitch) {
            if (pitch === void 0) { pitch = 1; }
            if (Engine.AudioManager.mode == Engine.AudioManagerMode.WEB) {
                //if(AudioManager.verified){
                this.autoplay(pitch);
                //}
            }
            else if (Engine.AudioManager.mode == Engine.AudioManagerMode.HTML) {
                //if(AudioManager.verified){
                //@ts-ignore
                this.played = true;
                try {
                    this.htmlAudio.currentTime = 0;
                }
                catch (e) {
                }
                this.htmlAudio.playbackRate = pitch;
                this.htmlAudio.play();
                //}
            }
        };
        AudioPlayer.prototype.autoplay = function (pitch) {
            if (pitch === void 0) { pitch = 1; }
            if (Engine.AudioManager.mode == Engine.AudioManagerMode.WEB) {
                if (this.played) {
                    this.source.stop();
                }
                this.gaingain.gain.value = 1;
                //@ts-ignore
                this.played = true;
                //@ts-ignore
                this.source = Engine.AudioManager.context.createBufferSource();
                this.source.buffer = this.buffer;
                this.source.loop = this.loopEnd > 0;
                this.source.playbackRate.value = pitch;
                if (this.source.loop) {
                    this.source.loopStart = this.loopStart;
                    this.source.loopEnd = this.loopEnd;
                }
                this.source.connect(this.muteGain);
                //@ts-ignore
                this.source[this.source.start ? 'start' : 'noteOn'](0, this.source.loop ? 150 * 0 : 0);
            }
            else if (Engine.AudioManager.mode == Engine.AudioManagerMode.HTML) {
                //if(AudioManager.verified){
                this.play();
                //}
                //else{
                //@ts-ignore
                //    this.autoplayed = true;
                //}
            }
        };
        AudioPlayer.prototype.stop = function () {
            if (Engine.AudioManager.mode == Engine.AudioManagerMode.WEB) {
                if (this.played) {
                    this.source.stop();
                }
            }
            else if (Engine.AudioManager.mode == Engine.AudioManagerMode.HTML) {
                if ( /*AudioManager.verified &&*/this.played) {
                    this.htmlAudio.currentTime = 0;
                    this.htmlAudio.pause();
                }
                //else if(this.autoplay){
                //@ts-ignore
                //    this.autoplayed = false;
                //}
            }
        };
        AudioPlayer.viewBox = null;
        return AudioPlayer;
    }());
    Engine.AudioPlayer = AudioPlayer;
})(Engine || (Engine = {}));
///<reference path="AudioPlayer.ts"/>
var Engine;
(function (Engine) {
    var AudioManagerMode;
    (function (AudioManagerMode) {
        AudioManagerMode[AudioManagerMode["NONE"] = 0] = "NONE";
        AudioManagerMode[AudioManagerMode["HTML"] = 1] = "HTML";
        AudioManagerMode[AudioManagerMode["WEB"] = 2] = "WEB";
    })(AudioManagerMode = Engine.AudioManagerMode || (Engine.AudioManagerMode = {}));
    var AudioManager = /** @class */ (function () {
        function AudioManager() {
        }
        Object.defineProperty(AudioManager, "muted", {
            get: function () {
                return AudioManager._muted;
            },
            set: function (value) {
                AudioManager._muted = value;
                for (var _i = 0, _a = AudioManager.players; _i < _a.length; _i++) {
                    var player = _a[_i];
                    //@ts-ignore
                    player.muted = player._muted;
                }
            },
            enumerable: false,
            configurable: true
        });
        //@ts-ignore
        AudioManager.init = function () {
            //@ts-ignore
            AudioManager.supported = window.Audio !== undefined;
            //@ts-ignore
            AudioManager.webSupported = window.AudioContext !== undefined || window.webkitAudioContext !== undefined;
            if (AudioManager.supported) {
                var audio = new Audio();
                //@ts-ignore
                AudioManager.wavSupported = audio.canPlayType("audio/wav; codecs=2").length > 0 || audio.canPlayType("audio/wav; codecs=1").length > 0 || audio.canPlayType("audio/wav; codecs=0").length > 0 || audio.canPlayType("audio/wav").length > 0;
                //@ts-ignore
                AudioManager.oggSupported = audio.canPlayType("audio/ogg; codecs=vorbis").length > 0 || audio.canPlayType("audio/ogg").length > 0;
                //@ts-ignore
                AudioManager.aacSupported = /*audio.canPlayType("audio/m4a").length > 0 ||*/ audio.canPlayType("audio/aac").length > 0 || audio.canPlayType("audio/mp4").length > 0;
            }
            //@ts-ignore
            AudioManager.supported = AudioManager.wavSupported || AudioManager.oggSupported || AudioManager.aacSupported;
            if (!AudioManager.supported || AudioManager.preferredMode == AudioManagerMode.NONE) {
                if (AudioManager.preferredMode == AudioManagerMode.NONE) {
                    console.error("Set \"AudioManager.preferredMode = AudioManagerMode.NONE\" only for testing proposes.");
                }
                //@ts-ignore
                AudioManager.mode = AudioManagerMode.NONE;
            }
            else if (AudioManager.webSupported && AudioManager.preferredMode == AudioManagerMode.WEB) {
                //@ts-ignore
                AudioManager.mode = AudioManagerMode.WEB;
                //@ts-ignore
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                //@ts-ignore
                AudioManager.context = new window.AudioContext();
                AudioManager.context.suspend();
                //@ts-ignore
                AudioManager.context.createGain = AudioManager.context.createGain || AudioManager.context.createGainNode;
            }
            else {
                if (AudioManager.preferredMode == AudioManagerMode.HTML) {
                    console.error("Set \"AudioManager.preferredMode = AudioManagerMode.HTML\" only for testing proposes.");
                }
                //@ts-ignore
                AudioManager.mode = AudioManagerMode.HTML;
            }
            //@ts-ignore
            AudioManager.inited = true;
        };
        //@ts-ignore
        AudioManager.verify = function () {
            if (Engine.System.pauseCount == 0 && AudioManager.inited && !AudioManager.verified) {
                if (AudioManager.mode == AudioManagerMode.WEB) {
                    AudioManager.context.resume();
                    if (Engine.System.pauseCount > 0) {
                        //    AudioManager.context.suspend();
                    }
                }
                //for(var player of AudioManager.players){
                //@ts-ignore
                //player.verify();
                //}
                //@ts-ignore
                AudioManager.verified = true;
            }
            if (AudioManager.verified && AudioManager.mode == AudioManagerMode.WEB && AudioManager.context.state == "suspended") {
                AudioManager.context.resume();
            }
        };
        //@ts-ignore
        AudioManager.pause = function () {
            /*
            if(AudioManager.mode == AudioManagerMode.WEB){
                if(AudioManager.verified){
                    AudioManager.context.suspend();
                }
            }
            for(var player of AudioManager.players){
                //@ts-ignore
                player.pause();
            }
            */
        };
        //@ts-ignore
        AudioManager.resume = function () {
            /*
            if(AudioManager.mode == AudioManagerMode.WEB){
                if(AudioManager.verified){
                    AudioManager.context.resume();
                }
            }
            for(var player of AudioManager.players){
                //@ts-ignore
                player.resume();
            }
            */
        };
        //@ts-ignore
        AudioManager.checkSuspended = function () {
            if (Engine.System.pauseCount == 0 && AudioManager.inited && AudioManager.mode == AudioManagerMode.WEB && AudioManager.context.state == "suspended") {
                AudioManager.context.resume();
            }
        };
        AudioManager.preferredMode = AudioManagerMode.WEB;
        AudioManager.wavSupported = false;
        AudioManager.oggSupported = false;
        AudioManager.aacSupported = false;
        AudioManager.verified = false;
        AudioManager.supported = false;
        AudioManager.webSupported = false;
        AudioManager.players = new Array();
        AudioManager._muted = false;
        return AudioManager;
    }());
    Engine.AudioManager = AudioManager;
})(Engine || (Engine = {}));
var Engine;
(function (Engine) {
    var InteractableBounds = /** @class */ (function () {
        function InteractableBounds() {
            this.enabled = false;
            this.pinned = false;
            this.x = 0;
            this.y = 0;
            this.xSize = 8;
            this.ySize = 8;
            this.xOffset = 0;
            this.yOffset = 0;
            this.xScale = 1;
            this.yScale = 1;
            this.xMirror = false;
            this.yMirror = false;
            this.angle = 0;
            this.useTouchRadius = true;
            this.data = null;
            this.topleftpin = false;
            this.topleftx = 3;
            this.toplefty = 3;
        }
        Object.defineProperty(InteractableBounds.prototype, "mouseOver", {
            get: function () {
                if (this.pinned) {
                    var x0 = Engine.Renderer.xViewToWindow(this.x + this.xOffset * this.xScale);
                    var y0 = Engine.Renderer.yViewToWindow(this.y + this.yOffset * this.yScale);
                    var x1 = Engine.Renderer.xViewToWindow(this.x + (this.xSize + this.xOffset) * this.xScale);
                    var y1 = Engine.Renderer.yViewToWindow(this.y + (this.ySize + this.yOffset) * this.yScale);
                }
                else {
                    var x0 = Engine.Renderer.xViewToWindow(this.x + this.xOffset * this.xScale - Engine.Renderer.xCamera);
                    var y0 = Engine.Renderer.yViewToWindow(this.y + this.yOffset * this.yScale - Engine.Renderer.yCamera);
                    var x1 = Engine.Renderer.xViewToWindow(this.x + (this.xSize + this.xOffset) * this.xScale - Engine.Renderer.xCamera);
                    var y1 = Engine.Renderer.yViewToWindow(this.y + (this.ySize + this.yOffset) * this.yScale - Engine.Renderer.yCamera);
                }
                if (this.topleftpin) {
                    x0 = this.topleftx;
                    y0 = this.toplefty;
                }
                return Engine.Mouse.in(x0, y0, x1, y1);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(InteractableBounds.prototype, "touched", {
            get: function () {
                if (this.pinned) {
                    var x0 = Engine.Renderer.xViewToWindow(this.x + this.xOffset * this.xScale);
                    var y0 = Engine.Renderer.yViewToWindow(this.y + this.yOffset * this.yScale);
                    var x1 = Engine.Renderer.xViewToWindow(this.x + (this.xSize + this.xOffset) * this.xScale);
                    var y1 = Engine.Renderer.yViewToWindow(this.y + (this.ySize + this.yOffset) * this.yScale);
                }
                else {
                    var x0 = Engine.Renderer.xViewToWindow(this.x + this.xOffset * this.xScale - Engine.Renderer.xCamera);
                    var y0 = Engine.Renderer.yViewToWindow(this.y + this.yOffset * this.yScale - Engine.Renderer.yCamera);
                    var x1 = Engine.Renderer.xViewToWindow(this.x + (this.xSize + this.xOffset) * this.xScale - Engine.Renderer.xCamera);
                    var y1 = Engine.Renderer.yViewToWindow(this.y + (this.ySize + this.yOffset) * this.yScale - Engine.Renderer.yCamera);
                }
                if (this.topleftpin) {
                    x0 = this.topleftx;
                    y0 = this.toplefty;
                }
                return Engine.TouchInput.down(x0, y0, x1, y1, this.useTouchRadius);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(InteractableBounds.prototype, "pointed", {
            get: function () {
                if (this.pinned) {
                    var x0 = Engine.Renderer.xViewToWindow(this.x + this.xOffset * this.xScale);
                    var y0 = Engine.Renderer.yViewToWindow(this.y + this.yOffset * this.yScale);
                    var x1 = Engine.Renderer.xViewToWindow(this.x + (this.xSize + this.xOffset) * this.xScale);
                    var y1 = Engine.Renderer.yViewToWindow(this.y + (this.ySize + this.yOffset) * this.yScale);
                }
                else {
                    var x0 = Engine.Renderer.xViewToWindow(this.x + this.xOffset * this.xScale - Engine.Renderer.xCamera);
                    var y0 = Engine.Renderer.yViewToWindow(this.y + this.yOffset * this.yScale - Engine.Renderer.yCamera);
                    var x1 = Engine.Renderer.xViewToWindow(this.x + (this.xSize + this.xOffset) * this.xScale - Engine.Renderer.xCamera);
                    var y1 = Engine.Renderer.yViewToWindow(this.y + (this.ySize + this.yOffset) * this.yScale - Engine.Renderer.yCamera);
                }
                if (this.topleftpin) {
                    x0 = this.topleftx;
                    y0 = this.toplefty;
                }
                return Engine.TouchInput.pressed(x0, y0, x1, y1, this.useTouchRadius);
            },
            enumerable: false,
            configurable: true
        });
        InteractableBounds.prototype.pointInside = function (x, y, radius) {
            if (this.pinned) {
                var x0 = Engine.Renderer.xViewToWindow(this.x + this.xOffset * this.xScale);
                var y0 = Engine.Renderer.yViewToWindow(this.y + this.yOffset * this.yScale);
                var x1 = Engine.Renderer.xViewToWindow(this.x + (this.xSize + this.xOffset) * this.xScale);
                var y1 = Engine.Renderer.yViewToWindow(this.y + (this.ySize + this.yOffset) * this.yScale);
            }
            else {
                var x0 = Engine.Renderer.xViewToWindow(this.x + this.xOffset * this.xScale - Engine.Renderer.xCamera);
                var y0 = Engine.Renderer.yViewToWindow(this.y + this.yOffset * this.yScale - Engine.Renderer.yCamera);
                var x1 = Engine.Renderer.xViewToWindow(this.x + (this.xSize + this.xOffset) * this.xScale - Engine.Renderer.xCamera);
                var y1 = Engine.Renderer.yViewToWindow(this.y + (this.ySize + this.yOffset) * this.yScale - Engine.Renderer.yCamera);
            }
            if (this.topleftpin) {
                x0 = this.topleftx;
                y0 = this.toplefty;
            }
            if (radius == null || radius == undefined) {
                radius = 1;
            }
            radius = radius == 0 ? 1 : radius;
            x /= radius;
            y /= radius;
            var rx0 = x0 / radius;
            var ry0 = y0 / radius;
            var rx1 = x1 / radius;
            var ry1 = y1 / radius;
            return x >= rx0 && x <= rx1 && y >= ry0 && y <= ry1;
        };
        InteractableBounds.prototype.render = function () {
        };
        //@ts-ignore
        InteractableBounds.prototype.setRGBA = function (red, green, blue, alpha) {
        };
        return InteractableBounds;
    }());
    Engine.InteractableBounds = InteractableBounds;
})(Engine || (Engine = {}));
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
///<reference path="InteractableBounds.ts"/>
var Engine;
(function (Engine) {
    var CanvasTexture = /** @class */ (function () {
        function CanvasTexture(sprite) {
            this.canvas = document.createElement("canvas");
            this.context = this.canvas.getContext("2d");
            //@ts-ignore
            this.context.drawImage(sprite.texture.canvas, sprite.xTexture, sprite.yTexture, sprite.xSizeTexture, sprite.ySizeTexture, 0, 0, sprite.xSizeTexture, sprite.ySizeTexture);
            //@ts-ignore
            var imageData = this.context.getImageData(0, 0, sprite.xSizeTexture, sprite.ySizeTexture);
            var data = imageData.data;
            //@ts-ignore
            for (var indexPixel = 0; indexPixel < sprite.xSizeTexture * sprite.ySizeTexture * 4; indexPixel += 4) {
                //@ts-ignore
                data[indexPixel + 0] = data[indexPixel + 0] * sprite.red;
                //@ts-ignore
                data[indexPixel + 1] = data[indexPixel + 1] * sprite.green;
                //@ts-ignore
                data[indexPixel + 2] = data[indexPixel + 2] * sprite.blue;
                //@ts-ignore
                data[indexPixel + 3] = data[indexPixel + 3] * sprite.alpha;
            }
            //@ts-ignore
            this.context.clearRect(0, 0, sprite.xSizeTexture, sprite.ySizeTexture);
            this.context.putImageData(imageData, 0, 0);
        }
        return CanvasTexture;
    }());
    var Sprite = /** @class */ (function (_super) {
        __extends(Sprite, _super);
        function Sprite() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.red = 1;
            _this.green = 1;
            _this.blue = 1;
            _this.alpha = 1;
            _this.texture = null;
            //Canvas
            _this.xTexture = 0;
            _this.yTexture = 0;
            _this.xSizeTexture = 0;
            _this.ySizeTexture = 0;
            _this.dirty = false;
            //GL
            //@ts-ignore
            _this.u0 = 0;
            //@ts-ignore
            _this.v0 = 0;
            //@ts-ignore
            _this.u1 = 0;
            //@ts-ignore
            _this.v1 = 0;
            //@ts-ignore
            _this.setHSVA = function (hue, saturation, value, alpha) {
                console.log("error");
            };
            return _this;
        }
        Sprite.prototype.setFull = function (enabled, pinned, texture, xSize, ySize, xOffset, yOffset, xTexture, yTexture, xSizeTexture, ySizeTexture) {
            if (texture == null) {
                console.log("error");
            }
            else {
                this.enabled = enabled;
                this.pinned = pinned;
                this.xSize = xSize;
                this.ySize = ySize;
                this.xOffset = xOffset;
                this.yOffset = yOffset;
                this.texture = texture;
                if (Engine.Renderer.mode == Engine.RendererMode.WEB_GL) {
                    //@ts-ignore
                    this.u0 = xTexture / texture.assetData.xSize;
                    //@ts-ignore
                    this.v0 = yTexture / texture.assetData.ySize;
                    //@ts-ignore
                    this.u1 = (xTexture + xSizeTexture) / texture.assetData.xSize;
                    //@ts-ignore
                    this.v1 = (yTexture + ySizeTexture) / texture.assetData.ySize;
                }
                else {
                    this.xTexture = xTexture;
                    this.yTexture = yTexture;
                    this.xSizeTexture = xSizeTexture;
                    this.ySizeTexture = ySizeTexture;
                    this.dirty = true;
                }
            }
        };
        Sprite.prototype.setRGBA = function (red, green, blue, alpha) {
            if (Engine.Renderer.mode == Engine.RendererMode.CANVAS_2D && (this.red != red || this.green != green || this.blue != blue || this.alpha != alpha)) {
                this.dirty = true;
            }
            //@ts-ignore
            this.red = red;
            //@ts-ignore
            this.green = green;
            //@ts-ignore
            this.blue = blue;
            //@ts-ignore
            this.alpha = alpha;
        };
        Sprite.prototype.render = function () {
            _super.prototype.render.call(this);
            if (Engine.Renderer.mode == Engine.RendererMode.CANVAS_2D && this.dirty && this.texture != null) {
                if (this.red != 1 || this.green != 1 || this.blue != 1 || this.alpha != 1) {
                    if (this.xSizeTexture > 0 && this.ySizeTexture > 0) {
                        this.canvasTexture = new CanvasTexture(this);
                    }
                    else {
                        this.canvasTexture = null;
                    }
                }
                else {
                    this.canvasTexture = null;
                }
                this.dirty = false;
            }
            //@ts-ignore
            Engine.Renderer.renderSprite(this);
        };
        Sprite.prototype.renderAt = function (x, y) {
            var oldX = this.x;
            var oldY = this.y;
            this.x = x;
            this.y = y;
            this.render();
            this.x = oldX;
            this.y = oldY;
        };
        /*
        public onScreen(){
            var xa=this.x+this.xOffset;
            var xb=xa+this.xSize;
            var ya=this.y+this.yOffset;
            var yb=ya+this.ySize;
            var xva=Engine.Renderer.xCamera-Engine.Renderer.xSizeView*0.5;
            var xvb=xva+Engine.Renderer.xSizeView;
            var yva=Engine.Renderer.yCamera-Engine.Renderer.ySizeView*0.5;
            var yvb=yva+Engine.Renderer.ySizeView;
            return(xa>=xva&&xa<=xvb||xb>=xva&&xb<=xvb)&&(ya>=yva&&ya<=yvb||yb>=yva&&yb<=yvb);
        }
        */
        Sprite.prototype.onScreenX = function () {
            var xa = this.x + this.xOffset;
            var xb = xa + this.xSize;
            var xva = Engine.Renderer.xCamera - Engine.Renderer.xSizeView * 0.5;
            var xvb = xva + Engine.Renderer.xSizeView;
            return (xa >= xva && xa <= xvb) || (xb >= xva && xb <= xvb);
        };
        Sprite.prototype.onScreenY = function () {
            var ya = this.y + this.yOffset;
            var yb = ya + this.ySize;
            var yva = Engine.Renderer.yCamera - Engine.Renderer.ySizeView * 0.5;
            var yvb = yva + Engine.Renderer.ySizeView;
            return (ya >= yva && ya <= yvb) || (yb >= yva && yb <= yvb);
        };
        Sprite.prototype.setRGBAFromTexture = function (texture, x, y) {
            this.setFull(true, true, texture, 1, 1, 0, 0, x, y, 1, 1);
        };
        return Sprite;
    }(Engine.InteractableBounds));
    Engine.Sprite = Sprite;
})(Engine || (Engine = {}));
///<reference path="Sprite.ts"/>
var Engine;
(function (Engine) {
    var Contact = /** @class */ (function () {
        function Contact(box, other, distance, hor) {
            this.box = box;
            this.other = other;
            this.distance = distance;
            this.hor = hor;
        }
        return Contact;
    }());
    Engine.Contact = Contact;
    /*
    export class Overlap{
        public readonly box : Box;
        public readonly other : Box;

        public constructor(box : Box, other : Box){
            this.box = box;
            this.other = other;
        }
    }
    */
    var Point = /** @class */ (function () {
        function Point(x, y) {
            this.x = x;
            this.y = y;
        }
        return Point;
    }());
    Engine.Point = Point;
    var Box = /** @class */ (function () {
        function Box() {
            this.position = new Int32Array(2);
            this.offset = new Int32Array(2);
            this.size = new Int32Array([8000, 8000]);
            this.enabled = false;
            this.layer = Box.LAYER_NONE;
            this.xMirror = false;
            this.yMirror = false;
            this.data = null;
            this.renderable = false;
            this.red = 0;
            this.green = 1;
            this.blue = 0;
            this.alpha = 0.5;
        }
        Object.defineProperty(Box.prototype, "x", {
            get: function () {
                return this.position[0] / Box.UNIT;
            },
            set: function (value) {
                this.position[0] = value * Box.UNIT;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Box.prototype, "y", {
            get: function () {
                return this.position[1] / Box.UNIT;
            },
            set: function (value) {
                this.position[1] = value * Box.UNIT;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Box.prototype, "xOffset", {
            get: function () {
                return this.offset[0] / Box.UNIT;
            },
            set: function (value) {
                this.offset[0] = value * Box.UNIT;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Box.prototype, "yOffset", {
            get: function () {
                return this.offset[1] / Box.UNIT;
            },
            set: function (value) {
                this.offset[1] = value * Box.UNIT;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Box.prototype, "xSize", {
            get: function () {
                return this.size[0] / Box.UNIT;
            },
            set: function (value) {
                this.size[0] = value * Box.UNIT;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Box.prototype, "ySize", {
            get: function () {
                return this.size[1] / Box.UNIT;
            },
            set: function (value) {
                this.size[1] = value * Box.UNIT;
            },
            enumerable: false,
            configurable: true
        });
        Box.setInterval = function (box, interval, xAxis) {
            if (xAxis) {
                if (box.xMirror) {
                    interval[0] = box.position[0] - box.offset[0] - box.size[0];
                    interval[1] = box.position[0] - box.offset[0];
                }
                else {
                    interval[0] = box.position[0] + box.offset[0];
                    interval[1] = box.position[0] + box.offset[0] + box.size[0];
                }
                if (box.yMirror) {
                    interval[2] = box.position[1] - box.offset[1] - box.size[1];
                    interval[3] = box.position[1] - box.offset[1];
                }
                else {
                    interval[2] = box.position[1] + box.offset[1];
                    interval[3] = box.position[1] + box.offset[1] + box.size[1];
                }
            }
            else {
                if (box.xMirror) {
                    interval[0] = box.position[1] - box.offset[1] - box.size[1];
                    interval[1] = box.position[1] - box.offset[1];
                }
                else {
                    interval[0] = box.position[1] + box.offset[1];
                    interval[1] = box.position[1] + box.offset[1] + box.size[1];
                }
                if (box.yMirror) {
                    interval[2] = box.position[0] - box.offset[0] - box.size[0];
                    interval[3] = box.position[0] - box.offset[0];
                }
                else {
                    interval[2] = box.position[0] + box.offset[0];
                    interval[3] = box.position[0] + box.offset[0] + box.size[0];
                }
            }
        };
        Box.intervalExclusiveCollides = function (startA, endA, startB, endB) {
            return (startA <= startB && startB < endA) || (startB <= startA && startA < endB);
        };
        Box.intervalDifference = function (startA, endA, startB, endB) {
            if (startA < startB) {
                return endA - startB;
            }
            return startA - endB;
        };
        Box.prototype.castAgainst = function (other, contacts, xAxis, distance, useGraphicUnits, mask) {
            if (useGraphicUnits === void 0) { useGraphicUnits = true; }
            if (mask === void 0) { mask = Box.LAYER_ALL; }
            if (distance != 0) {
                distance *= useGraphicUnits ? Box.UNIT : 1;
                Box.setInterval(this, Box.intervalA, xAxis);
                if (this == other || !other.enabled || (mask != Box.LAYER_ALL && !(mask & other.layer)) || this.xSize == 0 || this.ySize == 0 || other.xSize == 0 || other.ySize == 0) {
                    return contacts;
                }
                Box.setInterval(other, Box.intervalB, xAxis);
                if (Box.intervalExclusiveCollides(Box.intervalB[0], Box.intervalB[1], Box.intervalA[0], Box.intervalA[1])) {
                    return contacts;
                }
                if (!Box.intervalExclusiveCollides(Box.intervalB[2], Box.intervalB[3], Box.intervalA[2], Box.intervalA[3])) {
                    return contacts;
                }
                if (Box.intervalExclusiveCollides(Box.intervalB[0] - (distance > 0 ? distance : 0), Box.intervalB[1] - (distance < 0 ? distance : 0), Box.intervalA[0], Box.intervalA[1])) {
                    var intervalDist = Box.intervalDifference(Box.intervalB[0], Box.intervalB[1], Box.intervalA[0], Box.intervalA[1]);
                    if (Math.abs(distance) < Math.abs(intervalDist)) {
                        return contacts;
                    }
                    if (contacts == null || contacts.length == 0 || Math.abs(intervalDist) < Math.abs(contacts[0].distance)) {
                        contacts = [];
                        contacts[0] = new Contact(this, other, intervalDist, xAxis);
                    }
                    else if (Math.abs(intervalDist) == Math.abs(contacts[0].distance)) {
                        contacts = contacts || [];
                        contacts.push(new Contact(this, other, intervalDist, xAxis));
                    }
                }
            }
            return contacts;
        };
        Box.prototype.cast = function (boxes, contacts, xAxis, distance, useGraphicUnits, mask) {
            if (useGraphicUnits === void 0) { useGraphicUnits = true; }
            if (mask === void 0) { mask = Box.LAYER_ALL; }
            for (var _i = 0, boxes_1 = boxes; _i < boxes_1.length; _i++) {
                var other = boxes_1[_i];
                contacts = this.castAgainst(other, contacts, xAxis, distance, useGraphicUnits, mask);
            }
            return contacts;
        };
        Box.prototype.collideAgainst = function (other, overlaps, xAxis, distance, useGraphicUnits, mask) {
            if (overlaps === void 0) { overlaps = null; }
            if (xAxis === void 0) { xAxis = false; }
            if (distance === void 0) { distance = 0; }
            if (useGraphicUnits === void 0) { useGraphicUnits = true; }
            if (mask === void 0) { mask = Box.LAYER_ALL; }
            distance *= useGraphicUnits ? Box.UNIT : 1;
            if (this == other || !other.enabled || (mask != Box.LAYER_ALL && !(mask & other.layer)) || this.xSize == 0 || this.ySize == 0 || other.xSize == 0 || other.ySize == 0) {
                return overlaps;
            }
            Box.setInterval(this, Box.intervalA, xAxis);
            Box.setInterval(other, Box.intervalB, xAxis);
            if (!Box.intervalExclusiveCollides(Box.intervalB[2], Box.intervalB[3], Box.intervalA[2], Box.intervalA[3])) {
                return overlaps;
            }
            if (Box.intervalExclusiveCollides(Box.intervalB[0] - (distance > 0 ? distance : 0), Box.intervalB[1] - (distance < 0 ? distance : 0), Box.intervalA[0], Box.intervalA[1])) {
                overlaps = overlaps || [];
                overlaps.push(new Contact(this, other, 0, xAxis));
            }
            return overlaps;
        };
        Box.prototype.collide = function (boxes, overlaps, xAxis, distance, useGraphicUnits, mask) {
            if (overlaps === void 0) { overlaps = null; }
            if (xAxis === void 0) { xAxis = false; }
            if (distance === void 0) { distance = 0; }
            if (useGraphicUnits === void 0) { useGraphicUnits = true; }
            if (mask === void 0) { mask = Box.LAYER_ALL; }
            for (var _i = 0, boxes_2 = boxes; _i < boxes_2.length; _i++) {
                var other = boxes_2[_i];
                overlaps = this.collideAgainst(other, overlaps, xAxis, distance, useGraphicUnits, mask);
            }
            return overlaps;
        };
        Box.prototype.getDist = function (other, dir, xAxis) {
            Box.setInterval(this, Box.intervalA, xAxis);
            Box.setInterval(other, Box.intervalB, xAxis);
            if (dir >= 0) {
                return Box.intervalB[0] - Box.intervalA[1];
            }
            else {
                return Box.intervalB[1] - Box.intervalA[0];
            }
        };
        Box.prototype.translate = function (contacts, xAxis, distance, useGraphicUnits) {
            if (useGraphicUnits === void 0) { useGraphicUnits = true; }
            distance *= useGraphicUnits ? Box.UNIT : 1;
            if (contacts == null || contacts.length == 0) {
                this.position[0] += xAxis ? distance : 0;
                this.position[1] += xAxis ? 0 : distance;
            }
            else {
                this.position[0] += xAxis ? contacts[0].distance : 0;
                this.position[1] += xAxis ? 0 : contacts[0].distance;
            }
        };
        Box.prototype.getExtrapolation = function (boxes, xDistance, yDistance, useGraphicUnits, mask) {
            if (useGraphicUnits === void 0) { useGraphicUnits = true; }
            if (mask === void 0) { mask = Box.LAYER_ALL; }
            var oldX = this.position[0];
            var oldY = this.position[1];
            xDistance = xDistance * Engine.System.stepExtrapolation;
            yDistance = yDistance * Engine.System.stepExtrapolation;
            if (boxes == null) {
                this.position[0] += xDistance * (useGraphicUnits ? Box.UNIT : 1);
                this.position[1] += yDistance * (useGraphicUnits ? Box.UNIT : 1);
            }
            else {
                var contacts = this.cast(boxes, null, true, xDistance, useGraphicUnits, mask);
                this.translate(contacts, true, xDistance, useGraphicUnits);
                contacts = this.cast(boxes, null, false, yDistance, useGraphicUnits, mask);
                this.translate(contacts, false, yDistance, useGraphicUnits);
            }
            var point = new Point(this.position[0] / Box.UNIT, this.position[1] / Box.UNIT);
            this.position[0] = oldX;
            this.position[1] = oldY;
            return point;
        };
        Box.renderBoxAt = function (box, x, y) {
            if (Box.debugRender && box.enabled && box.renderable) {
                if (Box.sprite == null) {
                    Box.sprite = new Engine.Sprite();
                    Box.sprite.enabled = true;
                }
                Box.sprite.x = x;
                Box.sprite.y = y;
                Box.sprite.xOffset = box.offset[0] / Box.UNIT;
                Box.sprite.yOffset = box.offset[1] / Box.UNIT;
                Box.sprite.xSize = box.size[0] / Box.UNIT;
                Box.sprite.ySize = box.size[1] / Box.UNIT;
                Box.sprite.xMirror = box.xMirror;
                Box.sprite.yMirror = box.yMirror;
                Box.sprite.setRGBA(box.red, box.green, box.blue, box.alpha);
                Box.sprite.render();
            }
        };
        Box.prototype.render = function () {
            Box.renderBoxAt(this, this.x, this.y);
        };
        Box.prototype.renderAt = function (x, y) {
            Box.renderBoxAt(this, x, y);
        };
        Box.prototype.renderExtrapolated = function (boxes, xDistance, yDistance, useGraphicUnits, mask) {
            if (useGraphicUnits === void 0) { useGraphicUnits = true; }
            if (mask === void 0) { mask = Box.LAYER_ALL; }
            var point = this.getExtrapolation(boxes, xDistance, yDistance, useGraphicUnits, mask);
            Box.renderBoxAt(this, point.x, point.y);
        };
        Box.UNIT = 1000.0;
        Box.LAYER_NONE = 0;
        Box.LAYER_ALL = 1;
        Box.debugRender = true;
        Box.intervalA = new Int32Array(4);
        Box.intervalB = new Int32Array(4);
        return Box;
    }());
    Engine.Box = Box;
})(Engine || (Engine = {}));
var Engine;
(function (Engine) {
    var Data = /** @class */ (function () {
        function Data() {
        }
        Data.setID = function (domain, developer, game, version) {
            Data.id = domain + "." + developer + "." + game + version;
            Data.idToken = Data.id + ".";
        };
        Data.validateID = function () {
            if (Data.id == "") {
                console.error("PLEASE SET A VALID DATA ID");
            }
        };
        Data.save = function (name, value, days) {
            Data.validateID();
            name = Data.idToken + name;
            if (Data.useLocalStorage) {
                try {
                    localStorage.setItem(name, value + "");
                }
                catch (error) {
                    console.log(error);
                }
            }
            else {
                try {
                    var date = new Date();
                    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                    var expires = "expires=" + date.toUTCString();
                    document.cookie = name + "=" + value + ";" + expires + ";path=/; SameSite=None; Secure";
                }
                catch (error) {
                    console.log(error);
                }
            }
            //console.log(document.cookie);
        };
        ;
        Data.load = function (name) {
            Data.validateID();
            name = Data.idToken + name;
            if (Data.useLocalStorage) {
                try {
                    return localStorage.getItem(name);
                }
                catch (error) {
                    console.log(error);
                    return null;
                }
            }
            else {
                try {
                    name = name + "=";
                    var arrayCookies = document.cookie.split(';');
                    for (var indexCoockie = 0; indexCoockie < arrayCookies.length; indexCoockie += 1) {
                        var cookie = arrayCookies[indexCoockie];
                        while (cookie.charAt(0) == ' ') {
                            cookie = cookie.substring(1);
                        }
                        if (cookie.indexOf(name) == 0) {
                            return cookie.substring(name.length, cookie.length);
                        }
                    }
                    return null;
                }
                catch (error) {
                    console.log(error);
                    return null;
                }
            }
        };
        ;
        Data.id = "";
        Data.idToken = "";
        Data.useLocalStorage = true;
        return Data;
    }());
    Engine.Data = Data;
})(Engine || (Engine = {}));
var Engine;
(function (Engine) {
    var Entity = /** @class */ (function () {
        function Entity() {
            this.preserved = false;
            Engine.System.addListenersFrom(this);
        }
        return Entity;
    }());
    Engine.Entity = Entity;
})(Engine || (Engine = {}));
var Engine;
(function (Engine) {
    var Keyboard = /** @class */ (function () {
        function Keyboard() {
        }
        Keyboard.hasDown = function (keyCode, old) {
            for (var indexCode = 0; indexCode < (old ? Keyboard.oldKeyPressEvents.length : Keyboard.keyPressEvents.length); indexCode += 1) {
                if (keyCode == (old ? Keyboard.oldKeyPressEvents[indexCode] : Keyboard.keyPressEvents[indexCode])) {
                    return true;
                }
            }
            return false;
        };
        Keyboard.down = function (keyCode) {
            return Keyboard.hasDown(keyCode, false);
        };
        Keyboard.onDown = function (event) {
            if (event.key == null || event.key == undefined) {
                return false;
            }
            var code = event.key.toLowerCase();
            var indexCode = Keyboard.readedKeyPressEvents.length;
            for (var indexEvent = 0; indexEvent < Keyboard.readedKeyPressEvents.length; indexEvent += 1) {
                if (Keyboard.readedKeyPressEvents[indexEvent] == "") {
                    indexCode = indexEvent;
                }
                else if (Keyboard.readedKeyPressEvents[indexEvent] == code) {
                    indexCode = -1;
                    break;
                }
            }
            if (indexCode >= 0) {
                Keyboard.readedKeyPressEvents[indexCode] = code;
            }
            switch (code) {
                case Keyboard.UP:
                case "up":
                case "Up":
                case Keyboard.DOWN:
                case "down":
                case "Down":
                case Keyboard.LEFT:
                case "left":
                case "Left":
                case Keyboard.RIGHT:
                case "right":
                case "Right":
                case Keyboard.SPACE:
                case "space":
                case "Space":
                case " ":
                case "spacebar":
                case Keyboard.ESC:
                case "esc":
                case "Esc":
                case "ESC":
                    event.preventDefault();
                    //@ts-ignore
                    if (event.stopPropagation !== "undefined") {
                        event.stopPropagation();
                    }
                    else {
                        event.cancelBubble = true;
                    }
                    return true;
            }
            return false;
        };
        Keyboard.onUp = function (event) {
            if (event.key == null || event.key == undefined) {
                return false;
            }
            var code = event.key.toLowerCase();
            for (var indexEvent = 0; indexEvent < Keyboard.readedKeyPressEvents.length; indexEvent += 1) {
                if (Keyboard.readedKeyPressEvents[indexEvent] == code) {
                    Keyboard.readedKeyPressEvents[indexEvent] = "";
                    break;
                }
            }
            return false;
        };
        //@ts-ignore
        Keyboard.update = function () {
            for (var indexEvent = 0; indexEvent < Keyboard.keyPressEvents.length; indexEvent += 1) {
                Keyboard.oldKeyPressEvents[indexEvent] = Keyboard.keyPressEvents[indexEvent];
            }
            for (var indexEvent = 0; indexEvent < Keyboard.readedKeyPressEvents.length; indexEvent += 1) {
                Keyboard.keyPressEvents[indexEvent] = Keyboard.readedKeyPressEvents[indexEvent];
            }
        };
        Keyboard.A = "a";
        Keyboard.B = "b";
        Keyboard.C = "c";
        Keyboard.D = "d";
        Keyboard.E = "e";
        Keyboard.F = "f";
        Keyboard.G = "g";
        Keyboard.H = "h";
        Keyboard.I = "i";
        Keyboard.J = "j";
        Keyboard.K = "k";
        Keyboard.L = "l";
        Keyboard.M = "m";
        Keyboard.N = "n";
        Keyboard.O = "o";
        Keyboard.P = "p";
        Keyboard.Q = "q";
        Keyboard.R = "r";
        Keyboard.S = "s";
        Keyboard.T = "t";
        Keyboard.U = "u";
        Keyboard.V = "v";
        Keyboard.W = "w";
        Keyboard.X = "x";
        Keyboard.Y = "y";
        Keyboard.Z = "z";
        Keyboard.UP = "arrowup";
        Keyboard.DOWN = "arrowdown";
        Keyboard.LEFT = "arrowleft";
        Keyboard.RIGHT = "arrowright";
        Keyboard.SPACE = " ";
        Keyboard.ESC = "escape";
        Keyboard.readedKeyPressEvents = [];
        Keyboard.oldKeyPressEvents = [];
        Keyboard.keyPressEvents = [];
        Keyboard.up = function (keyCode) {
            return !Keyboard.hasDown(keyCode, false);
        };
        Keyboard.pressed = function (keyCode) {
            return Keyboard.hasDown(keyCode, false) && !Keyboard.hasDown(keyCode, true);
        };
        Keyboard.released = function (keyCode) {
            return !Keyboard.hasDown(keyCode, false) && Keyboard.hasDown(keyCode, true);
        };
        return Keyboard;
    }());
    Engine.Keyboard = Keyboard;
    //@ts-ignore
    window.addEventListener("keydown", Keyboard.onDown, false);
    //@ts-ignore
    window.addEventListener("keyup", Keyboard.onUp, false);
})(Engine || (Engine = {}));
var Engine;
(function (Engine) {
    var Link = /** @class */ (function () {
        function Link(owner, url) {
            this.owner = owner;
            this.url = url;
        }
        return Link;
    }());
    var LinkManager = /** @class */ (function () {
        function LinkManager() {
        }
        LinkManager.add = function (owner, url) {
            var link = null;
            for (var _i = 0, _a = LinkManager.links; _i < _a.length; _i++) {
                var arrayLink = _a[_i];
                if (arrayLink.owner == owner && arrayLink.url == url) {
                    link = arrayLink;
                }
            }
            if (link == null) {
                LinkManager.links.push(new Link(owner, url));
            }
        };
        LinkManager.remove = function (owner, url) {
            var newLinks = new Array();
            for (var _i = 0, _a = LinkManager.links; _i < _a.length; _i++) {
                var link = _a[_i];
                if (link.owner != owner || link.url != url) {
                    newLinks.push(link);
                }
            }
            LinkManager.links = newLinks;
        };
        LinkManager.triggerMouse = function (event) {
            if (Game.LevelAdLoader.instance != null && Game.LevelAdLoader.blocked) {
                return;
            }
            for (var _i = 0, _a = LinkManager.links; _i < _a.length; _i++) {
                var link = _a[_i];
                if (link.owner.bounds == null || (link.owner.bounds.enabled && link.owner.bounds.pointInside(event.clientX, event.clientY, 1) && link.owner.linkCondition())) {
                    if (link.owner != null && link.owner.onLinkTrigger != null) {
                        link.owner.onLinkTrigger();
                    }
                    else {
                        window.open(link.url, '_blank');
                    }
                }
            }
        };
        LinkManager.triggerTouch = function (event) {
            if (Game.LevelAdLoader.instance != null && Game.LevelAdLoader.blocked) {
                return;
            }
            for (var _i = 0, _a = LinkManager.links; _i < _a.length; _i++) {
                var link = _a[_i];
                for (var indexEventTouch = 0; indexEventTouch < event.changedTouches.length; indexEventTouch += 1) {
                    var touch = event.changedTouches.item(indexEventTouch);
                    var radius = touch.radiusX < touch.radiusY ? touch.radiusX : touch.radiusY;
                    //if(radius == null || radius == undefined){
                    radius = 1;
                    //}
                    if (link.owner.bounds == null || (link.owner.bounds.enabled && link.owner.bounds.pointInside(touch.clientX, touch.clientY, radius) && link.owner.linkCondition())) {
                        if (link.owner != null && link.owner.onLinkTrigger != null) {
                            link.owner.onLinkTrigger();
                        }
                        else {
                            window.open(link.url, '_blank');
                        }
                        break;
                    }
                }
            }
        };
        LinkManager.links = new Array();
        return LinkManager;
    }());
    Engine.LinkManager = LinkManager;
})(Engine || (Engine = {}));
var Engine;
(function (Engine) {
    var Mouse = /** @class */ (function () {
        function Mouse() {
        }
        Object.defineProperty(Mouse, "x", {
            get: function () {
                return Mouse._x;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Mouse, "y", {
            get: function () {
                return Mouse._y;
            },
            enumerable: false,
            configurable: true
        });
        Mouse.hasDown = function (indexButton, old) {
            if (indexButton < (old ? Mouse.oldButtonPressEvents.length : Mouse.buttonPressEvents.length)) {
                return old ? Mouse.oldButtonPressEvents[indexButton] : Mouse.buttonPressEvents[indexButton];
            }
            return false;
        };
        ;
        Mouse.down = function (indexButton) {
            return Mouse.hasDown(indexButton, false);
        };
        Mouse.up = function (indexButton) {
            return !Mouse.hasDown(indexButton, false);
        };
        Mouse.pressed = function (indexButton) {
            return Mouse.hasDown(indexButton, false) && !Mouse.hasDown(indexButton, true);
        };
        Mouse.released = function (indexButton) {
            return !Mouse.hasDown(indexButton, false) && Mouse.hasDown(indexButton, true);
        };
        Mouse.in = function (x0, y0, x1, y1) {
            return x0 <= Mouse._x && x1 >= Mouse._x && y0 <= Mouse._y && y1 >= Mouse._y;
        };
        Mouse.clickedIn = function (indexButton, x0, y0, x1, y1) {
            if (Mouse.released(indexButton)) {
                var downX = Mouse.pressPositionsX[indexButton];
                var downY = Mouse.pressPositionsY[indexButton];
                var downIn = x0 <= downX && x1 >= downX && y0 <= downY && y1 >= downY;
                var upIn = Mouse.in(x0, y0, x1, y1);
                return downIn && upIn;
            }
            return false;
        };
        Mouse.onDown = function (event) {
            Mouse._x = event.clientX;
            Mouse._y = event.clientY;
            Mouse.readedButtonPressEvents[event.button] = true;
            Mouse.pressPositionsX[event.button] = Mouse._x;
            Mouse.pressPositionsY[event.button] = Mouse._y;
            return false;
        };
        Mouse.onUp = function (event) {
            Mouse._x = event.clientX;
            Mouse._y = event.clientY;
            Mouse.readedButtonPressEvents[event.button] = false;
            return false;
        };
        Mouse.onMove = function (event) {
            Mouse._x = event.clientX;
            Mouse._y = event.clientY;
            return false;
        };
        //@ts-ignore
        Mouse.update = function () {
            for (var indexEvent = 0; indexEvent < Mouse.buttonPressEvents.length; indexEvent += 1) {
                Mouse.oldButtonPressEvents[indexEvent] = Mouse.buttonPressEvents[indexEvent];
            }
            for (var indexEvent = 0; indexEvent < Mouse.readedButtonPressEvents.length; indexEvent += 1) {
                Mouse.buttonPressEvents[indexEvent] = Mouse.readedButtonPressEvents[indexEvent];
            }
        };
        Mouse._x = 0;
        Mouse._y = 0;
        Mouse.readedButtonPressEvents = new Array();
        Mouse.oldButtonPressEvents = new Array();
        Mouse.buttonPressEvents = new Array();
        Mouse.pressPositionsX = new Array();
        Mouse.pressPositionsY = new Array();
        return Mouse;
    }());
    Engine.Mouse = Mouse;
    //@ts-ignore
    window.addEventListener("mousedown", Mouse.onDown, false);
    //@ts-ignore
    window.addEventListener("mouseup", Mouse.onUp, false);
    //@ts-ignore
    window.addEventListener("mousemove", Mouse.onMove, false);
})(Engine || (Engine = {}));
var Engine;
(function (Engine) {
    var RendererMode;
    (function (RendererMode) {
        RendererMode[RendererMode["CANVAS_2D"] = 0] = "CANVAS_2D";
        RendererMode[RendererMode["WEB_GL"] = 1] = "WEB_GL";
    })(RendererMode = Engine.RendererMode || (Engine.RendererMode = {}));
    var Renderer = /** @class */ (function () {
        function Renderer() {
        }
        Renderer.xViewToWindow = function (x) {
            return (x + Renderer.xSizeView * 0.5) * (Renderer.xSizeWindow) / Renderer.xSizeView;
        };
        Renderer.yViewToWindow = function (y) {
            return (y + Renderer.ySizeView * 0.5) * (Renderer.ySizeWindow) / Renderer.ySizeView;
        };
        Renderer.camera = function (x, y) {
            Renderer.xCamera = x;
            Renderer.yCamera = y;
            if (Renderer.mode == RendererMode.WEB_GL) {
                Renderer.gl.uniform2f(Renderer.glCameraPosition, x, y);
            }
        };
        Renderer.sizeView = function (x, y) {
            Renderer.xSizeViewIdeal = x;
            Renderer.ySizeViewIdeal = y;
            Renderer.fixViewValues();
            if (Renderer.mode == RendererMode.WEB_GL) {
                Renderer.gl.uniform2f(Renderer.glSizeView, Renderer.xSizeView, Renderer.xSizeView);
            }
        };
        Renderer.scaleView = function (x, y) {
            Renderer.xScaleView = x;
            Renderer.yScaleView = y;
            if (Renderer.mode == RendererMode.WEB_GL) {
                Renderer.gl.uniform2f(Renderer.glScaleView, x, y);
            }
        };
        ;
        Renderer.clearColor = function (red, green, blue) {
            Renderer.clearRed = red;
            Renderer.clearGreen = green;
            Renderer.clearBlue = blue;
            if (Renderer.mode == RendererMode.WEB_GL) {
                Renderer.gl.clearColor(red, green, blue, 1);
            }
        };
        Renderer.fixViewValues = function () {
            Renderer.xFitView = Renderer.ySizeWindow > Renderer.xSizeWindow || (Renderer.xSizeWindow / Renderer.ySizeWindow < (Renderer.xSizeViewIdeal / Renderer.ySizeViewIdeal - 0.001));
            if (Renderer.xFitView) {
                //@ts-ignore
                Renderer.xSizeView = Renderer.xSizeViewIdeal;
                //@ts-ignore
                Renderer.ySizeView = Renderer.ySizeWindow * Renderer.xSizeViewIdeal / Renderer.xSizeWindow;
            }
            else {
                //@ts-ignore
                Renderer.xSizeView = Renderer.xSizeWindow * Renderer.ySizeViewIdeal / Renderer.ySizeWindow;
                //@ts-ignore
                Renderer.ySizeView = Renderer.ySizeViewIdeal;
            }
        };
        //@ts-ignore
        Renderer.fixCanvasSize = function () {
            if (Renderer.autoscale) {
                var xSize = window.innerWidth;
                var ySize = window.innerHeight;
                Renderer.canvas.style.width = "100%";
                Renderer.canvas.style.height = "100%";
                Renderer.canvas.width = xSize * (Renderer.useDPI ? Renderer.dpr : 1);
                Renderer.canvas.height = ySize * (Renderer.useDPI ? Renderer.dpr : 1);
                //@ts-ignore
                Renderer.xSizeWindow = xSize;
                //@ts-ignore
                Renderer.ySizeWindow = ySize;
                Renderer.fixViewValues();
            }
            if (Renderer.mode == RendererMode.WEB_GL) {
                Renderer.gl.viewport(0, 0, Renderer.canvas.width, Renderer.canvas.height);
                Renderer.gl.uniform2f(Renderer.glSizeView, Renderer.xSizeView, Renderer.ySizeView);
            }
            else {
                if (Renderer.context.imageSmoothingEnabled != null && Renderer.context.imageSmoothingEnabled != undefined) {
                    Renderer.context.imageSmoothingEnabled = false;
                }
                //@ts-ignore
                else if (Renderer.context.msImageSmoothingEnabled != null && Renderer.context.msImageSmoothingEnabled != undefined) {
                    //@ts-ignore
                    Renderer.context.msImageSmoothingEnabled = false;
                }
            }
        };
        //@ts-ignore
        Renderer.clear = function () {
            if (Renderer.mode == RendererMode.CANVAS_2D) {
                Renderer.context.fillStyle = "rgba(" + Renderer.clearRed * 255 + ", " + Renderer.clearGreen * 255 + ", " + Renderer.clearBlue * 255 + ", 1.0)";
                Renderer.context.fillRect(0, 0, Renderer.canvas.width, Renderer.canvas.height);
            }
            else {
                Renderer.gl.clear(Renderer.gl.COLOR_BUFFER_BIT);
            }
            //@ts-ignore
            Renderer.drawCalls = 0;
        };
        //@ts-ignore
        Renderer.renderSprite = function (sprite) {
            if (sprite.enabled) {
                if (Renderer.mode == RendererMode.CANVAS_2D) {
                    Renderer.context.scale((Renderer.useDPI ? Renderer.dpr : 1), (Renderer.useDPI ? Renderer.dpr : 1));
                    Renderer.context.translate(Renderer.xSizeWindow * 0.5, Renderer.ySizeWindow * 0.5);
                    if (Renderer.xFitView) {
                        Renderer.context.scale(Renderer.xSizeWindow / Renderer.xSizeView, Renderer.xSizeWindow / Renderer.xSizeView);
                    }
                    else {
                        Renderer.context.scale(Renderer.ySizeWindow / Renderer.ySizeView, Renderer.ySizeWindow / Renderer.ySizeView);
                    }
                    if (Renderer.xScaleView != 1 && Renderer.yScaleView != 1) {
                        Renderer.context.scale(Renderer.xScaleView, Renderer.yScaleView);
                    }
                    if (!sprite.pinned) {
                        Renderer.context.translate(-Renderer.xCamera, -Renderer.yCamera);
                    }
                    Renderer.context.translate(sprite.x, sprite.y);
                    if (sprite.xScale != 1 || sprite.yScale != 1 || sprite.xMirror || sprite.yMirror) {
                        Renderer.context.scale(sprite.xScale * (sprite.xMirror ? -1 : 1), sprite.yScale * (sprite.yMirror ? -1 : 1));
                    }
                    //if(sprite.xSize != sprite.xSizeTexture || sprite.ySize != sprite.ySizeTexture){
                    //    System.context.scale(sprite.xSize / sprite.xSizeTexture, sprite.ySize / sprite.ySizeTexture);
                    //}
                    if (sprite.angle != 0) {
                        Renderer.context.rotate(sprite.angle * Engine.System.PI_OVER_180);
                    }
                    Renderer.context.translate(sprite.xOffset, sprite.yOffset);
                    //@ts-ignore
                    if (sprite.texture == null) {
                        Renderer.context.fillStyle = "rgba(" + sprite.red * 255 + ", " + sprite.green * 255 + ", " + sprite.blue * 255 + ", " + sprite.alpha + ")";
                        Renderer.context.fillRect(0, 0, sprite.xSize, sprite.ySize);
                    }
                    //@ts-ignore
                    else if (sprite.canvasTexture == null) {
                        //@ts-ignore
                        Renderer.context.drawImage(sprite.texture.canvas, sprite.xTexture, sprite.yTexture, sprite.xSizeTexture, sprite.ySizeTexture, 0, 0, sprite.xSize, sprite.ySize);
                    }
                    else {
                        //@ts-ignore
                        Renderer.context.drawImage(sprite.canvasTexture.canvas, 0, 0, sprite.xSizeTexture, sprite.ySizeTexture, 0, 0, sprite.xSize, sprite.ySize);
                    }
                    if (Renderer.context.resetTransform != null && Renderer.context.resetTransform != undefined) {
                        Renderer.context.resetTransform();
                    }
                    else {
                        Renderer.context.setTransform(1, 0, 0, 1, 0, 0);
                    }
                }
                else {
                    if (Renderer.drawableCount == Renderer.maxElementsDrawCall) {
                        Renderer.update();
                    }
                    Renderer.vertexArray.push(sprite.pinned ? 1 : 0);
                    Renderer.vertexArray.push(sprite.x);
                    Renderer.vertexArray.push(sprite.y);
                    Renderer.vertexArray.push(sprite.xOffset);
                    Renderer.vertexArray.push(sprite.yOffset);
                    Renderer.vertexArray.push(sprite.xScale);
                    Renderer.vertexArray.push(sprite.yScale);
                    Renderer.vertexArray.push(sprite.xMirror ? 1 : 0);
                    Renderer.vertexArray.push(sprite.yMirror ? 1 : 0);
                    Renderer.vertexArray.push(sprite.angle);
                    //@ts-ignore
                    Renderer.vertexArray.push(sprite.u0);
                    //@ts-ignore
                    Renderer.vertexArray.push(sprite.v0);
                    //@ts-ignore
                    Renderer.vertexArray.push(sprite.texture == null ? -1 : sprite.texture.getRenderingSlot());
                    Renderer.vertexArray.push(sprite.red);
                    Renderer.vertexArray.push(sprite.green);
                    Renderer.vertexArray.push(sprite.blue);
                    Renderer.vertexArray.push(sprite.alpha);
                    Renderer.vertexArray.push(sprite.pinned ? 1 : 0);
                    Renderer.vertexArray.push(sprite.x);
                    Renderer.vertexArray.push(sprite.y);
                    Renderer.vertexArray.push(sprite.xOffset + sprite.xSize);
                    Renderer.vertexArray.push(sprite.yOffset);
                    Renderer.vertexArray.push(sprite.xScale);
                    Renderer.vertexArray.push(sprite.yScale);
                    Renderer.vertexArray.push(sprite.xMirror ? 1 : 0);
                    Renderer.vertexArray.push(sprite.yMirror ? 1 : 0);
                    Renderer.vertexArray.push(sprite.angle);
                    //@ts-ignore
                    Renderer.vertexArray.push(sprite.u1);
                    //@ts-ignore
                    Renderer.vertexArray.push(sprite.v0);
                    //@ts-ignore
                    Renderer.vertexArray.push(sprite.texture == null ? -1 : sprite.texture.getRenderingSlot());
                    Renderer.vertexArray.push(sprite.red);
                    Renderer.vertexArray.push(sprite.green);
                    Renderer.vertexArray.push(sprite.blue);
                    Renderer.vertexArray.push(sprite.alpha);
                    Renderer.vertexArray.push(sprite.pinned ? 1 : 0);
                    Renderer.vertexArray.push(sprite.x);
                    Renderer.vertexArray.push(sprite.y);
                    Renderer.vertexArray.push(sprite.xOffset);
                    Renderer.vertexArray.push(sprite.yOffset + sprite.ySize);
                    Renderer.vertexArray.push(sprite.xScale);
                    Renderer.vertexArray.push(sprite.yScale);
                    Renderer.vertexArray.push(sprite.xMirror ? 1 : 0);
                    Renderer.vertexArray.push(sprite.yMirror ? 1 : 0);
                    Renderer.vertexArray.push(sprite.angle);
                    //@ts-ignore
                    Renderer.vertexArray.push(sprite.u0);
                    //@ts-ignore
                    Renderer.vertexArray.push(sprite.v1);
                    //@ts-ignore
                    Renderer.vertexArray.push(sprite.texture == null ? -1 : sprite.texture.getRenderingSlot());
                    Renderer.vertexArray.push(sprite.red);
                    Renderer.vertexArray.push(sprite.green);
                    Renderer.vertexArray.push(sprite.blue);
                    Renderer.vertexArray.push(sprite.alpha);
                    Renderer.vertexArray.push(sprite.pinned ? 1 : 0);
                    Renderer.vertexArray.push(sprite.x);
                    Renderer.vertexArray.push(sprite.y);
                    Renderer.vertexArray.push(sprite.xOffset + sprite.xSize);
                    Renderer.vertexArray.push(sprite.yOffset + sprite.ySize);
                    Renderer.vertexArray.push(sprite.xScale);
                    Renderer.vertexArray.push(sprite.yScale);
                    Renderer.vertexArray.push(sprite.xMirror ? 1 : 0);
                    Renderer.vertexArray.push(sprite.yMirror ? 1 : 0);
                    Renderer.vertexArray.push(sprite.angle);
                    //@ts-ignore
                    Renderer.vertexArray.push(sprite.u1);
                    //@ts-ignore
                    Renderer.vertexArray.push(sprite.v1);
                    //@ts-ignore
                    Renderer.vertexArray.push(sprite.texture == null ? -1 : sprite.texture.getRenderingSlot());
                    Renderer.vertexArray.push(sprite.red);
                    Renderer.vertexArray.push(sprite.green);
                    Renderer.vertexArray.push(sprite.blue);
                    Renderer.vertexArray.push(sprite.alpha);
                    Renderer.faceArray.push(Renderer.SPRITE_RENDERER_VERTICES * Renderer.drawableCount + 0);
                    Renderer.faceArray.push(Renderer.SPRITE_RENDERER_VERTICES * Renderer.drawableCount + 1);
                    Renderer.faceArray.push(Renderer.SPRITE_RENDERER_VERTICES * Renderer.drawableCount + 2);
                    Renderer.faceArray.push(Renderer.SPRITE_RENDERER_VERTICES * Renderer.drawableCount + 1);
                    Renderer.faceArray.push(Renderer.SPRITE_RENDERER_VERTICES * Renderer.drawableCount + 3);
                    Renderer.faceArray.push(Renderer.SPRITE_RENDERER_VERTICES * Renderer.drawableCount + 2);
                    Renderer.drawableCount += 1;
                }
            }
        };
        Renderer.update = function () {
            if (Renderer.mode == RendererMode.CANVAS_2D) {
                //@ts-ignore
                Renderer.drawCalls += 1;
            }
            else {
                if (Renderer.drawableCount > 0) {
                    Renderer.gl.bindBuffer(Renderer.gl.ARRAY_BUFFER, Renderer.vertexBuffer);
                    Renderer.gl.bufferData(Renderer.gl.ARRAY_BUFFER, new Float32Array(Renderer.vertexArray), Renderer.gl.DYNAMIC_DRAW);
                    Renderer.gl.vertexAttribPointer(Renderer.glVertexPinned, 1, Renderer.gl.FLOAT, false, 4 * (1 + 2 + 2 + 2 + 2 + 1 + 2 + 1 + 4), 4 * (0));
                    Renderer.gl.vertexAttribPointer(Renderer.glVertexAnchor, 2, Renderer.gl.FLOAT, false, 4 * (1 + 2 + 2 + 2 + 2 + 1 + 2 + 1 + 4), 4 * (1));
                    Renderer.gl.vertexAttribPointer(Renderer.glVertexPosition, 2, Renderer.gl.FLOAT, false, 4 * (1 + 2 + 2 + 2 + 2 + 1 + 2 + 1 + 4), 4 * (1 + 2));
                    Renderer.gl.vertexAttribPointer(Renderer.glVertexScale, 2, Renderer.gl.FLOAT, false, 4 * (1 + 2 + 2 + 2 + 2 + 1 + 2 + 1 + 4), 4 * (1 + 2 + 2));
                    Renderer.gl.vertexAttribPointer(Renderer.glVertexMirror, 2, Renderer.gl.FLOAT, false, 4 * (1 + 2 + 2 + 2 + 2 + 1 + 2 + 1 + 4), 4 * (1 + 2 + 2 + 2));
                    Renderer.gl.vertexAttribPointer(Renderer.glVertexAngle, 1, Renderer.gl.FLOAT, false, 4 * (1 + 2 + 2 + 2 + 2 + 1 + 2 + 1 + 4), 4 * (1 + 2 + 2 + 2 + 2));
                    Renderer.gl.vertexAttribPointer(Renderer.glVertexUV, 2, Renderer.gl.FLOAT, false, 4 * (1 + 2 + 2 + 2 + 2 + 1 + 2 + 1 + 4), 4 * (1 + 2 + 2 + 2 + 2 + 1));
                    Renderer.gl.vertexAttribPointer(Renderer.glVertexTexture, 1, Renderer.gl.FLOAT, false, 4 * (1 + 2 + 2 + 2 + 2 + 1 + 2 + 1 + 4), 4 * (1 + 2 + 2 + 2 + 2 + 1 + 2));
                    Renderer.gl.vertexAttribPointer(Renderer.glVertexColor, 4, Renderer.gl.FLOAT, false, 4 * (1 + 2 + 2 + 2 + 2 + 1 + 2 + 1 + 4), 4 * (1 + 2 + 2 + 2 + 2 + 1 + 2 + 1));
                    Renderer.gl.bindBuffer(Renderer.gl.ELEMENT_ARRAY_BUFFER, Renderer.faceBuffer);
                    Renderer.gl.bufferData(Renderer.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(Renderer.faceArray), Renderer.gl.DYNAMIC_DRAW);
                    Renderer.gl.drawElements(Renderer.gl.TRIANGLES, Renderer.drawableCount * (3 + 3), Renderer.gl.UNSIGNED_SHORT, 0);
                    Renderer.gl.flush();
                    //@ts-ignore
                    Renderer.drawCalls += 1;
                    Renderer.vertexArray = [];
                    Renderer.faceArray = [];
                    Renderer.drawableCount = 0;
                }
            }
        };
        //@ts-ignore
        Renderer.updateHandCursor = function () {
            if (Renderer.useHandPointer) {
                Renderer.canvas.style.cursor = "pointer";
                Renderer.useHandPointer = false;
            }
            else {
                Renderer.canvas.style.cursor = "default";
            }
        };
        //@ts-ignore
        Renderer.init = function () {
            Renderer.canvas = document.getElementById('gameCanvas');
            if (Renderer.autoscale) {
                Renderer.canvas.style.display = "block";
                Renderer.canvas.style.position = "absolute";
                Renderer.canvas.style.top = "0px";
                Renderer.canvas.style.left = "0px";
                var xSize = window.innerWidth;
                var ySize = window.innerHeight;
                Renderer.canvas.style.width = "100%";
                Renderer.canvas.style.height = "100%";
                Renderer.canvas.width = xSize * (Renderer.useDPI ? Renderer.dpr : 1);
                Renderer.canvas.height = ySize * (Renderer.useDPI ? Renderer.dpr : 1);
                //@ts-ignore
                Renderer.xSizeWindow = xSize;
                //@ts-ignore
                Renderer.ySizeWindow = ySize;
                //@ts-ignore
                Renderer.xSizeView = Renderer.xSizeWindow * Renderer.ySizeViewIdeal / Renderer.ySizeWindow;
                //@ts-ignore
                Renderer.ySizeView = Renderer.ySizeViewIdeal;
                Renderer.fixViewValues();
            }
            else {
                //@ts-ignore
                Renderer.xSizeWindow = Renderer.canvas.width;
                //@ts-ignore
                Renderer.ySizeWindow = Renderer.canvas.height;
                //@ts-ignore
                Renderer.xSizeView = Renderer.xSizeWindow * Renderer.ySizeViewIdeal / Renderer.ySizeWindow;
                //@ts-ignore
                Renderer.ySizeView = Renderer.ySizeViewIdeal;
                Renderer.fixViewValues();
            }
            if (Renderer.preferredMode == RendererMode.WEB_GL) {
                try {
                    //@ts-ignore
                    Renderer.gl = Renderer.canvas.getContext("webgl") || Renderer.canvas.getContext("experimental-webgl");
                    //@ts-ignore
                    Renderer.glSupported = Renderer.gl && Renderer.gl instanceof WebGLRenderingContext;
                }
                catch (e) {
                    //@ts-ignore
                    Renderer.glSupported = false;
                }
            }
            if (Renderer.glSupported && Renderer.preferredMode == RendererMode.WEB_GL) {
                //@ts-ignore
                Renderer.mode = RendererMode.WEB_GL;
                Engine.Assets.queue(Renderer.PATH_SHADER_VERTEX);
                Engine.Assets.queue(Renderer.PATH_SHADER_FRAGMENT);
                Engine.Assets.download();
                Renderer.initGL();
            }
            else {
                if (Renderer.preferredMode == RendererMode.CANVAS_2D) {
                    console.error("Set \"Renderer.preferredMode = RendererMode.CANVAS_2D\" only for testing proposes.");
                }
                //@ts-ignore
                Renderer.mode = RendererMode.CANVAS_2D;
                Renderer.context = Renderer.canvas.getContext("2d");
                if (Renderer.context.imageSmoothingEnabled != null && Renderer.context.imageSmoothingEnabled != undefined) {
                    Renderer.context.imageSmoothingEnabled = false;
                }
                //@ts-ignore
                else if (Renderer.context.msImageSmoothingEnabled != null && Renderer.context.msImageSmoothingEnabled != undefined) {
                    //@ts-ignore
                    Renderer.context.msImageSmoothingEnabled = false;
                }
                //@ts-ignore
                Renderer.inited = true;
            }
        };
        Renderer.getGLTextureUnitIndex = function (index) {
            switch (index) {
                case 0: return Renderer.gl.TEXTURE0;
                case 1: return Renderer.gl.TEXTURE1;
                case 2: return Renderer.gl.TEXTURE2;
                case 3: return Renderer.gl.TEXTURE3;
                case 4: return Renderer.gl.TEXTURE4;
                case 5: return Renderer.gl.TEXTURE5;
                case 6: return Renderer.gl.TEXTURE6;
                case 7: return Renderer.gl.TEXTURE7;
                case 8: return Renderer.gl.TEXTURE8;
                case 9: return Renderer.gl.TEXTURE9;
                case 10: return Renderer.gl.TEXTURE10;
                case 11: return Renderer.gl.TEXTURE11;
                case 12: return Renderer.gl.TEXTURE12;
                case 13: return Renderer.gl.TEXTURE13;
                case 14: return Renderer.gl.TEXTURE14;
                case 15: return Renderer.gl.TEXTURE15;
                case 16: return Renderer.gl.TEXTURE16;
                case 17: return Renderer.gl.TEXTURE17;
                case 18: return Renderer.gl.TEXTURE18;
                case 19: return Renderer.gl.TEXTURE19;
                case 20: return Renderer.gl.TEXTURE20;
                case 21: return Renderer.gl.TEXTURE21;
                case 22: return Renderer.gl.TEXTURE22;
                case 23: return Renderer.gl.TEXTURE23;
                case 24: return Renderer.gl.TEXTURE24;
                case 25: return Renderer.gl.TEXTURE25;
                case 26: return Renderer.gl.TEXTURE26;
                case 27: return Renderer.gl.TEXTURE27;
                case 28: return Renderer.gl.TEXTURE28;
                case 29: return Renderer.gl.TEXTURE29;
                case 30: return Renderer.gl.TEXTURE30;
                case 31: return Renderer.gl.TEXTURE31;
                default: return Renderer.gl.NONE;
            }
        };
        Renderer.createShader = function (source, type) {
            var shader = Renderer.gl.createShader(type);
            if (shader == null || shader == Renderer.gl.NONE) {
                console.log("Error");
            }
            else {
                Renderer.gl.shaderSource(shader, source);
                Renderer.gl.compileShader(shader);
                var shaderCompileStatus = Renderer.gl.getShaderParameter(shader, Renderer.gl.COMPILE_STATUS);
                if (shaderCompileStatus <= 0) {
                    console.log("Error");
                }
                else {
                    return shader;
                }
            }
            return Renderer.gl.NONE;
        };
        //@ts-ignore
        Renderer.renderTexture = function (texture, filter) {
            Renderer.textureSamplerIndices[texture.slot] = texture.slot;
            Renderer.gl.uniform1iv(Renderer.glTextureSamplers, new Int32Array(Renderer.textureSamplerIndices));
            Renderer.gl.activeTexture(Renderer.getGLTextureUnitIndex(texture.slot));
            Renderer.gl.bindTexture(Renderer.gl.TEXTURE_2D, Renderer.textureSlots[texture.slot]);
            //@ts-ignore
            Renderer.gl.texImage2D(Renderer.gl.TEXTURE_2D, 0, Renderer.gl.RGBA, texture.assetData.xSize, texture.assetData.ySize, 0, Renderer.gl.RGBA, Renderer.gl.UNSIGNED_BYTE, new Uint8Array(texture.assetData.bytes));
            //@ts-ignore
            if (filter && texture.assetData.filterable) {
                Renderer.gl.generateMipmap(Renderer.gl.TEXTURE_2D);
                Renderer.gl.texParameteri(Renderer.gl.TEXTURE_2D, Renderer.gl.TEXTURE_MAG_FILTER, Renderer.gl.LINEAR);
                Renderer.gl.texParameteri(Renderer.gl.TEXTURE_2D, Renderer.gl.TEXTURE_MIN_FILTER, Renderer.gl.LINEAR_MIPMAP_LINEAR);
            }
            else {
                Renderer.gl.texParameteri(Renderer.gl.TEXTURE_2D, Renderer.gl.TEXTURE_MAG_FILTER, Renderer.gl.NEAREST);
                Renderer.gl.texParameteri(Renderer.gl.TEXTURE_2D, Renderer.gl.TEXTURE_MIN_FILTER, Renderer.gl.NEAREST);
                Renderer.gl.texParameteri(Renderer.gl.TEXTURE_2D, Renderer.gl.TEXTURE_WRAP_T, Renderer.gl.CLAMP_TO_EDGE);
                Renderer.gl.texParameteri(Renderer.gl.TEXTURE_2D, Renderer.gl.TEXTURE_WRAP_S, Renderer.gl.CLAMP_TO_EDGE);
            }
        };
        Renderer.initGL = function () {
            if (Engine.Assets.downloadComplete) {
                for (var indexSlot = 0; indexSlot < Renderer.MAX_TEXTURE_SLOTS; indexSlot += 1) {
                    Renderer.textureSamplerIndices[indexSlot] = 0;
                }
                //TODO: USE Renderer.gl.MAX_TEXTURE_IMAGE_UNITS
                Renderer.vertexShader = Renderer.createShader(Engine.Assets.loadText(Renderer.PATH_SHADER_VERTEX), Renderer.gl.VERTEX_SHADER);
                var fragmentSource = "#define MAX_TEXTURE_SLOTS " + Renderer.MAX_TEXTURE_SLOTS + "\n" + "precision mediump float;\n" + Engine.Assets.loadText(Renderer.PATH_SHADER_FRAGMENT);
                Renderer.fragmentShader = Renderer.createShader(fragmentSource, Renderer.gl.FRAGMENT_SHADER);
                Renderer.shaderProgram = Renderer.gl.createProgram();
                if (Renderer.shaderProgram == null || Renderer.shaderProgram == 0) {
                    console.log("Error");
                }
                else {
                    Renderer.gl.attachShader(Renderer.shaderProgram, Renderer.vertexShader);
                    Renderer.gl.attachShader(Renderer.shaderProgram, Renderer.fragmentShader);
                    Renderer.gl.linkProgram(Renderer.shaderProgram);
                    Renderer.glTextureSamplers = Renderer.gl.getUniformLocation(Renderer.shaderProgram, "textures");
                    Renderer.glSizeView = Renderer.gl.getUniformLocation(Renderer.shaderProgram, "view_size");
                    Renderer.glScaleView = Renderer.gl.getUniformLocation(Renderer.shaderProgram, "view_scale");
                    Renderer.glCameraPosition = Renderer.gl.getUniformLocation(Renderer.shaderProgram, "camera_position");
                    //Renderer.glTopLeftCamera = Renderer.gl.getUniformLocation(Renderer.shaderProgram, "top_left_camera");
                    //glPixelPerfect = Renderer.gl.getUniformLocation(shaderProgram, "pixel_perfect");
                    Renderer.glVertexPinned = Renderer.gl.getAttribLocation(Renderer.shaderProgram, "vertex_pinned");
                    Renderer.glVertexAnchor = Renderer.gl.getAttribLocation(Renderer.shaderProgram, "vertex_anchor");
                    Renderer.glVertexPosition = Renderer.gl.getAttribLocation(Renderer.shaderProgram, "vertex_position");
                    Renderer.glVertexScale = Renderer.gl.getAttribLocation(Renderer.shaderProgram, "vertex_scale");
                    Renderer.glVertexMirror = Renderer.gl.getAttribLocation(Renderer.shaderProgram, "vertex_mirror");
                    Renderer.glVertexAngle = Renderer.gl.getAttribLocation(Renderer.shaderProgram, "vertex_angle");
                    Renderer.glVertexUV = Renderer.gl.getAttribLocation(Renderer.shaderProgram, "vertex_uv");
                    Renderer.glVertexTexture = Renderer.gl.getAttribLocation(Renderer.shaderProgram, "vertex_texture");
                    Renderer.glVertexColor = Renderer.gl.getAttribLocation(Renderer.shaderProgram, "vertex_color");
                    Renderer.gl.useProgram(Renderer.shaderProgram);
                    Renderer.gl.enableVertexAttribArray(Renderer.glVertexPinned);
                    Renderer.gl.enableVertexAttribArray(Renderer.glVertexAnchor);
                    Renderer.gl.enableVertexAttribArray(Renderer.glVertexPosition);
                    Renderer.gl.enableVertexAttribArray(Renderer.glVertexScale);
                    Renderer.gl.enableVertexAttribArray(Renderer.glVertexMirror);
                    Renderer.gl.enableVertexAttribArray(Renderer.glVertexAngle);
                    Renderer.gl.enableVertexAttribArray(Renderer.glVertexUV);
                    Renderer.gl.enableVertexAttribArray(Renderer.glVertexTexture);
                    Renderer.gl.enableVertexAttribArray(Renderer.glVertexColor);
                    Renderer.gl.uniform1iv(Renderer.glTextureSamplers, new Int32Array(Renderer.textureSamplerIndices));
                    Renderer.gl.viewport(0, 0, Renderer.canvas.width, Renderer.canvas.height);
                    Renderer.gl.uniform2f(Renderer.glSizeView, Renderer.xSizeView, Renderer.ySizeView);
                    Renderer.gl.uniform2f(Renderer.glScaleView, Renderer.xScaleView, Renderer.yScaleView);
                    //TODO: Android
                    //Renderer.gl.uniform2f(rly_cursor_location, rly_cursorX, rly_cursorY);
                    //Renderer.gl.uniform1iv(rly_top_left_cursor_location, rly_top_left_cursor);
                    //Renderer.gl.uniform1iv(rly_pixel_perfect_location, rly_pixel_perfect);
                    Renderer.vertexBuffer = Renderer.gl.createBuffer();
                    Renderer.faceBuffer = Renderer.gl.createBuffer();
                    Renderer.gl.enable(Renderer.gl.BLEND);
                    Renderer.gl.blendFuncSeparate(Renderer.gl.SRC_ALPHA, Renderer.gl.ONE_MINUS_SRC_ALPHA, Renderer.gl.ZERO, Renderer.gl.ONE);
                    //glBlendFunc(Renderer.gl.ONE, Renderer.gl.ONE_MINUS_SRC_ALPHA);
                    Renderer.gl.clearColor(Renderer.clearRed, Renderer.clearGreen, Renderer.clearBlue, 1);
                    //Renderer.gl.clear(Renderer.gl.COLOR_BUFFER_BIT);
                    for (var indexSlot = 0; indexSlot < Renderer.MAX_TEXTURE_SLOTS; indexSlot += 1) {
                        Renderer.textureSlots[indexSlot] = Renderer.gl.createTexture();
                        Renderer.gl.activeTexture(Renderer.getGLTextureUnitIndex(indexSlot));
                        Renderer.gl.bindTexture(Renderer.gl.TEXTURE_2D, Renderer.textureSlots[indexSlot]);
                        Renderer.gl.texParameteri(Renderer.gl.TEXTURE_2D, Renderer.gl.TEXTURE_MAG_FILTER, Renderer.gl.NEAREST);
                        Renderer.gl.texParameteri(Renderer.gl.TEXTURE_2D, Renderer.gl.TEXTURE_MIN_FILTER, Renderer.gl.NEAREST);
                        Renderer.gl.texParameteri(Renderer.gl.TEXTURE_2D, Renderer.gl.TEXTURE_WRAP_T, Renderer.gl.CLAMP_TO_EDGE);
                        Renderer.gl.texParameteri(Renderer.gl.TEXTURE_2D, Renderer.gl.TEXTURE_WRAP_S, Renderer.gl.CLAMP_TO_EDGE);
                    }
                    Renderer.gl.activeTexture(Renderer.getGLTextureUnitIndex(0));
                    Renderer.gl.bindTexture(Renderer.gl.TEXTURE_2D, Renderer.textureSlots[0]);
                    Renderer.gl.texImage2D(Renderer.gl.TEXTURE_2D, 0, Renderer.gl.RGBA, 2, 2, 0, Renderer.gl.RGBA, Renderer.gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]));
                }
                Renderer.gl.clearColor(Renderer.clearRed, Renderer.clearGreen, Renderer.clearBlue, 1);
                //@ts-ignore
                Renderer.inited = true;
            }
            else {
                setTimeout(Renderer.initGL, 1.0 / 60.0);
            }
        };
        //GL
        Renderer.MAX_TEXTURE_SLOTS = 8;
        Renderer.SPRITE_RENDERER_VERTICES = 4;
        //private static readonly  SPRITE_RENDERER_VERTEX_ATTRIBUTES = 17;
        //private static readonly  SPRITE_RENDERER_FACE_INDICES = 6;
        Renderer.PATH_SHADER_VERTEX = "System/Vertex.glsl";
        Renderer.PATH_SHADER_FRAGMENT = "System/Fragment.glsl";
        Renderer.inited = false;
        Renderer.preferredMode = RendererMode.WEB_GL;
        Renderer.glSupported = false;
        Renderer.useHandPointer = false;
        //private static topLeftCamera = false;
        Renderer.xCamera = 0;
        Renderer.yCamera = 0;
        Renderer.xSizeViewIdeal = 160 * 1;
        Renderer.ySizeViewIdeal = 120 * 1;
        Renderer.clearRed = 248.0 / 255.0;
        Renderer.clearGreen = 248.0 / 255.0;
        Renderer.clearBlue = 248.0 / 255.0;
        Renderer.xFitView = false;
        Renderer.xScaleView = 1;
        Renderer.yScaleView = 1;
        Renderer.drawCalls = 0;
        Renderer.autoscale = true;
        Renderer.maxElementsDrawCall = 8192;
        Renderer.textureSlots = new Array();
        Renderer.drawableCount = 0;
        Renderer.vertexArray = new Array();
        Renderer.faceArray = new Array();
        Renderer.textureSamplerIndices = new Array();
        Renderer.useDPI = true;
        Renderer.dpr = window.devicePixelRatio || 1;
        Renderer.a = false;
        return Renderer;
    }());
    Engine.Renderer = Renderer;
})(Engine || (Engine = {}));
var Engine;
(function (Engine) {
    var Scene = /** @class */ (function () {
        function Scene() {
            //@ts-ignore
            if (!Engine.System.canCreateScene || Engine.System.creatingScene) {
                console.log("error");
            }
            //@ts-ignore
            Engine.System.creatingScene = true;
        }
        Object.defineProperty(Scene.prototype, "preserved", {
            get: function () {
                return false;
            },
            //@ts-ignore
            set: function (value) {
                console.log("ERROR");
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Scene.prototype, "owner", {
            get: function () {
                return null;
            },
            //@ts-ignore
            set: function (value) {
                console.log("ERROR");
            },
            enumerable: false,
            configurable: true
        });
        return Scene;
    }());
    Engine.Scene = Scene;
})(Engine || (Engine = {}));
var Engine;
(function (Engine) {
    var EventType;
    (function (EventType) {
        EventType[EventType["CUSTOM"] = 0] = "CUSTOM";
        EventType[EventType["CREATE_SCENE"] = 1] = "CREATE_SCENE";
        EventType[EventType["INIT_SCENE"] = 2] = "INIT_SCENE";
        EventType[EventType["RESET_SCENE"] = 3] = "RESET_SCENE";
        EventType[EventType["VIEW_UPDATE"] = 4] = "VIEW_UPDATE";
        EventType[EventType["STEP_UPDATE"] = 5] = "STEP_UPDATE";
        EventType[EventType["TIME_UPDATE"] = 6] = "TIME_UPDATE";
        EventType[EventType["CLEAR_SCENE"] = 7] = "CLEAR_SCENE";
        EventType[EventType["DESTROY"] = 8] = "DESTROY";
        EventType[EventType["SURVIVE"] = 9] = "SURVIVE";
    })(EventType = Engine.EventType || (Engine.EventType = {}));
    var EventListenerGroup = /** @class */ (function () {
        function EventListenerGroup(name) {
            this.name = "";
            this.receptors = new Array();
            this.name = name;
        }
        return EventListenerGroup;
    }());
    var EventReceptor = /** @class */ (function () {
        function EventReceptor(chainable, action) {
            this.chainable = chainable;
            this.action = action;
        }
        return EventReceptor;
    }());
    var System = /** @class */ (function () {
        function System() {
        }
        System.triggerEvents = function (type) {
            for (var _i = 0, _a = System.listenerGroups[type]; _i < _a.length; _i++) {
                var listener = _a[_i];
                for (var _b = 0, _c = listener.receptors; _b < _c.length; _b++) {
                    var receptor = _c[_b];
                    receptor.action(receptor.chainable);
                }
            }
        };
        System.triggerCustomEvent = function (name) {
            for (var _i = 0, _a = System.listenerGroups[EventType.CUSTOM]; _i < _a.length; _i++) {
                var listener = _a[_i];
                if (listener.name == name) {
                    for (var _b = 0, _c = listener.receptors; _b < _c.length; _b++) {
                        var receptor = _c[_b];
                        receptor.action(receptor.chainable);
                    }
                    return;
                }
            }
            console.log("error");
        };
        System.getDestroyReceptors = function () {
            var callReceptors = [];
            for (var _i = 0, _a = System.listenerGroups[EventType.DESTROY]; _i < _a.length; _i++) {
                var listener = _a[_i];
                for (var _b = 0, _c = listener.receptors; _b < _c.length; _b++) {
                    var receptor = _c[_b];
                    var owner = receptor.chainable;
                    while (owner.owner != null) {
                        owner = owner.owner;
                    }
                    if (owner.preserved == null || !owner.preserved) {
                        callReceptors.push(receptor);
                    }
                }
            }
            return callReceptors;
        };
        System.onViewChanged = function () {
            System.triggerEvents(EventType.VIEW_UPDATE);
        };
        System.onStepUpdate = function () {
            if (System.nextSceneClass != null) {
                System.needReset = true;
                if (System.currentScene != null) {
                    System.triggerEvents(EventType.CLEAR_SCENE);
                    var destroyReceptors = System.getDestroyReceptors();
                    for (var _i = 0, _a = System.listenerGroups; _i < _a.length; _i++) {
                        var listenerGroup = _a[_i];
                        for (var _b = 0, listenerGroup_1 = listenerGroup; _b < listenerGroup_1.length; _b++) {
                            var listener = listenerGroup_1[_b];
                            var newReceptors = [];
                            for (var _c = 0, _d = listener.receptors; _c < _d.length; _c++) {
                                var receptor = _d[_c];
                                var owner = receptor.chainable;
                                while (owner.owner != null) {
                                    owner = owner.owner;
                                }
                                if (owner.preserved != null && owner.preserved) {
                                    newReceptors.push(receptor);
                                }
                            }
                            listener.receptors = newReceptors;
                        }
                    }
                    for (var _e = 0, destroyReceptors_1 = destroyReceptors; _e < destroyReceptors_1.length; _e++) {
                        var receptor = destroyReceptors_1[_e];
                        receptor.action(receptor.chainable);
                    }
                    //@ts-ignore
                    Engine.Texture.recycleAll();
                    //@ts-ignore
                    Engine.AudioPlayer.recycleAll();
                    System.triggerEvents(EventType.SURVIVE);
                }
                System.currentSceneClass = System.nextSceneClass;
                System.nextSceneClass = null;
                //@ts-ignore
                System.canCreateScene = true;
                //@ts-ignore
                System.currentScene = new System.currentSceneClass();
                System.triggerEvents(EventType.CREATE_SCENE);
                System.addListenersFrom(System.currentScene);
                //@ts-ignore
                System.canCreateScene = false;
                System.creatingScene = false;
                System.triggerEvents(EventType.INIT_SCENE);
            }
            if (System.needReset) {
                System.needReset = false;
                System.triggerEvents(EventType.RESET_SCENE);
                System.triggerEvents(EventType.VIEW_UPDATE);
            }
            System.triggerEvents(EventType.STEP_UPDATE);
        };
        System.onTimeUpdate = function () {
            //@ts-ignore
            Engine.AudioManager.checkSuspended();
            System.triggerEvents(EventType.TIME_UPDATE);
        };
        System.requireReset = function () {
            System.needReset = true;
        };
        System.update = function () {
            //if(System.hasFocus && !document.hasFocus()){
            //    System.hasFocus = false;
            //    Engine.pause();
            //}
            //else if(!System.hasFocus && document.hasFocus()){
            //    System.hasFocus = true;
            //    Engine.resume();
            //}
            if (System.pauseCount == 0) {
                //@ts-ignore
                Engine.Renderer.clear();
                while (System.stepTimeCount >= System.STEP_DELTA_TIME) {
                    //@ts-ignore
                    System.stepExtrapolation = 1;
                    if (System.inputInStepUpdate) {
                        //(NewKit as any).updateTouchscreen();
                        //@ts-ignore
                        Engine.Keyboard.update();
                        //@ts-ignore
                        Engine.Mouse.update();
                        //@ts-ignore
                        Engine.TouchInput.update();
                    }
                    System.onStepUpdate();
                    //@ts-ignore
                    Engine.Renderer.updateHandCursor();
                    System.stepTimeCount -= System.STEP_DELTA_TIME;
                }
                //@ts-ignore
                System.stepExtrapolation = System.stepTimeCount / System.STEP_DELTA_TIME;
                if (Engine.Renderer.xSizeWindow != window.innerWidth || Engine.Renderer.ySizeWindow != window.innerHeight) {
                    //@ts-ignore
                    Engine.Renderer.fixCanvasSize();
                    System.triggerEvents(EventType.VIEW_UPDATE);
                }
                if (!System.inputInStepUpdate) {
                    //(NewKit as any).updateTouchscreen();
                    //@ts-ignore
                    Engine.Keyboard.update();
                    //@ts-ignore
                    Engine.Mouse.update();
                    //@ts-ignore
                    Engine.TouchInput.update();
                }
                System.onTimeUpdate();
                //@ts-ignore
                Engine.Renderer.update();
                //@ts-ignore
                var nowTime = Date.now() / 1000.0;
                //@ts-ignore
                System.deltaTime = nowTime - System.oldTime;
                if (System.deltaTime > System.MAX_DELTA_TIME) {
                    //@ts-ignore
                    System.deltaTime = System.MAX_DELTA_TIME;
                }
                else if (System.deltaTime < 0) {
                    //@ts-ignore
                    System.deltaTime = 0;
                }
                System.stepTimeCount += System.deltaTime;
                System.oldTime = nowTime;
            }
            window.requestAnimationFrame(System.update);
        };
        System.pause = function () {
            //@ts-ignore
            System.pauseCount += 1;
            if (System.pauseCount == 1) {
                //@ts-ignore
                Engine.AudioManager.pause();
            }
        };
        ;
        System.resume = function () {
            if (System.pauseCount > 0) {
                //@ts-ignore
                System.pauseCount = 0;
                if (System.pauseCount == 0) {
                    //@ts-ignore
                    Engine.AudioManager.resume();
                    System.oldTime = Date.now() - System.STEP_DELTA_TIME;
                }
            }
            else {
                console.log("error");
            }
        };
        ;
        System.start = function () {
            if (Engine.Renderer.inited && Engine.AudioManager.inited) {
                System.canCreateEvents = true;
                System.onInit();
                System.canCreateEvents = false;
                //@ts-ignore
                System.started = true;
                window.requestAnimationFrame(System.update);
            }
            else {
                setTimeout(System.start, 1.0 / 60.0);
            }
        };
        System.run = function () {
            System.onRun();
            if (System.inited) {
                console.log("ERROR");
            }
            else {
                System.inited = true;
                //@ts-ignore
                Engine.Renderer.init();
                //@ts-ignore
                Engine.AudioManager.init();
                setTimeout(System.start, 1.0 / 60.0);
            }
        };
        System.STEP_DELTA_TIME = 1.0 / 60.0;
        System.MAX_DELTA_TIME = System.STEP_DELTA_TIME * 4;
        System.PI_OVER_180 = Math.PI / 180;
        System.inited = false;
        System.started = false;
        System.stepTimeCount = 0;
        System.stepExtrapolation = 0;
        System.oldTime = 0;
        System.deltaTime = 0;
        System.pauseCount = 0;
        System.listenerGroups = [[], [], [], [], [], [], [], [], [], []];
        System.canCreateEvents = false;
        System.canCreateScene = false;
        System.creatingScene = false;
        System.needReset = false;
        /*
        Engine.useHandPointer = false;
        Engine.onclick = null;
        */
        System.inputInStepUpdate = true;
        System.createEvent = function (type, name) {
            if (System.canCreateEvents) {
                System.listenerGroups[type].push(new EventListenerGroup(name));
            }
            else {
                console.log("error");
            }
        };
        System.addListenersFrom = function (chainable) {
            if (!System.creatingScene) {
                console.log("error");
            }
            for (var _i = 0, _a = System.listenerGroups; _i < _a.length; _i++) {
                var listenerGroup = _a[_i];
                for (var _b = 0, listenerGroup_2 = listenerGroup; _b < listenerGroup_2.length; _b++) {
                    var listener = listenerGroup_2[_b];
                    if (chainable.constructor != null) {
                        for (var prop in chainable.constructor) {
                            if (prop == listener.name) {
                                listener.receptors.push(new EventReceptor(chainable, chainable.constructor[prop]));
                            }
                        }
                    }
                    for (var prop in chainable) {
                        if (prop == listener.name) {
                            listener.receptors.push(new EventReceptor(chainable, chainable[prop].bind(chainable)));
                        }
                    }
                }
            }
        };
        System.onRun = function () {
        };
        return System;
    }());
    Engine.System = System;
    if (!window.requestAnimationFrame) {
        //@ts-ignore
        window.requestAnimationFrame = function () {
            window.requestAnimationFrame =
                window['requestAnimationFrame'] ||
                    //@ts-ignore
                    window['mozRequestAnimationFrame'] ||
                    //@ts-ignore
                    window['webkitRequestAnimationFrame'] ||
                    //@ts-ignore
                    window['msRequestAnimationFrame'] ||
                    //@ts-ignore
                    window['oRequestAnimationFrame'] ||
                    //@ts-ignore
                    function (callback, element) {
                        element = element;
                        window.setTimeout(callback, 1000 / 60);
                    };
        };
    }
    window.onclick = function (event) {
        //@ts-ignore
        Engine.AudioManager.verify();
        Engine.LinkManager.triggerMouse(event);
    };
    window.ontouchstart = function (event) {
        //window.onclick = function(_event : MouseEvent){}
        //@ts-ignore
        Engine.AudioManager.verify();
        Engine.LinkManager.triggerTouch(event);
    };
})(Engine || (Engine = {}));
var Engine;
(function (Engine) {
    var Texture = /** @class */ (function () {
        function Texture(path, hasClearColor, filter) {
            this._path = "";
            this.slot = 0;
            this.preserved = false;
            this.linkedTexture = null;
            this.linkedTexture = this;
            //@ts-ignore
            if (!Engine.System.creatingScene) {
                console.error("error");
            }
            this._path = path;
            //@ts-ignore
            this.slot = Texture.textures.length;
            this.assetData = Engine.Assets.loadImage(path);
            this.filter = filter;
            if (hasClearColor) {
                this.applyClearColor();
            }
            if (Engine.Renderer.mode == Engine.RendererMode.CANVAS_2D) {
                this.canvas = document.createElement("canvas");
                this.canvas.width = this.assetData.xSize;
                this.canvas.height = this.assetData.ySize;
                this.context = this.canvas.getContext("2d");
                this.context.putImageData(this.assetData.imageData, 0, 0);
            }
            else {
                //@ts-ignore
                Engine.Renderer.renderTexture(this, this.filter);
            }
            Texture.textures.push(this);
        }
        Object.defineProperty(Texture.prototype, "path", {
            get: function () {
                return this._path;
            },
            enumerable: false,
            configurable: true
        });
        //@ts-ignore
        Texture.recycleAll = function () {
            var newTextures = new Array();
            for (var _i = 0, _a = Texture.textures; _i < _a.length; _i++) {
                var texture = _a[_i];
                var owner = texture;
                while (owner.owner != null) {
                    owner = owner.owner;
                }
                if (owner.preserved) {
                    var oldSlot = texture.slot;
                    //@ts-ignore
                    texture.slot = newTextures.length;
                    if (Engine.Renderer.mode == Engine.RendererMode.WEB_GL && oldSlot != texture.slot) {
                        //@ts-ignore
                        Engine.Renderer.renderTexture(texture);
                    }
                    newTextures.push(texture);
                }
            }
            Texture.textures = newTextures;
        };
        Texture.prototype.getRed = function (x, y) {
            return this.assetData.bytes[(y * this.assetData.xSize + x) * 4];
        };
        Texture.prototype.getGreen = function (x, y) {
            return this.assetData.bytes[(y * this.assetData.xSize + x) * 4 + 1];
        };
        Texture.prototype.getBlue = function (x, y) {
            return this.assetData.bytes[(y * this.assetData.xSize + x) * 4 + 2];
        };
        Texture.prototype.getAlpha = function (x, y) {
            return this.assetData.bytes[(y * this.assetData.xSize + x) * 4 + 3];
        };
        Texture.prototype.setRGBA = function (x, y, r, g, b, a) {
            this.assetData.bytes[(y * this.assetData.xSize + x) * 4 + 0] = r;
            this.assetData.bytes[(y * this.assetData.xSize + x) * 4 + 1] = g;
            this.assetData.bytes[(y * this.assetData.xSize + x) * 4 + 2] = b;
            this.assetData.bytes[(y * this.assetData.xSize + x) * 4 + 3] = a;
        };
        Texture.prototype.applyClearColor = function () {
            var color = {};
            color.r = this.getRed(0, 0);
            color.g = this.getGreen(0, 0);
            color.b = this.getBlue(0, 0);
            color.a = this.getAlpha(0, 0);
            for (var yIndex = 0; yIndex < this.assetData.ySize; yIndex += 1) {
                for (var xIndex = 0; xIndex < this.assetData.xSize; xIndex += 1) {
                    if (color.r == this.getRed(xIndex, yIndex) && color.g == this.getGreen(xIndex, yIndex) && color.b == this.getBlue(xIndex, yIndex) && color.a == this.getAlpha(xIndex, yIndex)) {
                        this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 0] = 0;
                        this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 1] = 0;
                        this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 2] = 0;
                        this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 3] = 0;
                    }
                }
            }
        };
        Texture.prototype.clear = function () {
            for (var yIndex = 0; yIndex < this.assetData.ySize; yIndex += 1) {
                for (var xIndex = 0; xIndex < this.assetData.xSize; xIndex += 1) {
                    this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 0] = 0;
                    this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 1] = 0;
                    this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 2] = 0;
                    this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 3] = 0;
                }
            }
        };
        Texture.prototype.copy = function (other) {
            for (var yIndex = 0; yIndex < this.assetData.ySize; yIndex += 1) {
                for (var xIndex = 0; xIndex < this.assetData.xSize; xIndex += 1) {
                    this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 0] = other.assetData.bytes[(yIndex * other.assetData.xSize + xIndex) * 4 + 0];
                    this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 1] = other.assetData.bytes[(yIndex * other.assetData.xSize + xIndex) * 4 + 1];
                    this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 2] = other.assetData.bytes[(yIndex * other.assetData.xSize + xIndex) * 4 + 2];
                    this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 3] = other.assetData.bytes[(yIndex * other.assetData.xSize + xIndex) * 4 + 3];
                }
            }
        };
        Texture.prototype.clearColor = function (x, y) {
            var r = this.getRed(x, y);
            var g = this.getRed(x, y);
            var b = this.getRed(x, y);
            var a = this.getRed(x, y);
            for (var yIndex = 0; yIndex < this.assetData.ySize; yIndex += 1) {
                for (var xIndex = 0; xIndex < this.assetData.xSize; xIndex += 1) {
                    if (r == this.getRed(xIndex, yIndex) && g == this.getGreen(xIndex, yIndex) && b == this.getBlue(xIndex, yIndex) && a == this.getAlpha(xIndex, yIndex)) {
                        this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 0] = 0;
                        this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 1] = 0;
                        this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 2] = 0;
                        this.assetData.bytes[(yIndex * this.assetData.xSize + xIndex) * 4 + 3] = 0;
                    }
                }
            }
        };
        Texture.prototype.getRenderingSlot = function () {
            return this.linkedTexture.slot;
        };
        Texture.prototype.link = function (tex) {
            this.linkedTexture = tex == null ? this : tex;
        };
        Texture.prototype.renderAgain = function () {
            //console.error("OPTIMIZE THIS");
            //@ts-ignore
            Engine.Renderer.renderTexture(this, this.filter);
        };
        Texture.textures = new Array();
        return Texture;
    }());
    Engine.Texture = Texture;
})(Engine || (Engine = {}));
var Engine;
(function (Engine) {
    var TouchState;
    (function (TouchState) {
        TouchState[TouchState["New"] = 0] = "New";
        TouchState[TouchState["Pressed"] = 1] = "Pressed";
        TouchState[TouchState["Down"] = 2] = "Down";
        TouchState[TouchState["Canceled"] = 3] = "Canceled";
        TouchState[TouchState["Released"] = 4] = "Released";
    })(TouchState || (TouchState = {}));
    var TouchData = /** @class */ (function () {
        function TouchData(touch, state) {
            this.start = touch;
            this.previous = touch;
            this.current = touch;
            this.next = null;
            this.state = state;
        }
        return TouchData;
    }());
    var touchDataArray = new Array();
    var touchStart = function (event) {
        event.preventDefault();
        for (var indexEventTouch = 0; indexEventTouch < event.changedTouches.length; indexEventTouch += 1) {
            var touch = event.changedTouches.item(indexEventTouch);
            var add = true;
            for (var indexTouchData = 0; indexTouchData < touchDataArray.length; indexTouchData += 1) {
                var touchData = touchDataArray[indexTouchData];
                if (touchData == null) {
                    touchDataArray[indexTouchData] = new TouchData(touch, TouchState.New);
                    add = false;
                    break;
                }
                if (touch.identifier == touchData.current.identifier) {
                    if (touchData.state == TouchState.Canceled || touchData.state == TouchState.Released) {
                        touchDataArray[indexTouchData] = new TouchData(touch, TouchState.New);
                    }
                    else {
                        touchDataArray[indexTouchData].next = touch;
                    }
                    add = false;
                    break;
                }
            }
            if (add) {
                touchDataArray.push(new TouchData(touch, TouchState.New));
            }
        }
    };
    var touchMove = function (event) {
        event.preventDefault();
        for (var indexEventTouch = 0; indexEventTouch < event.changedTouches.length; indexEventTouch += 1) {
            var touch = event.changedTouches.item(indexEventTouch);
            for (var indexTouchData = 0; indexTouchData < touchDataArray.length; indexTouchData += 1) {
                var touchData = touchDataArray[indexTouchData];
                if (touchData != null && touchData.start.identifier == touch.identifier) {
                    touchData.next = touch;
                    break;
                }
            }
        }
    };
    var touchCancel = function (event) {
        event.preventDefault();
        for (var indexEventTouch = 0; indexEventTouch < event.changedTouches.length; indexEventTouch += 1) {
            var touch = event.changedTouches.item(indexEventTouch);
            for (var indexTouchData = 0; indexTouchData < touchDataArray.length; indexTouchData += 1) {
                var touchData = touchDataArray[indexTouchData];
                if (touchData != null && touchData.start.identifier == touch.identifier) {
                    touchData.next = touch;
                    if (touchData.state == TouchState.New || touchData.state == TouchState.Pressed || touchData.state == TouchState.Down) {
                        touchData.state = TouchState.Canceled;
                    }
                    break;
                }
            }
        }
    };
    var touchEnd = function (event) {
        touchCancel(event);
    };
    window.addEventListener("touchstart", touchStart, { passive: false });
    window.addEventListener("touchmove", touchMove, { passive: false });
    window.addEventListener("touchcancel", touchCancel, { passive: false });
    window.addEventListener("touchend", touchEnd, { passive: false });
    window.document.addEventListener("touchstart", function (e) {
        e.preventDefault();
    }, { passive: false });
    window.document.addEventListener("touchmove", function (e) {
        e.preventDefault();
    }, { passive: false });
    window.document.addEventListener("touchcancel", function (e) {
        e.preventDefault();
    }, { passive: false });
    window.document.addEventListener("touchend", function (e) {
        e.preventDefault();
    }, { passive: false });
    window.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    }, { passive: false });
    window.addEventListener('gesturechange', function (e) {
        e.preventDefault();
    }, { passive: false });
    window.addEventListener('gestureend', function (e) {
        e.preventDefault();
    }, { passive: false });
    window.document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    }, { passive: false });
    window.document.addEventListener('gesturechange', function (e) {
        e.preventDefault();
    }, { passive: false });
    window.document.addEventListener('gestureend', function (e) {
        e.preventDefault();
    }, { passive: false });
    var TouchInput = /** @class */ (function () {
        function TouchInput() {
        }
        TouchInput.findDown = function (x0, y0, x1, y1, useRadius, findPressed) {
            for (var _i = 0, touchDataArray_1 = touchDataArray; _i < touchDataArray_1.length; _i++) {
                var touchData = touchDataArray_1[_i];
                if (touchData != null) {
                    var touch = touchData.current;
                    if (touchData.state == TouchState.Pressed || (!findPressed && touchData.state == TouchState.Down)) {
                        var radius = touch.radiusX < touch.radiusY ? touch.radiusX : touch.radiusY;
                        //if(radius == null || radius == undefined){
                        radius = 1;
                        //}
                        if (!useRadius) {
                            radius = 1;
                        }
                        radius = radius == 0 ? 1 : radius;
                        var x = touch.clientX / radius;
                        var y = touch.clientY / radius;
                        if (x != 0 && y != 0) {
                            var rx0 = x0 / radius;
                            var ry0 = y0 / radius;
                            var rx1 = x1 / radius;
                            var ry1 = y1 / radius;
                            if (x >= rx0 && x <= rx1 && y >= ry0 && y <= ry1) {
                                return true;
                            }
                        }
                    }
                }
            }
            return false;
        };
        TouchInput.down = function (x0, y0, x1, y1, useRadius) {
            return TouchInput.findDown(x0, y0, x1, y1, useRadius, false);
        };
        TouchInput.pressed = function (x0, y0, x1, y1, useRadius) {
            return TouchInput.findDown(x0, y0, x1, y1, useRadius, true);
        };
        //@ts-ignore
        TouchInput.update = function () {
            for (var indexTouchData = 0; indexTouchData < touchDataArray.length; indexTouchData += 1) {
                var touchData = touchDataArray[indexTouchData];
                if (touchData != null) {
                    if (touchData.next != null) {
                        touchData.previous = touchData.current;
                        touchData.current = touchData.next;
                        touchData.next = null;
                    }
                    //window.parent.document.getElementById("myHeader").textContent = touchData.current.identifier + " " + touchData.current.force + " " + touchData.current.radiusX;
                    switch (touchData.state) {
                        case TouchState.New:
                            touchData.state = TouchState.Pressed;
                            break;
                        case TouchState.Pressed:
                            touchData.state = TouchState.Down;
                            break;
                        case TouchState.Canceled:
                            touchData.state = TouchState.Released;
                            break;
                        case TouchState.Released:
                            touchDataArray[indexTouchData] = null;
                            break;
                    }
                }
            }
        };
        return TouchInput;
    }());
    Engine.TouchInput = TouchInput;
})(Engine || (Engine = {}));
///<reference path="../Engine/System.ts"/>
///<reference path="../Engine/AudioManager.ts"/>
///<reference path="../Engine/Renderer.ts"/>
var Game;
(function (Game) {
    //Engine.Renderer.preferredMode = Engine.RendererMode.CANVAS_2D;
    //Engine.AudioManager.preferredMode = Engine.AudioManagerMode.HTML;
    Engine.System.onInit = function () {
        if (Engine.Data.useLocalStorage) {
            Engine.Data.setID("com", "noa", "minswm", "0");
        }
        else {
            Engine.Data.setID("c", "n", "minswm", "0");
        }
        //SceneColors.clearColor(255, 255, 255);
        Engine.System.createEvent(Engine.EventType.CREATE_SCENE, "onCreateScene");
        Engine.System.createEvent(Engine.EventType.INIT_SCENE, "onInitScene");
        Engine.System.createEvent(Engine.EventType.RESET_SCENE, "onReset");
        Engine.System.createEvent(Engine.EventType.RESET_SCENE, "onStart");
        Engine.System.createEvent(Engine.EventType.VIEW_UPDATE, "onViewUpdateAnchor");
        Engine.System.createEvent(Engine.EventType.VIEW_UPDATE, "onViewUpdateText");
        Engine.System.createEvent(Engine.EventType.VIEW_UPDATE, "onViewUpdate");
        Engine.System.createEvent(Engine.EventType.CUSTOM, "onGameSwitchChange");
        Engine.System.createEvent(Engine.EventType.CUSTOM, "onStopAll");
        Engine.System.createEvent(Engine.EventType.CUSTOM, "onSpell");
        Engine.System.createEvent(Engine.EventType.CUSTOM, "onSwitchPressed");
        Engine.System.createEvent(Engine.EventType.STEP_UPDATE, "onControlPreUpdate");
        Engine.System.createEvent(Engine.EventType.STEP_UPDATE, "onControlUpdate");
        Engine.System.createEvent(Engine.EventType.STEP_UPDATE, "onMoveReady");
        Engine.System.createEvent(Engine.EventType.STEP_UPDATE, "onMoveConfigUpdate");
        Engine.System.createEvent(Engine.EventType.STEP_UPDATE, "onPlatformMoveUpdate");
        Engine.System.createEvent(Engine.EventType.STEP_UPDATE, "onMoveUpdate");
        Engine.System.createEvent(Engine.EventType.STEP_UPDATE, "onOverlapPreUpdate");
        Engine.System.createEvent(Engine.EventType.STEP_UPDATE, "onOverlapUpdate");
        Engine.System.createEvent(Engine.EventType.STEP_UPDATE, "onOverlapBlockUpdate");
        Engine.System.createEvent(Engine.EventType.STEP_UPDATE, "onAnimationUpdate");
        Engine.System.createEvent(Engine.EventType.STEP_UPDATE, "onStepUpdate");
        Engine.System.createEvent(Engine.EventType.STEP_UPDATE, "onStepLateUpdate");
        Engine.System.createEvent(Engine.EventType.STEP_UPDATE, "onStepUpdateFade");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onPlatformTimePreUpdate");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onTimeUpdate");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onTimeUpdateSceneBeforeDrawFixed");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawBackground");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawSceneSky");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawBackgroundDecoration");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawMoon");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawDoor");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawDoorParticles");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawSceneMap");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawBlocks");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawSceneFill");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawMapFill");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawTextSuperBack");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawParticlesBack");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawPlatforms");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawStaticDecoration");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawSpeedrunDialog");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawBackStilt");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawBubbles");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawObjectsBack");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawParticles");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawGoal");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawParticlesSpark");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawSpark");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawObjects");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawLance");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawJumper");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawLava");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawParticlesNeoA");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawCoins");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawBoxes");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawBigBlob");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawParticlesFrontPaused");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawPlayerPaused");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawGoalPaused");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawObjectsFrontPaused");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawGoalParticlesFrontPaused");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawParticlesPaused");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawControlsPaused");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawPause");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawBubblesDialog");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawButtons");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawDialogs");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawPreloadParticles");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawText");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawParticlesFrontUnpaused");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawPlayerUnpaused");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawGoalUnpaused");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawObjectsFrontUnpaused");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawGoalParticlesFrontUnpaused");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawParticlesUnpaused");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawControlsUnpaused");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawObjectsAfterUI");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawTextFront");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawAdFade");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawObjectsAfterAdFade");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawTextSuperFront");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawFade");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawOrientationUI");
        ///Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawTextFront");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onDrawTest");
        Engine.System.createEvent(Engine.EventType.TIME_UPDATE, "onFinalTimeUpdate");
        Engine.System.createEvent(Engine.EventType.CLEAR_SCENE, "onClearScene");
        //console.log(document.cookie);
        var dat = Engine.Data.load("dat");
        if (dat == null) {
            Game.dataLevels[0] = '0';
            Game.dataLevels[1] = '1';
            for (var i = 2; i <= Game.maxlev; i += 1) {
                Game.dataLevels[i] = '0';
            }
            Game.levelSpeedrun = 1;
            Game.dataSpeedrun = 0;
            Game.recordSpeedrun = 0;
        }
        else {
            Game.dataSpeedrun = +(loaval(0, dat, 6));
            Game.recordSpeedrun = +(loaval(6, dat, 6));
            Game.levelSpeedrun = +(loaval(12, dat, 3));
            for (var i = 1; i <= Game.maxlev; i++)
                Game.dataLevels[i] = '0';
            for (var i = 1, j = 19; j < dat.length; i++, j++)
                Game.dataLevels[i] = dat.charAt(j);
            var lasunl = 0;
            for (var i = 1; i <= Game.maxlev; i += 1) {
                if (Game.dataLevels[i] != '2') {
                    lasunl = i;
                    break;
                }
            }
            if (lasunl == 0)
                Game.LevelSelection.norpag = +(loaval(15, dat, 2));
            else
                Game.LevelSelection.norpag = Math.ceil(lasunl / Game.levpagsiz) - 1;
            Game.LevelSelection.prapag = +(loaval(17, dat, 2));
        }
        if (Game.dataLevels[1] != '2')
            Game.dataLevels[1] = '1';
        //var timerOn = +(Engine.Data.load("timeron"));
        //timerOn= isNaN(timerOn) ? 0 : timerOn;
        //TimerButton.on=timerOn==1?true:false;
        Game.TimerButton.on = true;
        //levelSpeedrun = +(Engine.Data.load("speedrunlevel"));
        //levelSpeedrun = isNaN(levelSpeedrun) ? 1 : levelSpeedrun;
        //levelSpeedrun = levelSpeedrun == 0 ? 1 : levelSpeedrun;
        //dataSpeedrun = +(Engine.Data.load("speedrundata"));
        //dataSpeedrun = isNaN(dataSpeedrun) ? 0 : dataSpeedrun;
        //recordSpeedrun = +(Engine.Data.load("speedrunrecord"));
        //recordSpeedrun = isNaN(recordSpeedrun) ? 0 : recordSpeedrun;
        Game.triggerActions("loadgame");
        //console.error("TODO: COMMENT THIS");
        Engine.Box.debugRender = false;
        //SKIP_PRELOADER = true;
        //Utils.Fade.scale = 5000;
        Game.startingSceneClass = Game.maimen.cla;
        //console.error("MAYBE CHANGE FADE COLOR TO MATCH THE DAY CYCLE")-IT COULD NOT BE DONE;
        //console.error("SPEEDRUN AD ON REST IS ONLY TRIGGERED ON PLATFORMS THAT IS SURE TO WAIT UNTIL AD IS FINISHED")-DEPENDS ON THE PLATFORM;
        //Game.LevelSelection.clearAllLevels();
    };
    function loaval(ind, str, num) {
        var strval = "";
        while (num-- > 0)
            strval += str[ind++];
        return strval;
    }
    function savval(val, str, num) {
        var strval = val + "";
        while (num-- > strval.length)
            str += "0";
        return str + val;
    }
    function savedat() {
        var max = 599999;
        if (Game.dataSpeedrun > max)
            Game.dataSpeedrun = max;
        if (Game.recordSpeedrun > max)
            Game.recordSpeedrun = max;
        var dat = savval(Game.dataSpeedrun, "", 6);
        dat = savval(Game.recordSpeedrun, dat, 6);
        dat = savval(Game.levelSpeedrun, dat, 3);
        dat = savval(Game.LevelSelection.norpag, dat, 2);
        dat = savval(Game.LevelSelection.prapag, dat, 2);
        for (var i = 1; i <= Game.maxlev; i++)
            dat += Game.dataLevels[i];
        Engine.Data.save("dat", dat, 60);
        Game.triggerActions("savegame");
    }
    Game.savedat = savedat;
})(Game || (Game = {}));
var Game;
(function (Game) {
    Game.plu = false;
    Game.HAS_PRELOADER = true;
    Game.HAS_LINKS = true;
    Game.HAS_GOOGLE_PLAY_LOGOS = false;
    Game.IS_EDGE = /Edge/.test(navigator.userAgent);
    Game.STEPS_CHANGE_SCENE = 10;
    Game.STEPS_CHANGE_SCENE_AD = 30;
    Game.X_BUTTONS_LEFT = 5.3;
    Game.X_BUTTONS_RIGHT = -5.3;
    Game.Y_BUTTONS_TOP = 3 - 0.5;
    Game.Y_BUTTONS_BOTTOM = -1.4;
    Game.Y_ARROWS_GAME_BUTTONS = 4;
    Game.X_SEPARATION_BUTTONS_LEFT = 6;
    Game.MUSIC_MUTED = false;
    Game.SOUND_MUTED = false;
    Game.IS_TOUCH = false;
    Game.SKIP_PRELOADER = false;
    Game.FORCE_TOUCH = false;
    Game.DIRECT_PRELOADER = false;
    Game.TRACK_ORIENTATION = false;
    Game.URL_MORE_GAMES = "http://noadev.com/games";
    Game.URL_NOADEV = "http://noadev.com/games";
    Game.TEXT_MORE_GAMES = "+GAMES";
    Game.TEXT_NOADEV = "NOADEV.COM";
    Game.IS_APP = false;
    Game.OPTIMIZE_TRANSPARENCY = false;
    Game.fixViewHandler = function () { };
    Game.HAS_STARTED = false;
    Game.STRONG_TOUCH_MUTE_CHECK = false;
    function muteAll() {
        for (var _i = 0, _a = Game.Resources.bgms; _i < _a.length; _i++) {
            var bgm = _a[_i];
            bgm.volume = 0;
        }
        for (var _b = 0, sfxs_1 = Game.sfxs; _b < sfxs_1.length; _b++) {
            var player = sfxs_1[_b];
            player.volume = 0;
        }
    }
    Game.muteAll = muteAll;
    Game.unmute = function () {
        if (Game.Resources.bgmVolumeTracker < 1) {
            Game.Resources.bgmVolumeTracker += 1;
            for (var _i = 0, _a = Game.Resources.bgms; _i < _a.length; _i++) {
                var bgm = _a[_i];
                bgm.volume = Game.Resources.bgmVolumeTracker == 1 ? bgm.restoreVolume : 0;
            }
            if (Game.Resources.bgmVolumeTracker == 1) {
                for (var _b = 0, sfxs_2 = Game.sfxs; _b < sfxs_2.length; _b++) {
                    var player = sfxs_2[_b];
                    player.volume = player.restoreVolume;
                }
            }
        }
        return Game.Resources.bgmVolumeTracker == 1;
    };
    Game.mute = function () {
        Game.Resources.bgmVolumeTracker -= 1;
        muteAll();
        return Game.Resources.bgmVolumeTracker < 1;
    };
    Engine.System.onRun = function () {
        if (!Game.IS_APP) {
            /*
            if(document.onvisibilitychange == undefined){
                
            }
            else{
                document.onvisibilitychange = function(){
                    if(document.visibilityState == "visible"){
                        onShow();
                        Engine.System.resume();
                    }
                    else if(document.visibilityState == "hidden"){
                        onHide();
                        Engine.System.pause();
                    }
                }
            }
            */
            window.onfocus = function () {
                Game.fixViewHandler();
                //unmute();
                //Engine.System.resume();
            };
            window.onblur = function () {
                Game.fixViewHandler();
                //mute();
                //Engine.System.pause();
            };
            document.addEventListener("visibilitychange", function () {
                Game.fixViewHandler();
                if (document.visibilityState == "visible") {
                    if (Game.STRONG_TOUCH_MUTE_CHECK) {
                        if (Game.HAS_STARTED && !Game.IS_TOUCH) {
                            Game.unmute();
                        }
                    }
                    else {
                        Game.unmute();
                    }
                    Engine.System.resume();
                }
                else if (document.visibilityState == "hidden") {
                    if (Game.STRONG_TOUCH_MUTE_CHECK) {
                        if (Game.HAS_STARTED && !Game.IS_TOUCH) {
                            Game.mute();
                        }
                    }
                    else {
                        Game.mute();
                    }
                    Engine.System.pause();
                }
            });
        }
    };
    var pathGroups = new Array();
    var actionGroups = new Array();
    Game.dataLevels = new Array();
    //console.log("Fix Canvas Mode Shake, IN ALL IS A BIG PROBLEM ON THE RENDERER ROOT; EVERITHING WORKS BAD, NOT ONLY THE SHAKE");
    //console.log("TEST CANVAS MODE ON MOBILE TO TEST IF THE DPI DONT SHOW PROBLEMS");
    //console.log("FIX IE MODE");
    //console.log("GENERAL SOUNDS");
    //console.log("SCROLL");
    //console.log("TEST ON KITKAT (4.4 API 19 OR 4.4.4 API 20) AFTER THE IE PORT. THE KITKAT VERSION SHOULD USE CANVAS OR TEST IF WEBGL WORK ON 4.4.4 API 20");
    //console.log("FIX CONTROL/BUTTON TOUCH PROBLEM: CONTROL BLOCK IS NOT WORKING WITH TOUCH");
    Game.bgms = new Array();
    Game.sfxs = new Array();
    function switchMusicMute() {
        Game.MUSIC_MUTED = !Game.MUSIC_MUTED;
        for (var _i = 0, bgms_1 = Game.bgms; _i < bgms_1.length; _i++) {
            var player = bgms_1[_i];
            player.muted = Game.MUSIC_MUTED;
        }
    }
    Game.switchMusicMute = switchMusicMute;
    function switchSoundMute() {
        Game.SOUND_MUTED = !Game.SOUND_MUTED;
        for (var _i = 0, sfxs_3 = Game.sfxs; _i < sfxs_3.length; _i++) {
            var player = sfxs_3[_i];
            player.muted = Game.SOUND_MUTED;
        }
    }
    Game.switchSoundMute = switchSoundMute;
    function findInJSON(jsonObj, funct) {
        if (jsonObj.find != null && jsonObj.find != undefined) {
            return jsonObj.find(funct);
        }
        else {
            for (var _i = 0, jsonObj_1 = jsonObj; _i < jsonObj_1.length; _i++) {
                var obj = jsonObj_1[_i];
                if (funct(obj)) {
                    return obj;
                }
            }
            return undefined;
        }
    }
    Game.findInJSON = findInJSON;
    function addElement(groups, type, element) {
        for (var _i = 0, groups_1 = groups; _i < groups_1.length; _i++) {
            var group = groups_1[_i];
            if (group.type == type) {
                group.elements.push(element);
                return;
            }
        }
        var group = {};
        group.type = type;
        group.elements = [element];
        groups.push(group);
    }
    function addPath(type, path) {
        addElement(pathGroups, type, path);
    }
    Game.addPath = addPath;
    function addAction(type, action) {
        addElement(actionGroups, type, action);
    }
    Game.addAction = addAction;
    function forEachPath(type, action) {
        for (var _i = 0, pathGroups_1 = pathGroups; _i < pathGroups_1.length; _i++) {
            var group = pathGroups_1[_i];
            if (group.type == type) {
                for (var _a = 0, _b = group.elements; _a < _b.length; _a++) {
                    var path = _b[_a];
                    action(path);
                }
                return;
            }
        }
    }
    Game.forEachPath = forEachPath;
    function triggerActions(type) {
        for (var _i = 0, actionGroups_1 = actionGroups; _i < actionGroups_1.length; _i++) {
            var group = actionGroups_1[_i];
            if (group.type == type) {
                for (var _a = 0, _b = group.elements; _a < _b.length; _a++) {
                    var action = _b[_a];
                    action();
                }
                return;
            }
        }
    }
    Game.triggerActions = triggerActions;
})(Game || (Game = {}));
///<reference path="../../Engine/Entity.ts"/>
var Game;
(function (Game) {
    var Entity = /** @class */ (function (_super) {
        __extends(Entity, _super);
        function Entity(def) {
            var _this = _super.call(this) || this;
            _this.def = def;
            return _this;
        }
        //@ts-ignore
        Entity.create = function (def) {
            eval("new " + def.type.type + "(def)");
        };
        Entity.getDefProperty = function (def, name) {
            var prop = null;
            if (def.properties != undefined) {
                prop = Game.findInJSON(def.properties, function (prop) {
                    return prop.name == name;
                });
            }
            if (def.instance.properties != undefined) {
                prop = Game.findInJSON(def.instance.properties, function (prop) {
                    return prop.name == name;
                });
            }
            if (prop == null && def.type != undefined && def.type.properties != undefined) {
                prop = Game.findInJSON(def.type.properties, function (prop) {
                    return prop.name == name;
                });
            }
            if (prop == null && def.tileDef != undefined && def.tileDef.properties != undefined) {
                prop = Game.findInJSON(def.tileDef.properties, function (prop) {
                    return prop.name == name;
                });
            }
            if (prop != null) {
                return prop.value;
            }
            return null;
        };
        Entity.prototype.getProperty = function (name) {
            return Entity.getDefProperty(this.def, name);
        };
        return Entity;
    }(Engine.Entity));
    Game.Entity = Entity;
})(Game || (Game = {}));
///<reference path="../System/Entity.ts"/>
var Game;
(function (Game) {
    var Arcade;
    (function (Arcade) {
        Arcade.xForceWorld = 0;
        Arcade.yForceWorld = 0.1;
        var X_VEL_MAX_DEFAULT = 0;
        var Y_VEL_MAX_DEFAULT = 3;
        var PhysicEntity = /** @class */ (function (_super) {
            __extends(PhysicEntity, _super);
            function PhysicEntity(def) {
                var _this = _super.call(this, def) || this;
                _this.xOffsetDraw = 0;
                _this.yOffsetDraw = 0;
                _this.xAlign = "middle";
                _this.yAlign = "end";
                _this.xVel = 0;
                _this.yVel = 0;
                _this.xCanMove = true;
                _this.yCanMove = true;
                _this.xStop = true;
                _this.yStop = true;
                _this.xDirContact = 0;
                _this.yDirContact = 0;
                _this.xScaleForceWorld = 1;
                _this.yScaleForceWorld = 1;
                _this.xMaxVel = X_VEL_MAX_DEFAULT;
                _this.yMaxVel = Y_VEL_MAX_DEFAULT;
                _this.xDraw = 0;
                _this.yDraw = 0;
                _this.boxSolid = new Engine.Box();
                _this.boxSolid.enabled = true;
                _this.boxSolid.renderable = true;
                _this.boxSolid.xSize = 8;
                _this.boxSolid.ySize = 8;
                _this.boxSolid.xOffset = -4;
                _this.boxSolid.yOffset = -8;
                return _this;
            }
            Object.defineProperty(PhysicEntity.prototype, "xVelExtern", {
                get: function () {
                    return 0;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(PhysicEntity.prototype, "yVelExtern", {
                get: function () {
                    return 0;
                },
                enumerable: false,
                configurable: true
            });
            PhysicEntity.prototype.onReset = function () {
                if (this.def.flip.x) {
                    switch (this.xAlign) {
                        case "start":
                            this.boxSolid.x = this.def.instance.x;
                            break;
                        case "middle":
                            this.boxSolid.x = this.def.instance.x - Game.SceneMap.instance.xSizeTile * 0.5;
                            break;
                        case "end":
                            this.boxSolid.x = this.def.instance.x - Game.SceneMap.instance.xSizeTile;
                            break;
                    }
                    this.boxSolid.x += Game.SceneMap.instance.xSizeTile;
                }
                else {
                    switch (this.xAlign) {
                        case "start":
                            this.boxSolid.x = this.def.instance.x;
                            break;
                        case "middle":
                            this.boxSolid.x = this.def.instance.x + Game.SceneMap.instance.xSizeTile * 0.5;
                            break;
                        case "end":
                            this.boxSolid.x = this.def.instance.x + Game.SceneMap.instance.xSizeTile;
                            break;
                    }
                }
                if (this.def.flip.y) {
                    switch (this.yAlign) {
                        case "start":
                            this.boxSolid.y = this.def.instance.y;
                            break;
                        case "middle":
                            this.boxSolid.y = this.def.instance.y - Game.SceneMap.instance.ySizeTile * 0.5;
                            break;
                        case "end":
                            this.boxSolid.y = this.def.instance.y - Game.SceneMap.instance.ySizeTile;
                            break;
                    }
                }
                else {
                    switch (this.yAlign) {
                        case "start":
                            this.boxSolid.y = this.def.instance.y;
                            break;
                        case "middle":
                            this.boxSolid.y = this.def.instance.y + Game.SceneMap.instance.ySizeTile * 0.5;
                            break;
                        case "end":
                            this.boxSolid.y = this.def.instance.y + Game.SceneMap.instance.ySizeTile;
                            break;
                    }
                    this.boxSolid.y -= Game.SceneMap.instance.ySizeTile;
                }
                this.boxSolid.enabled = true;
                this.xDraw = this.boxSolid.x;
                this.yDraw = this.boxSolid.y;
                this.xVel = 0;
                this.yVel = 0;
                this.xDirContact = 0;
                this.yDirContact = 0;
                this.xContacts = null;
                this.yContacts = null;
            };
            PhysicEntity.prototype.onMoveUpdate = function () {
                if (!Game.SceneFreezer.stoped) {
                    this.xContacts = null;
                    this.xDirContact = 0;
                    this.yContacts = null;
                    this.yDirContact = 0;
                    if (this.xCanMove) {
                        this.xVel += Arcade.xForceWorld * this.xScaleForceWorld;
                        if (this.xMaxVel > 0 && this.xVel > this.xMaxVel) {
                            this.xVel = this.xMaxVel;
                        }
                        else if (this.xMaxVel < 0 && this.xVel < -this.xMaxVel) {
                            this.xVel = -this.xMaxVel;
                        }
                        if (this.boxSolid != null) {
                            this.onStartMoveX(this.yVel);
                            this.xContacts = this.boxSolid.cast(Game.SceneMap.instance.boxesSolids, null, true, this.xVel, true, Engine.Box.LAYER_ALL);
                            this.boxSolid.translate(this.xContacts, true, this.xVel, true);
                            if (this.xContacts != null) {
                                this.xDirContact = this.xVel < 0 ? -1 : 1;
                                if (this.xStop) {
                                    this.xVel = 0;
                                }
                            }
                            this.onEndMoveX();
                        }
                    }
                    if (this.yCanMove) {
                        this.yVel += Arcade.yForceWorld * this.yScaleForceWorld;
                        if (this.yMaxVel > 0 && this.yVel > this.yMaxVel) {
                            this.yVel = this.yMaxVel;
                        }
                        else if (this.yMaxVel < 0 && this.yVel < -this.yMaxVel) {
                            this.yVel = -this.yMaxVel;
                        }
                        if (this.boxSolid != null) {
                            this.onStartMoveY(this.yVel);
                            this.yContacts = this.boxSolid.cast(Game.SceneMap.instance.boxesSolids, null, false, this.yVel, true, Engine.Box.LAYER_ALL);
                            this.boxSolid.translate(this.yContacts, false, this.yVel, true);
                            if (this.yContacts != null) {
                                this.yDirContact = this.yVel < 0 ? -1 : 1;
                                if (this.yStop) {
                                    this.yVel = 0;
                                }
                            }
                            this.onEndMoveY();
                        }
                    }
                }
                this.xDraw = this.boxSolid.x;
                this.yDraw = this.boxSolid.y;
            };
            PhysicEntity.prototype.onStartMoveY = function (_dist) { };
            PhysicEntity.prototype.onEndMoveY = function () { };
            PhysicEntity.prototype.onStartMoveX = function (_dist) { };
            PhysicEntity.prototype.onEndMoveX = function () { };
            PhysicEntity.prototype.getContacts = function (xAxis, dir) {
                if (dir != 0) {
                    if (xAxis) {
                        return this.boxSolid.cast(Game.SceneMap.instance.boxesSolids, null, true, dir > 0 ? 1 : -1, false, Engine.Box.LAYER_ALL);
                    }
                    else {
                        return this.boxSolid.cast(Game.SceneMap.instance.boxesSolids, null, false, dir > 0 ? 1 : -1, false, Engine.Box.LAYER_ALL);
                    }
                }
                return null;
            };
            PhysicEntity.prototype.hasContact = function (xAxis, dir) {
                return this.getContacts(xAxis, dir) != null;
            };
            PhysicEntity.prototype.getDirContact = function (xAxis, dir) {
                if (this.hasContact(xAxis, dir)) {
                    return dir > 0 ? 1 : -1;
                }
                return 0;
            };
            PhysicEntity.prototype.onTimeUpdate = function () {
                if (!Game.SceneFreezer.stoped) {
                    if (this.xCanMove && this.yCanMove) {
                        var point = this.boxSolid.getExtrapolation(Game.SceneMap.instance.boxesSolids, this.xVel + this.xVelExtern, this.yVel + this.yVelExtern, true, Engine.Box.LAYER_ALL);
                        this.xDraw = point.x;
                        this.yDraw = point.y;
                    }
                    else if (this.xCanMove) {
                        var point = this.boxSolid.getExtrapolation(Game.SceneMap.instance.boxesSolids, this.xVel + this.xVelExtern, 0, true, Engine.Box.LAYER_ALL);
                        this.xDraw = point.x;
                        this.yDraw = this.boxSolid.y;
                    }
                    else if (this.yCanMove) {
                        var point = this.boxSolid.getExtrapolation(Game.SceneMap.instance.boxesSolids, 0, this.yVel + this.yVelExtern, true, Engine.Box.LAYER_ALL);
                        this.xDraw = this.boxSolid.x;
                        this.yDraw = point.y;
                    }
                    else {
                        this.xDraw = this.boxSolid.x;
                        this.yDraw = this.boxSolid.y;
                    }
                }
            };
            PhysicEntity.prototype.onDrawObjectsFront = function () {
                if (Engine.Box.debugRender) {
                    this.boxSolid.renderExtrapolated(Game.SceneMap.instance.boxesSolids, this.xVel + this.xVelExtern, this.yVel + this.yVelExtern, true, Engine.Box.LAYER_ALL);
                }
            };
            return PhysicEntity;
        }(Game.Entity));
        Arcade.PhysicEntity = PhysicEntity;
    })(Arcade = Game.Arcade || (Game.Arcade = {}));
})(Game || (Game = {}));
/*
///<reference path="../System/Entity.ts"/>
namespace Game.Arcade{
    export var xForceWorld = 0;
    export var yForceWorld = 0.1;

    var X_VEL_MAX_DEFAULT = 0;
    var Y_VEL_MAX_DEFAULT = 10;

    export abstract class PhysicEntity extends Entity{
        boxSolid : Engine.Box;

        protected xOffsetDraw = 0;
        protected yOffsetDraw = 0;

        xAlign : "start" | "middle" | "end" = "middle";
        yAlign : "start" | "middle" | "end" = "end";

        xVel = 0;
        yVel = 0;

        xCanMove = true;
        yCanMove = true;

        xStop = true;
        yStop = true;

        xContacts : Array<Engine.Contact>;
        yContacts : Array<Engine.Contact>;

        xDirContact = 0;
        yDirContact = 0;

        xScaleForceWorld = 1;
        yScaleForceWorld = 1;

        xMaxVel = X_VEL_MAX_DEFAULT;
        yMaxVel = Y_VEL_MAX_DEFAULT;

        protected xDraw = 0;
        protected yDraw = 0;

        coyote = 3;
        coyoteCount : number;

        protected get xVelExtern(){
            return 0;
        }

        protected get yVelExtern(){
            return 0;
        }

        constructor(def : any){
            super(def);
            this.boxSolid = new Engine.Box();
            this.boxSolid.enabled = true;
            this.boxSolid.renderable = true;
            this.boxSolid.xSize = 8;
            this.boxSolid.ySize = 8;
            this.boxSolid.xOffset = -4;
            this.boxSolid.yOffset = -8;
        }

        protected onReset(){
            if(this.def.flip.x){
                switch(this.xAlign){
                    case "start":
                        this.boxSolid.x = this.def.instance.x;
                    break;
                    case "middle":
                        this.boxSolid.x = this.def.instance.x - SceneMap.instance.xSizeTile * 0.5;
                    break;
                    case "end":
                        this.boxSolid.x = this.def.instance.x - SceneMap.instance.xSizeTile;
                    break;
                }
                this.boxSolid.x += SceneMap.instance.xSizeTile;
            }
            else{
                switch(this.xAlign){
                    case "start":
                        this.boxSolid.x = this.def.instance.x;
                    break;
                    case "middle":
                        this.boxSolid.x = this.def.instance.x + SceneMap.instance.xSizeTile * 0.5;
                    break;
                    case "end":
                        this.boxSolid.x = this.def.instance.x + SceneMap.instance.xSizeTile;
                    break;
                }
            }
            if(this.def.flip.y){
                switch(this.yAlign){
                    case "start":
                        this.boxSolid.y = this.def.instance.y;
                    break;
                    case "middle":
                        this.boxSolid.y = this.def.instance.y - SceneMap.instance.ySizeTile * 0.5;
                    break;
                    case "end":
                        this.boxSolid.y = this.def.instance.y - SceneMap.instance.ySizeTile;
                    break;
                }
            }
            else{
                switch(this.yAlign){
                    case "start":
                        this.boxSolid.y = this.def.instance.y;
                    break;
                    case "middle":
                        this.boxSolid.y = this.def.instance.y + SceneMap.instance.ySizeTile * 0.5;
                    break;
                    case "end":
                        this.boxSolid.y = this.def.instance.y + SceneMap.instance.ySizeTile;
                    break;
                }
                this.boxSolid.y -= SceneMap.instance.ySizeTile;
            }
            this.boxSolid.enabled = true;
            this.xDraw = this.boxSolid.x;
            this.yDraw = this.boxSolid.y;
            this.xVel = 0;
            this.yVel = 0;
            this.xDirContact = 0;
            this.yDirContact = 0;
            this.xContacts = null;
            this.yContacts = null;
            this.coyoteCount = 0;
        }

        protected onMoveUpdate(){
            if(!SceneFreezer.stoped){
                this.xContacts = null;
                this.xDirContact = 0;
                var yOldContacts = this.yContacts;
                var yOldDirContact = this.yDirContact;
                this.yContacts = null;
                this.yDirContact = 0;
                if(this.xCanMove){
                    this.xVel += xForceWorld * this.xScaleForceWorld;
                    if(this.xMaxVel > 0 && this.xVel > this.xMaxVel){
                        this.xVel = this.xMaxVel;
                    }
                    else if(this.xMaxVel < 0 && this.xVel < -this.xMaxVel){
                        this.xVel = -this.xMaxVel;
                    }
                    if(this.boxSolid != null){
                        this.onStartMoveX(this.yVel);
                        this.xContacts = this.boxSolid.cast(SceneMap.instance.boxesSolids, null, true, this.xVel, true, Engine.Box.LAYER_ALL);
                        this.boxSolid.translate(this.xContacts, true, this.xVel, true);
                        if(this.xContacts != null){
                            this.xDirContact = this.xVel < 0 ? -1 : 1;
                            if(this.xStop){
                                this.xVel = 0;
                            }
                        }
                        this.onEndMoveX();
                    }
                }
                if(this.yCanMove){
                    this.yVel += yForceWorld * this.yScaleForceWorld;
                    if(this.yMaxVel > 0 && this.yVel > this.yMaxVel){
                        this.yVel = this.yMaxVel;
                    }
                    else if(this.yMaxVel < 0 && this.yVel < -this.yMaxVel){
                        this.yVel = -this.yMaxVel;
                    }
                    if(this.boxSolid != null && this.yVel != 0){
                        this.onStartMoveY(this.yVel);
                        if(this.yVel > 0){
                            this.yContacts = this.boxSolid.cast(SceneMap.instance.boxesSolids, null, false, this.yVel, true, Engine.Box.LAYER_ALL);
                        }
                        else{
                            this.yContacts = this.boxSolid.cast(SceneMap.instance.noOneWaySolids, null, false, this.yVel, true, Engine.Box.LAYER_ALL);
                        }
                        if(this.yContacts == null && yOldContacts != null && this.yVel > 0 && yOldDirContact > 0){
                            if(this.coyoteCount < this.coyote){
                                this.coyoteCount++;
                                if(this.coyoteCount - 1 >= this.coyote){
                                    this.coyoteCount = 0;
                                    this.boxSolid.translate(null, false, this.yVel, true);
                                }
                                else{
                                    this.yContacts = yOldContacts;
                                }
                            }
                        }
                        else{
                            this.coyoteCount = 0;
                            this.boxSolid.translate(this.yContacts, false, this.yVel, true);
                        }
                        if(this.yContacts != null){
                            this.yDirContact = this.yVel < 0 ? -1 : 1;
                            if(this.yStop){
                                this.yVel = 0;
                            }
                        }
                        this.onEndMoveY();
                    }
                }
                else{
                    this.coyoteCount = 0;
                }
            }
            this.xDraw = this.boxSolid.x;
            this.yDraw = this.boxSolid.y;
        }

        onStartMoveY(_dist : number){}
        onEndMoveY(){}

        onStartMoveX(_dist : number){}
        onEndMoveX(){}

        getContacts(xAxis : boolean, dir : number){
            if(dir != 0){
                if(xAxis){
                    return this.boxSolid.cast(SceneMap.instance.boxesSolids, null, true, dir > 0 ? 1 : -1, false, Engine.Box.LAYER_ALL);
                }
                else{
                    return this.boxSolid.cast(SceneMap.instance.boxesSolids, null, false, dir > 0 ? 1 : -1, false, Engine.Box.LAYER_ALL);
                }
            }
            return null;
        }

        hasContact(xAxis : boolean, dir : number){
            return this.getContacts(xAxis, dir) != null;
        }

        getDirContact(xAxis : boolean, dir : number){
            if(this.hasContact(xAxis, dir)){
                return dir > 0 ? 1 : -1;
            }
            return 0;
        }

        protected onTimeUpdate(){
            if(!SceneFreezer.stoped){
                if(this.xCanMove && this.yCanMove){
                    var point = this.boxSolid.getExtrapolation(SceneMap.instance.boxesSolids, this.xVel + this.xVelExtern, this.yVel + this.yVelExtern, true, Engine.Box.LAYER_ALL);
                    this.xDraw = point.x;
                    this.yDraw = point.y;
                }
                else if(this.xCanMove){
                    var point = this.boxSolid.getExtrapolation(SceneMap.instance.boxesSolids, this.xVel + this.xVelExtern, 0, true, Engine.Box.LAYER_ALL);
                    this.xDraw = point.x;
                    this.yDraw = this.boxSolid.y;
                }
                else if(this.yCanMove){
                    var point = this.boxSolid.getExtrapolation(SceneMap.instance.boxesSolids, 0, this.yVel + this.yVelExtern, true, Engine.Box.LAYER_ALL);
                    this.xDraw = this.boxSolid.x;
                    this.yDraw = point.y;
                }
                else{
                    this.xDraw = this.boxSolid.x;
                    this.yDraw = this.boxSolid.y;
                }
            }
        }

        protected onDrawObjectsFront(){
            if(Engine.Box.debugRender){
                this.boxSolid.renderExtrapolated(SceneMap.instance.boxesSolids, this.xVel + this.xVelExtern, this.yVel + this.yVelExtern, true, Engine.Box.LAYER_ALL);
            }
        }
    }
}
*/ 
///<reference path="PhysicEntity.ts"/>
var Game;
(function (Game) {
    var Arcade;
    (function (Arcade) {
        var WorldEntity = /** @class */ (function (_super) {
            __extends(WorldEntity, _super);
            function WorldEntity(def) {
                var _this = _super.call(this, def) || this;
                _this.sprite = new Engine.Sprite();
                _this.sprite.enabled = true;
                _this.animator = new Utils.Animator();
                _this.animator.owner = _this;
                _this.animator.listener = _this;
                _this.machine = new Game.Flow.StateMachine(_this);
                _this.machine.owner = _this;
                _this.machine.startState = _this.initStates();
                return _this;
            }
            WorldEntity.prototype.initStates = function () {
                return new Game.Flow.State(this);
            };
            WorldEntity.prototype.onSetFrame = function (_animator, _animation, _frame) {
                _frame.applyToSprite(this.sprite);
            };
            WorldEntity.prototype.onReset = function () {
                _super.prototype.onReset.call(this);
                this.sprite.enabled = true;
                this.sprite.x = this.xDraw;
                this.sprite.y = this.yDraw;
                this.sprite.xMirror = this.def.flip.x;
                this.sprite.yMirror = this.def.flip.y;
            };
            WorldEntity.prototype.onMoveUpdate = function () {
                _super.prototype.onMoveUpdate.call(this);
                this.sprite.x = this.xDraw;
                this.sprite.y = this.yDraw;
            };
            WorldEntity.prototype.onTimeUpdate = function () {
                _super.prototype.onTimeUpdate.call(this);
                this.sprite.x = this.xDraw;
                this.sprite.y = this.yDraw;
            };
            return WorldEntity;
        }(Arcade.PhysicEntity));
        Arcade.WorldEntity = WorldEntity;
    })(Arcade = Game.Arcade || (Game.Arcade = {}));
})(Game || (Game = {}));
///<reference path = "../WorldEntity.ts"/>
var Game;
(function (Game) {
    var Arcade;
    (function (Arcade) {
        var Platformer;
        (function (Platformer) {
            var X_MOVE_VEL_DEFAULT = 1.3 * 2;
            var Y_VEL_JUMP_DEFAULT = 5.0;
            var Y_DRAG_CANCEL_JUMP_DEFAULT = 0.7;
            var BaseEntity = /** @class */ (function (_super) {
                __extends(BaseEntity, _super);
                function BaseEntity() {
                    var _this = _super !== null && _super.apply(this, arguments) || this;
                    _this.platformParent = null;
                    _this.moveActionsEnabled = true;
                    _this.turnActionsEnabled = true;
                    _this._jumpActionsEnabled = true;
                    _this._platformActionsEnabled = true;
                    _this.xVelMove = X_MOVE_VEL_DEFAULT;
                    _this.yVelJump = Y_VEL_JUMP_DEFAULT;
                    _this._jumping = false;
                    _this._canCancelJump = true;
                    _this._jumpCanceled = false;
                    _this.yDragCancelJump = Y_DRAG_CANCEL_JUMP_DEFAULT;
                    _this._xOverlapsPlatform = false;
                    _this._xCollidesOnPlatform = false;
                    _this._yOverlapsPlatform = false;
                    return _this;
                }
                Object.defineProperty(BaseEntity.prototype, "jumpActionsEnabled", {
                    get: function () {
                        return this._jumpActionsEnabled;
                    },
                    set: function (value) {
                        this._jumpActionsEnabled = value;
                        if (!this._jumpActionsEnabled) {
                            this._jumpCanceled = false;
                            this._jumping = false;
                        }
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseEntity.prototype, "platformActionsEnabled", {
                    get: function () {
                        return this._platformActionsEnabled;
                    },
                    set: function (value) {
                        this._platformActionsEnabled = value;
                        if (!this._platformActionsEnabled && this.platformParent != null) {
                            this.platformParent.removeChild(this);
                        }
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseEntity.prototype, "jumping", {
                    get: function () {
                        return this._jumping;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseEntity.prototype, "canCancelJump", {
                    get: function () {
                        return this._canCancelJump;
                    },
                    set: function (value) {
                        this._canCancelJump = value;
                        if (!this._canCancelJump) {
                            this._jumpCanceled = false;
                        }
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseEntity.prototype, "xOverlapsPlatform", {
                    get: function () {
                        return this._xOverlapsPlatform;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseEntity.prototype, "xCollidesOnPlatform", {
                    get: function () {
                        return this._xCollidesOnPlatform;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseEntity.prototype, "yOverlapsPlatform", {
                    get: function () {
                        return this._yOverlapsPlatform;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseEntity.prototype, "dirMove", {
                    get: function () {
                        return 0;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseEntity.prototype, "jumpControlPressed", {
                    get: function () {
                        return false;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseEntity.prototype, "jumpControlDown", {
                    get: function () {
                        return false;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseEntity.prototype, "xVelExtern", {
                    get: function () {
                        if (this.platformParent != null) {
                            return this.platformParent.xGetVelMove();
                        }
                        return 0;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseEntity.prototype, "yVelExtern", {
                    get: function () {
                        if (this.platformParent != null) {
                            return this.platformParent.yGetVelMove();
                        }
                        return 0;
                    },
                    enumerable: false,
                    configurable: true
                });
                BaseEntity.prototype.onInitScene = function () {
                    Platformer.Platform.pushInteractable(this);
                };
                BaseEntity.prototype.onReset = function () {
                    _super.prototype.onReset.call(this);
                    this._jumping = false;
                    this._jumpCanceled = false;
                };
                BaseEntity.prototype.onMoveReady = function () {
                    this._xOverlapsPlatform = false;
                    this._xCollidesOnPlatform = false;
                    this._yOverlapsPlatform = false;
                };
                BaseEntity.prototype.onMoveUpdate = function () {
                    _super.prototype.onMoveUpdate.call(this);
                    if (!Game.SceneFreezer.stoped) {
                        if (this.moveActionsEnabled) {
                            this.xVel = this.xVelMove * this.dirMove;
                        }
                        if (this.turnActionsEnabled && this.dirMove != 0) {
                            this.sprite.xMirror = this.dirMove < 0;
                        }
                        if (!this._jumping && this._jumpActionsEnabled && this.yDirContact > 0 && this.jumpControlPressed) {
                            this.yVel = -this.yVelJump;
                            this._jumpCanceled = false;
                            this._jumping = true;
                        }
                        if (this._jumping && !this._jumpCanceled && this.yVel < 0 && this._canCancelJump && !this.jumpControlDown) {
                            this._jumpCanceled = true;
                        }
                        if (this._jumping && this._jumpCanceled && this.yVel < 0) {
                            this.yVel *= this.yDragCancelJump;
                        }
                        if (this._jumping && this.yVel >= 0) {
                            this._jumpCanceled = false,
                                this._jumping = false;
                        }
                        if (this.platformActionsEnabled) {
                            this.platformCheck();
                        }
                    }
                };
                BaseEntity.prototype.platformCheck = function () {
                    var newPlatformParent = null;
                    if (this.yDirContact > 0) {
                        for (var _i = 0, _a = this.yContacts; _i < _a.length; _i++) {
                            var contact = _a[_i];
                            if (contact.other.data instanceof Platformer.Platform) {
                                if (contact.other.data == this.platformParent) {
                                    return;
                                }
                                else {
                                    newPlatformParent = contact.other.data;
                                }
                            }
                        }
                    }
                    if (newPlatformParent != null) {
                        newPlatformParent.addChild(this);
                    }
                    else if (this.platformParent != null) {
                        this.platformParent.removeChild(this);
                    }
                };
                BaseEntity.prototype.xMoveOnPlatform = function (dist) {
                    //if(!this.moveActionsEnabled || this.dirMove == 0 || (this.dirMove > 0 && dist < 0)){
                    var contacts = this.boxSolid.cast(Game.SceneMap.instance.noOneWaySolids, null, true, dist, true, Engine.Box.LAYER_ALL);
                    this.boxSolid.translate(contacts, true, dist, true);
                    this._xCollidesOnPlatform = contacts != null;
                    //}
                };
                BaseEntity.prototype.yMoveOnPlatform = function (dist) {
                    var contacts;
                    if (this.yVel > 0) {
                        this.boxSolid.cast(Game.SceneMap.instance.boxesSolids, null, false, dist, true, Engine.Box.LAYER_ALL);
                    }
                    else {
                        this.boxSolid.cast(Game.SceneMap.instance.noOneWaySolids, null, false, dist, true, Engine.Box.LAYER_ALL);
                    }
                    this.boxSolid.translate(contacts, false, dist, true);
                };
                BaseEntity.prototype.onPlatformOverlapX = function () {
                    this._xOverlapsPlatform = true;
                };
                BaseEntity.prototype.onPlatformOverlapY = function () {
                    this._yOverlapsPlatform = true;
                };
                BaseEntity.prototype.onTimeUpdate = function () {
                    _super.prototype.onTimeUpdate.call(this);
                    if (!Game.SceneFreezer.stoped && this.platformParent != null) {
                        //this.sprite.x += this.platformParent.xGetVelMove() * Engine.System.deltaTime;
                        //this.sprite.y += this.platformParent.yGetVelMove() * Engine.System.deltaTime;
                    }
                };
                return BaseEntity;
            }(Arcade.WorldEntity));
            Platformer.BaseEntity = BaseEntity;
        })(Platformer = Arcade.Platformer || (Arcade.Platformer = {}));
    })(Arcade = Game.Arcade || (Game.Arcade = {}));
})(Game || (Game = {}));
///<reference path = "BaseEntity.ts"/>
var Game;
(function (Game) {
    var Arcade;
    (function (Arcade) {
        var Platformer;
        (function (Platformer) {
            var BaseMachineEntity = /** @class */ (function (_super) {
                __extends(BaseMachineEntity, _super);
                function BaseMachineEntity(def) {
                    var _this = _super.call(this, def) || this;
                    _this.extraSoundY = 0;
                    _this.boxOverlap = new Engine.Box();
                    _this.boxOverlap.enabled = true;
                    _this.boxOverlap.renderable = true;
                    _this.boxOverlap.red = 0;
                    _this.boxOverlap.green = 0;
                    _this.boxOverlap.blue = 1;
                    return _this;
                }
                BaseMachineEntity.prototype.initStates = function () {
                    var _this = this;
                    _super.prototype.initStates.call(this);
                    this.stateStand = new Game.Flow.State(this, "stand");
                    this.stateMove = new Game.Flow.State(this, "move");
                    this.stateAscend = new Game.Flow.State(this, "ascend");
                    this.stateFall = new Game.Flow.State(this, "fall");
                    this.stateLanding = new Game.Flow.State(this, "landing");
                    this.stateStand.onEnter = function () {
                        _this.moveActionsEnabled = true;
                        _this.turnActionsEnabled = true;
                        _this.jumpActionsEnabled = true;
                        _this.platformActionsEnabled = true;
                    };
                    this.stateStand.onReady = function () {
                        _this.animator.setAnimation(_this.animStand);
                    };
                    this.stateStand.addLink(this.stateMove, function () { return _this.dirMove != 0 && _this.moveActionsEnabled; });
                    this.stateStand.addLink(this.stateAscend, function () { return _this.yVel < 0; });
                    this.stateStand.addLink(this.stateFall, function () { return _this.yVel > 0 && _this.yDirContact == 0; });
                    this.stateMove.onEnter = function () {
                        _this.moveActionsEnabled = true;
                        _this.turnActionsEnabled = true;
                        _this.jumpActionsEnabled = true;
                        _this.platformActionsEnabled = true;
                    };
                    this.stateMove.onReady = function () {
                        _this.animator.setAnimation(_this.animMove);
                    };
                    this.stateMove.addLink(this.stateStand, function () { return _this.dirMove == 0 || !_this.moveActionsEnabled; });
                    this.stateMove.addLink(this.stateAscend, function () { return _this.yVel < 0; });
                    this.stateMove.addLink(this.stateFall, function () { return _this.yVel > 0 && _this.yDirContact == 0; });
                    this.stateAscend.onEnter = function () {
                        _this.moveActionsEnabled = true;
                        _this.turnActionsEnabled = true;
                        _this.jumpActionsEnabled = true;
                        _this.platformActionsEnabled = true;
                    };
                    this.stateAscend.onReady = function () {
                        _this.animator.setAnimation(_this.animAscend);
                        if (_this.jumping) {
                            _this.consumeJumpControls();
                            if (_this.sfxJump != null)
                                _this.sfxJump.boxPlay(_this.boxSolid, 0, _this.extraSoundY);
                        }
                    };
                    this.stateAscend.addLink(this.stateFall, function () { return _this.yVel >= 0; });
                    this.stateFall.onEnter = function () {
                        _this.moveActionsEnabled = true;
                        _this.turnActionsEnabled = true;
                        _this.jumpActionsEnabled = false;
                        _this.platformActionsEnabled = true;
                    };
                    this.stateFall.onReady = function () {
                        if (_this.animator.animation == _this.animAscend && _this.animFallAscend != null) {
                            _this.animator.setAnimation(_this.animFallAscend);
                        }
                        else {
                            _this.animator.setAnimation(_this.animFall);
                        }
                    };
                    this.stateFall.addLink(this.stateAscend, function () { return _this.yVel < 0; });
                    this.stateFall.addLink(this.stateLanding, function () { return _this.yVel >= 0 && _this.yDirContact > 0; });
                    this.stateLanding.onEnter = function () {
                        _this.moveActionsEnabled = true;
                        _this.turnActionsEnabled = true;
                        _this.jumpActionsEnabled = true;
                        _this.platformActionsEnabled = true;
                    };
                    this.stateLanding.onReady = function () {
                        _this.animator.setAnimation(_this.animLanding);
                    };
                    this.stateLanding.addLink(this.stateStand, function () { return _this.animLanding == null; });
                    this.stateLanding.addLink(this.stateStand, function () { return _this.dirMove == 0 && _this.animator.animation == _this.animLanding && _this.animator.ended; });
                    this.stateLanding.addLink(this.stateMove, function () { return _this.dirMove != 0; });
                    this.stateLanding.addLink(this.stateAscend, function () { return _this.yVel < 0; });
                    this.stateLanding.addLink(this.stateFall, function () { return _this.yVel > 0 && _this.yDirContact == 0; });
                    return this.stateStand;
                };
                BaseMachineEntity.prototype.onReset = function () {
                    _super.prototype.onReset.call(this);
                    this.boxOverlap.x = this.boxSolid.x;
                    this.boxOverlap.y = this.boxSolid.y;
                };
                BaseMachineEntity.prototype.onMoveUpdate = function () {
                    _super.prototype.onMoveUpdate.call(this);
                    this.boxOverlap.x = this.boxSolid.x;
                    this.boxOverlap.y = this.boxSolid.y;
                };
                BaseMachineEntity.prototype.onOverlapUpdate = function () {
                    this.boxOverlap.x = this.boxSolid.x;
                    this.boxOverlap.y = this.boxSolid.y;
                };
                BaseMachineEntity.prototype.consumeJumpControls = function () {
                };
                BaseMachineEntity.prototype.onDrawObjectsFront = function () {
                    _super.prototype.onDrawObjectsFront.call(this);
                    if (Engine.Box.debugRender) {
                        this.boxOverlap.x = this.boxSolid.x;
                        this.boxOverlap.y = this.boxSolid.y;
                        this.boxOverlap.render();
                    }
                };
                return BaseMachineEntity;
            }(Platformer.BaseEntity));
            Platformer.BaseMachineEntity = BaseMachineEntity;
        })(Platformer = Arcade.Platformer || (Arcade.Platformer = {}));
    })(Arcade = Game.Arcade || (Game.Arcade = {}));
})(Game || (Game = {}));
///<reference path = "BaseMachineEntity.ts"/>
var Game;
(function (Game) {
    var Arcade;
    (function (Arcade) {
        var Platformer;
        (function (Platformer) {
            var BaseDrawablePlayer = /** @class */ (function (_super) {
                __extends(BaseDrawablePlayer, _super);
                function BaseDrawablePlayer() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                Object.defineProperty(BaseDrawablePlayer.prototype, "xRender", {
                    get: function () {
                        return this.xDraw;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseDrawablePlayer.prototype, "yRender", {
                    get: function () {
                        return this.yDraw;
                    },
                    enumerable: false,
                    configurable: true
                });
                BaseDrawablePlayer.prototype.onDrawPlayer = function () {
                    this.sprite.render();
                };
                return BaseDrawablePlayer;
            }(Platformer.BaseMachineEntity));
            Platformer.BaseDrawablePlayer = BaseDrawablePlayer;
        })(Platformer = Arcade.Platformer || (Arcade.Platformer = {}));
    })(Arcade = Game.Arcade || (Game.Arcade = {}));
})(Game || (Game = {}));
///<reference path = "BaseDrawablePlayer.ts"/>
var Game;
(function (Game) {
    var Arcade;
    (function (Arcade) {
        var Platformer;
        (function (Platformer) {
            var DEFAULT_STEPS_WAIT_WINNING_LOSSING = 26;
            var BaseFlowPlayer = /** @class */ (function (_super) {
                __extends(BaseFlowPlayer, _super);
                function BaseFlowPlayer(def) {
                    var _this = _super.call(this, def) || this;
                    _this.stepsWin = DEFAULT_STEPS_WAIT_WINNING_LOSSING;
                    _this.stepsLoss = DEFAULT_STEPS_WAIT_WINNING_LOSSING;
                    _this._canWin = true;
                    _this._canLoss = true;
                    BaseFlowPlayer._instance = _this;
                    return _this;
                }
                Object.defineProperty(BaseFlowPlayer, "instance", {
                    get: function () {
                        return BaseFlowPlayer._instance;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseFlowPlayer.prototype, "winning", {
                    get: function () {
                        return this._winning;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseFlowPlayer.prototype, "hasWon", {
                    get: function () {
                        return this._hasWon;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseFlowPlayer.prototype, "losing", {
                    get: function () {
                        return this._losing;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseFlowPlayer.prototype, "hasLost", {
                    get: function () {
                        return this._hasLost;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseFlowPlayer.prototype, "winCondition", {
                    get: function () {
                        return false;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseFlowPlayer.prototype, "lossCondition", {
                    get: function () {
                        return false;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseFlowPlayer.prototype, "canWin", {
                    get: function () {
                        return this._canWin;
                    },
                    set: function (value) {
                        this._canWin = value;
                        if (!this._canWin) {
                            this._winning = false;
                            this._hasWon = false;
                            this.countStepsWin = 0;
                        }
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(BaseFlowPlayer.prototype, "canLoss", {
                    get: function () {
                        return this.canLoss;
                    },
                    set: function (value) {
                        this._canLoss = value;
                        if (!this._canLoss) {
                            this._losing = false;
                            this._hasLost = false;
                            this.countStepsLoss = 0;
                        }
                    },
                    enumerable: false,
                    configurable: true
                });
                BaseFlowPlayer.prototype.onReset = function () {
                    _super.prototype.onReset.call(this);
                    this.countStepsWin = 0;
                    this._winning = false;
                    this._hasWon = false;
                    this.countStepsLoss = 0;
                    this._losing = false;
                    this._hasLost = false;
                };
                BaseFlowPlayer.prototype.onStepUpdate = function () {
                    if (!Game.SceneFreezer.stoped) {
                        if (this._winning && !this._hasWon) {
                            this.countStepsWin -= 1;
                            if (this.countStepsWin <= 0) {
                                this._hasWon = true;
                                this.onWon();
                            }
                        }
                        if (this._losing && !this._hasLost) {
                            this.countStepsLoss -= 1;
                            if (this.countStepsLoss <= 0) {
                                this._hasLost = true;
                                this.onWon();
                            }
                        }
                        if (!this._winning && this.winCondition) {
                            this.onGoal();
                            if (this._canWin) {
                                this._winning = true;
                                this.countStepsWin = this.stepsWin;
                                this.onWinning();
                            }
                        }
                        if (!this._winning && !this._losing && this.lossCondition) {
                            this.onDeath();
                            if (this._canLoss) {
                                this._losing = true;
                                this.countStepsLoss = this.stepsLoss;
                                this.onLosing();
                            }
                        }
                    }
                };
                BaseFlowPlayer.prototype.onGoal = function () {
                };
                BaseFlowPlayer.prototype.onWinning = function () {
                };
                BaseFlowPlayer.prototype.onWon = function () {
                };
                BaseFlowPlayer.prototype.onDeath = function () {
                };
                BaseFlowPlayer.prototype.onLosing = function () {
                };
                BaseFlowPlayer.prototype.onLost = function () {
                };
                return BaseFlowPlayer;
            }(Platformer.BaseDrawablePlayer));
            Platformer.BaseFlowPlayer = BaseFlowPlayer;
        })(Platformer = Arcade.Platformer || (Arcade.Platformer = {}));
    })(Arcade = Game.Arcade || (Game.Arcade = {}));
})(Game || (Game = {}));
///<reference path = "BaseFlowPlayer.ts"/>
var Game;
(function (Game) {
    var Arcade;
    (function (Arcade) {
        var Platformer;
        (function (Platformer) {
            var BaseAwarePlayer = /** @class */ (function (_super) {
                __extends(BaseAwarePlayer, _super);
                function BaseAwarePlayer() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                BaseAwarePlayer.prototype.onReset = function () {
                    _super.prototype.onReset.call(this);
                    this.contactsEnemies = null;
                };
                BaseAwarePlayer.prototype.onOverlapUpdate = function () {
                    _super.prototype.onOverlapUpdate.call(this);
                    if (!Game.SceneFreezer.stoped) {
                        this.contactsEnemies = this.boxOverlap.collide(Game.SceneMap.instance.boxesEnemies, null, true, 0, true, Engine.Box.LAYER_ALL);
                        this.contactsSolids = null; //this.boxSolid.collide(SceneMap.instance.boxesTiles, null, true, 0, true, Engine.Box.LAYER_ALL)
                    }
                };
                return BaseAwarePlayer;
            }(Platformer.BaseFlowPlayer));
            Platformer.BaseAwarePlayer = BaseAwarePlayer;
        })(Platformer = Arcade.Platformer || (Arcade.Platformer = {}));
    })(Arcade = Game.Arcade || (Game.Arcade = {}));
})(Game || (Game = {}));
///<reference path = "../../System/Entity.ts"/>
var Game;
(function (Game) {
    var Arcade;
    (function (Arcade) {
        var Platformer;
        (function (Platformer) {
            var interactables = [];
            var Platform = /** @class */ (function (_super) {
                __extends(Platform, _super);
                function Platform(def) {
                    var _this = _super.call(this, def) || this;
                    _this.soundOrigin = null;
                    _this.soundDestiny = null;
                    _this.shakeOrigin = false;
                    _this.shakeDestiny = false;
                    _this.xSoundExtra = 0;
                    _this.ySoundExtra = 0;
                    _this.children = null;
                    _this.onScreenCheck = false;
                    _this.box = new Engine.Box();
                    _this.box.enabled = true;
                    _this.box.renderable = true;
                    _this.box.xSize = Game.SceneMap.instance.xSizeTile;
                    _this.box.ySize = Game.SceneMap.instance.ySizeTile;
                    _this.box.data = _this;
                    Game.SceneMap.instance.boxesSolids.push(_this.box);
                    _this.sprite = new Engine.Sprite();
                    _this.xOrigin = def.instance.x;
                    _this.yOrigin = def.instance.y - Game.SceneMap.instance.ySizeTile;
                    _this.xDestiny = _this.xOrigin + _this.getProperty("dist tiles x") * Game.SceneMap.instance.xSizeTile;
                    _this.yDestiny = _this.yOrigin + _this.getProperty("dist tiles y") * Game.SceneMap.instance.ySizeTile;
                    _this.velMoveOrigin = _this.getProperty("vel move origin");
                    _this.velMoveDestiny = _this.getProperty("vel move destiny");
                    _this.stepsWaitStart = _this.getProperty("wait steps start");
                    _this.stepsWaitOrigin = _this.getProperty("wait steps origin");
                    _this.stepsWaitDestiny = _this.getProperty("wait steps destiny");
                    _this.shakeOrigin = _this.getProperty("shake origin");
                    _this.shakeDestiny = _this.getProperty("shake destiny");
                    _this.onScreenCheck = _this.getProperty("on screen check");
                    _this.xOnScreenActive = _this.getProperty("on screen active x");
                    _this.yOnScreenActive = _this.getProperty("on screen active y");
                    _this.initStates();
                    //this.sprite.enabled = true;
                    _this.activationIndex = _this.getProperty("activation index");
                    return _this;
                    //Jumper.activables.push(this);
                }
                Platform.prototype.activate = function () {
                    this.activeNow = true;
                };
                Platform.prototype.initStates = function () {
                    var _this = this;
                    this.stateWaiting = new Game.Flow.State(this, "waiting");
                    this.stateMoving = new Game.Flow.State(this, "moving");
                    this.stateWaiting.onEnter = function () {
                        if (_this.machine.oldState == null) {
                            _this.onOrigin = true;
                            _this.countStepsWait = _this.stepsWaitStart;
                        }
                        else {
                            _this.onOrigin = !_this.onOrigin;
                            _this.countStepsWait = _this.onOrigin ? _this.stepsWaitOrigin : _this.stepsWaitDestiny;
                            if (_this.onOrigin) {
                                if (_this.soundOrigin != null) {
                                    _this.soundOrigin.boxPlay(_this.box, _this.xSoundExtra, _this.ySoundExtra, _this.shakeOrigin);
                                }
                            }
                            else {
                                if (_this.soundDestiny != null) {
                                    _this.soundDestiny.boxPlay(_this.box, _this.xSoundExtra, _this.ySoundExtra, _this.shakeDestiny);
                                }
                            }
                        }
                        _this.xDist = 0;
                        _this.yDist = 0;
                        _this.xDir = 0;
                        _this.yDir = 0;
                        _this.xVel = 0;
                        _this.yVel = 0;
                    };
                    this.stateWaiting.onStepUpdate = function () {
                        if (!_this.activeNow) {
                            if (_this.onScreenCheck) {
                                if (Engine.AudioPlayer.onScreen(_this.box, _this.xOnScreenActive, _this.yOnScreenActive)) {
                                    //Jumper.triggerActivation(this);
                                }
                            }
                            else {
                                _this.activeNow = true;
                            }
                        }
                        if (_this.activeNow) {
                            _this.countStepsWait -= 1;
                        }
                    };
                    this.stateWaiting.addLink(this.stateMoving, function () { return _this.countStepsWait <= 0 && _this.activeNow; });
                    this.stateMoving.onEnter = function () {
                        if (_this.onOrigin) {
                            _this.xNext = _this.xDestiny;
                            _this.yNext = _this.yDestiny;
                        }
                        else {
                            _this.xNext = _this.xOrigin;
                            _this.yNext = _this.yOrigin;
                        }
                        _this.xDist = _this.xNext - _this.box.x;
                        _this.yDist = _this.yNext - _this.box.y;
                        var magnitude = Math.sqrt(_this.xDist * _this.xDist + _this.yDist * _this.yDist);
                        _this.xDir = _this.xDist / magnitude;
                        _this.yDir = _this.yDist / magnitude;
                        _this.xVel = (_this.onOrigin ? _this.velMoveDestiny : _this.velMoveOrigin) * _this.xDir * (_this.xDir < 0 ? -1 : 1);
                        _this.yVel = (_this.onOrigin ? _this.velMoveDestiny : _this.velMoveOrigin) * _this.yDir * (_this.yDir < 0 ? -1 : 1);
                        _this.xDist *= (_this.xDist < 0 ? -1 : 1);
                        _this.yDist *= (_this.yDist < 0 ? -1 : 1);
                    };
                    this.stateMoving.onMoveUpdate = function () {
                        _this.xMove();
                        _this.yMove();
                    };
                    this.stateMoving.addLink(this.stateWaiting, function () { return _this.xDist <= 0 && _this.yDist <= 0; });
                    this.machine = new Game.Flow.StateMachine(this);
                    this.machine.owner = this;
                    this.machine.startState = this.stateWaiting;
                };
                Platform.pushInteractable = function (interactable) {
                    //if(interactables != null){
                    interactables.push(interactable);
                    //}
                };
                Platform.prototype.onReset = function () {
                    this.box.x = this.xOrigin;
                    this.box.y = this.yOrigin;
                    if (this.children != null) {
                        for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                            var child = _a[_i];
                            child.platformParent = null;
                        }
                    }
                    this.children = [];
                    this.activeNow = false;
                };
                Platform.prototype.addChild = function (child) {
                    if (child.platformParent != this) {
                        if (child.platformParent != null) {
                            child.platformParent.removeChild(child);
                        }
                        child.platformParent = this;
                        this.children.push(child);
                    }
                };
                Platform.prototype.removeChild = function (child) {
                    child.platformParent = null;
                    var newChildren = [];
                    for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                        var oldChild = _a[_i];
                        if (oldChild != child) {
                            newChildren.push(oldChild);
                        }
                    }
                    this.children = newChildren;
                };
                Platform.prototype.onStepUpdate = function () {
                };
                Platform.prototype.xGetMagMove = function () {
                    return this.xDist > this.xVel ? this.xVel : this.xDist;
                };
                Platform.prototype.xGetVelMove = function () {
                    return this.xGetMagMove() * (this.xDir > 0 ? 1 : -1);
                };
                Platform.prototype.xMove = function () {
                    if (this.xGetMagMove() != 0) {
                        this.box.x += this.xGetVelMove();
                        for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                            var child = _a[_i];
                            child.xMoveOnPlatform(this.xGetVelMove());
                        }
                        this.xDist -= this.xGetMagMove();
                        if (this.xDist <= 0) {
                            this.box.x = this.xNext;
                        }
                        var dirMove = this.xDir > 0 ? 1 : -1;
                        for (var _b = 0, interactables_1 = interactables; _b < interactables_1.length; _b++) {
                            var interactable = interactables_1[_b];
                            var contacts = this.box.collideAgainst(interactable.boxSolid, null, true, 0, true, Engine.Box.LAYER_ALL);
                            if (contacts != null) {
                                var distMove = this.box.getDist(interactable.boxSolid, dirMove, true);
                                contacts = interactable.boxSolid.cast(Game.SceneMap.instance.boxesSolids, null, true, -distMove, false, Engine.Box.LAYER_ALL);
                                interactable.boxSolid.translate(contacts, true, -distMove, false);
                                interactable.onPlatformOverlapX();
                            }
                        }
                    }
                };
                Platform.prototype.yGetMagMove = function () {
                    return this.yDist > this.yVel ? this.yVel : this.yDist;
                };
                Platform.prototype.yGetVelMove = function () {
                    return this.yGetMagMove() * (this.yDir > 0 ? 1 : -1);
                };
                Platform.prototype.yMove = function () {
                    if (this.yGetMagMove()) {
                        this.box.y += this.yGetVelMove();
                        for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                            var child = _a[_i];
                            child.yMoveOnPlatform(this.yGetVelMove());
                        }
                        this.yDist -= this.yGetMagMove();
                        if (this.yDist <= 0) {
                            var delta = this.yNext - this.box.y;
                            this.box.y = this.yNext;
                            if (this.yDist < 0) {
                                for (var _b = 0, _c = this.children; _b < _c.length; _b++) {
                                    var child = _c[_b];
                                    child.yMoveOnPlatform(delta);
                                }
                            }
                        }
                        var dirMove = this.yDir > 0 ? 1 : -1;
                        for (var _d = 0, interactables_2 = interactables; _d < interactables_2.length; _d++) {
                            var interactable = interactables_2[_d];
                            var contacts = this.box.collideAgainst(interactable.boxSolid, null, true, 0, true, Engine.Box.LAYER_ALL);
                            if (contacts != null) {
                                var distMove = this.box.getDist(interactable.boxSolid, dirMove, false);
                                contacts = interactable.boxSolid.cast(Game.SceneMap.instance.boxesSolids, null, false, -distMove, false, Engine.Box.LAYER_ALL);
                                interactable.boxSolid.translate(contacts, false, -distMove, false);
                                interactable.onPlatformOverlapY();
                            }
                        }
                    }
                };
                Platform.prototype.onTimeUpdate = function () {
                    var xDraw = this.box.x;
                    var yDraw = this.box.y;
                    this.sprite.x = xDraw;
                    this.sprite.y = yDraw;
                };
                Platform.prototype.onDrawObjects = function () {
                    //this.sprite.render();
                };
                Platform.prototype.onDrawObjectsFront = function () {
                    if (Engine.Box.debugRender) {
                        var xOld = this.box.x;
                        var yOld = this.box.y;
                        this.box.x += this.xGetVelMove() * Engine.System.deltaTime;
                        this.box.y += this.yGetVelMove() * Engine.System.deltaTime;
                        this.box.render();
                        this.box.x = xOld;
                        this.box.y = yOld;
                    }
                };
                Platform.prototype.onClearScene = function () {
                    if (interactables.length > 0) {
                        interactables = [];
                    }
                };
                return Platform;
            }(Game.Entity));
            Platformer.Platform = Platform;
        })(Platformer = Arcade.Platformer || (Arcade.Platformer = {}));
    })(Arcade = Game.Arcade || (Game.Arcade = {}));
})(Game || (Game = {}));
///<reference path = "../BaseAwarePlayer.ts"/>
var Game;
(function (Game) {
    var Arcade;
    (function (Arcade) {
        var Platformer;
        (function (Platformer) {
            var Simple;
            (function (Simple) {
                var BaseFlowPlayer = /** @class */ (function (_super) {
                    __extends(BaseFlowPlayer, _super);
                    function BaseFlowPlayer(def) {
                        return _super.call(this, def) || this;
                    }
                    Object.defineProperty(BaseFlowPlayer.prototype, "winCondition", {
                        get: function () {
                            return Simple.Goal.instance != null && this.boxOverlap.collideAgainst(Simple.Goal.instance.boxOverlap, null, true, 0, true, Engine.Box.LAYER_ALL) != null;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(BaseFlowPlayer.prototype, "lossCondition", {
                        get: function () {
                            return this.contactsEnemies != null || this.contactsSolids != null || this.boxSolid.y > Game.SceneMap.instance.ySizeMap;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    return BaseFlowPlayer;
                }(Platformer.BaseAwarePlayer));
                Simple.BaseFlowPlayer = BaseFlowPlayer;
            })(Simple = Platformer.Simple || (Platformer.Simple = {}));
        })(Platformer = Arcade.Platformer || (Arcade.Platformer = {}));
    })(Arcade = Game.Arcade || (Game.Arcade = {}));
})(Game || (Game = {}));
///<reference path = "BaseFlowPlayer.ts"/>
var Game;
(function (Game) {
    var Arcade;
    (function (Arcade) {
        var Platformer;
        (function (Platformer) {
            var Simple;
            (function (Simple) {
                var ControllablePlayer = /** @class */ (function (_super) {
                    __extends(ControllablePlayer, _super);
                    function ControllablePlayer(def) {
                        var _this = _super.call(this, def) || this;
                        _this.controls = new Game.Interaction.Controls.Platformer.BasicJumperControls();
                        return _this;
                    }
                    Object.defineProperty(ControllablePlayer.prototype, "dirMove", {
                        get: function () {
                            return 0;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(ControllablePlayer.prototype, "jumpControlPressed", {
                        get: function () {
                            return this.controls.pressedDelayedAction;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(ControllablePlayer.prototype, "jumpControlDown", {
                        get: function () {
                            return this.controls.downAction;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    return ControllablePlayer;
                }(Simple.BaseFlowPlayer));
                Simple.ControllablePlayer = ControllablePlayer;
            })(Simple = Platformer.Simple || (Platformer.Simple = {}));
        })(Platformer = Arcade.Platformer || (Arcade.Platformer = {}));
    })(Arcade = Game.Arcade || (Game.Arcade = {}));
})(Game || (Game = {}));
///<reference path="../BaseMachineEntity.ts"/>
var Game;
(function (Game) {
    var Arcade;
    (function (Arcade) {
        var Platformer;
        (function (Platformer) {
            var Simple;
            (function (Simple) {
                var Goal = /** @class */ (function (_super) {
                    __extends(Goal, _super);
                    function Goal(def) {
                        var _this = _super.call(this, def) || this;
                        Goal.instance = _this;
                        return _this;
                    }
                    Goal.prototype.onDrawGoal = function () {
                        this.sprite.render();
                    };
                    Goal.prototype.onClearScene = function () {
                        Goal.instance = null;
                    };
                    Goal.instance = null;
                    return Goal;
                }(Platformer.BaseMachineEntity));
                Simple.Goal = Goal;
            })(Simple = Platformer.Simple || (Platformer.Simple = {}));
        })(Platformer = Arcade.Platformer || (Arcade.Platformer = {}));
    })(Arcade = Game.Arcade || (Game.Arcade = {}));
})(Game || (Game = {}));
///<reference path = "BaseFlowPlayer.ts"/>
var Game;
(function (Game) {
    var Arcade;
    (function (Arcade) {
        var Platformer;
        (function (Platformer) {
            var Simple;
            (function (Simple) {
                var NoActionsRunnerPlayer = /** @class */ (function (_super) {
                    __extends(NoActionsRunnerPlayer, _super);
                    function NoActionsRunnerPlayer() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    Object.defineProperty(NoActionsRunnerPlayer.prototype, "dirMove", {
                        get: function () {
                            return this.sprite.xMirror ? -1 : 1;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    return NoActionsRunnerPlayer;
                }(Simple.BaseFlowPlayer));
                Simple.NoActionsRunnerPlayer = NoActionsRunnerPlayer;
            })(Simple = Platformer.Simple || (Platformer.Simple = {}));
        })(Platformer = Arcade.Platformer || (Arcade.Platformer = {}));
    })(Arcade = Game.Arcade || (Game.Arcade = {}));
})(Game || (Game = {}));
///<reference path = "BaseFlowPlayer.ts"/>
var Game;
(function (Game) {
    var Arcade;
    (function (Arcade) {
        var Platformer;
        (function (Platformer) {
            var Simple;
            (function (Simple) {
                var RunnerPlayer = /** @class */ (function (_super) {
                    __extends(RunnerPlayer, _super);
                    function RunnerPlayer(def) {
                        var _this = _super.call(this, def) || this;
                        _this.controls = new Game.Interaction.Controls.Platformer.BasicRunnerControls();
                        return _this;
                    }
                    Object.defineProperty(RunnerPlayer.prototype, "dirMove", {
                        get: function () {
                            return this.sprite.xMirror ? -1 : 1;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(RunnerPlayer.prototype, "jumpControlPressed", {
                        get: function () {
                            return this.controls.pressedDelayedAction;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(RunnerPlayer.prototype, "jumpControlDown", {
                        get: function () {
                            return this.controls.downAction;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    return RunnerPlayer;
                }(Simple.BaseFlowPlayer));
                Simple.RunnerPlayer = RunnerPlayer;
            })(Simple = Platformer.Simple || (Platformer.Simple = {}));
        })(Platformer = Arcade.Platformer || (Arcade.Platformer = {}));
    })(Arcade = Game.Arcade || (Game.Arcade = {}));
})(Game || (Game = {}));
///<reference path = "BaseFlowPlayer.ts"/>
var Game;
(function (Game) {
    var Arcade;
    (function (Arcade) {
        var Platformer;
        (function (Platformer) {
            var Simple;
            (function (Simple) {
                var TwoActionsRunnerPlayer = /** @class */ (function (_super) {
                    __extends(TwoActionsRunnerPlayer, _super);
                    function TwoActionsRunnerPlayer(def) {
                        var _this = _super.call(this, def) || this;
                        _this.controls = new Game.Interaction.Controls.Platformer.TwoActionsControl();
                        return _this;
                    }
                    Object.defineProperty(TwoActionsRunnerPlayer.prototype, "dirMove", {
                        get: function () {
                            return this.sprite.xMirror ? -1 : 1;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(TwoActionsRunnerPlayer.prototype, "jumpControlPressed", {
                        get: function () {
                            return this.controls.pressedDelayedA;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(TwoActionsRunnerPlayer.prototype, "jumpControlDown", {
                        get: function () {
                            return this.controls.downA;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    return TwoActionsRunnerPlayer;
                }(Simple.BaseFlowPlayer));
                Simple.TwoActionsRunnerPlayer = TwoActionsRunnerPlayer;
            })(Simple = Platformer.Simple || (Platformer.Simple = {}));
        })(Platformer = Arcade.Platformer || (Arcade.Platformer = {}));
    })(Arcade = Game.Arcade || (Game.Arcade = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var Flow;
    (function (Flow) {
        Flow.LENGTH_STATE_CHANGE_CHAIN = 10;
        var StateLink = /** @class */ (function () {
            function StateLink(state, condition, priority) {
                this.priority = 0;
                this.state = state;
                this.condition = condition;
                this.priority = priority;
            }
            return StateLink;
        }());
        Flow.StateLink = StateLink;
        var State = /** @class */ (function () {
            function State(owner, name) {
                if (name === void 0) { name = ""; }
                this.name = "";
                this.recursive = false;
                this.links = new Array();
                this.owner = owner;
                this.name = name;
            }
            Object.defineProperty(State.prototype, "onEnter", {
                set: function (value) {
                    this._onEnter = value.bind(this.owner);
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(State.prototype, "onReady", {
                set: function (value) {
                    this._onReady = value.bind(this.owner);
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(State.prototype, "onMoveUpdate", {
                set: function (value) {
                    this._onMoveUpdate = value.bind(this.owner);
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(State.prototype, "onOverlapUpdate", {
                set: function (value) {
                    this._onOverlapUpdate = value.bind(this.owner);
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(State.prototype, "onStepUpdate", {
                set: function (value) {
                    this._onStepUpdate = value.bind(this.owner);
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(State.prototype, "onTimeUpdate", {
                set: function (value) {
                    this._onTimeUpdate = value.bind(this.owner);
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(State.prototype, "onExit", {
                set: function (value) {
                    this._onExit = value.bind(this.owner);
                },
                enumerable: false,
                configurable: true
            });
            State.prototype.addLink = function (other, condition, priority) {
                if (priority === void 0) { priority = -1; }
                this.links.push(new StateLink(other, condition.bind(this.owner), priority));
                if (priority != -1) {
                    this.links.sort(function (a, b) {
                        if (a.priority < 0 && b.priority < 0) {
                            return 0;
                        }
                        if (a.priority < 0) {
                            return -1;
                        }
                        if (b.priority < 0) {
                            return -1;
                        }
                        return a.priority - b.priority;
                    });
                }
            };
            State.prototype.checkLinks = function (that) {
                for (var _i = 0, _a = this.links; _i < _a.length; _i++) {
                    var link = _a[_i];
                    if (link.condition(that)) {
                        return link.state;
                    }
                }
                return null;
            };
            return State;
        }());
        Flow.State = State;
        var StateAccess = /** @class */ (function (_super) {
            __extends(StateAccess, _super);
            function StateAccess() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return StateAccess;
        }(State));
        var StateMachine = /** @class */ (function (_super) {
            __extends(StateMachine, _super);
            function StateMachine(owner) {
                var _this = _super.call(this) || this;
                _this.recursive = true;
                _this.stoppable = true;
                _this.owner = owner;
                _this._anyState = new State(owner);
                return _this;
            }
            Object.defineProperty(StateMachine.prototype, "anyState", {
                get: function () {
                    return this._anyState;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(StateMachine.prototype, "startState", {
                get: function () {
                    return this._startState;
                },
                set: function (value) {
                    this._startState = value;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(StateMachine.prototype, "oldState", {
                get: function () {
                    return this._oldState;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(StateMachine.prototype, "currentState", {
                get: function () {
                    return this._currentState;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(StateMachine.prototype, "nextState", {
                get: function () {
                    return this._nextState;
                },
                enumerable: false,
                configurable: true
            });
            /*
            triggerUserListener(type : number){
                if(this.currentState.onUserUpdate != null){
                    this.currentState.onUserUpdate(type, this.owner as any);
                }
            }
            */
            StateMachine.prototype.triggerListener = function (listener) {
                if (listener != null) {
                    listener(this.owner);
                }
            };
            StateMachine.prototype.onReset = function () {
                this._nextState = null;
                this._oldState = null;
                this._currentState = this._startState;
                this.triggerListener(this._anyState._onEnter);
                this.triggerListener(this._currentState._onEnter);
                this.triggerListener(this._anyState._onReady);
                this.triggerListener(this._currentState._onReady);
            };
            StateMachine.prototype.onMoveUpdate = function () {
                if (!this.stoppable || !Game.SceneFreezer.stoped) {
                    this.triggerListener(this._anyState._onMoveUpdate);
                    this.triggerListener(this._currentState._onMoveUpdate);
                }
            };
            StateMachine.prototype.onOverlapUpdate = function () {
                if (!this.stoppable || !Game.SceneFreezer.stoped) {
                    this.triggerListener(this._anyState._onOverlapUpdate);
                    this.triggerListener(this._currentState._onOverlapUpdate);
                }
            };
            StateMachine.prototype.onStepUpdate = function () {
                if (!this.stoppable || !Game.SceneFreezer.stoped) {
                    this.triggerListener(this._anyState._onStepUpdate);
                    this.triggerListener(this._currentState._onStepUpdate);
                    var nextState = null;
                    var countStateChanges = 0;
                    do {
                        nextState = this._currentState.checkLinks(this.owner);
                        if (nextState != null) {
                            this._nextState = nextState;
                            this.triggerListener(this._anyState._onExit);
                            this.triggerListener(this._currentState._onExit);
                            this._oldState = this._currentState;
                            this._currentState = nextState;
                            this._nextState = null;
                            this.triggerListener(this._anyState._onEnter);
                            this.triggerListener(this._currentState._onEnter);
                            countStateChanges += 1;
                        }
                    } while (nextState != null && (this.recursive || nextState.recursive) && countStateChanges < Flow.LENGTH_STATE_CHANGE_CHAIN);
                    if (countStateChanges > 0) {
                        this.triggerListener(this._anyState._onReady);
                        this.triggerListener(this._currentState._onReady);
                        if (countStateChanges >= Flow.LENGTH_STATE_CHANGE_CHAIN) {
                            console.warn("Warning: state change chain was broken because there was too much recursion. Please check your state links");
                        }
                    }
                }
            };
            StateMachine.prototype.onTimeUpdate = function () {
                if (!this.stoppable || !Game.SceneFreezer.stoped) {
                    this.triggerListener(this._anyState._onTimeUpdate);
                    this.triggerListener(this._currentState._onTimeUpdate);
                }
            };
            return StateMachine;
        }(Engine.Entity));
        Flow.StateMachine = StateMachine;
    })(Flow = Game.Flow || (Game.Flow = {}));
})(Game || (Game = {}));
///<reference path="../../../../Engine/Entity.ts"/>
var Game;
(function (Game) {
    var Interaction;
    (function (Interaction) {
        var Controls;
        (function (Controls) {
            var Platformer;
            (function (Platformer) {
                var BasicJumperControls = /** @class */ (function (_super) {
                    __extends(BasicJumperControls, _super);
                    function BasicJumperControls() {
                        var _this = _super.call(this) || this;
                        _this.countStepsDelayAction = 0;
                        _this.stepsDelayAction = 5;
                        _this.controlAction = new Game.Control();
                        _this.controlAction.enabled = true;
                        _this.controlAction.freezeable = true;
                        _this.controlAction.listener = _this;
                        _this.controlAction.useKeyboard = true;
                        _this.controlAction.newInteractionRequired = true;
                        _this.controlAction.useMouse = true;
                        _this.controlAction.mouseButtons = [0];
                        _this.controlAction.keys = [Engine.Keyboard.C, Engine.Keyboard.W, Engine.Keyboard.UP, "up", "Up", Engine.Keyboard.SPACE, "Space", "space", " "];
                        _this.controlAction.useTouch = true;
                        _this.controlAction.listener = _this;
                        if (Game.IS_TOUCH) {
                            _this.controlAction.useTouch = true;
                            _this.controlAction.bounds = new Engine.Sprite();
                            _this.controlAction.bounds.enabled = true;
                            _this.controlAction.bounds.pinned = true;
                            _this.tryFixTouchControls();
                        }
                        return _this;
                    }
                    Object.defineProperty(BasicJumperControls.prototype, "pressedDelayedAction", {
                        get: function () {
                            return this.countStepsDelayAction > 0;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(BasicJumperControls.prototype, "pressedAction", {
                        get: function () {
                            return this.controlAction.pressed;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(BasicJumperControls.prototype, "downAction", {
                        get: function () {
                            return this.controlAction.down;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    BasicJumperControls.prototype.onReset = function () {
                        this.countStepsDelayAction = 0;
                        this.tryFixTouchControls();
                    };
                    BasicJumperControls.prototype.onViewUpdate = function () {
                        this.tryFixTouchControls();
                    };
                    BasicJumperControls.prototype.tryFixTouchControls = function () {
                        if (Game.IS_TOUCH) {
                            this.controlAction.bounds.x = -Engine.Renderer.xSizeView * 0.5;
                            this.controlAction.bounds.y = -Engine.Renderer.ySizeView * 0.5;
                            this.controlAction.bounds.xSize = Engine.Renderer.xSizeView;
                            this.controlAction.bounds.ySize = Engine.Renderer.ySizeView;
                        }
                    };
                    BasicJumperControls.prototype.onStepUpdate = function () {
                        if (!Game.SceneFreezer.stoped) {
                            this.countStepsDelayAction -= (this.countStepsDelayAction > 0 ? 1 : 0);
                            if (this.controlAction.pressed) {
                                this.countStepsDelayAction = this.stepsDelayAction;
                            }
                        }
                    };
                    BasicJumperControls.prototype.consumeDelayedAction = function () {
                        this.countStepsDelayAction = 0;
                    };
                    return BasicJumperControls;
                }(Engine.Entity));
                Platformer.BasicJumperControls = BasicJumperControls;
            })(Platformer = Controls.Platformer || (Controls.Platformer = {}));
        })(Controls = Interaction.Controls || (Interaction.Controls = {}));
    })(Interaction = Game.Interaction || (Game.Interaction = {}));
})(Game || (Game = {}));
///<reference path="../../../../Engine/Entity.ts"/>
var Game;
(function (Game) {
    var Interaction;
    (function (Interaction) {
        var Controls;
        (function (Controls) {
            var Platformer;
            (function (Platformer) {
                var BasicRunnerControls = /** @class */ (function (_super) {
                    __extends(BasicRunnerControls, _super);
                    function BasicRunnerControls() {
                        var _this = _super.call(this) || this;
                        _this.countStepsDelayAction = 0;
                        _this.stepsDelayAction = 5;
                        _this.controlAction = new Game.Control();
                        _this.controlAction.enabled = true;
                        _this.controlAction.freezeable = true;
                        _this.controlAction.listener = _this;
                        _this.controlAction.useKeyboard = true;
                        _this.controlAction.newInteractionRequired = true;
                        _this.controlAction.useMouse = false;
                        _this.controlAction.mouseButtons = [0];
                        if (Game.IS_EDGE) {
                            _this.controlAction.keys = [Engine.Keyboard.H, Engine.Keyboard.UP, "up", "Up", Engine.Keyboard.SPACE, "spacebar", "Space", "space", " "];
                        }
                        else {
                            _this.controlAction.keys = [Engine.Keyboard.W, Engine.Keyboard.H, Engine.Keyboard.UP, "up", "Up", Engine.Keyboard.SPACE, "spacebar", "Space", "space", " "];
                        }
                        _this.controlAction.useTouch = true;
                        return _this;
                    }
                    Object.defineProperty(BasicRunnerControls.prototype, "pressedDelayedAction", {
                        get: function () {
                            return this.countStepsDelayAction > 0;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(BasicRunnerControls.prototype, "pressedAction", {
                        get: function () {
                            return this.controlAction.pressed;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(BasicRunnerControls.prototype, "downAction", {
                        get: function () {
                            return this.controlAction.down;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    BasicRunnerControls.prototype.onReset = function () {
                        this.countStepsDelayAction = 0;
                    };
                    BasicRunnerControls.prototype.onStepUpdate = function () {
                        if (!Game.SceneFreezer.stoped) {
                            this.countStepsDelayAction -= (this.countStepsDelayAction > 0 ? 1 : 0);
                            if (this.controlAction.pressed) {
                                this.countStepsDelayAction = this.stepsDelayAction;
                            }
                        }
                    };
                    return BasicRunnerControls;
                }(Engine.Entity));
                Platformer.BasicRunnerControls = BasicRunnerControls;
            })(Platformer = Controls.Platformer || (Controls.Platformer = {}));
        })(Controls = Interaction.Controls || (Interaction.Controls = {}));
    })(Interaction = Game.Interaction || (Game.Interaction = {}));
})(Game || (Game = {}));
///<reference path="../../../../Engine/Entity.ts"/>
var Game;
(function (Game) {
    var Interaction;
    (function (Interaction) {
        var Controls;
        (function (Controls) {
            var Platformer;
            (function (Platformer) {
                var TwoActionsControl = /** @class */ (function (_super) {
                    __extends(TwoActionsControl, _super);
                    function TwoActionsControl() {
                        var _this = _super.call(this) || this;
                        _this.countStepsDelayA = 0;
                        _this.stepsDelayA = 5;
                        _this.countStepsDelayB = 0;
                        _this.stepsDelayB = 5;
                        _this.controlA = new Game.Control();
                        _this.controlA.enabled = true;
                        _this.controlA.freezeable = true;
                        _this.controlA.listener = _this;
                        _this.controlA.useKeyboard = true;
                        _this.controlA.newInteractionRequired = true;
                        _this.controlA.useMouse = true;
                        _this.controlA.mouseButtons = [0];
                        _this.controlA.keys = [Engine.Keyboard.C, Engine.Keyboard.UP, "up", "Up"];
                        _this.controlB = new Game.Control();
                        _this.controlB.enabled = true;
                        _this.controlB.freezeable = true;
                        _this.controlB.listener = _this;
                        _this.controlB.useKeyboard = true;
                        _this.controlB.newInteractionRequired = true;
                        _this.controlB.useMouse = true;
                        _this.controlB.mouseButtons = [2];
                        _this.controlB.keys = [Engine.Keyboard.SPACE, Engine.Keyboard.X, "spacebar", "Spacebar", "SPACEBAR", "space", "Space", " "];
                        if (Game.IS_TOUCH) {
                            _this.controlA.useTouch = true;
                            _this.controlA.bounds = new Engine.Sprite();
                            _this.controlA.bounds.enabled = true;
                            _this.controlA.bounds.pinned = true;
                            _this.controlB.useTouch = true;
                            _this.controlB.bounds = new Engine.Sprite();
                            _this.controlB.bounds.enabled = true;
                            _this.controlB.bounds.pinned = true;
                            _this.tryFixTouchControls();
                        }
                        _this.tryFixTouchControls();
                        return _this;
                    }
                    Object.defineProperty(TwoActionsControl.prototype, "pressedDelayedA", {
                        get: function () {
                            return this.countStepsDelayA > 0;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(TwoActionsControl.prototype, "pressedA", {
                        get: function () {
                            return this.controlA.pressed;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(TwoActionsControl.prototype, "downA", {
                        get: function () {
                            return this.controlA.down;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(TwoActionsControl.prototype, "pressedDelayedB", {
                        get: function () {
                            return this.countStepsDelayB > 0;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(TwoActionsControl.prototype, "pressedB", {
                        get: function () {
                            return this.controlB.pressed;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    Object.defineProperty(TwoActionsControl.prototype, "downB", {
                        get: function () {
                            return this.controlB.down;
                        },
                        enumerable: false,
                        configurable: true
                    });
                    TwoActionsControl.prototype.onReset = function () {
                        this.countStepsDelayA = 0;
                        this.countStepsDelayB = 0;
                    };
                    TwoActionsControl.prototype.onViewUpdate = function () {
                        this.tryFixTouchControls();
                    };
                    TwoActionsControl.prototype.tryFixTouchControls = function () {
                        if (Game.IS_TOUCH) {
                            this.controlA.bounds.x = 0;
                            this.controlA.bounds.y = -Engine.Renderer.ySizeView * 0.5;
                            this.controlA.bounds.xSize = Engine.Renderer.xSizeView * 0.5;
                            this.controlA.bounds.ySize = Engine.Renderer.ySizeView;
                            this.controlB.bounds.x = -Engine.Renderer.xSizeView * 0.5;
                            this.controlB.bounds.y = -Engine.Renderer.ySizeView * 0.5;
                            this.controlB.bounds.xSize = Engine.Renderer.xSizeView * 0.5;
                            this.controlB.bounds.ySize = Engine.Renderer.ySizeView;
                        }
                    };
                    TwoActionsControl.prototype.onStepUpdate = function () {
                        if (!Game.SceneFreezer.stoped) {
                            this.countStepsDelayA -= (this.countStepsDelayA > 0 ? 1 : 0);
                            if (this.controlA.pressed) {
                                this.countStepsDelayA = this.stepsDelayA;
                            }
                            this.countStepsDelayB -= (this.countStepsDelayB > 0 ? 1 : 0);
                            if (this.controlB.pressed) {
                                this.countStepsDelayB = this.stepsDelayB;
                            }
                        }
                    };
                    return TwoActionsControl;
                }(Engine.Entity));
                Platformer.TwoActionsControl = TwoActionsControl;
            })(Platformer = Controls.Platformer || (Controls.Platformer = {}));
        })(Controls = Interaction.Controls || (Interaction.Controls = {}));
    })(Interaction = Game.Interaction || (Game.Interaction = {}));
})(Game || (Game = {}));
///<reference path="../../../Engine/Scene.ts"/>
///<reference path="../../Game.ts"/>
var Game;
(function (Game) {
    var Scene = /** @class */ (function (_super) {
        __extends(Scene, _super);
        function Scene() {
            var _this = _super.call(this) || this;
            _this.countStepsWait = 0;
            _this.stepsWait = 0;
            Scene.instance = _this;
            Game.SceneFreezer.init();
            Game.SceneFade.init();
            Game.SceneColors.init();
            //SceneColors.clearColor(0, 0, 0);
            Game.SceneOrientator.init();
            return _this;
        }
        Object.defineProperty(Scene, "nextSceneClass", {
            get: function () {
                return Scene.instance.nextSceneClass;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Scene, "waiting", {
            get: function () {
                return Scene.instance.waiting;
            },
            enumerable: false,
            configurable: true
        });
        Scene.prototype.onReset = function () {
            this.nextSceneClass = null;
            this.waiting = false;
            this.countStepsWait = 0;
        };
        Scene.prototype.onStepUpdate = function () {
            if (this.waiting) {
                this.countStepsWait += 1 * Utils.Fade.scale;
                if (this.countStepsWait >= this.stepsWait) {
                    if (this.nextSceneClass == "reset") {
                        Engine.System.requireReset();
                    }
                    else {
                        Engine.System.nextSceneClass = this.nextSceneClass;
                    }
                    this.onEndWaiting();
                }
            }
            else if (!this.waiting && this.nextSceneClass != null && Game.SceneFade.filled) {
                this.waiting = true;
                this.onStartWaiting();
            }
        };
        Scene.prototype.onStartWaiting = function () {
        };
        Scene.prototype.onEndWaiting = function () {
        };
        Scene.prototype.onFadeLinStart = function () {
        };
        return Scene;
    }(Engine.Scene));
    Game.Scene = Scene;
})(Game || (Game = {}));
///<reference path="Scene.ts"/>
var Game;
(function (Game) {
    var FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
    var FLIPPED_VERTICALLY_FLAG = 0x40000000;
    var FLIPPED_DIAGONALLY_FLAG = 0x20000000;
    var SceneMap = /** @class */ (function (_super) {
        __extends(SceneMap, _super);
        //private defSky : any;
        function SceneMap() {
            var _this = _super.call(this) || this;
            _this.offsetTiles = 0;
            _this.xSizeMap = 0;
            _this.ySizeMap = 0;
            _this.xSizeTile = 0;
            _this.ySizeTile = 0;
            SceneMap.instance = _this;
            _this.boxesSolids = [];
            _this.boxesSticky = [];
            _this.noOneWaySolids = [];
            _this.newOneWaySolids = [];
            _this.boxesEnemies = [];
            _this.dataTiles = [];
            return _this;
            //console.error("REMEMBER TO OPTIMIZE THIS SHIT");
        }
        SceneMap.prototype.loadMap = function (pathTerrain, _pathSky) {
            if (_pathSky === void 0) { _pathSky = null; }
            this.boxesEnemies = Array();
            this.loadDefTerrain(pathTerrain);
            this.loadDefSky(null);
            this.createMapBoxes(this.defMapSky);
            this.createMapBoxes(this.defMapTerrain);
            this.createEntities(this.defMapSky);
            this.createEntities(this.defMapTerrain);
            Game.Resources.textureMapBack.clear();
            this.buildTexture(this.defMapSky, true);
            this.buildTexture(this.defMapTerrain, true);
            Game.Resources.textureMapTerrain.clear();
            this.buildTexture(this.defMapSky, false);
            this.buildTexture(this.defMapTerrain, false);
            this.spriteTerrain = new Engine.Sprite();
            this.spriteTerrain.setFull(true, false, Game.Resources.textureMapTerrain, this.xSizeMap, this.ySizeMap, 0, 0, 1, 1, this.xSizeMap, this.ySizeMap);
            for (var _i = 0, _a = this.boxesSolids; _i < _a.length; _i++) {
                var box = _a[_i];
                this.noOneWaySolids.push(box);
            }
            for (var _b = 0, _c = this.newOneWaySolids; _b < _c.length; _b++) {
                var box = _c[_b];
                this.boxesSolids.push(box);
            }
            this.onViewUpdate();
        };
        SceneMap.prototype.redraw = function () {
            Game.Resources.textureMapBack.clear();
            this.buildTexture(this.defMapSky, true);
            this.buildTexture(this.defMapTerrain, true);
            Game.Resources.textureMapTerrain.clear();
            this.buildTexture(this.defMapSky, false);
            this.buildTexture(this.defMapTerrain, false);
        };
        SceneMap.prototype.onViewUpdate = function () {
            this.spritesBack = [];
            if (Engine.Renderer.xFitView) {
                this.onViewUpdateY();
            }
            else {
                this.onViewUpdateX();
            }
            var sprite = new Engine.Sprite();
            sprite.setFull(true, false, Game.Resources.textureMapBack, this.xSizeMap, this.ySizeMap, 0, 0, 1, 1, this.xSizeMap, this.ySizeMap);
            this.spritesBack.push(sprite);
        };
        SceneMap.prototype.onViewUpdateX = function () {
            var count = Engine.Renderer.xSizeView - this.xSizeMap;
            count /= 2.0;
            var lastSize = count + this.xSizeTile;
            count /= this.xSizeMap;
            count = Math.ceil(count);
            for (var i = 0; i < count; i++) {
                this.spritesBack.push(this.createSpriteBackX(i, 1, i == count - 1, lastSize));
                this.spritesBack.push(this.createSpriteBackX(i, -1, i == count - 1, lastSize));
            }
        };
        SceneMap.prototype.onViewUpdateY = function () {
            var count = Engine.Renderer.ySizeView - this.ySizeMap;
            count /= 2.0;
            var lastSize = count;
            count /= this.ySizeMap;
            count = Math.ceil(count);
            for (var i = 0; i < count; i++) {
                this.spritesBack.push(this.createSpriteBackY(i, 1, i == count - 1, lastSize));
                this.spritesBack.push(this.createSpriteBackY(i, -1, i == count - 1, lastSize));
            }
        };
        SceneMap.prototype.createSpriteBackX = function (index, dir, last, lastSize) {
            var sprite = new Engine.Sprite();
            if (last) {
                if (dir > 0) {
                    sprite.setFull(true, false, Game.Resources.textureMapBack, lastSize, this.ySizeMap, 0, 0, 1, 1, lastSize, this.ySizeMap);
                    sprite.x = this.xSizeMap * dir + this.xSizeMap * index * dir;
                }
                else {
                    sprite.setFull(true, false, Game.Resources.textureMapBack, lastSize, this.ySizeMap, 0, 0, 1 + (this.xSizeMap - lastSize), 1, lastSize, this.ySizeMap);
                    sprite.x = lastSize * dir + this.xSizeMap * index * dir;
                }
            }
            else {
                sprite.setFull(true, false, Game.Resources.textureMapBack, this.xSizeMap, this.ySizeMap, 0, 0, 1, 1, this.xSizeMap, this.ySizeMap);
                sprite.x = this.xSizeMap * dir + this.xSizeMap * index * dir;
            }
            return sprite;
        };
        SceneMap.prototype.createSpriteBackY = function (index, dir, last, lastSize) {
            var sprite = new Engine.Sprite();
            if (last) {
                if (dir > 0) {
                    sprite.setFull(true, false, Game.Resources.textureMapBack, this.xSizeMap, lastSize, 0, 0, 1, 1, this.xSizeMap, lastSize);
                    sprite.y = this.ySizeMap * dir + this.ySizeMap * index * dir;
                }
                else {
                    sprite.setFull(true, false, Game.Resources.textureMapBack, this.xSizeMap, lastSize, 0, 0, 1, 1 + (this.ySizeMap - lastSize), this.xSizeMap, lastSize);
                    sprite.y = lastSize * dir + this.ySizeMap * index * dir;
                }
            }
            else {
                sprite.setFull(true, false, Game.Resources.textureMapBack, this.xSizeMap, this.ySizeMap, 0, 0, 1, 1, this.xSizeMap, this.ySizeMap);
                sprite.y = this.ySizeMap * dir + this.ySizeMap * index * dir;
            }
            return sprite;
        };
        SceneMap.prototype.loadDefTerrain = function (pathMap) {
            //TODO: Suboptimal
            var tileset = JSON.parse(Engine.Assets.loadText(Game.Resources.PATH_TILESET));
            this.tiles = tileset.tiles;
            this.xSizeTile = tileset.tilewidth;
            this.ySizeTile = tileset.tileheight;
            this.tileColumns = tileset.columns;
            this.offsetTiles = tileset.margin;
            this.defMapTerrain = JSON.parse(Engine.Assets.loadText(pathMap));
            this.xCountTiles = this.defMapTerrain.width;
            this.yCountTiles = this.defMapTerrain.height;
            this.xSizeMap = this.defMapTerrain.width * this.xSizeTile;
            this.ySizeMap = this.defMapTerrain.height * this.ySizeTile;
            this.boxesSolids = new Array();
            this.boxesSticky = new Array();
            this.noOneWaySolids = new Array();
            this.newOneWaySolids = new Array();
        };
        SceneMap.prototype.loadDefSky = function (pathMap) {
            if (pathMap == null) {
                this.defMapSky = null;
                return;
            }
            var xUnitSky = Math.floor(this.xSizeMap / Engine.Renderer.xSizeView);
            var yUnitSky = Math.floor(this.ySizeMap / Engine.Renderer.ySizeView);
            //TODO: Suboptimal
            this.defMapSky = JSON.parse(Engine.Assets.loadText(pathMap + xUnitSky + "x" + yUnitSky + ".json"));
        };
        SceneMap.prototype.createMapBoxes = function (def) {
            if (def == null)
                return;
            for (var _i = 0, _a = def.layers; _i < _a.length; _i++) {
                var layer = _a[_i];
                if (layer.name.indexOf("Entities") < 0 && layer.name.indexOf("Repeat") < 0 && layer.name.indexOf("Ignore") < 0) {
                    var indexTile = 0;
                    var tileDefMatrix = [];
                    for (var yIndex = 0; yIndex < this.yCountTiles; yIndex += 1) {
                        for (var xIndex = 0; xIndex < this.xCountTiles; xIndex += 1) {
                            tileDefMatrix[xIndex + yIndex * this.xCountTiles] = false;
                            if (layer.data[indexTile] != 0) {
                                var tiltyp = this.getTileType(layer.data[indexTile]);
                                if (tiltyp == "Terrain") {
                                    tileDefMatrix[xIndex + yIndex * this.xCountTiles] = true;
                                }
                                else if (tiltyp != "StickyTerrain") {
                                    var def = this.getTileDef(layer.data[indexTile]);
                                    if (def != null) {
                                        eval("new " + def.type + "({tileDef : def, instance : {x : (xIndex)*this.xSizeTile, y : (yIndex+1)*this.ySizeTile, indexTile : layer.data[indexTile]}})");
                                    }
                                }
                            }
                            indexTile += 1;
                        }
                    }
                    for (var yIndex = 0; yIndex < this.yCountTiles; yIndex += 1) {
                        for (var xIndex = 0; xIndex < this.xCountTiles; xIndex += 1) {
                            if (tileDefMatrix[xIndex + yIndex * this.xCountTiles]) {
                                this.boxesSolids.push(this.generateBox(tileDefMatrix, null, xIndex, yIndex, this.xCountTiles, this.yCountTiles, this.xCountTiles));
                            }
                        }
                    }
                    var indexTile = 0;
                    var tileDefMatrix = [];
                    for (var yIndex = 0; yIndex < this.yCountTiles; yIndex += 1) {
                        for (var xIndex = 0; xIndex < this.xCountTiles; xIndex += 1) {
                            tileDefMatrix[xIndex + yIndex * this.xCountTiles] = false;
                            if (layer.data[indexTile] != 0) {
                                if (this.getTileType(layer.data[indexTile]) == "StickyTerrain") {
                                    tileDefMatrix[xIndex + yIndex * this.xCountTiles] = true;
                                }
                            }
                            indexTile += 1;
                        }
                    }
                    for (var yIndex = 0; yIndex < this.yCountTiles; yIndex += 1) {
                        for (var xIndex = 0; xIndex < this.xCountTiles; xIndex += 1) {
                            if (tileDefMatrix[xIndex + yIndex * this.xCountTiles]) {
                                var box = this.generateBox(tileDefMatrix, "sti", xIndex, yIndex, this.xCountTiles, this.yCountTiles, this.xCountTiles);
                                this.boxesSolids.push(box);
                                this.boxesSticky.push(box);
                            }
                        }
                    }
                    var indexTile = 0;
                    var tileDefMatrix = [];
                    for (var yIndex = 0; yIndex < this.yCountTiles; yIndex += 1) {
                        for (var xIndex = 0; xIndex < this.xCountTiles; xIndex += 1) {
                            tileDefMatrix[xIndex + yIndex * this.xCountTiles] = false;
                            if (layer.data[indexTile] != 0) {
                                if (this.getTileType(layer.data[indexTile]) == "OneWay") {
                                    tileDefMatrix[xIndex + yIndex * this.xCountTiles] = true;
                                }
                            }
                            indexTile += 1;
                        }
                    }
                    for (var yIndex = 0; yIndex < this.yCountTiles; yIndex += 1) {
                        for (var xIndex = 0; xIndex < this.xCountTiles; xIndex += 1) {
                            if (tileDefMatrix[xIndex + yIndex * this.xCountTiles]) {
                                this.newOneWaySolids.push(this.generateBox(tileDefMatrix, null, xIndex, yIndex, this.xCountTiles, this.yCountTiles, this.xCountTiles));
                            }
                        }
                    }
                }
            }
        };
        SceneMap.prototype.generateBox = function (tileDefMatrix, type, xStart, yStart, xMax, yMax, xSize) {
            for (var y = yStart; y < yMax; y += 1) {
                for (var x = xStart; x < xMax; x += 1) {
                    if (!tileDefMatrix[x + y * xSize]) {
                        xMax = x;
                        break;
                    }
                }
                if (y < yMax - 1 && !tileDefMatrix[xStart + (y + 1) * xSize]) {
                    yMax = y + 1;
                    break;
                }
            }
            for (var y = yStart; y < yMax; y += 1) {
                for (var x = xStart; x < xMax; x += 1) {
                    tileDefMatrix[x + y * xSize] = false;
                }
            }
            var box = new Engine.Box();
            box.enabled = true;
            box.renderable = true;
            box.data = type;
            box.layer = Engine.Box.LAYER_ALL;
            box.x = xStart * this.xSizeTile;
            box.y = yStart * this.ySizeTile;
            box.xSize = (xMax - xStart) * this.xSizeTile;
            box.ySize = (yMax - yStart) * this.ySizeTile;
            box.red = Math.random() * 1;
            box.green = Math.random() * 1;
            box.blue = Math.random() * 1;
            box.alpha = 0.9;
            return box;
        };
        SceneMap.prototype.createEntities = function (def) {
            if (def == null)
                return;
            for (var _i = 0, _a = def.layers; _i < _a.length; _i++) {
                var layer = _a[_i];
                if (layer.name.indexOf("Entities") >= 0) {
                    var entities = layer.objects;
                    for (var _b = 0, entities_1 = entities; _b < entities_1.length; _b++) {
                        var instancedef = entities_1[_b];
                        var entitydef = this.getEntitydef(instancedef);
                        Game.Entity.create(entitydef);
                    }
                }
            }
        };
        SceneMap.prototype.getEntitydef = function (instancedef) {
            var typedef = Game.findInJSON(this.tiles, function (typedef) {
                var gid = instancedef.gid & ~(FLIPPED_HORIZONTALLY_FLAG | FLIPPED_VERTICALLY_FLAG | FLIPPED_DIAGONALLY_FLAG);
                return typedef.id == gid - 1;
            });
            var entitydef = {};
            entitydef.type = typedef;
            entitydef.instance = instancedef;
            entitydef.flip = {};
            entitydef.flip.x = (instancedef.gid & (instancedef.gid & FLIPPED_HORIZONTALLY_FLAG)) != 0;
            entitydef.flip.y = (instancedef.gid & (instancedef.gid & FLIPPED_VERTICALLY_FLAG)) != 0;
            return entitydef;
        };
        SceneMap.prototype.getTileType = function (id) {
            var typedef = Game.findInJSON(this.tiles, function (typedef) {
                return typedef.id == id - 1;
            });
            if (typedef != null) {
                return typedef.type;
            }
            return null;
        };
        SceneMap.prototype.getTileDef = function (id) {
            return Game.findInJSON(this.tiles, function (typedef) {
                return typedef.id == id - 1;
            });
        };
        SceneMap.prototype.onDrawSceneSky = function () {
            for (var _i = 0, _a = this.spritesBack; _i < _a.length; _i++) {
                var sprite = _a[_i];
                sprite.render();
            }
        };
        SceneMap.prototype.onDrawSceneMap = function () {
            //this.drawLayers(this.defMap);
            this.spriteTerrain.render();
            //SceneColors.instance.drawFill();
            for (var _i = 0, _a = this.boxesSolids; _i < _a.length; _i++) {
                var box = _a[_i];
                box.render();
            }
            for (var _b = 0, _c = this.boxesSticky; _b < _c.length; _b++) {
                var box = _c[_b];
                box.render();
            }
        };
        SceneMap.prototype.buildTexture = function (def, back) {
            if (def == null)
                return;
            var texture = back ? Game.Resources.textureMapBack : Game.Resources.textureMapTerrain;
            var texgam = Game.Resources.texgam.linkedTexture;
            for (var _i = 0, _a = def.layers; _i < _a.length; _i++) {
                var layer = _a[_i];
                if (layer.name.indexOf("Entities") >= 0 || layer.name.indexOf("Ignore") >= 0)
                    continue;
                if (back && layer.name.indexOf("Repeat") < 0)
                    continue;
                if (!back && layer.name.indexOf("Repeat") >= 0)
                    continue;
                for (var yIndex = 0; yIndex < this.yCountTiles; yIndex += 1) {
                    for (var xIndex = 0; xIndex < this.xCountTiles; xIndex += 1) {
                        var indexTile = xIndex + yIndex * this.xCountTiles;
                        var data = layer.data[indexTile];
                        if (data == 0 || (this.getTileDef(layer.data[indexTile]) != null && this.getTileType(layer.data[indexTile]) != "Terrain"))
                            continue;
                        data--;
                        var yPixTil = Math.floor(data / Math.floor(texgam.assetData.xSize / (this.xSizeTile + this.offsetTiles)));
                        var xPixTil = data - (yPixTil * Math.floor(texgam.assetData.ySize / (this.xSizeTile + this.offsetTiles)));
                        var xPixPut = this.offsetTiles + xPixTil * (this.xSizeTile + this.offsetTiles);
                        var yPixPut = this.offsetTiles + yPixTil * (this.xSizeTile + this.offsetTiles);
                        for (var xPix = 0; xPix < this.xSizeTile; xPix += 1) {
                            for (var yPix = 0; yPix < this.ySizeTile; yPix += 1) {
                                var alpha = texgam.getAlpha(xPixPut + xPix, yPixPut + yPix);
                                if (alpha != 0) {
                                    var red = texgam.getRed(xPixPut + xPix, yPixPut + yPix);
                                    var green = texgam.getGreen(xPixPut + xPix, yPixPut + yPix);
                                    var blue = texgam.getBlue(xPixPut + xPix, yPixPut + yPix);
                                    var xmap = xIndex * this.xSizeTile + xPix + 1;
                                    var ymap = yIndex * this.xSizeTile + yPix + 1;
                                    texture.setRGBA(xmap, ymap, red, green, blue, alpha);
                                }
                            }
                        }
                    }
                }
            }
            for (var xPix = 0; xPix < this.xSizeMap + 1; xPix += 1) {
                var red = texture.getRed(xPix, 1);
                var green = texture.getGreen(xPix, 1);
                var blue = texture.getBlue(xPix, 1);
                var alpha = texture.getAlpha(xPix, 1);
                texture.setRGBA(xPix, 0, red, green, blue, alpha);
                red = texture.getRed(xPix, this.ySizeMap);
                green = texture.getGreen(xPix, this.ySizeMap);
                blue = texture.getBlue(xPix, this.ySizeMap);
                alpha = texture.getAlpha(xPix, this.ySizeMap);
                texture.setRGBA(xPix, this.ySizeMap + 1, red, green, blue, alpha);
            }
            for (var yPix = 0; yPix < this.ySizeMap + 1; yPix += 1) {
                var red = texture.getRed(1, yPix);
                var green = texture.getGreen(1, yPix);
                var blue = texture.getBlue(1, yPix);
                var alpha = texture.getAlpha(1, yPix);
                texture.setRGBA(0, yPix, red, green, blue, alpha);
                red = texture.getRed(this.xSizeMap, yPix);
                green = texture.getGreen(this.xSizeMap, yPix);
                blue = texture.getBlue(this.xSizeMap, yPix);
                alpha = texture.getAlpha(this.xSizeMap, yPix);
                texture.setRGBA(this.xSizeMap + 1, yPix, red, green, blue, alpha);
            }
            texture.renderAgain();
        };
        SceneMap.maxRepetitionsX = Infinity;
        SceneMap.maxRepetitionsY = Infinity;
        SceneMap.instance = null;
        return SceneMap;
    }(Game.Scene));
    Game.SceneMap = SceneMap;
})(Game || (Game = {}));
///<reference path="../System/Scene/SceneMap.ts"/>
var Game;
(function (Game) {
    var BaseBackScene = /** @class */ (function (_super) {
        __extends(BaseBackScene, _super);
        function BaseBackScene() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return BaseBackScene;
    }(Game.SceneMap));
    Game.BaseBackScene = BaseBackScene;
})(Game || (Game = {}));
///<reference path="../System/Scene/SceneMap.ts"/>
var Game;
(function (Game) {
    var Credits;
    (function (Credits) {
        var offtex = 7;
        var offtexsep = 11;
        Game.addAction("configure", function () { if (Game.plu)
            offtexsep -= 1; });
        Credits.big = false;
        var cla = /** @class */ (function (_super) {
            __extends(cla, _super);
            function cla() {
                var _this = _super.call(this) || this;
                Credits.ins = _this;
                if (Game.plu)
                    new Game.AudioFrame();
                new Game.MusicButton();
                new Game.SoundButton();
                new Game.CreditsFrame();
                maktex();
                makbacbut();
                Credits.ins.loadMap(Game.Resources.PATH_MAP_CREDITS);
                Engine.Renderer.camera(Game.SceneMap.instance.xSizeMap * 0.5, Game.SceneMap.instance.ySizeMap * 0.5);
                Game.SceneColors.enabledDown = true;
                Game.SceneColors.instance.usingFill = true;
                Game.triggerActions("credits");
                return _this;
            }
            return cla;
        }(Game.SceneMap));
        Credits.cla = cla;
        function maktex() {
            var devtit = new Utils.Text();
            devtit.font = Game.FontManager.a;
            devtit.scale = 1;
            devtit.enabled = true;
            devtit.pinned = true;
            devtit.str = "CREATED BY:";
            devtit.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            devtit.xAlignView = Utils.AnchorAlignment.MIDDLE;
            devtit.yAlignBounds = Utils.AnchorAlignment.START;
            devtit.yAlignView = Utils.AnchorAlignment.MIDDLE;
            //noadev.xAligned=1.5;
            devtit.yAligned = Game.CreditsFrame.spr.y + 5 - (Game.plu ? 0 : 2);
            var devnic = new Utils.Text();
            devnic.font = Game.FontManager.a;
            devnic.scale = 1;
            devnic.enabled = true;
            devnic.pinned = true;
            devnic.str = "NOADEV";
            devnic.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            devnic.xAlignView = Utils.AnchorAlignment.MIDDLE;
            devnic.yAlignBounds = Utils.AnchorAlignment.START;
            devnic.yAlignView = Utils.AnchorAlignment.MIDDLE;
            devnic.yAligned = devtit.y + offtex;
            var devtittwo = null;
            if (Credits.big) {
                devtittwo = new Utils.Text();
                devtittwo.font = Game.FontManager.a;
                devtittwo.scale = 1;
                devtittwo.enabled = true;
                devtittwo.pinned = true;
                devtittwo.str = "GRAPHICS:";
                devtittwo.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
                devtittwo.xAlignView = Utils.AnchorAlignment.MIDDLE;
                devtittwo.yAlignBounds = Utils.AnchorAlignment.START;
                devtittwo.yAlignView = Utils.AnchorAlignment.MIDDLE;
                //behe.xAligned=1.5;
                devtittwo.yAligned = devnic.y + offtexsep;
                var devnictwo = new Utils.Text();
                devnictwo.font = Game.FontManager.a;
                devnictwo.scale = 1;
                devnictwo.enabled = true;
                devnictwo.pinned = true;
                devnictwo.str = "KALPAR";
                devnictwo.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
                devnictwo.xAlignView = Utils.AnchorAlignment.MIDDLE;
                devnictwo.yAlignBounds = Utils.AnchorAlignment.START;
                devnictwo.yAlignView = Utils.AnchorAlignment.MIDDLE;
                devnictwo.xAligned = 0;
                devnictwo.yAligned = devtittwo.y + offtex;
            }
            var mustit = new Utils.Text();
            mustit.font = Game.FontManager.a;
            mustit.scale = 1;
            mustit.enabled = true;
            mustit.pinned = true;
            mustit.str = "MUSIC:";
            mustit.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            mustit.xAlignView = Utils.AnchorAlignment.MIDDLE;
            mustit.yAlignBounds = Utils.AnchorAlignment.START;
            mustit.yAlignView = Utils.AnchorAlignment.MIDDLE;
            //behe.xAligned=1.5;
            mustit.yAligned = Credits.big ? devnictwo.y + offtexsep : devnic.y + offtexsep;
            var musnic = new Utils.Text();
            musnic.font = Game.FontManager.a;
            musnic.scale = 1;
            musnic.enabled = true;
            musnic.pinned = true;
            musnic.str = "KOMIKU";
            musnic.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            musnic.xAlignView = Utils.AnchorAlignment.MIDDLE;
            musnic.yAlignBounds = Utils.AnchorAlignment.START;
            musnic.yAlignView = Utils.AnchorAlignment.MIDDLE;
            musnic.xAligned = 0;
            musnic.yAligned = mustit.y + offtex;
            var thutit = new Utils.Text();
            thutit.font = Game.FontManager.a;
            thutit.scale = 1;
            thutit.enabled = true;
            thutit.pinned = true;
            thutit.str = "THUMBNAIL:";
            thutit.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            thutit.xAlignView = Utils.AnchorAlignment.MIDDLE;
            thutit.yAlignBounds = Utils.AnchorAlignment.START;
            thutit.yAlignView = Utils.AnchorAlignment.MIDDLE;
            //behe.xAligned=1.5;
            thutit.yAligned = musnic.y + offtexsep;
            var thunic = new Utils.Text();
            thunic.font = Game.FontManager.a;
            thunic.scale = 1;
            thunic.enabled = true;
            thunic.pinned = true;
            thunic.str = "NIELDACAN";
            thunic.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            thunic.xAlignView = Utils.AnchorAlignment.MIDDLE;
            thunic.yAlignBounds = Utils.AnchorAlignment.START;
            thunic.yAlignView = Utils.AnchorAlignment.MIDDLE;
            thunic.xAligned = 0;
            thunic.yAligned = thutit.y + offtex;
        }
        function makbacbut() {
            var but = new Game.DialogButton(Game.plu ? 7 : 6, 0, (Game.plu ? -2 : 0) + 44);
            but.control.listener = Credits;
            but.text.font = Game.FontManager.a;
            but.text.scale = 1;
            but.text.enabled = true;
            but.text.pinned = true;
            but.text.str = "BACK";
            but.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            but.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            but.text.yAlignBounds = Utils.AnchorAlignment.START;
            but.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            but.text.xAligned = but.dialog.spr.x;
            but.text.yAligned = but.dialog.spr.y - (Game.plu ? 0 : 0.5);
            but.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            //backButton.arrows.yOffset -= 0.5;
            but.control.useKeyboard = true;
            but.control.keys = [Engine.Keyboard.ESC, "esc", "Esc", "ESC"];
            but.control.onPressedDelegate = function () {
                if (Game.Scene.nextSceneClass == null) {
                    Credits.ins.stepsWait = 0;
                    Credits.ins.nextSceneClass = Game.maimen.cla;
                }
            };
        }
    })(Credits = Game.Credits || (Game.Credits = {}));
})(Game || (Game = {}));
///<reference path="../System/Scene/SceneMap.ts"/>
var Game;
(function (Game) {
    Game.TEXT_DESKTOP_CONTINUE_EXIT = "ESC OR CLICK HERE TO EXIT";
    var fra;
    var fraexi;
    Game.addAction("configure", function () {
        if (Game.plu)
            fra = Game.FrameSelector.complex("lastscene", Game.Resources.texgam, 0, 890);
        else
            fra = Game.FrameSelector.complex("lastscene", Game.Resources.texgam, 257, 222);
        if (Game.plu)
            fraexi = Game.FrameSelector.complex("lastscene2", Game.Resources.texgam, 290, 894);
        else
            fraexi = Game.FrameSelector.complex("lastscene2", Game.Resources.texgam, 257, 198);
    });
    Game.HAS_LINKS_NOADEV = true;
    var LastScene = /** @class */ (function (_super) {
        __extends(LastScene, _super);
        function LastScene() {
            var _this = _super.call(this) || this;
            Engine.Renderer.clearColor(Game.Resources.texgam.getRed(100, 20) / 255.0, Game.Resources.texgam.getGreen(100, 20) / 255.0, Game.Resources.texgam.getBlue(100, 20) / 255.0);
            LastScene.instance = _this;
            new Game.MusicButton();
            new Game.SoundButton();
            new Game.ExitButton();
            new Game.LastSceneAdUI();
            //var hasLinks=HAS_LINKS&&HAS_LINKS_NOADEV;
            var tha = new Game.Button();
            tha.bounds.enabled = tha.bounds.pinned = true;
            tha.anchor.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            tha.anchor.xAlignView = Utils.AnchorAlignment.MIDDLE;
            tha.anchor.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            tha.anchor.yAlignView = Utils.AnchorAlignment.MIDDLE;
            var pepe = -32 + 2 + 4 + 1.5 + 1 - 10 + 4;
            //Level.speedrun=true;
            //LevelSaveManager.hasSpeedrunRecord=false;
            //hasLinks=false;
            if (Game.Level.speedrun) {
                fra[2].applyToSprite(tha.bounds);
                tha.control.enabled = false;
                var tex = new Game.TextButton();
                tex.control.listener = _this;
                tex.text.font = Game.FontManager.a;
                tex.text.scale = 1;
                tex.text.enabled = true;
                tex.text.pinned = true;
                tex.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
                tex.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
                tex.text.yAlignBounds = Utils.AnchorAlignment.START;
                tex.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
                tex.text.xAligned = 0.5;
                tex.text.yAligned = -20.5 + 10 + 4 + pepe + 8 - (Game.plu ? 0 : 2);
                tex.control.enabled = false;
                tex.text.str = Game.LevelSaveManager.hasSpeedrunRecord ? "NEW RECORD! " + Game.SpeedrunTimer.getTextValue(Game.recordSpeedrun) : "YOUR TIME! " + Game.SpeedrunTimer.getTextValue(Game.Level.countStepsSpeedrun);
            }
            /*
            else if(hasLinks){
                fra[0].applyToSprite(tha.bounds);
                tha.anchor.yAligned=-8;
                tha.arrows.xOffset=-9;
                tha.arrows.xOffset2=1;
                tha.arrows.yOffset=7+6;
                tha.control.url=URL_NOADEV;
                tha.control.onSelectionStayDelegate=()=>{
                    Engine.Renderer.useHandPointer=hasLinks;
                }
            }
            */
            else {
                fra[0].applyToSprite(tha.bounds);
                tha.control.enabled = false;
            }
            tha.anchor.xAligned = 0;
            tha.anchor.yAligned = pepe;
            var exi = new Game.Button();
            exi.bounds.enabled = exi.bounds.pinned = true;
            fraexi[Game.IS_TOUCH ? 1 : 0].applyToSprite(exi.bounds);
            exi.anchor.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            exi.anchor.xAlignView = Utils.AnchorAlignment.MIDDLE;
            exi.anchor.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            exi.anchor.yAlignView = Utils.AnchorAlignment.MIDDLE;
            exi.anchor.xAligned = 0;
            exi.anchor.yAligned = pepe + 12 + 12 - 6 + 1 - 0.5 + 2 - 1 - 0.5 + 1;
            exi.arrows.xOffset = Game.IS_TOUCH ? -9 : -9;
            if (Game.plu) {
                exi.arrows.xOffset2 = 1;
                exi.arrows.yOffset = 4 + (Game.IS_TOUCH ? 3 : 3);
            }
            else {
                exi.arrows.xOffset2 = 0;
                exi.arrows.yOffset = Game.IS_TOUCH ? 4 : 3;
            }
            //exi.control.enabled=false;
            _this.con = exi.control;
            _this.loadMap(Game.Resources.PATH_MAP_LAST);
            //var x = Scene.xSizeLevel * 0.5;
            //var y = Scene.ySizeLevel * 0.5;
            //Engine.Renderer.camera(x, y);
            //SceneColors.enabledDown = true;
            Game.triggerActions("endscreen");
            Game.triggerActions("happytime");
            Game.LevelShake.init();
            Game.LevelShake2.init();
            //new TerrainFill(2);
            new Game.LastButtonFrames();
            if (!Game.IS_TOUCH)
                Game.ExitButton.instance.control.bounds = Game.LastButtonFrames.instance.spr;
            new Game.LevelAdLoader();
            return _this;
        }
        LastScene.prototype.onReset = function () {
            _super.prototype.onReset.call(this);
        };
        LastScene.prototype.onStepUpdate = function () {
            _super.prototype.onStepUpdate.call(this);
            if (Game.Scene.nextSceneClass == null && (Game.ExitButton.instance.control.pressed || this.con.pressed)) {
                if (Game.Resources.audgey.played) {
                    Game.Resources.audgey.extraGain.gain.value = 0;
                }
                Game.triggerActions("exitlastlevel");
                this.nextSceneClass = Game.Level.speedrun ? Game.SpeedrunMenu.cla : Game.maimen.cla;
                this.stepsWait = Game.STEPS_CHANGE_SCENE;
            }
        };
        LastScene.prototype.onDrawSceneSky = function () {
        };
        LastScene.prototype.onStartWaiting = function () {
            _super.prototype.onStartWaiting.call(this);
            if (Game.Resources.audgey.played) {
                Game.Resources.audgey.extraGain.gain.value = 0;
            }
            if (Game.Scene.nextSceneClass == Game.maimen.cla || Game.Scene.nextSceneClass == Game.LevelSelection.cla || Game.Scene.nextSceneClass == Game.SpeedrunMenu.cla) {
                //Resources.stopBGM();
            }
        };
        LastScene.prototype.onTimeUpdateSceneBeforeDrawFixed = function () {
            var x = this.xSizeMap * 0.5;
            var y = this.ySizeMap * 0.5;
            Engine.Renderer.camera(x + Game.LevelShake.position + Game.LevelShake2.position, y);
        };
        LastScene.prototype.onClearScene = function () {
            LastScene.instance = null;
        };
        LastScene.instance = null;
        return LastScene;
    }(Game.SceneMap));
    Game.LastScene = LastScene;
})(Game || (Game = {}));
///<reference path="../System/Scene/SceneMap.ts"/>
var Game;
(function (Game) {
    Game.levpagsiz = 9;
    Game.levpag = 3;
    Game.maxlev = Game.levpagsiz * Game.levpag * 0 + 27;
})(Game || (Game = {}));
(function (Game) {
    var LevelSelection;
    (function (LevelSelection) {
        LevelSelection.preserved = false;
        var horbutcou = 3;
        var verbutcou = 3;
        var versizbut = 14;
        var horsepbut = 42 + 2 - 5;
        var versepbut = 6 - 2;
        var horsepnavbut = 49 + 1 - 11;
        LevelSelection.norpag = 0;
        LevelSelection.spepag = 0;
        LevelSelection.prapag = 0;
        var but = new Array();
        var horbut = -0.5 * (horsepbut) * (horbutcou - 1);
        var verbut = -34 + 5 - 10 + 10 + 5 + 2;
        var vernavbut = 5 - 5 - 2 - 2 + 7 - 2;
        Game.addAction("configure", function () {
            if (Game.plu) {
                horsepbut += 5;
                versepbut += 2;
                vernavbut -= 3;
                horsepnavbut += 11;
                horbut -= 5;
            }
        });
        var bacbut;
        var rigbut;
        var lefbut;
        var cla = /** @class */ (function (_super) {
            __extends(cla, _super);
            function cla() {
                var _this = _super.call(this) || this;
                Engine.System.addListenersFrom(Game.LevelSelection);
                LevelSelection.ins = _this;
                Game.Level.speedrunRestCount = 0;
                fixpag();
                if (Game.plu)
                    new Game.AudioFrame();
                new Game.MusicButton();
                new Game.SoundButton();
                maktex();
                makbut();
                fixbut();
                makbacbut();
                maklefbut();
                makrigbut();
                LevelSelection.ins.loadMap(Game.Resources.PATH_MAP_LEVEL_SELECTION);
                Engine.Renderer.camera(Game.SceneMap.instance.xSizeMap * 0.5, Game.SceneMap.instance.ySizeMap * 0.5);
                Game.SceneColors.instance.usingFill = true;
                Game.triggerActions("levelselectionmenu");
                Game.triggerActions("levelselection");
                return _this;
            }
            return cla;
        }(Game.SceneMap));
        LevelSelection.cla = cla;
        function onClearScene() {
            LevelSelection.ins = null;
        }
        LevelSelection.onClearScene = onClearScene;
        function fixpag() {
            if (!Game.Level.practice) {
                var lasunl = 0;
                for (var i = 1; i <= Game.maxlev; i += 1) {
                    if (Game.dataLevels[i] != '2') {
                        lasunl = i;
                        break;
                    }
                }
                if (lasunl != 0) {
                    var maxpagind = Math.ceil(lasunl / Game.levpagsiz) - 1;
                    setPage(maxpagind);
                }
            }
        }
        function maktex() {
            var tex = new Utils.Text();
            tex.font = Game.FontManager.a;
            tex.scale = 1;
            tex.enabled = true;
            tex.pinned = true;
            tex.str = Game.Level.practice ? "PRACTICE STAGE" : "SELECT STAGE";
            tex.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            tex.xAlignView = Utils.AnchorAlignment.MIDDLE;
            tex.yAlignBounds = Utils.AnchorAlignment.START;
            tex.yAlignView = Utils.AnchorAlignment.MIDDLE;
            tex.xAligned = 0;
            tex.yAligned = -40 - 1 - 1 + 2 - 4 - 2 + (Game.plu ? 2 : 0);
        }
        function makbut() {
            var cou = 0;
            for (var horind = 0; horind < verbutcou; horind += 1) {
                for (var verind = 0; verind < horbutcou; verind += 1) {
                    var hor = horbut + (horsepbut) * verind;
                    var ver = verbut + (versizbut + versepbut) * horind;
                    but[cou] = new Game.DialogButton(1, hor, ver);
                    but[cou].owner = LevelSelection;
                    but[cou].control.listener = but[cou];
                    //buttons[count].control.audioPressed=Resources.sfxMouseLevel;
                    but[cou].text.font = Game.FontManager.a;
                    but[cou].text.scale = 1;
                    but[cou].text.enabled = true;
                    but[cou].text.pinned = true;
                    but[cou].text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
                    but[cou].text.xAlignView = Utils.AnchorAlignment.MIDDLE;
                    but[cou].text.yAlignBounds = Utils.AnchorAlignment.START;
                    but[cou].text.yAlignView = Utils.AnchorAlignment.MIDDLE;
                    but[cou].text.xAligned = but[cou].dialog.spr.x;
                    but[cou].text.yAligned = but[cou].dialog.spr.y - (Game.plu ? 0 : 0.5);
                    but[cou].text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
                    //buttons[count].arrows.yOffset-=0.5;
                    but[cou].control.onPressedDelegate = function () {
                        if (LevelSelection.ins.nextSceneClass == null) {
                            var levind = (+this.text.str);
                            Game.Level.speedrun = false;
                            Game.Level.nextIndex = levind;
                            LevelSelection.ins.stepsWait = Game.STEPS_CHANGE_SCENE;
                            LevelSelection.ins.nextSceneClass = Game.Level;
                            for (var _i = 0, but_1 = but; _i < but_1.length; _i++) {
                                var ele = but_1[_i];
                                if (ele.text.str != levind + "") {
                                    ele.control.enabled = false;
                                }
                            }
                            bacbut.control.enabled = false;
                            rigbut.control.enabled = false;
                            lefbut.control.enabled = false;
                            Game.savedat();
                            Game.triggerActions("playlevelbutton");
                            Game.triggerActions("play");
                        }
                    };
                    cou += 1;
                }
            }
        }
        function fixbut() {
            var cou = 1 + getPage() * Game.levpagsiz;
            for (var _i = 0, but_2 = but; _i < but_2.length; _i++) {
                var ele = but_2[_i];
                if (cou <= Game.maxlev) {
                    ele.enabled = true;
                    ele.text.str = cou + "";
                    switch (Game.dataLevels[cou]) {
                        case "0":
                            //button.enabled=false;
                            //button.dialog.enabled=false;
                            ele.control.enabled = false;
                            ele.dialog.setIndex(3);
                            ele.dialog.spr.setRGBA(1, 1, 1, 0);
                            ele.text.font = Game.plu ? Game.FontManager.a : Game.FontManager.c;
                            ele.text.setRGBA(1, 1, 1, 0.5);
                            break;
                        case "1":
                            ele.enabled = true;
                            ele.control.enabled = true;
                            ele.dialog.setIndex(Game.plu ? 3 : 2);
                            ele.dialog.spr.setRGBA(1, 1, 1, 1);
                            ele.text.font = Game.plu ? Game.FontManager.a : Game.FontManager.b;
                            ele.arrows.font = Game.plu ? Game.FontManager.a : Game.FontManager.b;
                            ele.text.setRGBA(1, 1, 1, 1);
                            break;
                        case "2":
                            ele.enabled = true;
                            ele.control.enabled = true;
                            ele.dialog.setIndex(Game.plu ? 2 : 1);
                            ele.dialog.spr.setRGBA(1, 1, 1, 1);
                            ele.text.font = Game.FontManager.a;
                            ele.arrows.font = Game.FontManager.a;
                            ele.text.setRGBA(1, 1, 1, 1);
                            break;
                    }
                    cou += 1;
                }
                else {
                    ele.enabled = false;
                }
            }
        }
        function makbacbut() {
            bacbut = new Game.DialogButton(Game.plu ? 4 : 6, 0, 4 + verbut + (versizbut + versepbut) * (verbutcou + 0) + 2 + vernavbut);
            bacbut.control.listener = LevelSelection;
            bacbut.text.font = Game.FontManager.a;
            bacbut.text.scale = 1;
            bacbut.text.enabled = true;
            bacbut.text.pinned = true;
            bacbut.text.str = "BACK";
            bacbut.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            bacbut.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            bacbut.text.yAlignBounds = Utils.AnchorAlignment.START;
            bacbut.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            bacbut.text.xAligned = bacbut.dialog.spr.x;
            bacbut.text.yAligned = bacbut.dialog.spr.y - (Game.plu ? 0 : 0.5);
            bacbut.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            //backButton.arrows.yOffset-=0.5;
            bacbut.control.useKeyboard = true;
            bacbut.control.keys = [Engine.Keyboard.ESC, "esc", "Esc", "ESC"];
            bacbut.control.onPressedDelegate = function () {
                if (LevelSelection.ins.nextSceneClass == null) {
                    LevelSelection.ins.stepsWait = 0;
                    LevelSelection.ins.nextSceneClass = Game.Level.practice ? Game.SpeedrunMenu.cla : Game.maimen.cla;
                    for (var _i = 0, but_3 = but; _i < but_3.length; _i++) {
                        var button = but_3[_i];
                        button.control.enabled = false;
                    }
                    rigbut.control.enabled = false;
                    lefbut.control.enabled = false;
                    exisav();
                }
            };
        }
        function exisav() {
            var lasunl = 0;
            for (var i = 1; i <= Game.maxlev; i += 1) {
                if (Game.dataLevels[i] != '2') {
                    lasunl = i;
                    break;
                }
            }
            if (lasunl != 0) {
                var maxpagind = Math.ceil(lasunl / Game.levpagsiz) - 1;
                if (getPage() > maxpagind)
                    setPage(maxpagind);
            }
            Game.Level.practice = false;
            Game.savedat();
        }
        function makrigbut() {
            rigbut = new Game.DialogButton(Game.plu ? 5 : 1, horsepnavbut, 4 + verbut + (versizbut + versepbut) * verbutcou + 2 + vernavbut);
            rigbut.control.listener = LevelSelection;
            rigbut.text.font = Game.FontManager.a;
            rigbut.text.scale = 1;
            rigbut.text.enabled = true;
            rigbut.text.pinned = true;
            rigbut.text.str = ">";
            rigbut.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            rigbut.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            rigbut.text.yAlignBounds = Utils.AnchorAlignment.START;
            rigbut.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            rigbut.text.xAligned = rigbut.dialog.spr.x;
            rigbut.text.yAligned = rigbut.dialog.spr.y - (Game.plu ? 0 : 0.5);
            rigbut.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            rigbut.arrows.yOffset -= 0.5;
            rigbut.arrows.enabled = false;
            rigbut.control.onSelectionStartDelegate = function () { rigbut.text.str = ">>>"; };
            rigbut.control.onSelectionEndDelegate = function () { rigbut.text.str = ">"; };
            rigbut.control.onPressedDelegate = function () {
                nexpag();
                fixbut();
                rigbut.text.str = ">>>";
            };
        }
        function maklefbut() {
            lefbut = new Game.DialogButton(Game.plu ? 5 : 1, -horsepnavbut, 4 + verbut + (versizbut + versepbut) * verbutcou + 2 + vernavbut);
            lefbut.control.listener = LevelSelection;
            lefbut.text.font = Game.FontManager.a;
            lefbut.text.scale = 1;
            lefbut.text.enabled = true;
            lefbut.text.pinned = true;
            lefbut.text.str = "<";
            lefbut.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            lefbut.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            lefbut.text.yAlignBounds = Utils.AnchorAlignment.START;
            lefbut.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            lefbut.text.xAligned = lefbut.dialog.spr.x;
            lefbut.text.yAligned = lefbut.dialog.spr.y - (Game.plu ? 0 : 0.5);
            lefbut.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            lefbut.arrows.yOffset -= 0.5;
            lefbut.arrows.enabled = false;
            lefbut.control.onSelectionStartDelegate = function () { lefbut.text.str = "<<<"; };
            lefbut.control.onSelectionEndDelegate = function () { lefbut.text.str = "<"; };
            lefbut.control.onPressedDelegate = function () {
                bacpag();
                fixbut();
                lefbut.text.str = "<<<";
            };
        }
        function setPage(i) {
            if (Game.Level.speedrun)
                LevelSelection.spepag = i;
            else if (Game.Level.practice)
                LevelSelection.prapag = i;
            else
                LevelSelection.norpag = i;
        }
        LevelSelection.setPage = setPage;
        function getPage() {
            if (Game.Level.speedrun)
                return LevelSelection.spepag;
            else if (Game.Level.practice)
                return LevelSelection.prapag;
            else
                return LevelSelection.norpag;
        }
        LevelSelection.getPage = getPage;
        function nexpag() {
            setPage(getPage() + 1);
            if (getPage() >= Game.levpag)
                setPage(0);
        }
        LevelSelection.nexpag = nexpag;
        function bacpag() {
            setPage(getPage() - 1);
            if (getPage() < 0)
                setPage(Game.levpag - 1);
        }
        LevelSelection.bacpag = bacpag;
        function unllev() {
            for (var indexLevel = 1; indexLevel <= Game.maxlev; indexLevel += 1)
                if (Game.dataLevels[indexLevel] == "0")
                    Game.dataLevels[indexLevel] = "1";
            Game.savedat();
            if (LevelSelection.ins != null)
                fixbut();
        }
        LevelSelection.unllev = unllev;
        function clelev() {
            for (var indexLevel = 1; indexLevel <= Game.maxlev; indexLevel += 1)
                Game.dataLevels[indexLevel] = "2";
            Game.savedat();
            if (LevelSelection.ins != null)
                fixbut();
        }
        LevelSelection.clelev = clelev;
    })(LevelSelection = Game.LevelSelection || (Game.LevelSelection = {}));
})(Game || (Game = {}));
function unlockAllLevels() {
    Game.LevelSelection.unllev();
}
///<reference path="../System/Scene/SceneMap.ts"/>
var Game;
(function (Game) {
    var maimen;
    (function (maimen) {
        maimen.preserved = false;
        maimen.morgamind = 0;
        var ins;
        var bgmpla = false;
        var stabut;
        var spebut;
        var crebut;
        var morbut;
        var statou;
        var spetou;
        var cretou;
        var mortou;
        var cla = /** @class */ (function (_super) {
            __extends(cla, _super);
            function cla() {
                var _this = _super.call(this) || this;
                ins = _this;
                mak();
                return _this;
            }
            cla.prototype.onStartWaiting = function () {
                _super.prototype.onStartWaiting.call(this);
                if (Game.Scene.nextSceneClass == Game.Level) {
                    //Resources.stopBGM();
                }
                if (Game.LevelAds.tryTriggerSpeedrunAd()) {
                    ins.stepsWait = Game.STEPS_CHANGE_SCENE_AD;
                }
            };
            return cla;
        }(Game.SceneMap));
        maimen.cla = cla;
        function mak() {
            Engine.System.addListenersFrom(Game.maimen);
            if (!bgmpla) {
                Game.Resources.playBGM();
                bgmpla = true;
            }
            if (Game.plu && (!Game.IS_TOUCH || Game.HAS_LINKS))
                new Game.AudioFrame(1);
            new Game.MusicButton();
            new Game.SoundButton();
            makbut();
            var x = ins.xSizeMap * 0.5;
            var y = ins.ySizeMap * 0.5;
            Engine.Renderer.camera(x, y);
            Game.titlab.mak(-37 - (Game.plu && !Game.HAS_LINKS ? 6 : 0) + (Game.plu && !Game.HAS_LINKS && !Game.IS_TOUCH ? 4 : 0));
            new Game.ByDevFrame();
            Game.triggerActions("mainmenu");
            new Game.TerrainFill(1);
            Game.SceneColors.instance.usingFill = true;
        }
        var lincheone = false;
        var linchetwo = 0;
        function onTimeUpdate() {
            Engine.Renderer.camera(Game.SceneMap.instance.xSizeMap * 0.5, Game.SceneMap.instance.ySizeMap * 0.5);
            if (lincheone && linchetwo < 0.25) {
                linchetwo += Engine.System.deltaTime;
                if (linchetwo >= 0.25) {
                    //noadev.control.url=HAS_LINKS ? URL_NOADEV:null;
                    if (Game.HAS_LINKS)
                        morbut.control.url = Game.URL_MORE_GAMES;
                }
            }
            if (!lincheone && !Engine.Mouse.down(0) && !Engine.TouchInput.down(0, 0, Engine.Renderer.xSizeWindow, Engine.Renderer.ySizeWindow, false)) {
                lincheone = true;
            }
        }
        maimen.onTimeUpdate = onTimeUpdate;
        function makbut() {
            stabut = new Game.TextButton();
            stabut.control.listener = maimen;
            stabut.text.font = Game.FontManager.a;
            stabut.text.scale = 1;
            stabut.text.enabled = true;
            stabut.text.pinned = true;
            stabut.text.str = "START";
            stabut.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            stabut.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            stabut.text.yAlignBounds = Utils.AnchorAlignment.START;
            stabut.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            stabut.control.onPressedDelegate = function () {
                if (ins.nextSceneClass == null) {
                    spebut.control.enabled = false;
                    crebut.control.enabled = false;
                    if (Game.HAS_LINKS)
                        morbut.control.enabled = false;
                    ins.stepsWait = 0;
                    ins.nextSceneClass = Game.LevelSelection.cla;
                    Game.SceneFade.fixMe();
                    Game.triggerActions("playbutton");
                }
            };
            spebut = new Game.TextButton();
            spebut.control.listener = maimen;
            spebut.text.font = Game.FontManager.a;
            spebut.text.scale = 1;
            spebut.text.enabled = true;
            spebut.text.pinned = true;
            spebut.text.str = "SPEEDRUN";
            spebut.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            spebut.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            spebut.text.yAlignBounds = Utils.AnchorAlignment.START;
            spebut.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            spebut.control.onPressedDelegate = function () {
                if (ins.nextSceneClass == null) {
                    stabut.control.enabled = false;
                    spebut.control.enabled = false;
                    if (Game.HAS_LINKS)
                        morbut.control.enabled = false;
                    ins.stepsWait = 0;
                    ins.nextSceneClass = Game.SpeedrunMenu.cla;
                    Game.SceneFade.fixMe();
                    Game.triggerActions("playbutton");
                }
            };
            crebut = new Game.TextButton();
            crebut.control.listener = maimen;
            crebut.text.font = Game.FontManager.a;
            crebut.text.scale = 1;
            crebut.text.enabled = true;
            crebut.text.pinned = true;
            crebut.text.str = "CREDITS";
            crebut.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            crebut.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            crebut.text.yAlignBounds = Utils.AnchorAlignment.START;
            crebut.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            crebut.control.onPressedDelegate = function () {
                if (ins.nextSceneClass == null) {
                    stabut.control.enabled = false;
                    spebut.control.enabled = false;
                    if (Game.HAS_LINKS)
                        morbut.control.enabled = false;
                    ins.stepsWait = 0;
                    ins.nextSceneClass = Game.Credits.cla;
                    Game.SceneFade.fixMe();
                }
            };
            if (Game.HAS_LINKS) {
                morbut = new Game.TextButton();
                morbut.control.listener = maimen;
                morbut.control.url = null;
                morbut.control.onSelectionStayDelegate = function () { return Engine.Renderer.useHandPointer = true; };
                morbut.text.font = Game.FontManager.a;
                morbut.text.scale = 1;
                morbut.text.enabled = true;
                morbut.text.pinned = true;
                morbut.text.str = maimen.morgamind == 0 ? "+GAMES" : "DEV SITE";
                morbut.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
                morbut.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
                morbut.text.yAlignBounds = Utils.AnchorAlignment.START;
                morbut.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            }
            if (Game.IS_TOUCH) {
                var ypos = -12 + 6 + 4 + 8 - 8 - 1 + 3 + 0.5 + 3 + 1 - 1 - 15 + 1 - 1 + (Game.plu ? 17 : 0);
                var yoff = 20 + 1 + 1 - (Game.plu ? 2 : 0);
                var xpos = 0;
                var xoff = 29 + 1 + 1;
                var texoffplu = Game.plu ? 0.5 : 0;
                if (Game.HAS_LINKS) {
                    statou = new Game.ButtonFrame(0, xpos - xoff, ypos);
                    spetou = new Game.ButtonFrame(0, xpos + xoff, ypos);
                    cretou = new Game.ButtonFrame(0, xpos - xoff, ypos + yoff);
                    mortou = new Game.ButtonFrame(0, xpos + xoff, ypos + yoff);
                }
                else {
                    ypos = Game.plu ? -4.5 : -15.5;
                    yoff = Game.plu ? 18 : 19;
                    texoffplu += Game.plu ? 0.5 : 0;
                    statou = new Game.ButtonFrame(Game.plu ? 1 : 0, 0, ypos);
                    spetou = new Game.ButtonFrame(Game.plu ? 1 : 0, 0, ypos + yoff);
                    cretou = new Game.ButtonFrame(Game.plu ? 1 : 0, 0, ypos + yoff + yoff);
                }
                stabut.text.xAligned = statou.spr.x;
                stabut.text.yAligned = statou.spr.y + 0.5 - 1 + texoffplu;
                stabut.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
                stabut.control.bounds = statou.spr;
                //start.arrows.yOffset -= 0.5;
                spebut.text.xAligned = spetou.spr.x;
                spebut.text.yAligned = spetou.spr.y + 0.5 - 1 + texoffplu;
                spebut.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
                spebut.control.bounds = spetou.spr;
                //speedrun.arrows.yOffset -= 0.5;
                crebut.text.xAligned = cretou.spr.x;
                crebut.text.yAligned = cretou.spr.y + 0.5 - 1 + texoffplu;
                crebut.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
                crebut.control.bounds = cretou.spr;
                //credits.arrows.yOffset -= 0.5;
                if (Game.HAS_LINKS) {
                    morbut.text.xAligned = mortou.spr.x;
                    morbut.text.yAligned = mortou.spr.y + 0.5 - 1 - 1 + texoffplu;
                    morbut.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
                    morbut.control.bounds = mortou.spr;
                    //moregames.arrows.yOffset -= 0.5;
                    Game.devlinund.mak(morbut.text.xAligned, morbut.text.yAligned + 4);
                    ins.loadMap(Game.plu ? Game.Resources.PATH_MAP_MAIN_MENU_PLUS : Game.Resources.PATH_MAP_MAIN_MENU);
                }
                else
                    ins.loadMap(Game.plu ? Game.Resources.PATH_MAP_MAIN_MENU_PLUS_MNL : Game.Resources.PATH_MAP_MAIN_MENU_TOUCH);
            }
            else {
                new Game.MenuDesktopFrame();
                var off = Game.plu ? 0 + 2 - 1 : -16;
                if (Game.HAS_LINKS) {
                    stabut.text.yAligned = off;
                    spebut.text.yAligned = off + 7;
                    crebut.text.yAligned = off + 14;
                    morbut.text.yAligned = off + 21;
                    Game.devlinund.mak(morbut.text.xAligned, morbut.text.yAligned + 7);
                    ins.loadMap(Game.plu ? Game.Resources.PATH_MAP_MAIN_MENU_PLUS : Game.Resources.PATH_MAP_MAIN_MENU);
                }
                else {
                    off -= Game.plu ? 5 : 0;
                    off -= Game.plu && !Game.HAS_LINKS ? 3 : 0;
                    stabut.text.yAligned = off + 6;
                    spebut.text.yAligned = off + 6 + 7;
                    crebut.text.yAligned = off + 6 + 14;
                    ins.loadMap(Game.plu ? Game.Resources.PATH_MAP_MAIN_MENU_PLUS_DNL : Game.Resources.PATH_MAP_MAIN_MENU);
                }
            }
        }
    })(maimen = Game.maimen || (Game.maimen = {}));
})(Game || (Game = {}));
///<reference path="../System/Scene/SceneMap.ts"/>
var Game;
(function (Game) {
    var SpeedrunMenu;
    (function (SpeedrunMenu) {
        var horbut = 53.5;
        var verbut = 46.5;
        var verconbut = 26;
        Game.addAction("configure", function () {
            if (Game.plu) {
                horbut -= 2;
                verbut += 2;
                verconbut += 3;
            }
        });
        var offtex = 7;
        var offtexsep = 10;
        var newbut;
        var resbut;
        var bacbut;
        var prabut;
        var cla = /** @class */ (function (_super) {
            __extends(cla, _super);
            function cla() {
                var _this = _super.call(this) || this;
                SpeedrunMenu.ins = _this;
                Game.Level.speedrun = false;
                Game.Level.speedrunRestCount = 0;
                if (Game.plu)
                    new Game.AudioFrame();
                new Game.MusicButton();
                new Game.SoundButton();
                new Game.SpeedrunFrame();
                maktex();
                makresbut();
                maknewbut();
                makprabut();
                makbacbut();
                SpeedrunMenu.ins.loadMap(Game.Resources.PATH_MAP_SPEEDRUN_MENU);
                Engine.Renderer.camera(Game.SceneMap.instance.xSizeMap * 0.5, Game.SceneMap.instance.ySizeMap * 0.5);
                Game.SceneColors.enabledDown = true;
                Game.SceneColors.instance.usingFill = true;
                Game.triggerActions("speedrummenu");
                Game.triggerActions("levelselection");
                return _this;
            }
            return cla;
        }(Game.SceneMap));
        SpeedrunMenu.cla = cla;
        function maktex() {
            var reclab = new Utils.Text();
            reclab.font = Game.FontManager.a;
            reclab.scale = 1;
            reclab.enabled = true;
            reclab.pinned = true;
            reclab.str = "BEST TIME:";
            reclab.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            reclab.xAlignView = Utils.AnchorAlignment.MIDDLE;
            reclab.yAlignBounds = Utils.AnchorAlignment.START;
            reclab.yAlignView = Utils.AnchorAlignment.MIDDLE;
            reclab.xAligned = 0;
            reclab.yAligned = Game.SpeedrunFrame.spr.y + 5 - (Game.plu ? 0 : 2);
            var recval = new Utils.Text();
            recval.font = Game.FontManager.a;
            recval.scale = 1;
            recval.enabled = true;
            recval.pinned = true;
            recval.str = Game.SpeedrunTimer.getTextValue(Game.recordSpeedrun);
            recval.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            recval.xAlignView = Utils.AnchorAlignment.MIDDLE;
            recval.yAlignBounds = Utils.AnchorAlignment.START;
            recval.yAlignView = Utils.AnchorAlignment.MIDDLE;
            recval.xAligned = 0;
            recval.yAligned = reclab.y + offtex;
            var timlab = new Utils.Text();
            timlab.font = Game.FontManager.a;
            timlab.scale = 1;
            timlab.enabled = true;
            timlab.pinned = true;
            timlab.str = "CURRENT TIME:";
            timlab.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            timlab.xAlignView = Utils.AnchorAlignment.MIDDLE;
            timlab.yAlignBounds = Utils.AnchorAlignment.START;
            timlab.yAlignView = Utils.AnchorAlignment.MIDDLE;
            timlab.xAligned = 0;
            timlab.yAligned = recval.y + offtexsep;
            var timval = new Utils.Text();
            timval.font = Game.FontManager.a;
            timval.scale = 1;
            timval.enabled = true;
            timval.pinned = true;
            timval.str = Game.dataSpeedrun == 0 ? "0.000" : Game.SpeedrunTimer.getTextValue(Game.dataSpeedrun);
            timval.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            timval.xAlignView = Utils.AnchorAlignment.MIDDLE;
            timval.yAlignBounds = Utils.AnchorAlignment.START;
            timval.yAlignView = Utils.AnchorAlignment.MIDDLE;
            timval.xAligned = 0;
            timval.yAligned = timlab.y + offtex;
            var levlab = new Utils.Text();
            levlab.font = Game.FontManager.a;
            levlab.scale = 1;
            levlab.enabled = true;
            levlab.pinned = true;
            levlab.str = "NEXT LEVEL:";
            levlab.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            levlab.xAlignView = Utils.AnchorAlignment.MIDDLE;
            levlab.yAlignBounds = Utils.AnchorAlignment.START;
            levlab.yAlignView = Utils.AnchorAlignment.MIDDLE;
            levlab.xAligned = 0;
            levlab.yAligned = timval.y + offtexsep;
            var levval = new Utils.Text();
            levval.font = Game.FontManager.a;
            levval.scale = 1;
            levval.enabled = true;
            levval.pinned = true;
            levval.str = Game.levelSpeedrun + "";
            levval.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            levval.xAlignView = Utils.AnchorAlignment.MIDDLE;
            levval.yAlignBounds = Utils.AnchorAlignment.START;
            levval.yAlignView = Utils.AnchorAlignment.MIDDLE;
            levval.xAligned = 0;
            levval.yAligned = levlab.y + offtex;
        }
        function makresbut() {
            resbut = new Game.DialogButton(Game.plu ? 6 : 9, 0, verconbut);
            resbut.control.enabled = Game.dataSpeedrun > 0;
            resbut.control.listener = SpeedrunMenu;
            //continueButton.control.audioPressed=Resources.sfxMouseLevel;
            resbut.text.font = Game.dataSpeedrun > 0 ? Game.FontManager.a : Game.FontManager.a;
            resbut.arrows.font = Game.dataSpeedrun > 0 ? Game.FontManager.a : Game.FontManager.a;
            resbut.text.scale = 1;
            resbut.text.enabled = true;
            resbut.text.pinned = true;
            resbut.text.str = "RESUME";
            resbut.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            resbut.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            resbut.text.yAlignBounds = Utils.AnchorAlignment.START;
            resbut.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            resbut.text.xAligned = resbut.dialog.spr.x;
            resbut.text.yAligned = resbut.dialog.spr.y - (Game.plu ? 0 : 0.5);
            resbut.control.onPressedDelegate = function () {
                if (Game.Scene.nextSceneClass == null) {
                    staspe(false);
                    newbut.control.enabled = false;
                    bacbut.control.enabled = false;
                    prabut.control.enabled = false;
                }
            };
            resbut.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            //continueButton.arrows.yOffset-=0.5;
            if (Game.dataSpeedrun == 0) {
                resbut.dialog.spr.setRGBA(1, 1, 1, 0.4);
                resbut.text.setRGBA(1, 1, 1, 0.5);
            }
        }
        function maknewbut() {
            newbut = new Game.DialogButton(Game.plu ? 6 : 8, -horbut, verbut);
            newbut.control.listener = SpeedrunMenu;
            //newButton.control.audioPressed=Resources.sfxMouseLevel;
            newbut.text.font = Game.FontManager.a;
            newbut.text.scale = 1;
            newbut.text.enabled = true;
            newbut.text.pinned = true;
            newbut.text.str = Game.plu ? "NEW RUN" : "START";
            newbut.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            newbut.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            newbut.text.yAlignBounds = Utils.AnchorAlignment.START;
            newbut.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            newbut.text.xAligned = newbut.dialog.spr.x;
            newbut.text.yAligned = newbut.dialog.spr.y - (Game.plu ? 0 : 0.5);
            newbut.control.onPressedDelegate = function () {
                if (Game.Scene.nextSceneClass == null) {
                    staspe(true);
                    resbut.control.enabled = false;
                    bacbut.control.enabled = false;
                    prabut.control.enabled = false;
                }
            };
            newbut.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            //newButton.arrows.yOffset-=0.5;
        }
        function makprabut() {
            prabut = new Game.DialogButton(Game.plu ? 6 : 7, 0, verbut);
            prabut.control.enabled = true;
            prabut.control.listener = SpeedrunMenu;
            //practiceButton.control.audioPressed=Resources.sfxMouseLevel;
            prabut.text.font = Game.FontManager.a;
            prabut.text.scale = 1;
            prabut.text.enabled = true;
            prabut.text.pinned = true;
            prabut.text.str = "PRACTICE";
            prabut.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            prabut.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            prabut.text.yAlignBounds = Utils.AnchorAlignment.START;
            prabut.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            prabut.text.xAligned = prabut.dialog.spr.x;
            prabut.text.yAligned = prabut.dialog.spr.y - (Game.plu ? 0 : 0.5);
            prabut.control.onPressedDelegate = function () {
                if (Game.Scene.nextSceneClass == null) {
                    SpeedrunMenu.ins.stepsWait = 0;
                    Game.Level.practice = true;
                    SpeedrunMenu.ins.nextSceneClass = Game.LevelSelection.cla;
                    newbut.control.enabled = false;
                    resbut.control.enabled = false;
                    bacbut.control.enabled = false;
                }
            };
            prabut.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            //practiceButton.arrows.yOffset-=0.5;
        }
        function makbacbut() {
            bacbut = new Game.DialogButton(Game.plu ? 6 : 8, horbut, verbut);
            bacbut.control.listener = SpeedrunMenu;
            bacbut.text.font = Game.FontManager.a;
            bacbut.text.scale = 1;
            bacbut.text.enabled = true;
            bacbut.text.pinned = true;
            bacbut.text.str = "BACK";
            bacbut.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            bacbut.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            bacbut.text.yAlignBounds = Utils.AnchorAlignment.START;
            bacbut.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            bacbut.text.xAligned = bacbut.dialog.spr.x;
            bacbut.text.yAligned = bacbut.dialog.spr.y - (Game.plu ? 0 : 0.5);
            bacbut.control.useKeyboard = true;
            bacbut.control.keys = [Engine.Keyboard.ESC, "esc", "Esc", "ESC"];
            bacbut.control.onPressedDelegate = function () {
                if (Game.Scene.nextSceneClass == null) {
                    SpeedrunMenu.ins.stepsWait = 0;
                    SpeedrunMenu.ins.nextSceneClass = Game.maimen.cla;
                    newbut.control.enabled = false;
                    resbut.control.enabled = false;
                    prabut.control.enabled = false;
                }
            };
            bacbut.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            //backButton.arrows.yOffset-=0.5;
        }
        function staspe(newrun) {
            Game.Level.speedrun = true;
            Game.Level.countStepsSpeedrun = newrun ? 0 : Game.dataSpeedrun;
            Game.LevelSaveManager.hasSpeedrunRecord = false;
            Game.Level.nextIndex = newrun ? 1 : Game.levelSpeedrun;
            SpeedrunMenu.ins.stepsWait = Game.STEPS_CHANGE_SCENE;
            SpeedrunMenu.ins.nextSceneClass = Game.Level;
            Game.SceneFade.fixMe();
            Game.triggerActions("playlevelbutton");
            Game.triggerActions("play");
        }
    })(SpeedrunMenu = Game.SpeedrunMenu || (Game.SpeedrunMenu = {}));
})(Game || (Game = {}));
///<reference path="../System/Scene/SceneMap.ts"/>
var Game;
(function (Game) {
    var Y_COUNT_BUTTONS = 4;
    var Y_SIZE_BUTTON = 14;
    var Y_SPEARATION_BUTTONS = 4;
    var OFFSET_SINGLE = 7;
    var OFFSET_DOUBLE = 10;
    var SpeedrunRestMenu = /** @class */ (function (_super) {
        __extends(SpeedrunRestMenu, _super);
        function SpeedrunRestMenu() {
            var _this = _super.call(this) || this;
            _this.yButtons = -29.5 - 12;
            SpeedrunRestMenu.instance = _this;
            Game.Level.speedrunRestCount = 0;
            //Resources.playBGM(0);
            new Game.MusicButton();
            new Game.SoundButton();
            new Game.ExitButton();
            Game.ExitButton.instance.control.onPressedDelegate = function () {
                SpeedrunRestMenu.instance.nextSceneClass = Game.SpeedrunMenu.cla;
                SpeedrunRestMenu.instance.stepsWait = Game.STEPS_CHANGE_SCENE;
            };
            //new TimerButton();
            //new ClockFrame();
            //if(!IS_TOUCH)TimerButton.instance.control.bounds=ClockFrame.spr;
            new Game.SpeedrunRestFrame();
            if (Game.plu) {
                new Game.LastButtonFrames();
                if (!Game.IS_TOUCH)
                    Game.ExitButton.instance.control.bounds = Game.LastButtonFrames.instance.spr;
            }
            var recordA = new Utils.Text();
            recordA.font = Game.FontManager.a;
            recordA.scale = 1;
            recordA.enabled = true;
            recordA.pinned = true;
            recordA.str = "REST POINT";
            recordA.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            recordA.xAlignView = Utils.AnchorAlignment.MIDDLE;
            recordA.yAlignBounds = Utils.AnchorAlignment.START;
            recordA.yAlignView = Utils.AnchorAlignment.MIDDLE;
            recordA.xAligned = 0;
            recordA.yAligned = Game.SpeedrunRestFrame.spr.y + 5 - (Game.plu ? 0 : 2);
            var recordB = new Utils.Text();
            recordB.font = Game.FontManager.a;
            recordB.scale = 1;
            recordB.enabled = true;
            recordB.pinned = true;
            recordB.str = Math.floor((Game.Level.nextIndex - 1) * 100 / Game.maxlev) + "% DONE!";
            recordB.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            recordB.xAlignView = Utils.AnchorAlignment.MIDDLE;
            recordB.yAlignBounds = Utils.AnchorAlignment.START;
            recordB.yAlignView = Utils.AnchorAlignment.MIDDLE;
            recordB.xAligned = 0;
            recordB.yAligned = recordA.y + OFFSET_SINGLE;
            var timeA = new Utils.Text();
            timeA.font = Game.FontManager.a;
            timeA.scale = 1;
            timeA.enabled = true;
            timeA.pinned = true;
            timeA.str = "CURRENT TIME:";
            timeA.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            timeA.xAlignView = Utils.AnchorAlignment.MIDDLE;
            timeA.yAlignBounds = Utils.AnchorAlignment.START;
            timeA.yAlignView = Utils.AnchorAlignment.MIDDLE;
            timeA.xAligned = 0;
            timeA.yAligned = recordB.y + OFFSET_DOUBLE;
            var timeB = new Utils.Text();
            timeB.font = Game.FontManager.a;
            timeB.scale = 1;
            timeB.enabled = true;
            timeB.pinned = true;
            timeB.str = Game.dataSpeedrun == 0 ? "0.000" : Game.SpeedrunTimer.getTextValue(Game.dataSpeedrun);
            timeB.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            timeB.xAlignView = Utils.AnchorAlignment.MIDDLE;
            timeB.yAlignBounds = Utils.AnchorAlignment.START;
            timeB.yAlignView = Utils.AnchorAlignment.MIDDLE;
            timeB.xAligned = 0;
            timeB.yAligned = timeA.y + OFFSET_SINGLE;
            var levelA = new Utils.Text();
            levelA.font = Game.FontManager.a;
            levelA.scale = 1;
            levelA.enabled = true;
            levelA.pinned = true;
            levelA.str = "NEXT LEVEL:";
            levelA.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            levelA.xAlignView = Utils.AnchorAlignment.MIDDLE;
            levelA.yAlignBounds = Utils.AnchorAlignment.START;
            levelA.yAlignView = Utils.AnchorAlignment.MIDDLE;
            levelA.xAligned = 0;
            levelA.yAligned = timeB.y + OFFSET_DOUBLE;
            var levelB = new Utils.Text();
            levelB.font = Game.FontManager.a;
            levelB.scale = 1;
            levelB.enabled = true;
            levelB.pinned = true;
            levelB.str = Game.levelSpeedrun + "";
            levelB.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            levelB.xAlignView = Utils.AnchorAlignment.MIDDLE;
            levelB.yAlignBounds = Utils.AnchorAlignment.START;
            levelB.yAlignView = Utils.AnchorAlignment.MIDDLE;
            levelB.xAligned = 0;
            levelB.yAligned = levelA.y + OFFSET_SINGLE;
            _this.continueButton = new Game.DialogButton(0, 0, (Game.plu ? 2.5 : 0) + 5 - 5 + _this.yButtons + 16 + 8 - 4 + 2 - 1 + (Y_SIZE_BUTTON + Y_SPEARATION_BUTTONS) * Y_COUNT_BUTTONS + 2 - 7 - 4 - 0 - 3);
            _this.continueButton.control.enabled = true;
            _this.continueButton.control.listener = _this;
            //this.continueButton.control.audioPressed = Resources.sfxMouseLevel;
            _this.continueButton.text.font = Game.FontManager.a;
            _this.continueButton.text.scale = 1;
            _this.continueButton.text.enabled = true;
            _this.continueButton.text.pinned = true;
            _this.continueButton.text.str = "CONTINUE";
            _this.continueButton.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            _this.continueButton.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.continueButton.text.yAlignBounds = Utils.AnchorAlignment.START;
            _this.continueButton.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.continueButton.text.xAligned = _this.continueButton.dialog.spr.x;
            _this.continueButton.text.yAligned = _this.continueButton.dialog.spr.y - (Game.plu ? 0 : 0.5);
            _this.continueButton.control.onPressedDelegate = _this.continuePressed;
            _this.continueButton.control.onReleasedDelegate = _this.continueReleased;
            _this.continueButton.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            //this.continueButton.arrows.yOffset -= 0.5;
            if (Game.dataSpeedrun == 0) {
                _this.continueButton.dialog.spr.setRGBA(1, 1, 1, 0);
                _this.continueButton.text.setRGBA(1, 1, 1, 0.5);
            }
            //this.backButton.arrows.yOffset -= 0.5;
            _this.loadMap(Game.Resources.PATH_MAP_SPEEDRUN_MENU);
            //var x = Scene.xSizeLevel * 0.5;
            //var y = Scene.ySizeLevel * 0.5;
            //Engine.Renderer.camera(x, y);
            Game.SceneColors.enabledDown = true;
            //this.loadSky(Resources.PATH_MAP_SKY);
            //new AudioFrame();
            Game.SceneColors.instance.usingFill = true;
            Game.triggerActions("speedrunrestmenu");
            return _this;
        }
        SpeedrunRestMenu.prototype.onStartWaiting = function () {
            _super.prototype.onStartWaiting.call(this);
            if (Game.Scene.nextSceneClass == Game.Level) {
                //Resources.stopBGM();
            }
        };
        SpeedrunRestMenu.prototype.startSpeedrun = function (isNew) {
            Game.Level.speedrun = true;
            Game.Level.countStepsSpeedrun = isNew ? 0 : Game.dataSpeedrun;
            Game.LevelSaveManager.hasSpeedrunRecord = false;
            Game.Level.nextIndex = isNew ? 1 : Game.levelSpeedrun;
            this.stepsWait = Game.STEPS_CHANGE_SCENE;
            this.nextSceneClass = Game.Level;
            Game.SceneFade.fixMe();
            Game.triggerActions("playlevelbutton");
            Game.triggerActions("play");
        };
        SpeedrunRestMenu.prototype.continuePressed = function () {
            if (Game.Scene.nextSceneClass == null) {
                this.startSpeedrun(false);
            }
        };
        SpeedrunRestMenu.prototype.continueReleased = function () {
            //    this.backButton.control.enabled = false;
        };
        SpeedrunRestMenu.prototype.onTimeUpdate = function () {
            Engine.Renderer.camera(Game.SceneMap.instance.xSizeMap * 0.5, Game.SceneMap.instance.ySizeMap * 0.5);
        };
        return SpeedrunRestMenu;
    }(Game.SceneMap));
    Game.SpeedrunRestMenu = SpeedrunRestMenu;
})(Game || (Game = {}));
///<reference path="../../System/Scene/SceneMap.ts"/>
var Game;
(function (Game) {
    var Level = /** @class */ (function (_super) {
        __extends(Level, _super);
        function Level() {
            var _this = _super.call(this) || this;
            _this.exiting = false;
            _this.bgmIndex = 0;
            _this.fadeSound = false;
            Engine.Renderer.clearColor(Game.Resources.texgam.getRed(100, 20) / 255.0, Game.Resources.texgam.getGreen(100, 20) / 255.0, Game.Resources.texgam.getBlue(100, 20) / 255.0);
            //console.error("DELETE NEXT LINE");
            //Level.speedrun=true;
            Level.practiceFinished = false;
            Level.speedrunRestCount++;
            //SceneColors.instance.resetColors();
            //SceneFade.fixMe();
            Level.instance = _this;
            Level.index = Level.nextIndex;
            Level.nextIndex = Level.index + 1;
            Game.SceneColors.instance.fillDown.setRGBA(0, 0, 0, 1);
            //Engine.Renderer.clearColor(0 , 0, 0);
            new Game.LevelFrame();
            new Game.PauseButton();
            new Game.MusicButton();
            new Game.SoundButton();
            new Game.ResetButton();
            new Game.ExitButton();
            //if(Level.index < 8 || Level.index > 11){
            new Game.LevelText();
            //}
            Game.LevelShake.init();
            Game.LevelShake2.init();
            Game.LevelPauseUI.init();
            Game.LevelAds.init();
            Game.LevelSaveManager.init();
            Game.triggerActions("level");
            Game.LevelUIAlignment.fin();
            new Game.LevelTextFrame();
            Game.LevelUnpausedText.mak();
            new Game.SpeedrunTimer();
            if (Level.practice) {
                new Game.LevelTimerFrame();
                new Game.PracticePausedFrame();
                Game.LevelTimer.mak();
            }
            else if (Level.speedrun) {
                new Game.LevelTimerFrame();
                Game.LevelTimer.mak();
                new Game.LevelSpeedrunTimer();
                //new TimerFrame(horali,verali,skitex,tradia,hassep,horalitex,veralitex,skitexsep,tradiatex);
            }
            _this.loadMap(Game.getlev(Level.index));
            //this.loadMap(getPathLevel(1));
            //this.loadMap(Resources.PATH_LEVEL_TEST);
            switch (Level.index) {
                default:
                    //this.loadSky(Resources.PATH_MAP_NONE);
                    break;
            }
            if (Level.index == 1) {
                //new PushTutorial();
            }
            else if (Level.index == 2) {
                //new JumpTutorial();
            }
            else if (Level.index == 5) {
                //new StuckTutorial();
            }
            //new TerrainFill(Level.index<14?1:2);
            new Game.LevelAdLoader();
            return _this;
        }
        Level.prototype.onReset = function () {
            _super.prototype.onReset.call(this);
            //triggerActions("play");
        };
        Level.prototype.onStart = function () {
            if (Level.practice && Level.practiceFinished) {
                Level.practiceFinished = false;
                //console.log("AEAE");
                if (Game.SceneFreezer.paused)
                    Game.PauseButton.instance.onPressed();
                Game.LevelTimer.fixOnReset();
            }
            Level.practiceFinished = false;
        };
        Level.prototype.onStepUpdate = function () {
            _super.prototype.onStepUpdate.call(this);
            if (this.nextSceneClass == null && Game.Goal.haswon) {
                if (Level.practice) {
                    if (!Level.practiceFinished) {
                        if (!Game.SceneFreezer.paused)
                            Game.PauseButton.instance.onPressed();
                        Level.practiceFinished = true;
                        Game.LevelTimer.goalReached();
                    }
                    else if (!Game.SceneFreezer.stoped) {
                        if (Level.index == Game.maxlev)
                            Level.nextIndex = 1;
                        this.nextSceneClass = Level;
                        Game.triggerActions("playlevelbutton");
                        Game.triggerActions("winlevel");
                    }
                }
                else {
                    if (Level.index == Game.maxlev) {
                        this.stepsWait = Game.STEPS_CHANGE_SCENE;
                        this.nextSceneClass = Game.LastScene;
                        Game.triggerActions("winlastlevel");
                    }
                    else if (Level.speedrun && Level.speedrunRestCount >= Level.SPEEDRUN_REST_INTERVAL && Level.nextIndex < Game.maxlev - Level.MIN_SPEEDRUN_REST) {
                        this.nextSceneClass = Game.SpeedrunRestMenu;
                        Game.triggerActions("winlevel");
                    }
                    else {
                        this.nextSceneClass = Level;
                        Game.triggerActions("playlevelbutton");
                        Game.triggerActions("winlevel");
                    }
                    Game.triggerActions("lose");
                }
            }
            if (!Level.practiceFinished && this.nextSceneClass == null && Game.pla.haslos) {
                this.nextSceneClass = "reset";
                this.stepsWait = 0;
                Game.triggerActions("loselevel");
                Game.triggerActions("lose");
            }
            if (Game.ResetButton.instance != null && Game.ResetButton.instance.control.pressed && Game.Scene.nextSceneClass != "reset" && !this.exiting) {
                if (Level.practice && Level.practiceFinished) {
                    //Level.nextIndex=Level.index;
                    //this.nextSceneClass = Level;
                    this.nextSceneClass = "reset";
                }
                else {
                    this.nextSceneClass = "reset";
                }
                this.stepsWait = 0;
                Game.triggerActions("resetlevelbutton");
                Game.triggerActions("resetlevel");
                Game.triggerActions("lose");
            }
            if (Game.ExitButton.instance.control.pressed && !this.exiting) {
                this.stepsWait = Game.STEPS_CHANGE_SCENE;
                if (Level.speedrun) {
                    this.nextSceneClass = Game.SpeedrunMenu.cla;
                }
                else {
                    this.nextSceneClass = Game.LevelSelection.cla;
                }
                this.stepsWait = Game.STEPS_CHANGE_SCENE;
                this.exiting = true;
                Game.triggerActions("exitlevel");
                Game.triggerActions("lose");
            }
        };
        Level.prototype.onTimeUpdateSceneBeforeDrawFixed = function () {
            if (this.fadeSound) {
            }
            //var x = this.xSizeMap * 0.5;
            //var y = this.ySizeMap * 0.5;
            var x = Game.pla.horcam;
            var y = Game.pla.vercam;
            //Engine.Renderer.camera(x + LevelShake.position, y);
            //Engine.Renderer.camera((x + LevelShake.position), (y + LevelShake2.position));
            Engine.Renderer.camera((x + Game.LevelShake.position + Game.LevelShake2.position), (y));
        };
        Level.prototype.onDrawSceneSky = function () {
        };
        Level.prototype.onDrawSceneMap = function () {
            _super.prototype.onDrawSceneMap.call(this);
            if (Engine.Box.debugRender) {
                for (var _i = 0, _a = this.boxesEnemies; _i < _a.length; _i++) {
                    var box = _a[_i];
                    if (box.data != null && box.data != undefined && box.data.spikeAngle != null && box.data.spikeAngle != undefined) {
                        box.render();
                    }
                }
            }
        };
        Level.prototype.onStartWaiting = function () {
            _super.prototype.onStartWaiting.call(this);
            if ((Game.Scene.nextSceneClass == Level && (Level.nextIndex == Level.INDEX_FASE_2 || Level.nextIndex == Level.INDEX_FASE_3)) || Game.Scene.nextSceneClass == Game.maimen.cla || Game.Scene.nextSceneClass == Game.LevelSelection.cla || Game.Scene.nextSceneClass == Game.SpeedrunMenu.cla || Game.Scene.nextSceneClass == Game.LastScene) {
                //Resources.stopBGM();
            }
            Game.LevelAds.tryTriggerTimeAd();
        };
        Level.prototype.onFadeLinStart = function () {
            /*
            if((Scene.nextSceneClass == Level && (Level.nextIndex == Level.INDEX_FASE_2 || Level.nextIndex == Level.INDEX_FASE_3)) || Scene.nextSceneClass == LastScene){
                SceneFade.speed =  0.0166666666666667 * 2;
                if(Scene.nextSceneClass != LastScene) this.stepsWait = STEPS_CHANGE_SCENE_AD * 0.25;
                else this.stepsWait = STEPS_CHANGE_SCENE_AD * 0.65;
                this.fadeSound = true;
                //Resources.stopBGM();
            }
            */
        };
        Level.prototype.onClearScene = function () {
            //Resources.texgam.link(null);
            Level.instance = null;
        };
        Level.INDEX_FASE_2 = 10;
        Level.INDEX_FASE_3 = 19;
        Level.GRAVITY = 0.0;
        Level.Y_VEL_MAX = 6;
        Level.nextIndex = 1;
        Level.practice = false;
        Level.practiceFinished = false;
        Level.speedrunRestCount = 0;
        Level.SPEEDRUN_REST_INTERVAL = 27;
        Level.MIN_SPEEDRUN_REST = 5;
        return Level;
    }(Game.SceneMap));
    Game.Level = Level;
})(Game || (Game = {}));
///<reference path="../../../Engine/Entity.ts"/>
var Game;
(function (Game) {
    var TIME_AD_SPEEDRUN = 60000;
    var STEPS_AD_TIME_FIRST = 30 * 60;
    var STEPS_AD_TIME_REGULAR = 110 * 60;
    var LevelAds = /** @class */ (function (_super) {
        __extends(LevelAds, _super);
        function LevelAds() {
            return _super.call(this) || this;
        }
        LevelAds.init = function () {
            new LevelAds();
        };
        LevelAds.prototype.onStepUpdate = function () {
            if (!Game.Level.speedrun) {
                if (LevelAds.countStepsAdTime > 0) {
                    LevelAds.countStepsAdTime -= 1;
                }
            }
        };
        LevelAds.tryTriggerTimeAd = function () {
            if (!Game.Level.speedrun) {
                if (LevelAds.countStepsAdTime <= 0) {
                    if (LevelAds.listenerAdTime != null) {
                        LevelAds.listenerAdTime();
                    }
                    LevelAds.clearSpeedrunCounter();
                    LevelAds.countStepsAdTime = STEPS_AD_TIME_REGULAR;
                    return LevelAds.listenerAdTime != null;
                }
            }
            return false;
        };
        LevelAds.tryTriggerSpeedrunAd = function () {
            if (Game.Scene.nextSceneClass == Game.Level && Game.Level.speedrun) {
                if (LevelAds.dateSpeedrun == 0 || Date.now() - LevelAds.dateSpeedrun >= TIME_AD_SPEEDRUN) {
                    if (LevelAds.listenerAdSpeedrun != null) {
                        LevelAds.listenerAdSpeedrun();
                    }
                    LevelAds.clearTimeCounter();
                    LevelAds.dateSpeedrun = Date.now();
                    return LevelAds.listenerAdSpeedrun != null;
                }
            }
            return false;
        };
        LevelAds.clearTimeCounter = function () {
            LevelAds.countStepsAdTime = STEPS_AD_TIME_REGULAR;
        };
        LevelAds.clearSpeedrunCounter = function () {
            LevelAds.dateSpeedrun = Date.now();
        };
        LevelAds.listenerAdTime = null;
        LevelAds.listenerAdSpeedrun = null;
        LevelAds.countStepsAdTime = STEPS_AD_TIME_FIRST;
        LevelAds.dateSpeedrun = 0;
        return LevelAds;
    }(Engine.Entity));
    Game.LevelAds = LevelAds;
})(Game || (Game = {}));
///<reference path="../../../Engine/Entity.ts"/>
var Game;
(function (Game) {
    //var FILL_R = 0 / 255;
    //var FILL_G = 89 / 255;
    //var FILL_B = 250 / 255;
    var FILL_A = 0.7;
    var LevelPauseUI = /** @class */ (function (_super) {
        __extends(LevelPauseUI, _super);
        function LevelPauseUI() {
            var _this = _super.call(this) || this;
            LevelPauseUI.instance = _this;
            _this.fill = new Engine.Sprite();
            _this.fill.enabled = true;
            _this.fill.pinned = true;
            _this.fill.setRGBA(Game.SceneFade.instance.red, Game.SceneFade.instance.green, Game.SceneFade.instance.blue, FILL_A);
            _this.onViewUpdate();
            _this.text = new Utils.Text();
            _this.text.font = Game.FontManager.a;
            _this.text.scale = 1;
            _this.text.enabled = false;
            _this.text.pinned = true;
            _this.text.str = LevelPauseUI.STR;
            _this.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            _this.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            _this.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.text.xAligned = 0;
            _this.text.yAligned = 0;
            _this.text.superFront = true;
            return _this;
        }
        LevelPauseUI.init = function () {
            new LevelPauseUI();
        };
        LevelPauseUI.prototype.onViewUpdate = function () {
            this.fill.x = -Engine.Renderer.xSizeView * 0.5;
            this.fill.y = -Engine.Renderer.ySizeView * 0.5;
            this.fill.xSize = Engine.Renderer.xSizeView;
            this.fill.ySize = Engine.Renderer.ySizeView;
        };
        LevelPauseUI.prototype.onDrawPause = function () {
            if (Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) {
                if (!this.text.enabled && (Game.LevelAdLoader.instance == null || !Game.LevelAdLoader.instance.text.enabled)) {
                    this.text.enabled = true;
                }
                this.fill.render();
            }
            else {
                if (this.text.enabled) {
                    this.text.enabled = false;
                }
            }
        };
        LevelPauseUI.STR = "MENU";
        return LevelPauseUI;
    }(Engine.Entity));
    Game.LevelPauseUI = LevelPauseUI;
})(Game || (Game = {}));
///<reference path="../../../Engine/Entity.ts"/>
var Game;
(function (Game) {
    var LevelSaveManager = /** @class */ (function (_super) {
        __extends(LevelSaveManager, _super);
        function LevelSaveManager() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.winSaved = false;
            _this.exiting = false;
            return _this;
        }
        LevelSaveManager.init = function () {
            new LevelSaveManager();
        };
        LevelSaveManager.prototype.onReset = function () {
            this.winSaved = false;
        };
        LevelSaveManager.prototype.onStepUpdate = function () {
            if (!this.winSaved && Game.Goal.win) {
                Game.dataLevels[Game.Level.index] = '2';
                if (Game.dataLevels[Game.Level.nextIndex] == '0') {
                    Game.dataLevels[Game.Level.nextIndex] = '1';
                }
                if (Game.Level.speedrun && Game.Level.nextIndex > Game.maxlev && (Game.recordSpeedrun == 0 || Game.Level.countStepsSpeedrun < Game.recordSpeedrun)) {
                    LevelSaveManager.hasSpeedrunRecord = Game.recordSpeedrun > 0;
                    Game.recordSpeedrun = Game.Level.countStepsSpeedrun;
                    Game.levelSpeedrun = 1;
                    Game.dataSpeedrun = 0;
                }
                else if (Game.Level.speedrun && Game.Level.nextIndex > Game.maxlev) {
                    LevelSaveManager.hasSpeedrunRecord = false;
                    Game.levelSpeedrun = 1;
                    Game.dataSpeedrun = 0;
                }
                else if (Game.Level.speedrun) {
                    Game.levelSpeedrun = Game.Level.nextIndex;
                    Game.dataSpeedrun = Game.Level.countStepsSpeedrun;
                }
                if (!Game.Level.speedrun && Game.Level.index == Game.levpagsiz * (Game.LevelSelection.getPage() + 1)) {
                    Game.LevelSelection.nexpag();
                }
                Game.savedat();
                this.winSaved = true;
            }
            if (Game.Level.speedrun && !this.winSaved && !this.exiting && Game.ExitButton.instance.control.pressed) {
                Game.levelSpeedrun = Game.Level.index;
                Game.dataSpeedrun = Game.Level.countStepsSpeedrun;
                Game.savedat();
                this.exiting = true;
            }
        };
        return LevelSaveManager;
    }(Engine.Entity));
    Game.LevelSaveManager = LevelSaveManager;
})(Game || (Game = {}));
var Utils;
(function (Utils) {
    var Shake = /** @class */ (function (_super) {
        __extends(Shake, _super);
        function Shake() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._triggered = false;
            return _this;
        }
        Object.defineProperty(Shake.prototype, "triggered", {
            get: function () {
                return this._triggered;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Shake.prototype, "inactive", {
            get: function () {
                return this.position == 0 && this.direction == 0;
            },
            enumerable: false,
            configurable: true
        });
        Shake.prototype.start = function (direction) {
            this.position = 0;
            this.countDistance = this.distance;
            this.direction = direction;
            this._triggered = true;
        };
        Shake.prototype.stop = function () {
            this.position = 0;
            this.direction = 0;
            this._triggered = false;
        };
        Shake.prototype.onReset = function () {
            this.position = 0;
            this.direction = 0;
            this._triggered = false;
        };
        Shake.prototype.onStepUpdate = function () {
            if (this.direction != 0 && !Game.SceneFreezer.stoped) {
                this.position += this.velocity * this.direction;
                var change = false;
                if ((this.direction > 0 && this.position > this.countDistance) || (this.direction < 0 && this.position < -this.countDistance)) {
                    change = true;
                }
                if (change) {
                    this.position = this.countDistance * this.direction;
                    this.direction *= -1;
                    this.countDistance *= this.reduction;
                    if (this.countDistance <= this.minDistance) {
                        this.position = 0;
                        this.direction = 0;
                    }
                }
            }
        };
        return Shake;
    }(Engine.Entity));
    Utils.Shake = Shake;
})(Utils || (Utils = {}));
///<reference path="../../Utils/Shake.ts"/>
var Game;
(function (Game) {
    var VELOCITY = 2;
    var DISTANCE = 2;
    var MIN_DISTANCE = 0.01;
    var REDUCTION = 0.8;
    var START_DIRECTION = 1;
    var LevelShake = /** @class */ (function (_super) {
        __extends(LevelShake, _super);
        function LevelShake() {
            var _this = _super.call(this) || this;
            _this.velocity = VELOCITY;
            _this.distance = DISTANCE;
            _this.minDistance = MIN_DISTANCE;
            _this.reduction = REDUCTION;
            return _this;
        }
        Object.defineProperty(LevelShake, "triggered", {
            get: function () {
                return LevelShake.instance.triggered;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LevelShake, "position", {
            get: function () {
                return LevelShake.instance.position;
            },
            enumerable: false,
            configurable: true
        });
        LevelShake.init = function () {
            LevelShake.instance = new LevelShake();
        };
        LevelShake.prototype.onStepUpdate = function () {
            _super.prototype.onStepUpdate.call(this);
            if (!this.triggered && Game.pla.los) {
                this.start(START_DIRECTION);
            }
        };
        LevelShake.prototype.onClearScene = function () {
            LevelShake.instance = null;
        };
        LevelShake.instance = null;
        return LevelShake;
    }(Utils.Shake));
    Game.LevelShake = LevelShake;
})(Game || (Game = {}));
///<reference path="../../Utils/Shake.ts"/>
var Game;
(function (Game) {
    var VELOCITY = 2;
    var DISTANCE = 2;
    var MIN_DISTANCE = 0.01;
    var REDUCTION = 0.8;
    var START_DIRECTION = -1;
    var LevelShake2 = /** @class */ (function (_super) {
        __extends(LevelShake2, _super);
        function LevelShake2() {
            var _this = _super.call(this) || this;
            _this.velocity = VELOCITY;
            _this.distance = DISTANCE;
            _this.minDistance = MIN_DISTANCE;
            _this.reduction = REDUCTION;
            return _this;
        }
        Object.defineProperty(LevelShake2, "triggered", {
            get: function () {
                return LevelShake2.instance.triggered;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LevelShake2, "position", {
            get: function () {
                return LevelShake2.instance.position;
            },
            enumerable: false,
            configurable: true
        });
        LevelShake2.init = function () {
            LevelShake2.instance = new LevelShake2();
        };
        LevelShake2.prototype.onStepUpdate = function () {
            _super.prototype.onStepUpdate.call(this);
            if (!this.triggered && Game.pla.los) {
                //    this.start(START_DIRECTION);
            }
        };
        LevelShake2.prototype.onSpell = function () {
            this.start(START_DIRECTION);
        };
        LevelShake2.prototype.onClearScene = function () {
            LevelShake2.instance = null;
        };
        LevelShake2.instance = null;
        return LevelShake2;
    }(Utils.Shake));
    Game.LevelShake2 = LevelShake2;
})(Game || (Game = {}));
///<reference path="../../System/Scene/SceneMap.ts"/>
var Game;
(function (Game) {
    var preloa;
    (function (preloa) {
        preloa.preserved = false;
        var hortexloa = 0;
        var hortexpre = 0;
        var hortexcom = -34;
        var vertexnor = -3;
        var vertexplu = 6;
        var stedot = 20;
        var stebli = 40;
        var stenex = 60;
        preloa.canend = true;
        var ins;
        var tex;
        var con;
        var cla = /** @class */ (function (_super) {
            __extends(cla, _super);
            function cla() {
                var _this = _super.call(this) || this;
                ins = _this;
                mak();
                return _this;
            }
            return cla;
        }(Game.SceneMap));
        preloa.cla = cla;
        function mak() {
            Engine.System.addListenersFrom(preloa);
            Game.SceneFade.speed = 0.0166666666666667 * 1;
            if (Game.plu)
                Game.titlab.mak(-37);
            tex = new Utils.Text();
            tex.font = Game.FontManager.a;
            tex.scale = 1;
            tex.enabled = true;
            tex.pinned = true;
            tex.str = "   LOADING   ";
            tex.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            tex.xAlignView = Utils.AnchorAlignment.MIDDLE;
            tex.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            tex.yAlignView = Utils.AnchorAlignment.MIDDLE;
            tex.xAligned = hortexloa;
            tex.yAligned = Game.plu ? vertexplu : vertexnor;
            tex.front = false;
            con = new Game.Control();
            con.enabled = true;
            con.freezeable = true;
            con.newInteractionRequired = true;
            con.useMouse = true;
            con.mouseButtons = [0];
            con.useTouch = true;
            Game.loabar.mak();
            makmap();
            Game.triggerActions("preloader");
        }
        function makmap() {
            if (Game.plu) {
                ins.loadMap(Game.Resources.PATH_MAP_PRELOADER);
                Game.SceneColors.enabledDown = false;
                Game.SceneColors.instance.usingFill = true;
                new Game.TerrainFill(0);
            }
            else {
                ins.loadMap(Game.Resources.PATH_MAP_NONE);
                Game.SceneColors.enabledDown = false;
                Game.SceneColors.instance.usingFill = false;
                Engine.Renderer.clearColor(Game.Resources.texgam.linkedTexture.getRed(3, 0) / 255.0, Game.Resources.texgam.linkedTexture.getGreen(3, 0) / 255.0, Game.Resources.texgam.linkedTexture.getBlue(3, 0) / 255.0);
            }
            Engine.Renderer.camera(Game.SceneMap.instance.xSizeMap * 0.5, Game.SceneMap.instance.ySizeMap * 0.5);
        }
        var cou = 0;
        var updloa = function () {
            if (++cou == stedot) {
                cou = 0;
                if (tex.str == "   LOADING   ")
                    tex.str = "  .LOADING.  ";
                else if (tex.str == "  .LOADING.  ")
                    tex.str = " ..LOADING.. ";
                else if (tex.str == " ..LOADING.. ")
                    tex.str = "...LOADING...";
                else if (tex.str == "...LOADING...")
                    tex.str = "   LOADING   ";
            }
            if (Game.DIRECT_PRELOADER && Engine.Assets.downloadComplete && Game.loabar.ful()) {
                if (Game.DIRECT_PRELOADER) {
                    tex.str = "LOAD COMPLETE!";
                    tex.xAligned = hortexcom;
                    //@ts-ignore
                    //Engine.AudioManager.verify();
                }
                setupdexi();
            }
            else if (Engine.Assets.downloadComplete && Game.loabar.ful()) {
                cou = 0;
                tex.str = "PRESS TO CONTINUE";
                tex.xAligned = hortexpre;
                upd = updpre;
            }
        };
        var updpre = function () {
            if (++cou == stebli) {
                cou = 0;
                tex.enabled = !tex.enabled;
            }
            if (con.pressed)
                setupdexi();
        };
        function setupdexi() {
            Game.HAS_STARTED = true;
            Game.IS_TOUCH = Game.FORCE_TOUCH || con.touchPressed;
            //HAS_LINKS=HAS_LINKS&&!IS_TOUCH;
            tex.enabled = true;
            Game.SceneFade.trigger();
            Game.triggerActions("postinit");
            Game.triggerActions("presstocontinue");
            upd = updexi;
        }
        var soupla = false;
        var updexi = function () {
            if (!soupla && Engine.AudioManager.verified) {
                //Resources.sfxGameStart.play();
                soupla = true;
            }
            if (Game.SceneFade.filled && preloa.canend) {
                cou = 0;
                upd = updwai;
            }
        };
        var updwai = function () {
            cou += 1 * Utils.Fade.scale;
            if (Game.startingSceneClass != Game.maimen.cla || cou >= stenex) {
                //triggerActions("preloadchangecolor");
                Game.triggerActions("endpreloader");
                Engine.System.nextSceneClass = Game.PreloadEnd;
                upd = function () { };
            }
        };
        var upd = updloa;
        function onStepUpdate() {
            upd();
        }
        preloa.onStepUpdate = onStepUpdate;
    })(preloa = Game.preloa || (Game.preloa = {}));
})(Game || (Game = {}));
///<reference path="../../../Engine/Scene.ts"/>
var Game;
(function (Game) {
    var PreloadStart = /** @class */ (function (_super) {
        __extends(PreloadStart, _super);
        function PreloadStart() {
            var _this = _super.call(this) || this;
            Game.forEachPath("preload", function (path) {
                Engine.Assets.queue(path);
            });
            Engine.Assets.download();
            return _this;
            //triggerActions("preloadchangecolor");
        }
        PreloadStart.prototype.onStepUpdate = function () {
            if (Engine.Assets.downloadComplete) {
                Engine.System.nextSceneClass = PreloadMiddle;
            }
        };
        return PreloadStart;
    }(Engine.Scene));
    Game.PreloadStart = PreloadStart;
    var PreloadMiddle = /** @class */ (function (_super) {
        __extends(PreloadMiddle, _super);
        function PreloadMiddle() {
            var _this = _super.call(this) || this;
            Game.triggerActions("preinit");
            Game.triggerActions("init");
            Game.forEachPath("load", function (path) {
                Engine.Assets.queue(path);
            });
            Engine.Assets.download();
            Engine.System.nextSceneClass = Game.SKIP_PRELOADER ? SimplePreloader : Game.preloa.cla;
            return _this;
        }
        return PreloadMiddle;
    }(Engine.Scene));
    Game.PreloadMiddle = PreloadMiddle;
    var SimplePreloader = /** @class */ (function (_super) {
        __extends(SimplePreloader, _super);
        function SimplePreloader() {
            var _this = _super.call(this) || this;
            Game.SceneFade.speed = 0.0166666666666667 * 1000;
            //SceneColors.clearColor(0, 0, 0);
            Game.triggerActions("preloader");
            Game.IS_TOUCH = Game.FORCE_TOUCH;
            Game.triggerActions("postinit");
            return _this;
        }
        ;
        SimplePreloader.prototype.onStepUpdate = function () {
            if (Engine.Assets.downloadComplete) {
                Engine.System.nextSceneClass = PreloadEnd;
            }
        };
        return SimplePreloader;
    }(Game.Scene));
    Game.SimplePreloader = SimplePreloader;
    var PreloadEnd = /** @class */ (function (_super) {
        __extends(PreloadEnd, _super);
        function PreloadEnd() {
            var _this = _super.call(this) || this;
            Game.triggerActions("preconfigure");
            Game.triggerActions("configure");
            Game.triggerActions("prepare");
            Game.triggerActions("start");
            Engine.System.nextSceneClass = Game.startingSceneClass;
            return _this;
            //triggerActions("preloadchangecolor");
        }
        return PreloadEnd;
    }(Engine.Scene));
    Game.PreloadEnd = PreloadEnd;
})(Game || (Game = {}));
Engine.System.nextSceneClass = Game.PreloadStart;
var Game;
(function (Game) {
    var Button = /** @class */ (function (_super) {
        __extends(Button, _super);
        function Button(bounds) {
            if (bounds === void 0) { bounds = new Engine.Sprite(); }
            var _this = _super.call(this) || this;
            _this.arrows = new Game.Arrows();
            _this.control = new Game.Control();
            _this.anchor = new Utils.Anchor();
            _this.control.bounds = bounds;
            _this.anchor.bounds = bounds;
            _this.control.enabled = true;
            _this.control.useMouse = true;
            _this.control.mouseButtons = [0];
            _this.control.useTouch = true;
            _this.control.blockOthersSelection = true;
            _this.control.newInteractionRequired = true;
            _this.control.listener = _this;
            _this.arrows.control = _this.control;
            _this.arrows.bounds = _this.control.bounds;
            return _this;
            //this.control.audioSelected = Resources.sfxMouseOver;
            //this.control.audioPressed = Resources.sfxMouseClick;
        }
        Object.defineProperty(Button.prototype, "bounds", {
            get: function () {
                return this.control.bounds;
            },
            enumerable: false,
            configurable: true
        });
        Button.prototype.onDrawButtons = function () {
            this.control.bounds.render();
        };
        return Button;
    }(Engine.Entity));
    Game.Button = Button;
    var TextButton = /** @class */ (function (_super) {
        __extends(TextButton, _super);
        function TextButton() {
            var _this = _super.call(this) || this;
            _this.arrows = new Game.Arrows();
            _this.control = new Game.Control();
            _this.text = new Utils.Text();
            _this.control.bounds = _this.text.bounds;
            _this.control.enabled = true;
            _this.control.useMouse = true;
            _this.control.mouseButtons = [0];
            _this.control.useTouch = true;
            _this.control.blockOthersSelection = true;
            _this.control.newInteractionRequired = true;
            _this.control.listener = _this;
            _this.arrows.control = _this.control;
            _this.arrows.bounds = _this.text.bounds;
            return _this;
            //this.control.audioSelected = Resources.sfxMouseOver;
            //this.control.audioPressed = Resources.sfxMouseClick;
        }
        return TextButton;
    }(Engine.Entity));
    Game.TextButton = TextButton;
    var DialogButton = /** @class */ (function (_super) {
        __extends(DialogButton, _super);
        function DialogButton(index, x, y) {
            var _this = _super.call(this) || this;
            _this.arrows = new Game.Arrows();
            _this.control = new Game.Control();
            _this.text = new Utils.Text();
            _this.dialog = new Game.ButtonFrame(index, x, y);
            _this.control.bounds = _this.dialog.spr;
            _this.control.enabled = true;
            _this.control.useMouse = true;
            _this.control.mouseButtons = [0];
            _this.control.useTouch = true;
            _this.control.blockOthersSelection = true;
            _this.control.newInteractionRequired = true;
            _this.control.listener = _this;
            _this.arrows.control = _this.control;
            _this.arrows.bounds = _this.text.bounds;
            return _this;
            //this.control.audioSelected = Resources.sfxMouseOver;
            //this.control.audioPressed = Resources.sfxMouseClick;
        }
        Object.defineProperty(DialogButton.prototype, "enabled", {
            set: function (value) {
                this.control.enabled = value;
                this.dialog.spr.enabled = value;
                this.text.enabled = value;
            },
            enumerable: false,
            configurable: true
        });
        return DialogButton;
    }(Engine.Entity));
    Game.DialogButton = DialogButton;
})(Game || (Game = {}));
///<reference path="../../../System/Button.ts"/>
var Game;
(function (Game) {
    var FRAMES;
    Game.addAction("configure", function () {
        FRAMES = Game.FrameSelector.complex("exit button", Game.Resources.texgam, 768, 198);
    });
    var ExitButton = /** @class */ (function (_super) {
        __extends(ExitButton, _super);
        function ExitButton() {
            var _this = _super.call(this, new Engine.Sprite()) || this;
            _this.baseSprite = _this.bounds;
            ExitButton.instance = _this;
            _this.bounds.enabled = true;
            _this.bounds.pinned = true;
            _this.fix();
            _this.anchor.xAlignBounds = Utils.AnchorAlignment.END;
            _this.anchor.xAlignView = Utils.AnchorAlignment.END;
            _this.anchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.anchor.yAlignView = Utils.AnchorAlignment.START;
            _this.anchor.xAligned = -Game.X_BUTTONS_LEFT;
            _this.anchor.yAligned = Game.Y_BUTTONS_TOP;
            _this.arrows.yOffset = Game.Y_ARROWS_GAME_BUTTONS;
            _this.control.useKeyboard = true;
            _this.control.keys = [Engine.Keyboard.ESC, "esc", "Esc", "ESC"];
            _this.control.onPressedDelegate = _this.onPressed;
            return _this;
        }
        ExitButton.prototype.onPressed = function () {
            if (Game.Scene.nextSceneClass == null) {
                //Scene.switchPause();
                //this.fix(); 
            }
        };
        ExitButton.prototype.onStepUpdate = function () {
            if (Game.PauseButton.instance != null) {
                if (!(Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) && this.bounds.enabled) {
                    this.control.useMouse = false;
                    this.control.useTouch = false;
                    this.bounds.enabled = false;
                }
                else if ((Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) && !this.bounds.enabled) {
                    this.control.useMouse = true;
                    this.control.useTouch = true;
                    this.bounds.enabled = true;
                }
            }
        };
        ExitButton.prototype.fix = function () {
            FRAMES[Game.IS_TOUCH ? 1 : 0].applyToSprite(this.bounds);
        };
        ExitButton.prototype.onDrawButtons = function () {
            this.baseSprite.render();
        };
        ExitButton.prototype.onClearScene = function () {
            ExitButton.instance = null;
        };
        return ExitButton;
    }(Game.Button));
    Game.ExitButton = ExitButton;
})(Game || (Game = {}));
///<reference path="../../../System/Button.ts"/>
var Game;
(function (Game) {
    Game.PLAYSTORE_BUTTON_POSITION = "bottom right";
    var SCALE = 0.060;
    var PlayStoreButton = /** @class */ (function (_super) {
        __extends(PlayStoreButton, _super);
        function PlayStoreButton() {
            var _this = _super.call(this) || this;
            _this.bounds.enabled = true;
            _this.bounds.pinned = true;
            _this.arrows.enabled = false;
            FRAMES[0].applyToSprite(_this.bounds);
            _this.bounds.xSize *= SCALE;
            _this.bounds.ySize *= SCALE;
            /*
            this.anchor.xAlignBounds = Utils.AnchorAlignment.START;
            this.anchor.xAlignView = Utils.AnchorAlignment.MIDDLE;
            this.anchor.yAlignBounds = Utils.AnchorAlignment.END;
            this.anchor.yAlignView = Utils.AnchorAlignment.MIDDLE;
            this.anchor.xAligned = 40 + (Engine.Renderer.xSizeView * 0.5 - 40) * 0.5 - this.bounds.xSize * 0.5;
            this.anchor.yAligned = 56;

            
            this.anchor.xAlignBounds = Utils.AnchorAlignment.START;
            this.anchor.xAlignView = Utils.AnchorAlignment.MIDDLE;
            this.anchor.yAlignBounds = Utils.AnchorAlignment.END;
            this.anchor.yAlignView = Utils.AnchorAlignment.MIDDLE;
            this.anchor.xAligned = 43;
            this.anchor.yAligned = 56;
            */
            switch (Game.PLAYSTORE_BUTTON_POSITION) {
                case "top right":
                    _this.anchor.xAlignBounds = Utils.AnchorAlignment.END;
                    _this.anchor.xAlignView = Utils.AnchorAlignment.END;
                    _this.anchor.yAlignBounds = Utils.AnchorAlignment.START;
                    _this.anchor.yAlignView = Utils.AnchorAlignment.START;
                    _this.anchor.xAligned = -3;
                    _this.anchor.yAligned = 2;
                    break;
                case "bottom left":
                    _this.anchor.xAlignBounds = Utils.AnchorAlignment.START;
                    _this.anchor.xAlignView = Utils.AnchorAlignment.START;
                    _this.anchor.yAlignBounds = Utils.AnchorAlignment.END;
                    _this.anchor.yAlignView = Utils.AnchorAlignment.END;
                    _this.anchor.xAligned = 3;
                    _this.anchor.yAligned = -4;
                    break;
                case "bottom right":
                    _this.anchor.xAlignBounds = Utils.AnchorAlignment.END;
                    _this.anchor.xAlignView = Utils.AnchorAlignment.END;
                    _this.anchor.yAlignBounds = Utils.AnchorAlignment.END;
                    _this.anchor.yAlignView = Utils.AnchorAlignment.END;
                    _this.anchor.xAligned = -3;
                    _this.anchor.yAligned = -4;
                    break;
                case "right":
                    _this.anchor.xAlignBounds = Utils.AnchorAlignment.END;
                    _this.anchor.xAlignView = Utils.AnchorAlignment.END;
                    _this.anchor.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
                    _this.anchor.yAlignView = Utils.AnchorAlignment.MIDDLE;
                    _this.anchor.xAligned = -3;
                    _this.anchor.yAligned = -0.5;
                    break;
            }
            _this.control.url = "https://play.google.com/store/apps/details?id=com.noadev.miniblocks";
            _this.control.onSelectionStayDelegate = function () {
                Engine.Renderer.useHandPointer = true;
            };
            return _this;
        }
        PlayStoreButton.prototype.onViewUpdate = function () {
            //this.anchor.xAligned = 40 + (Engine.Renderer.xSizeView * 0.5 - 40) * 0.5 - this.bounds.xSize * 0.5;
        };
        return PlayStoreButton;
    }(Game.Button));
    Game.PlayStoreButton = PlayStoreButton;
    function TryCreatePlaystoreButton() {
        if (Game.HAS_LINKS && Game.HAS_GOOGLE_PLAY_LOGOS) {
            new PlayStoreButton();
        }
    }
    Game.TryCreatePlaystoreButton = TryCreatePlaystoreButton;
    var FRAMES;
    Game.addAction("prepare", function () {
        if (Game.HAS_LINKS && Game.HAS_GOOGLE_PLAY_LOGOS) {
            FRAMES = Game.FrameSelector.complex("google play", Game.Resources.textureGooglePlay, 37, 37);
        }
    });
})(Game || (Game = {}));
///<reference path="../../../System/Button.ts"/>
var Game;
(function (Game) {
    var FRAMES;
    Game.addAction("configure", function () {
        FRAMES = Game.FrameSelector.complex("music button", Game.Resources.texgam, 770, 118);
    });
    var MusicButton = /** @class */ (function (_super) {
        __extends(MusicButton, _super);
        function MusicButton() {
            var _this = _super.call(this) || this;
            MusicButton.instance = _this;
            _this.bounds.enabled = true;
            _this.bounds.pinned = true;
            _this.fix();
            _this.anchor.xAlignBounds = Utils.AnchorAlignment.START;
            _this.anchor.xAlignView = Utils.AnchorAlignment.START;
            _this.anchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.anchor.yAlignView = Utils.AnchorAlignment.START;
            _this.anchor.xAligned = Game.X_BUTTONS_LEFT + (Game.PauseButton.instance != null ? Game.PauseButton.instance.baseSprite.xSize + Game.X_SEPARATION_BUTTONS_LEFT : 0);
            _this.anchor.yAligned = Game.Y_BUTTONS_TOP;
            _this.arrows.yOffset = Game.Y_ARROWS_GAME_BUTTONS;
            _this.control.useKeyboard = true;
            _this.control.keys = [Engine.Keyboard.M];
            _this.control.onPressedDelegate = _this.onPressed;
            return _this;
        }
        MusicButton.prototype.onStepUpdate = function () {
            if (Game.PauseButton.instance != null) {
                if (!(Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) && this.bounds.enabled) {
                    this.control.useMouse = false;
                    this.control.useTouch = false;
                    this.bounds.enabled = false;
                }
                else if ((Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) && !this.bounds.enabled) {
                    this.control.useMouse = true;
                    this.control.useTouch = true;
                    this.bounds.enabled = true;
                }
            }
        };
        MusicButton.prototype.setPracticeAlign = function () {
            this.anchor.xAligned = Game.X_BUTTONS_LEFT + Game.ResetButton.instance.bounds.xSize + Game.X_SEPARATION_BUTTONS_LEFT + (Game.PauseButton.instance != null ? Game.PauseButton.instance.baseSprite.xSize + Game.X_SEPARATION_BUTTONS_LEFT : 0);
        };
        MusicButton.prototype.setPracticeRealign = function () {
            this.anchor.xAligned = Game.X_BUTTONS_LEFT + (Game.PauseButton.instance != null ? Game.PauseButton.instance.baseSprite.xSize + Game.X_SEPARATION_BUTTONS_LEFT : 0);
        };
        MusicButton.prototype.onPressed = function () {
            Game.switchMusicMute();
            this.fix();
        };
        MusicButton.prototype.fix = function () {
            if (Game.MUSIC_MUTED) {
                FRAMES[2 + (Game.IS_TOUCH ? 1 : 0)].applyToSprite(this.bounds);
            }
            else {
                FRAMES[0 + (Game.IS_TOUCH ? 1 : 0)].applyToSprite(this.bounds);
            }
        };
        MusicButton.prototype.onClearScene = function () {
            MusicButton.instance = null;
        };
        return MusicButton;
    }(Game.Button));
    Game.MusicButton = MusicButton;
})(Game || (Game = {}));
///<reference path="../../../System/Button.ts"/>
var Game;
(function (Game) {
    var FRAMES;
    Game.addAction("configure", function () {
        FRAMES = Game.FrameSelector.complex("pause button", Game.Resources.texgam, 930, 118);
    });
    var PauseButton = /** @class */ (function (_super) {
        __extends(PauseButton, _super);
        function PauseButton() {
            var _this = _super.call(this) || this;
            _this.pauseGraph = false;
            _this.inited = false;
            PauseButton.instance = _this;
            _this.pauseGraph = Game.SceneFreezer.paused;
            _this.bounds.enabled = true;
            _this.bounds.pinned = true;
            _this.baseSprite = _this.bounds;
            _this.fix();
            _this.anchor.xAlignBounds = Utils.AnchorAlignment.START;
            _this.anchor.xAlignView = Utils.AnchorAlignment.START;
            _this.anchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.anchor.yAlignView = Utils.AnchorAlignment.START;
            _this.anchor.xAligned = Game.X_BUTTONS_LEFT;
            _this.anchor.yAligned = Game.Y_BUTTONS_TOP;
            _this.arrows.yOffset = Game.Y_ARROWS_GAME_BUTTONS;
            _this.control.useKeyboard = true;
            _this.control.keys = [Engine.Keyboard.P];
            _this.control.onPressedDelegate = _this.onPressed;
            return _this;
        }
        PauseButton.prototype.onReset = function () {
            this.inited = true;
            this.pauseGraph = Game.SceneFreezer.paused;
            this.fix();
        };
        PauseButton.prototype.setPracticeRealign = function () {
            this.fix();
        };
        PauseButton.prototype.onPressed = function () {
            Game.SceneFreezer.switchPause();
            this.pauseGraph = !this.pauseGraph;
            this.fix();
        };
        PauseButton.prototype.onStepUpdate = function () {
        };
        PauseButton.prototype.fix = function () {
            if (this.pauseGraph || (Game.Level.practice && Game.Level.practiceFinished)) {
                FRAMES[Game.IS_TOUCH ? 3 : 2].applyToSprite(this.baseSprite);
                if (!Game.IS_TOUCH && this.inited) {
                    this.control.bounds = this.baseSprite;
                }
            }
            else {
                FRAMES[Game.IS_TOUCH ? 1 : 0].applyToSprite(this.baseSprite);
                if (!Game.IS_TOUCH && this.inited) {
                    this.control.bounds = Game.LevelFrame.spr;
                }
            }
        };
        PauseButton.prototype.onDrawButtons = function () {
            this.baseSprite.render();
        };
        PauseButton.prototype.onClearScene = function () {
            PauseButton.instance = null;
        };
        PauseButton.instance = null;
        return PauseButton;
    }(Game.Button));
    Game.PauseButton = PauseButton;
})(Game || (Game = {}));
///<reference path="../../../System/Button.ts"/>
var Game;
(function (Game) {
    var FRAMES;
    Game.addAction("configure", function () {
        FRAMES = Game.FrameSelector.complex("reset button", Game.Resources.texgam, 726, 198);
    });
    var ResetButton = /** @class */ (function (_super) {
        __extends(ResetButton, _super);
        function ResetButton() {
            var _this = _super.call(this) || this;
            ResetButton.instance = _this;
            _this.bounds.enabled = true;
            _this.bounds.pinned = true;
            _this.fix();
            _this.anchor.xAlignBounds = Utils.AnchorAlignment.START;
            _this.anchor.xAlignView = Utils.AnchorAlignment.START;
            _this.anchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.anchor.yAlignView = Utils.AnchorAlignment.START;
            _this.anchor.xAligned = Game.X_BUTTONS_LEFT + Game.MusicButton.instance.bounds.xSize + Game.X_SEPARATION_BUTTONS_LEFT + Game.SoundButton.instance.bounds.xSize + Game.X_SEPARATION_BUTTONS_LEFT + Game.PauseButton.instance.baseSprite.xSize + Game.X_SEPARATION_BUTTONS_LEFT;
            _this.anchor.yAligned = Game.Y_BUTTONS_TOP;
            _this.arrows.yOffset = Game.Y_ARROWS_GAME_BUTTONS;
            _this.control.useKeyboard = true;
            _this.control.keys = [Engine.Keyboard.R];
            return _this;
            //this.control.onPressedDelegate = this.onPressed;
        }
        ResetButton.prototype.setPracticeRealign = function () {
            this.anchor.xAligned = Game.X_BUTTONS_LEFT + Game.MusicButton.instance.bounds.xSize + Game.X_SEPARATION_BUTTONS_LEFT + Game.SoundButton.instance.bounds.xSize + Game.X_SEPARATION_BUTTONS_LEFT + Game.PauseButton.instance.baseSprite.xSize + Game.X_SEPARATION_BUTTONS_LEFT;
        };
        ResetButton.prototype.setPracticeAlign = function () {
            this.anchor.xAligned = Game.X_BUTTONS_LEFT + (Game.PauseButton.instance != null ? Game.PauseButton.instance.baseSprite.xSize + Game.X_SEPARATION_BUTTONS_LEFT : 0);
        };
        ResetButton.prototype.onStepUpdate = function () {
            if (Game.PauseButton.instance != null) {
                if (!(Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) && this.bounds.enabled) {
                    this.control.useMouse = false;
                    this.control.useTouch = false;
                    this.bounds.enabled = false;
                }
                else if ((Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) && !this.bounds.enabled) {
                    this.control.useMouse = true;
                    this.control.useTouch = true;
                    this.bounds.enabled = true;
                }
            }
        };
        ResetButton.prototype.fix = function () {
            FRAMES[Game.IS_TOUCH ? 1 : 0].applyToSprite(this.bounds);
        };
        ResetButton.prototype.onClearScene = function () {
            ResetButton.instance = null;
        };
        return ResetButton;
    }(Game.Button));
    Game.ResetButton = ResetButton;
})(Game || (Game = {}));
///<reference path="../../../System/Button.ts"/>
var Game;
(function (Game) {
    var FRAMES;
    Game.addAction("configure", function () {
        FRAMES = Game.FrameSelector.complex("sound button", Game.Resources.texgam, 850, 118);
    });
    var SoundButton = /** @class */ (function (_super) {
        __extends(SoundButton, _super);
        function SoundButton() {
            var _this = _super.call(this) || this;
            SoundButton.instance = _this;
            _this.bounds.enabled = true;
            _this.bounds.pinned = true;
            _this.fix();
            _this.anchor.xAlignBounds = Utils.AnchorAlignment.START;
            _this.anchor.xAlignView = Utils.AnchorAlignment.START;
            _this.anchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.anchor.yAlignView = Utils.AnchorAlignment.START;
            _this.anchor.xAligned = Game.X_BUTTONS_LEFT + Game.MusicButton.instance.bounds.xSize + Game.X_SEPARATION_BUTTONS_LEFT
                + (Game.PauseButton.instance != null ? Game.PauseButton.instance.baseSprite.xSize + Game.X_SEPARATION_BUTTONS_LEFT : 0);
            _this.anchor.yAligned = Game.Y_BUTTONS_TOP;
            _this.arrows.yOffset = Game.Y_ARROWS_GAME_BUTTONS;
            _this.control.useKeyboard = true;
            _this.control.keys = [Engine.Keyboard.N];
            _this.control.onPressedDelegate = _this.onPressed;
            return _this;
        }
        SoundButton.prototype.setPracticeAlign = function () {
            this.anchor.xAligned = Game.X_BUTTONS_LEFT
                + Game.ResetButton.instance.bounds.xSize + Game.X_SEPARATION_BUTTONS_LEFT
                + Game.MusicButton.instance.bounds.xSize + Game.X_SEPARATION_BUTTONS_LEFT
                + (Game.PauseButton.instance != null ? Game.PauseButton.instance.baseSprite.xSize + Game.X_SEPARATION_BUTTONS_LEFT : 0);
        };
        SoundButton.prototype.setPracticeRealign = function () {
            this.anchor.xAligned = Game.X_BUTTONS_LEFT + Game.MusicButton.instance.bounds.xSize + Game.X_SEPARATION_BUTTONS_LEFT
                + (Game.PauseButton.instance != null ? Game.PauseButton.instance.baseSprite.xSize + Game.X_SEPARATION_BUTTONS_LEFT : 0);
        };
        SoundButton.prototype.onStepUpdate = function () {
            if (Game.PauseButton.instance != null) {
                if (!(Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) && this.bounds.enabled) {
                    this.control.useMouse = false;
                    this.control.useTouch = false;
                    this.bounds.enabled = false;
                }
                else if ((Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) && !this.bounds.enabled) {
                    this.control.useMouse = true;
                    this.control.useTouch = true;
                    this.bounds.enabled = true;
                }
            }
        };
        SoundButton.prototype.onPressed = function () {
            Game.switchSoundMute();
            this.fix();
        };
        SoundButton.prototype.fix = function () {
            if (Game.SOUND_MUTED) {
                FRAMES[2 + (Game.IS_TOUCH ? 1 : 0)].applyToSprite(this.bounds);
            }
            else {
                FRAMES[0 + (Game.IS_TOUCH ? 1 : 0)].applyToSprite(this.bounds);
            }
        };
        SoundButton.prototype.onClearScene = function () {
            SoundButton.instance = null;
        };
        return SoundButton;
    }(Game.Button));
    Game.SoundButton = SoundButton;
})(Game || (Game = {}));
///<reference path="../../../System/Button.ts"/>
var Game;
(function (Game) {
    var FRAMES;
    var TimerButton = /** @class */ (function (_super) {
        __extends(TimerButton, _super);
        function TimerButton() {
            var _this = _super.call(this, new Engine.Sprite()) || this;
            _this.baseSprite = _this.bounds;
            TimerButton.instance = _this;
            _this.bounds.enabled = true;
            _this.bounds.pinned = true;
            _this.fix();
            _this.anchor.xAlignBounds = Utils.AnchorAlignment.END;
            _this.anchor.xAlignView = Utils.AnchorAlignment.END;
            _this.anchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.anchor.yAlignView = Utils.AnchorAlignment.START;
            _this.anchor.xAligned = -Game.X_BUTTONS_LEFT + 0.5;
            _this.anchor.yAligned = Game.Y_BUTTONS_TOP;
            _this.arrows.yOffset = Game.Y_ARROWS_GAME_BUTTONS;
            _this.control.useKeyboard = true;
            _this.control.keys = [Engine.Keyboard.T];
            _this.control.onPressedDelegate = _this.onPressed;
            return _this;
        }
        TimerButton.prototype.onPressed = function () {
            if (Game.Scene.nextSceneClass == null) {
                TimerButton.on = !TimerButton.on;
                this.fix();
                Game.savedat();
            }
        };
        TimerButton.prototype.onStepUpdate = function () {
            if (Game.PauseButton.instance != null) {
                if (!Game.SceneFreezer.paused && this.bounds.enabled) {
                    this.control.useMouse = false;
                    this.control.useTouch = false;
                    this.bounds.enabled = false;
                }
                else if (Game.SceneFreezer.paused && !this.bounds.enabled) {
                    this.control.useMouse = true;
                    this.control.useTouch = true;
                    this.bounds.enabled = true;
                }
            }
        };
        TimerButton.prototype.fix = function () {
            if (TimerButton.on) {
                FRAMES[Game.IS_TOUCH ? 3 : 2].applyToSprite(this.baseSprite);
            }
            else {
                FRAMES[Game.IS_TOUCH ? 1 : 0].applyToSprite(this.baseSprite);
            }
        };
        TimerButton.prototype.onDrawButtons = function () {
            this.baseSprite.render();
        };
        TimerButton.prototype.onClearScene = function () {
            TimerButton.instance = null;
        };
        TimerButton.on = false;
        return TimerButton;
    }(Game.Button));
    Game.TimerButton = TimerButton;
})(Game || (Game = {}));
var Game;
(function (Game) {
    Game.LEVEL_TEXT_UNPAUSED_ALPHA = 0.5;
    Game.LEVEL_TEXT_UNPAUSED_OFFSET = -30 + 6 - 1 + 1;
    var LevelText = /** @class */ (function (_super) {
        __extends(LevelText, _super);
        function LevelText() {
            var _this = _super.call(this) || this;
            _this.text = new Utils.Text();
            _this.text.font = Game.FontManager.a;
            _this.text.scale = 1;
            _this.text.enabled = Game.LevelUIAlignment.enalev;
            _this.text.pinned = true;
            _this.text.str = "STAGE " + Game.Level.index;
            _this.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            _this.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.text.yAlignBounds = Utils.AnchorAlignment.START;
            _this.text.yAlignView = Utils.AnchorAlignment.START;
            _this.text.xAligned = Game.Level.index < 100 ? 0 : -2;
            _this.text.yAligned = Game.Y_BUTTONS_TOP + 2.5;
            if (Game.IS_TOUCH) {
                //this.text0.enabled = false;
            }
            _this.fix();
            _this.onStepUpdate();
            return _this;
        }
        LevelText.prototype.fix = function () {
            if (Engine.Renderer.xSizeView > 360) {
                this.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
                this.text.xAligned = Game.Level.index < 100 ? 0 : -2;
            }
            else {
                this.text.xAlignView = Utils.AnchorAlignment.START;
                var posLeft = Game.X_BUTTONS_LEFT + Game.MusicButton.instance.bounds.xSize
                    + Game.X_SEPARATION_BUTTONS_LEFT + Game.SoundButton.instance.bounds.xSize
                    + Game.X_SEPARATION_BUTTONS_LEFT + Game.PauseButton.instance.baseSprite.xSize
                    + Game.X_SEPARATION_BUTTONS_LEFT + Game.ResetButton.instance.bounds.xSize;
                var posRight = Engine.Renderer.xSizeView - Game.X_BUTTONS_LEFT - Game.ExitButton.instance.bounds.xSize;
                this.text.xAligned = posLeft + (posRight - posLeft) * 0.5;
            }
        };
        LevelText.prototype.onStepUpdate = function () {
            if (!(Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) && this.text.enabled) {
                this.text.enabled = false;
            }
            else if ((Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) && !this.text.enabled) {
                this.text.enabled = true;
                this.fix();
            }
        };
        LevelText.prototype.onViewUpdate = function () {
            this.fix();
        };
        LevelText.prototype.onDrawUIDialogs = function () {
        };
        return LevelText;
    }(Engine.Entity));
    Game.LevelText = LevelText;
})(Game || (Game = {}));
var Game;
(function (Game) {
    Game.LEVEL_TEXT_UNPAUSED_ALPHA = 0.5;
    Game.LEVEL_TEXT_UNPAUSED_OFFSET = -30 + 6 - 1 + 1;
    var SpeedrunLevelText = /** @class */ (function (_super) {
        __extends(SpeedrunLevelText, _super);
        function SpeedrunLevelText() {
            var _this = _super.call(this) || this;
            _this.text = new Utils.Text();
            _this.text.font = Game.FontManager.a;
            _this.text.scale = 1;
            _this.text.enabled = true;
            _this.text.pinned = true;
            _this.text.str = "STAGE " + Game.Level.index;
            _this.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            _this.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.text.yAlignBounds = Utils.AnchorAlignment.START;
            _this.text.yAlignView = Utils.AnchorAlignment.START;
            _this.text.xAligned = Game.Level.index < 100 ? 0 : -2;
            _this.text.yAligned = Game.Y_BUTTONS_TOP + 2.5;
            if (Game.IS_TOUCH) {
                //this.text0.enabled = false;
            }
            _this.fix();
            _this.onStepUpdate();
            return _this;
        }
        SpeedrunLevelText.prototype.fix = function () {
            if (Engine.Renderer.xSizeView > 360) {
                this.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
                this.text.xAligned = Game.Level.index < 100 ? 0 : -2;
            }
            else {
                this.text.xAlignView = Utils.AnchorAlignment.START;
                var posLeft = Game.X_BUTTONS_LEFT + Game.MusicButton.instance.bounds.xSize
                    + Game.X_SEPARATION_BUTTONS_LEFT + Game.SoundButton.instance.bounds.xSize
                    + Game.X_SEPARATION_BUTTONS_LEFT + Game.PauseButton.instance.baseSprite.xSize
                    + Game.X_SEPARATION_BUTTONS_LEFT + Game.ResetButton.instance.bounds.xSize;
                var posRight = Engine.Renderer.xSizeView - Game.X_BUTTONS_LEFT - Game.ExitButton.instance.bounds.xSize;
                this.text.xAligned = posLeft + (posRight - posLeft) * 0.5;
            }
        };
        SpeedrunLevelText.prototype.onStepUpdate = function () {
            if (!Game.SceneFreezer.paused && this.text.enabled) {
                this.text.enabled = false;
            }
            else if (Game.SceneFreezer.paused && !this.text.enabled) {
                this.text.enabled = true;
                this.fix();
            }
        };
        SpeedrunLevelText.prototype.onViewUpdate = function () {
            this.fix();
        };
        SpeedrunLevelText.prototype.onDrawUIDialogs = function () {
        };
        return SpeedrunLevelText;
    }(Engine.Entity));
    Game.SpeedrunLevelText = SpeedrunLevelText;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var LevelTimer;
    (function (LevelTimer) {
        LevelTimer.preserved = false;
        var hor;
        var ver;
        var tex;
        var pau;
        var ste;
        function mak() {
            Engine.System.addListenersFrom(Game.LevelTimer);
            hor = Game.LevelUIAlignment.hortim;
            ver = Game.LevelUIAlignment.vertim;
            tex = new Utils.Text();
            tex.font = Game.Level.speedrun ? Game.FontManager.c : Game.FontManager.a;
            tex.scale = 1;
            tex.enabled = Game.LevelUIAlignment.enatim;
            tex.pinned = true;
            tex.str = Game.Level.countStepsSpeedrun == 0 ? "0.00" : Game.SpeedrunTimer.getTextValue(Game.Level.countStepsSpeedrun);
            tex.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            tex.xAlignView = Utils.AnchorAlignment.MIDDLE;
            tex.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            tex.yAlignView = Utils.AnchorAlignment.MIDDLE;
            tex.xAligned = 0;
            tex.front = true;
            tex.enabled = true;
            onViewUpdate();
        }
        LevelTimer.mak = mak;
        function onReset() {
            ste = 0;
        }
        LevelTimer.onReset = onReset;
        function onViewUpdate() {
            if (Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) {
                tex.enabled = !Game.Level.practice || !Game.Level.practiceFinished;
                tex.xAlignView = Utils.AnchorAlignment.MIDDLE;
                tex.yAlignView = Utils.AnchorAlignment.END;
                tex.xAligned = 0;
                tex.yAligned = 3 + (Game.TimerButton.on ? -15 : -8) + 7;
            }
            else {
                tex.enabled = true;
                tex.xAlignView = Utils.AnchorAlignment.MIDDLE;
                tex.yAlignView = Utils.AnchorAlignment.MIDDLE;
                tex.xAligned = hor * (Engine.Renderer.xSizeView * 0.5 - 19.5 + 2 - 0.5 + (Game.plu ? 3 : 0) - (Game.plu && Game.LevelUIAlignment.imglev > 0 ? 1.5 : 0)) + Game.LevelUIAlignment.hortimoff;
                tex.yAligned = ver * (Engine.Renderer.ySizeView * 0.5 - 5 - 7 + 7) + Game.LevelUIAlignment.vertimoff;
            }
            pau = Game.SceneFreezer.paused;
        }
        LevelTimer.onViewUpdate = onViewUpdate;
        function onStepUpdate() {
            if (!Game.Goal.win && !Game.pla.los && !Game.SceneFreezer.stopedWitoutPause) {
                tex.str = Game.SpeedrunTimer.getTextValue(++ste);
            }
            if (pau != Game.SceneFreezer.paused) {
                onViewUpdate();
            }
        }
        LevelTimer.onStepUpdate = onStepUpdate;
        function goalReached() {
            //LevelTimerFrame.spr.enabled=false;
            //LevelTimerFrame.sprtex.enabled=false;
            Game.PracticePausedFrame.spr.enabled = false;
            Game.LevelPauseUI.instance.text.str = "STAGE TIME: " + tex.str;
            //LevelTimer.instance.text.enabled=false;
            //LevelTimer.instance.textLevel.enabled=false;
            Game.ResetButton.instance.setPracticeAlign();
            Game.MusicButton.instance.setPracticeAlign();
            Game.SoundButton.instance.setPracticeAlign();
        }
        LevelTimer.goalReached = goalReached;
        function fixOnReset() {
            //LevelTimerFrame.spr.enabled=true;
            //LevelTimerFrame.sprtex.enabled=true;
            Game.PracticePausedFrame.spr.enabled = true;
            Game.LevelPauseUI.instance.text.str = Game.LevelPauseUI.STR;
            //LevelTimer.instance.text.enabled=true;
            //LevelTimer.instance.textLevel.enabled=true;
            Game.PauseButton.instance.setPracticeRealign();
            Game.MusicButton.instance.setPracticeRealign();
            Game.SoundButton.instance.setPracticeRealign();
            Game.ResetButton.instance.setPracticeRealign();
        }
        LevelTimer.fixOnReset = fixOnReset;
    })(LevelTimer = Game.LevelTimer || (Game.LevelTimer = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var LevelUIAlignment;
    (function (LevelUIAlignment) {
        function fin() {
            if (Game.Level.speedrun) {
                LevelUIAlignment.enalev = true;
                LevelUIAlignment.extlev = false;
                LevelUIAlignment.alplev = 1;
                LevelUIAlignment.imglev = 0;
                LevelUIAlignment.horlev = -1;
                LevelUIAlignment.verlev = -1;
                LevelUIAlignment.enaspe = true;
                LevelUIAlignment.extspe = false;
                LevelUIAlignment.alpspe = 1;
                LevelUIAlignment.imgspe = 1;
                LevelUIAlignment.horspe = 1;
                LevelUIAlignment.verspe = 1;
                LevelUIAlignment.horspeoff = 0;
                LevelUIAlignment.verspeoff = 0;
                LevelUIAlignment.enatim = true;
                LevelUIAlignment.exttim = false;
                LevelUIAlignment.alptim = 1;
                LevelUIAlignment.imgtim = 0;
                LevelUIAlignment.hortim = -1;
                LevelUIAlignment.vertim = -1;
                LevelUIAlignment.hortimoff = 0;
                LevelUIAlignment.vertimoff = 0;
                spe();
                if (LevelUIAlignment.imglev == 1) {
                    LevelUIAlignment.horspe = LevelUIAlignment.horlev;
                    LevelUIAlignment.verspe = LevelUIAlignment.verlev;
                    LevelUIAlignment.imgspe = -1;
                    LevelUIAlignment.horspeoff = -LevelUIAlignment.horlev * 3;
                    LevelUIAlignment.verspeoff = LevelUIAlignment.verlev < 0 ? 7 : 0;
                }
                else if (LevelUIAlignment.imglev == 2) {
                    LevelUIAlignment.hortim = LevelUIAlignment.horspe = LevelUIAlignment.horlev;
                    LevelUIAlignment.vertim = LevelUIAlignment.verspe = LevelUIAlignment.verlev;
                    LevelUIAlignment.imgtim = LevelUIAlignment.imgspe = -1;
                    LevelUIAlignment.hortimoff = LevelUIAlignment.horspeoff = -LevelUIAlignment.horspe * 3;
                    LevelUIAlignment.verspeoff = -LevelUIAlignment.verlev * 7;
                    LevelUIAlignment.vertimoff = LevelUIAlignment.verlev < 0 ? 14 : 0;
                }
                else if (LevelUIAlignment.imgspe == 1) {
                    LevelUIAlignment.hortim = LevelUIAlignment.horspe;
                    LevelUIAlignment.vertim = LevelUIAlignment.verspe;
                    LevelUIAlignment.imgtim = -1;
                    LevelUIAlignment.verspeoff = LevelUIAlignment.vertim > 0 ? -7 : 0;
                    LevelUIAlignment.vertimoff = LevelUIAlignment.vertim < 0 ? 7 : 0;
                }
            }
            else if (Game.Level.practice) {
                LevelUIAlignment.enalev = true;
                LevelUIAlignment.extlev = false;
                LevelUIAlignment.alplev = 1;
                LevelUIAlignment.imglev = 0;
                LevelUIAlignment.horlev = 1;
                LevelUIAlignment.verlev = -1;
                LevelUIAlignment.enatim = true;
                LevelUIAlignment.exttim = false;
                LevelUIAlignment.alptim = 1;
                LevelUIAlignment.imgtim = 0;
                LevelUIAlignment.hortim = 1;
                LevelUIAlignment.vertim = 1;
                LevelUIAlignment.hortimoff = 0;
                LevelUIAlignment.vertimoff = 0;
                pra();
                if (LevelUIAlignment.imglev > 0) {
                    LevelUIAlignment.enatim = false;
                    LevelUIAlignment.hortim = LevelUIAlignment.horlev;
                    LevelUIAlignment.vertim = LevelUIAlignment.verlev;
                    LevelUIAlignment.hortimoff = -LevelUIAlignment.horlev * 3;
                    LevelUIAlignment.vertimoff = LevelUIAlignment.verlev < 0 ? 7 : 0;
                }
            }
            else {
                LevelUIAlignment.enalev = true;
                LevelUIAlignment.extlev = false;
                LevelUIAlignment.alplev = 1;
                LevelUIAlignment.imglev = 0;
                LevelUIAlignment.horlev = 1;
                LevelUIAlignment.verlev = -1;
                def();
            }
        }
        LevelUIAlignment.fin = fin;
        function def() {
        }
        LevelUIAlignment.def = def;
        function pra() {
            LevelUIAlignment.imglev = 0;
            LevelUIAlignment.horlev = 1;
            LevelUIAlignment.verlev = -1;
            LevelUIAlignment.imgtim = 0;
            LevelUIAlignment.hortim = 0;
            LevelUIAlignment.vertim = -1;
        }
        LevelUIAlignment.pra = pra;
        function spe() {
            LevelUIAlignment.imglev = 0;
            LevelUIAlignment.horlev = 0;
            LevelUIAlignment.verlev = -1;
            LevelUIAlignment.imgspe = 1;
            LevelUIAlignment.horspe = 1;
            LevelUIAlignment.verspe = -1;
        }
        LevelUIAlignment.spe = spe;
    })(LevelUIAlignment = Game.LevelUIAlignment || (Game.LevelUIAlignment = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var LevelUnpausedText;
    (function (LevelUnpausedText) {
        LevelUnpausedText.preserved = false;
        var hor;
        var ver;
        var ind;
        var tex;
        var pau;
        function mak() {
            Engine.System.addListenersFrom(Game.LevelUnpausedText);
            hor = Game.LevelUIAlignment.horlev;
            ver = Game.LevelUIAlignment.verlev;
            ind = Game.LevelUIAlignment.imglev;
            tex = new Utils.Text();
            tex.font = Game.FontManager.a;
            tex.scale = 1;
            tex.enabled = true;
            tex.pinned = true;
            tex.str = "STAGE " + Game.Level.index;
            tex.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            tex.xAlignView = Utils.AnchorAlignment.MIDDLE;
            tex.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            tex.yAlignView = Utils.AnchorAlignment.MIDDLE;
            tex.xAligned = (Game.plu ? 2.5 : 0) + (Game.Level.index < 100 ? 0 : -2);
            tex.yAligned = Game.Y_BUTTONS_TOP + 2.5;
            tex.front = true;
            onViewUpdate();
        }
        LevelUnpausedText.mak = mak;
        function onViewUpdate() {
            if (Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) {
                tex.enabled = false;
            }
            else {
                tex.enabled = true;
                tex.xAlignView = Utils.AnchorAlignment.MIDDLE;
                tex.yAlignView = Utils.AnchorAlignment.MIDDLE;
                tex.xAligned = hor * (Engine.Renderer.xSizeView * 0.5 - 21 + (Game.plu ? 1.5 : 0));
                tex.yAligned = ver * (Engine.Renderer.ySizeView * 0.5 - 5 - 0) - (ver > 0 ? 7 * ind : 0);
            }
            pau = Game.SceneFreezer.paused;
        }
        LevelUnpausedText.onViewUpdate = onViewUpdate;
        function onStepUpdate() {
            if (pau != Game.SceneFreezer.paused)
                onViewUpdate();
        }
        LevelUnpausedText.onStepUpdate = onStepUpdate;
    })(LevelUnpausedText = Game.LevelUnpausedText || (Game.LevelUnpausedText = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    Game.EXTRA_DIALOG_ALPHA = 0.6;
    var SpeedrunTimer = /** @class */ (function (_super) {
        __extends(SpeedrunTimer, _super);
        function SpeedrunTimer() {
            var _this = _super.call(this) || this;
            _this.text = new Utils.Text();
            _this.text.font = Game.FontManager.a;
            _this.text.scale = 1;
            _this.text.pinned = true;
            _this.text.str = Game.Level.countStepsSpeedrun == 0 ? "0.00" : SpeedrunTimer.getTextValue(Game.Level.countStepsSpeedrun);
            _this.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            _this.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            _this.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.text.xAligned = 0;
            _this.text.front = true;
            //this.text.enabled=Level.speedrun&&LevelUIAlignment.enaspe;
            new Game.TimerPausedFrame();
            _this.fix();
            return _this;
        }
        SpeedrunTimer.prototype.fix = function () {
            if (!Game.SceneFreezer.paused) {
                this.text.enabled = Game.Level.speedrun && Game.LevelUIAlignment.enaspe;
                this.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
                this.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
                this.text.xAligned = Game.LevelUIAlignment.horspe * (Engine.Renderer.xSizeView * 0.5 - 19.5 + 2 - 0.5 + (Game.plu ? 3 : 0) - (Game.plu && Game.LevelUIAlignment.imglev > 0 ? 1.5 : 0)) + Game.LevelUIAlignment.horspeoff;
                this.text.yAligned = Game.LevelUIAlignment.verspe * (Engine.Renderer.ySizeView * 0.5 - 5) + Game.LevelUIAlignment.verspeoff;
            }
            else {
                this.text.enabled = Game.Level.speedrun;
                this.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
                this.text.yAlignView = Utils.AnchorAlignment.END;
                this.text.xAligned = 0;
                this.text.yAligned = 3 + (Game.TimerButton.on ? -15 : -8);
            }
            this.oldPaused = Game.SceneFreezer.paused;
        };
        SpeedrunTimer.prototype.onReset = function () {
        };
        SpeedrunTimer.prototype.onViewUpdate = function () {
            this.fix();
        };
        SpeedrunTimer.getTextValue = function (stepsTime) {
            var text = "9999.99";
            if (stepsTime > 0) {
                var seconds = new Int32Array([stepsTime / 60]);
                if (seconds[0] <= 9999) {
                    var milliseconds = new Int32Array([(stepsTime - seconds[0] * 60) * 1000.0 * (1.0 / 60.0)]);
                    text = seconds[0] + ".";
                    if (milliseconds[0] < 10) {
                        text += "00" + milliseconds[0];
                    }
                    else if (milliseconds[0] < 100) {
                        text += "0" + milliseconds[0];
                    }
                    else {
                        text += milliseconds[0];
                    }
                }
                text = text.substring(0, text.length - 1);
            }
            //text = "9999.99";
            return text;
        };
        SpeedrunTimer.getValue = function (stepsTime) {
            var value = 9999999;
            if (stepsTime > 0) {
                var seconds = new Int32Array([stepsTime / 60]);
                if (seconds[0] <= 9999) {
                    var milliseconds = new Int32Array([(stepsTime - seconds[0] * 60) * 1000.0 * (1.0 / 60.0)]);
                    value = seconds[0] * 1000 + milliseconds[0];
                }
            }
            return value;
        };
        SpeedrunTimer.prototype.onStepUpdate = function () {
            if (!Game.Goal.win && !Game.pla.los && !Game.SceneFreezer.stopedWitoutPause) {
                this.text.str = SpeedrunTimer.getTextValue(++Game.Level.countStepsSpeedrun);
            }
            if (this.oldPaused != Game.SceneFreezer.paused) {
                this.fix();
            }
        };
        return SpeedrunTimer;
    }(Engine.Entity));
    Game.SpeedrunTimer = SpeedrunTimer;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var Arrows = /** @class */ (function (_super) {
        __extends(Arrows, _super);
        function Arrows() {
            var _this = _super.call(this) || this;
            _this.enabled = true;
            _this.xOffset = 0;
            _this.xOffset2 = 0;
            _this.yOffset = 0;
            _this.arrowLeft = new Utils.Text();
            _this.arrowLeft.owner = _this;
            _this.arrowLeft.str = ">";
            _this.arrowLeft.font = Game.FontManager.a;
            _this.arrowLeft.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.arrowLeft.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.arrowLeft.xAlignBounds = Utils.AnchorAlignment.END;
            _this.arrowLeft.yAlignBounds = Utils.AnchorAlignment.START;
            _this.arrowRight = new Utils.Text();
            _this.arrowRight.owner = _this;
            _this.arrowRight.str = "<";
            _this.arrowRight.font = Game.FontManager.a;
            _this.arrowRight.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.arrowRight.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.arrowRight.xAlignBounds = Utils.AnchorAlignment.START;
            _this.arrowRight.yAlignBounds = Utils.AnchorAlignment.START;
            return _this;
        }
        Object.defineProperty(Arrows.prototype, "font", {
            set: function (value) {
                this.arrowLeft.font = value;
                this.arrowRight.font = value;
            },
            enumerable: false,
            configurable: true
        });
        Arrows.prototype.onTimeUpdate = function () {
            this.arrowLeft.enabled = false;
            this.arrowRight.enabled = false;
            //console.log(this.bounds.selected);
            if (this.control.selected) {
                this.arrowLeft.enabled = this.enabled && this.bounds.enabled;
                this.arrowRight.enabled = this.enabled && this.bounds.enabled;
                this.arrowLeft.pinned = this.bounds.pinned;
                this.arrowRight.pinned = this.bounds.pinned;
                this.arrowLeft.xAligned = this.bounds.x - this.arrowLeft.font.xOffset - this.xOffset;
                this.arrowLeft.yAligned = this.bounds.y + this.yOffset;
                this.arrowRight.xAligned = this.bounds.x + this.bounds.xSize * this.bounds.xScale + this.arrowLeft.font.xOffset + this.xOffset + this.xOffset2;
                this.arrowRight.yAligned = this.bounds.y + this.yOffset;
            }
        };
        return Arrows;
    }(Engine.Entity));
    Game.Arrows = Arrows;
})(Game || (Game = {}));
var Utils;
(function (Utils) {
    var Font = /** @class */ (function () {
        function Font() {
            this.ySize = 0;
            this.xOffset = 0;
        }
        Font.prototype.setFull = function (texture, xTexture, yTexture, xOffset) {
            this.texture = texture;
            this.frames = Game.FrameSelector.complex("font", texture, xTexture, yTexture);
            this.xOffset = xOffset;
            this.ySize = this.frames[0].ySize;
            return this;
        };
        return Font;
    }());
    Utils.Font = Font;
})(Utils || (Utils = {}));
///<reference path="../Utils/Font.ts"/>
var Game;
(function (Game) {
    var FontManager = /** @class */ (function () {
        function FontManager() {
        }
        FontManager.createFondts = function () {
            var off = Game.plu ? 0 : 1;
            FontManager.a = new Utils.Font();
            FontManager.a.setFull(Game.Resources.texgam, 0, 118, off);
            FontManager.b = new Utils.Font();
            FontManager.b.setFull(Game.Resources.texgam, 0, 159, off);
            FontManager.c = new Utils.Font();
            FontManager.c.setFull(Game.Resources.texgam, 0, 200, off);
            FontManager.d = new Utils.Font();
            FontManager.d.setFull(Game.Resources.texgam, 0, 241, off);
            FontManager.e = new Utils.Font();
            FontManager.e.setFull(Game.Resources.texgam, 0, 282, off);
            FontManager.f = new Utils.Font();
            FontManager.f.setFull(Game.Resources.texgam, 0, 323, off);
        };
        return FontManager;
    }());
    Game.FontManager = FontManager;
    Game.addAction("init", function () {
        FontManager.createFondts();
    });
})(Game || (Game = {}));
var Game;
(function (Game) {
    var offsetFrame = 0;
    var testFrames = null;
    Game.DEBUG_FRAME_SELECTOR = false;
    if (Game.DEBUG_FRAME_SELECTOR) {
        Game.addAction("start", function () {
            //console.log(testFrames);
            //console.log(JSON.stringify(testFrames));
        });
    }
    Game.xBlackFrameSelector = 0;
    Game.yBlackFrameSelector = 0;
    Game.xWhiteFrameSelector = 0;
    Game.yWhiteFrameSelector = 1;
    var FrameSelector = /** @class */ (function () {
        function FrameSelector() {
        }
        FrameSelector.complex = function (message, texture, x, y, frames, offset, extrude) {
            if (frames === void 0) { frames = new Array(); }
            if (offset === void 0) { offset = 0; }
            if (extrude === void 0) { extrude = false; }
            if (frames == null)
                frames = new Array();
            colorRect.r = texture.getRed(Game.xBlackFrameSelector, Game.yBlackFrameSelector);
            colorRect.g = texture.getGreen(Game.xBlackFrameSelector, Game.yBlackFrameSelector);
            colorRect.b = texture.getBlue(Game.xBlackFrameSelector, Game.yBlackFrameSelector);
            colorRect.a = texture.getAlpha(Game.xBlackFrameSelector, Game.yBlackFrameSelector);
            colorMark.r = texture.getRed(Game.xWhiteFrameSelector, Game.yWhiteFrameSelector);
            colorMark.g = texture.getGreen(Game.xWhiteFrameSelector, Game.yWhiteFrameSelector);
            colorMark.b = texture.getBlue(Game.xWhiteFrameSelector, Game.yWhiteFrameSelector);
            colorMark.a = texture.getAlpha(Game.xWhiteFrameSelector, Game.yWhiteFrameSelector);
            if (testFrames == null) {
                testFrames = {};
                if (Game.DEBUG_FRAME_SELECTOR) {
                    console.error("DEBUG_FRAME_SELECTOR ONLY FOR TESTING");
                }
            }
            if (Game.DEBUG_FRAME_SELECTOR) {
                console.log(message);
            }
            offsetFrame = offset;
            var oldLength = frames.length;
            findHorizontalFrames(frames, texture, x, y);
            var jsonFrames = {};
            var count = 0;
            for (var index = oldLength; index < frames.length; index += 1) {
                frames[index].extrude = extrude;
                jsonFrames[count + ""] = frames[index].getGeneric();
                count += 1;
            }
            testFrames[texture.path + " " + x + " " + y] = jsonFrames;
            return frames;
        };
        return FrameSelector;
    }());
    Game.FrameSelector = FrameSelector;
    var colorRect = { r: 0, g: 0, b: 0, a: 255 };
    var colorMark = { r: 255, g: 255, b: 255, a: 255 };
    function findHorizontalFrames(frames, texture, x, y) {
        var xLimit = xFindLimit(texture, x, y);
        var yLimit = yFindLimit(texture, x, y);
        var xSearch = x + 2;
        var ySearch = y + 2;
        while (xSearch < xLimit - 3) {
            var frame = new Utils.AnimationFrame();
            frames.push(frame);
            xSearch = initComplexFrame(frame, texture, xSearch, ySearch) + 1;
            if (xSearch > texture.assetData.xSize) {
                throw "Error searching";
            }
        }
        var color = {};
        copyColor(color, texture, x, yLimit);
        if (compareColor(color, colorRect)) {
            findHorizontalFrames(frames, texture, x, yLimit - 1);
        }
    }
    function initComplexFrame(frame, texture, x, y) {
        var xLimit = xFindLimit(texture, x, y);
        var yLimit = yFindLimit(texture, x, y);
        var colorSearch = {};
        var xMarkOffsetStart = 0;
        var xMarkOffsetEnd = 0;
        var xBoxStart = 0;
        var xBoxEnd = 0;
        for (var xIndex = x + 1; xIndex < xLimit - 1; xIndex += 1) {
            copyColor(colorSearch, texture, xIndex, y);
            if (compareColor(colorSearch, colorMark)) {
                if (xBoxStart == 0) {
                    xBoxStart = xIndex;
                }
                xBoxEnd = xIndex + 1;
            }
            copyColor(colorSearch, texture, xIndex, yLimit - 1);
            if (compareColor(colorSearch, colorMark)) {
                if (xMarkOffsetStart == 0) {
                    xMarkOffsetStart = xIndex;
                }
                xMarkOffsetEnd = xIndex + 1;
            }
        }
        var yMarkOffsetStart = 0;
        var yMarkOffsetEnd = 0;
        var yBoxStart = 0;
        var yBoxEnd = 0;
        for (var yIndex = y + 1; yIndex < yLimit - 1; yIndex += 1) {
            copyColor(colorSearch, texture, x, yIndex);
            if (compareColor(colorSearch, colorMark)) {
                if (yBoxStart == 0) {
                    yBoxStart = yIndex;
                }
                yBoxEnd = yIndex + 1;
            }
            copyColor(colorSearch, texture, xLimit - 1, yIndex);
            if (compareColor(colorSearch, colorMark)) {
                if (yMarkOffsetStart == 0) {
                    yMarkOffsetStart = yIndex;
                }
                yMarkOffsetEnd = yIndex + 1;
            }
        }
        frame.texture = texture;
        frame.xSize = xLimit - 2 - (x + 2) - offsetFrame * 2;
        frame.ySize = yLimit - 2 - (y + 2) - offsetFrame * 2;
        frame.xTexture = x + 2 + offsetFrame;
        frame.yTexture = y + 2 + offsetFrame;
        if (xMarkOffsetStart > 0) {
            frame.xOffset = frame.xTexture - xMarkOffsetStart - (xMarkOffsetEnd - xMarkOffsetStart) * 0.5;
        }
        if (yMarkOffsetStart > 0) {
            frame.yOffset = frame.yTexture - yMarkOffsetStart - (yMarkOffsetEnd - yMarkOffsetStart) * 0.5;
        }
        if (xBoxStart > 0) {
            frame.hasBox = true;
            frame.xSizeBox = xBoxEnd - xBoxStart;
            if (xMarkOffsetStart > 0) {
                frame.xOffsetBox = xBoxStart - xMarkOffsetStart - (xMarkOffsetEnd - xMarkOffsetStart) * 0.5;
            }
        }
        else if (yBoxStart > 0) {
            frame.hasBox = true;
            frame.xSizeBox = frame.xSize;
            if (xMarkOffsetStart > 0) {
                frame.xOffsetBox = frame.xTexture - xMarkOffsetStart - (xMarkOffsetEnd - xMarkOffsetStart) * 0.5;
            }
        }
        if (yBoxStart > 0) {
            frame.hasBox = true;
            frame.ySizeBox = yBoxEnd - yBoxStart;
            if (yMarkOffsetStart > 0) {
                frame.yOffsetBox = yBoxStart - yMarkOffsetStart - (yMarkOffsetEnd - yMarkOffsetStart) * 0.5;
            }
        }
        else if (xBoxStart > 0) {
            frame.hasBox = true;
            frame.ySizeBox = frame.ySize;
            if (yMarkOffsetStart > 0) {
                frame.yOffsetBox = frame.yTexture - yMarkOffsetStart - (yMarkOffsetEnd - yMarkOffsetStart) * 0.5;
            }
        }
        return xLimit;
    }
    function xFindLimit(texture, x, y) {
        var colorCompare = {};
        y += 1;
        do {
            x += 1;
            copyColor(colorCompare, texture, x, y);
            if (x > texture.assetData.xSize) {
                throw "Error searching";
            }
        } while (!compareColor(colorCompare, colorRect) && !compareColor(colorCompare, colorMark));
        return x += 1;
    }
    function yFindLimit(texture, x, y) {
        var colorCompare = {};
        x += 1;
        do {
            y += 1;
            copyColor(colorCompare, texture, x, y);
            if (y > texture.assetData.ySize) {
                throw "Error searching";
            }
        } while (!compareColor(colorCompare, colorRect) && !compareColor(colorCompare, colorMark));
        return y += 1;
    }
    function copyColor(color, texture, x, y) {
        color.r = texture.getRed(x, y);
        color.g = texture.getGreen(x, y);
        color.b = texture.getBlue(x, y);
        color.a = texture.getAlpha(x, y);
    }
    function compareColor(colorA, colorB) {
        return colorA.r == colorB.r && colorA.g == colorB.g && colorA.b == colorB.b && colorA.a == colorB.a;
    }
})(Game || (Game = {}));
var Game;
(function (Game) {
    var PATH_MUSIC = "Assets/Audio/Komiku_-_33_-_Space_MTV.omw";
    var patjum = "Assets/Audio/jum.wom";
    var patcoi = "Assets/Audio/coi.wom";
    var patgoa = "Assets/Audio/goa.wom";
    var patdea = "Assets/Audio/dea.wom";
    var patgey = "Assets/Audio/gey.wom";
    var patmed = "Assets/Audio/med.wom";
    var patcac = "Assets/Audio/cac.wom";
    var patcacbac = "Assets/Audio/cacbac.wom";
    Game.PATH_TEXTURE = "Assets/Graphics/game.png";
    //export var PATH_TEXTURE_B = "Assets/Graphics/game-b.png";
    //export var PATH_TEXTURE_C = "Assets/Graphics/game-c.png";
    Game.PATH_TEXTURE_MAP_BACK = "Assets/Graphics/MapBack.png";
    Game.PATH_TEXTURE_MAP_TERRAIN = "Assets/Graphics/MapTerrain.png";
    var PATH_GOOGLE_PLAY_LOGO = "Assets/Graphics/google-play-badge.png";
    var Resources = /** @class */ (function () {
        function Resources() {
        }
        //static bgmIndex = -1;
        Resources.playBGM = function () {
            Resources.bgms[0].extraGain.gain.value = 1;
            Resources.bgms[0].autoplay();
        };
        Resources.PATH_LEVEL_TEST = "Assets/Maps/LevelTest.json";
        Resources.PATH_TILESET = "Assets/Maps/TilesetGame.json";
        Resources.PATH_MAPS = "Assets/Maps/";
        Resources.PATH_MAP_NONE = Resources.PATH_MAPS + "None.json";
        Resources.PATH_MAP_PRELOADER = Resources.PATH_MAPS + "Preloader.json";
        Resources.PATH_MAP_MAIN_MENU = Resources.PATH_MAPS + "MainMenu.json";
        Resources.PATH_MAP_MAIN_MENU_PLUS = Resources.PATH_MAPS + "MainMenuPlu.json";
        Resources.PATH_MAP_MAIN_MENU_PLUS_DNL = Resources.PATH_MAPS + "MainMenuPluDNL.json";
        Resources.PATH_MAP_MAIN_MENU_PLUS_MNL = Resources.PATH_MAPS + "MainMenuPluMNL.json";
        Resources.PATH_MAP_CREDITS = Resources.PATH_MAPS + "Credits.json";
        Resources.PATH_MAP_LEVEL_SELECTION = Resources.PATH_MAPS + "LevelSelection.json";
        Resources.PATH_MAP_SPEEDRUN_MENU = Resources.PATH_MAPS + "SpeedrunMenu.json";
        Resources.PATH_MAP_MAIN_MENU_TOUCH = Resources.PATH_MAPS + "MainMenuTouch.json";
        Resources.PATH_MAP_LAST = Resources.PATH_MAPS + "LastScene.json";
        Resources.PATH_LEVEL = Resources.PATH_MAPS + "Level";
        Resources.texgam = null;
        Resources.bgms = [];
        Resources.bgmVolumeTracker = 1;
        return Resources;
    }());
    Game.Resources = Resources;
    function getPathLevel(index) {
        return Resources.PATH_LEVEL + "" + (index < 10 ? "0" : "") + index + ".json";
    }
    Game.getPathLevel = getPathLevel;
    Game.addPath("preload", Game.PATH_TEXTURE);
    //addPath("preload", PATH_TEXTURE_B);
    //addPath("preload", PATH_TEXTURE_C);
    Game.addPath("preload", Game.PATH_TEXTURE_MAP_BACK);
    Game.addPath("preload", Game.PATH_TEXTURE_MAP_TERRAIN);
    Game.addPath("preload", Resources.PATH_TILESET);
    Game.addPath("preload", Resources.PATH_MAP_NONE);
    Game.addPath("preload", Resources.PATH_MAP_PRELOADER);
    Game.addPath("load", PATH_MUSIC);
    Game.addPath("load", patjum);
    Game.addPath("load", patcoi);
    Game.addPath("load", patgoa);
    Game.addPath("load", patdea);
    Game.addPath("load", patgey);
    Game.addPath("load", patmed);
    Game.addPath("load", patcac);
    Game.addPath("load", patcacbac);
    Game.addPath("load", Resources.PATH_LEVEL_TEST);
    Game.addPath("load", Resources.PATH_MAP_MAIN_MENU);
    Game.addPath("load", Resources.PATH_MAP_MAIN_MENU_PLUS);
    Game.addPath("load", Resources.PATH_MAP_MAIN_MENU_PLUS_DNL);
    Game.addPath("load", Resources.PATH_MAP_MAIN_MENU_PLUS_MNL);
    Game.addPath("load", Resources.PATH_MAP_MAIN_MENU_TOUCH);
    Game.addPath("load", Resources.PATH_MAP_CREDITS);
    Game.addPath("load", Resources.PATH_MAP_LEVEL_SELECTION);
    Game.addPath("load", Resources.PATH_MAP_SPEEDRUN_MENU);
    Game.addPath("load", Resources.PATH_MAP_LAST);
    for (var indexLevel = 1; indexLevel <= Game.maxlev; indexLevel += 1) {
        Game.addPath("load", getPathLevel(indexLevel));
    }
    Game.addAction("preinit", function () {
        Resources.texgam = new Engine.Texture(Game.PATH_TEXTURE, false, false);
        Resources.texgam.preserved = true;
        Resources.textureMapBack = new Engine.Texture(Game.PATH_TEXTURE_MAP_BACK, false, false);
        Resources.textureMapBack.preserved = true;
        Resources.textureMapTerrain = new Engine.Texture(Game.PATH_TEXTURE_MAP_TERRAIN, false, false);
        Resources.textureMapTerrain.preserved = true;
        //Resources.sfxGameStart = new Engine.AudioPlayer(PATH_AUDIO_GAME_START);
        //Resources.sfxGameStart.preserved = true;
        //Resources.sfxGameStart.volume = Resources.sfxGameStart.restoreVolume = 5;
        if (Game.HAS_LINKS && Game.HAS_GOOGLE_PLAY_LOGOS) {
            Game.addPath("load", PATH_GOOGLE_PLAY_LOGO);
        }
    });
    Game.addAction("preconfigure", function () {
    });
    Game.addAction("configure", function () {
        if (Game.HAS_LINKS && Game.HAS_GOOGLE_PLAY_LOGOS) {
            Resources.textureGooglePlay = new Engine.Texture(PATH_GOOGLE_PLAY_LOGO, false, true);
            Resources.textureGooglePlay.preserved = true;
        }
        var volumeScale = 0.6 * 1;
        var bgmsca = 1;
        var sfxsca = 0.71;
        Resources.bgms[0] = new Engine.AudioPlayer(PATH_MUSIC);
        Resources.bgms[0].preserved = true;
        Resources.bgms[0].volume = Resources.bgms[0].restoreVolume = 1.16 * volumeScale * bgmsca;
        Resources.bgms[0].loopStart = 10.66;
        Resources.bgms[0].loopEnd = 160;
        Game.bgms.push(Resources.bgms[0]);
        Resources.audjum = new Engine.AudioPlayer(patjum);
        Resources.audjum.preserved = true;
        Resources.audjum.volume = Resources.audjum.restoreVolume = 5.0 * volumeScale * sfxsca;
        Game.sfxs.push(Resources.audjum);
        Resources.audcoi = new Engine.AudioPlayer(patcoi);
        Resources.audcoi.preserved = true;
        Resources.audcoi.volume = Resources.audcoi.restoreVolume = 5.0 * volumeScale * sfxsca;
        Game.sfxs.push(Resources.audcoi);
        Resources.audgoa = new Engine.AudioPlayer(patgoa);
        Resources.audgoa.preserved = true;
        Resources.audgoa.volume = Resources.audgoa.restoreVolume = 5.0 * volumeScale * sfxsca;
        Game.sfxs.push(Resources.audgoa);
        Resources.auddea = new Engine.AudioPlayer(patdea);
        Resources.auddea.preserved = true;
        Resources.auddea.volume = Resources.auddea.restoreVolume = 5.0 * volumeScale * sfxsca;
        Game.sfxs.push(Resources.auddea);
        Resources.audgey = new Engine.AudioPlayer(patgey);
        Resources.audgey.preserved = true;
        Resources.audgey.volume = Resources.audgey.restoreVolume = 0.73 * volumeScale * sfxsca;
        Game.sfxs.push(Resources.audgey);
        Resources.audmed = new Engine.AudioPlayer(patmed);
        Resources.audmed.preserved = true;
        Resources.audmed.volume = Resources.audmed.restoreVolume = 4.0 * volumeScale * sfxsca;
        Game.sfxs.push(Resources.audmed);
        Resources.audcac = new Engine.AudioPlayer(patcac);
        Resources.audcac.preserved = true;
        Resources.audcac.volume = Resources.audcac.restoreVolume = 3.0 * volumeScale * sfxsca;
        Game.sfxs.push(Resources.audcac);
        Resources.audcacbac = new Engine.AudioPlayer(patcacbac);
        Resources.audcacbac.preserved = true;
        Resources.audcacbac.volume = Resources.audcacbac.restoreVolume = 3.2 * volumeScale * sfxsca;
        Game.sfxs.push(Resources.audcacbac);
        if (Resources.bgmVolumeTracker < 1) {
            Game.muteAll();
        }
    });
})(Game || (Game = {}));
///<reference path="../../../Engine/Entity.ts"/>
var Game;
(function (Game) {
    var SceneColors = /** @class */ (function (_super) {
        __extends(SceneColors, _super);
        function SceneColors() {
            var _this = _super.call(this) || this;
            _this.usingFill = false;
            SceneColors.instance = _this;
            _this.fillUp = new Engine.Sprite();
            _this.fillUp.enabled = true;
            _this.fillUp.pinned = true;
            _this.fillUp.y = -60 - 8 - 8;
            _this.fillUp.xSize = 160;
            _this.fillUp.xOffset = -80;
            _this.fillDown = new Engine.Sprite();
            _this.fillDown.enabled = true;
            _this.fillDown.pinned = true;
            _this.fillDown.y = 120 - 48;
            _this.fillDown.xSize = 160;
            _this.fillDown.xOffset = -80;
            _this.resetColors();
            return _this;
        }
        Object.defineProperty(SceneColors, "enabledDown", {
            set: function (value) {
                SceneColors.instance.fillDown.enabled = value;
            },
            enumerable: false,
            configurable: true
        });
        SceneColors.init = function () {
            new SceneColors();
            //console.error("REMEMBER TO CHANGE THIS FOR COLOR SCHEMES. FADE AND PAUSE ALSO");
        };
        SceneColors.prototype.resetColors = function () {
            this.fillUp.setRGBA(Game.Resources.texgam.linkedTexture.getRed(2, 0) / 255.0, Game.Resources.texgam.linkedTexture.getGreen(2, 0) / 255.0, Game.Resources.texgam.linkedTexture.getBlue(2, 0) / 255.0, Game.Resources.texgam.linkedTexture.getAlpha(2, 0) / 255.0);
            this.fillDown.setRGBA(Game.Resources.texgam.linkedTexture.getRed(3, 0) / 255.0, Game.Resources.texgam.linkedTexture.getGreen(3, 0) / 255.0, Game.Resources.texgam.linkedTexture.getBlue(3, 0) / 255.0, Game.Resources.texgam.linkedTexture.getAlpha(3, 0) / 255.0);
        };
        SceneColors.prototype.onDrawSceneFill = function () {
            if (!this.usingFill)
                return;
            this.fillUp.enabled = true;
            this.fillUp.pinned = true;
            this.fillDown.enabled = true;
            this.fillDown.pinned = true;
            if (Engine.Renderer.xFitView) {
                this.fillUp.ySize = Engine.Renderer.ySizeView;
                this.fillUp.yOffset = -Engine.Renderer.ySizeView;
                this.fillUp.render();
                this.fillDown.ySize = Engine.Renderer.ySizeView;
                this.fillDown.render();
            }
        };
        SceneColors.prototype.onClearScene = function () {
            SceneColors.instance = null;
            this.usingFill = false;
        };
        return SceneColors;
    }(Engine.Entity));
    Game.SceneColors = SceneColors;
})(Game || (Game = {}));
///<reference path="../../Engine/Entity.ts"/>
var Utils;
(function (Utils) {
    var Fade = /** @class */ (function (_super) {
        __extends(Fade, _super);
        function Fade() {
            var _this = _super.call(this) || this;
            _this.speed = 0.0166666666666667 * 4;
            _this.direction = -1;
            _this.alpha = 1;
            _this.red = 228.0 / 255.0;
            _this.green = 226.0 / 255.0;
            _this.blue = 255.0 / 255.0;
            _this.maxAlpha = 1;
            _this.sprite = new Engine.Sprite();
            _this.sprite.enabled = true;
            _this.sprite.pinned = true;
            _this.sprite.setRGBA(_this.red, _this.green, _this.blue, _this.maxAlpha);
            _this.onViewUpdate();
            return _this;
        }
        Fade.prototype.onViewUpdate = function () {
            this.sprite.xSize = Engine.Renderer.xSizeView;
            this.sprite.ySize = Engine.Renderer.ySizeView;
            this.sprite.x = -Engine.Renderer.xSizeView * 0.5;
            this.sprite.y = -Engine.Renderer.ySizeView * 0.5;
        };
        Fade.prototype.onStepUpdateFade = function () {
            if (this.direction != 0) {
                this.alpha += this.speed * this.direction * Fade.scale;
                if (this.direction < 0 && this.alpha <= 0) {
                    this.direction = 0;
                    this.alpha = 0;
                    this.sprite.setRGBA(this.red, this.green, this.blue, 0);
                }
                else if (this.direction > 0 && this.alpha >= this.maxAlpha) {
                    this.direction = 0;
                    this.alpha = this.maxAlpha;
                    this.sprite.setRGBA(this.red, this.green, this.blue, this.maxAlpha);
                }
            }
        };
        Fade.prototype.onTimeUpdate = function () {
            if (this.direction != 0) {
                var extAlpha = this.alpha + this.speed * this.direction * Fade.scale * Engine.System.stepExtrapolation;
                if (this.direction < 0 && extAlpha < 0) {
                    extAlpha = 0;
                }
                else if (this.direction > 0 && extAlpha > this.maxAlpha) {
                    extAlpha = this.maxAlpha;
                }
                this.sprite.setRGBA(this.red, this.green, this.blue, extAlpha);
            }
        };
        Fade.prototype.onDrawFade = function () {
            this.sprite.render();
        };
        Fade.scale = 1;
        return Fade;
    }(Engine.Entity));
    Utils.Fade = Fade;
})(Utils || (Utils = {}));
///<reference path="../../Utils/Fade.ts"/>
var Game;
(function (Game) {
    var instance = null;
    var SceneFade = /** @class */ (function (_super) {
        __extends(SceneFade, _super);
        function SceneFade() {
            return _super.call(this) || this;
        }
        Object.defineProperty(SceneFade, "instance", {
            get: function () {
                return instance;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SceneFade, "speed", {
            set: function (value) {
                instance.speed = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SceneFade, "filled", {
            get: function () {
                return instance.alpha == 1;
            },
            enumerable: false,
            configurable: true
        });
        SceneFade.init = function () {
            instance = instance || new SceneFade();
            instance.preserved = true;
            instance.speed = 0.0833 * (0.75);
        };
        SceneFade.fixMe = function () {
            if (Game.Resources.texgam != null) {
                instance.red = Game.Resources.texgam.getRed(4, 0) / 255.0;
                instance.green = Game.Resources.texgam.getGreen(4, 0) / 255.0;
                instance.blue = Game.Resources.texgam.getBlue(4, 0) / 255.0;
            }
        };
        SceneFade.setBlack = function () {
            instance.red = 0;
            instance.green = 0;
            instance.blue = 0;
        };
        SceneFade.setCodlor = function (red, green, blue) {
            //red = 0;
            //green = 0;
            //blue = 0;
            instance.red = red / 255;
            instance.green = green / 255;
            instance.blue = blue / 255;
        };
        SceneFade.isBlack = function () {
            //console.log(instance.red + " " + instance.green + " " + instance.blue);
            return instance.red == 0 && instance.blue == 0 && instance.green == 0;
        };
        SceneFade.trigger = function () {
            instance.direction = 1;
        };
        SceneFade.prototype.onReset = function () {
            this.direction = -1;
        };
        SceneFade.prototype.onStepUpdate = function () {
            if (!Game.Scene.waiting && Game.Scene.nextSceneClass != null && this.direction != 1 && (Game.LevelAdLoader.instance == null || !Game.LevelAdLoader.blocked)) {
                Game.Scene.instance.onFadeLinStart();
                this.direction = 1;
            }
        };
        return SceneFade;
    }(Utils.Fade));
    Game.SceneFade = SceneFade;
})(Game || (Game = {}));
///<reference path="../../../Engine/Entity.ts"/>
var Game;
(function (Game) {
    var instance = null;
    var SceneFreezer = /** @class */ (function (_super) {
        __extends(SceneFreezer, _super);
        function SceneFreezer() {
            var _this = _super.call(this) || this;
            _this.requirePauseSwitch = false;
            _this.paused = false;
            if (!(Game.Scene.instance instanceof Game.Level)) {
                _this.paused = false;
                _this.requirePauseSwitch = false;
            }
            return _this;
        }
        Object.defineProperty(SceneFreezer, "paused", {
            get: function () {
                return instance.paused;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SceneFreezer, "stoped", {
            get: function () {
                return Game.Scene.nextSceneClass != null || instance.paused || Game.SceneOrientator.blocked || (Game.LevelAdLoader.instance != null && Game.LevelAdLoader.blocked);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SceneFreezer, "stopedWitoutPause", {
            get: function () {
                return Game.Scene.nextSceneClass != null || Game.SceneOrientator.blocked || (Game.LevelAdLoader.instance != null && Game.LevelAdLoader.blocked);
            },
            enumerable: false,
            configurable: true
        });
        SceneFreezer.switchPause = function () {
            instance.requirePauseSwitch = !instance.requirePauseSwitch;
        };
        SceneFreezer.init = function () {
            instance = new SceneFreezer();
        };
        SceneFreezer.prototype.onReset = function () {
            this.paused = false;
        };
        SceneFreezer.prototype.onStepUpdate = function () {
            if (this.requirePauseSwitch) {
                this.paused = !this.paused;
                this.requirePauseSwitch = false;
            }
        };
        SceneFreezer.prototype.onClearScene = function () {
            instance = null;
        };
        return SceneFreezer;
    }(Engine.Entity));
    Game.SceneFreezer = SceneFreezer;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var instance = null;
    var ready = false;
    var SceneOrientator = /** @class */ (function (_super) {
        __extends(SceneOrientator, _super);
        function SceneOrientator() {
            var _this = _super.call(this) || this;
            var yOffset = 24 - 6;
            _this.text0 = new Utils.Text();
            _this.text0.font = Game.FontManager.a;
            _this.text0.scale = 1;
            _this.text0.enabled = true;
            _this.text0.pinned = true;
            _this.text0.str = "PLEASE ROTATE";
            _this.text0.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            _this.text0.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.text0.yAlignBounds = Utils.AnchorAlignment.START;
            _this.text0.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.text0.xAligned = 0;
            _this.text0.yAligned = yOffset;
            _this.text0.front = true;
            _this.text1 = new Utils.Text();
            _this.text1.font = Game.FontManager.a;
            _this.text1.scale = 1;
            _this.text1.enabled = true;
            _this.text1.pinned = true;
            _this.text1.str = "YOUR DEVICE";
            _this.text1.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            _this.text1.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.text1.yAlignBounds = Utils.AnchorAlignment.START;
            _this.text1.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.text1.xAligned = 0;
            _this.text1.yAligned = yOffset + 8;
            _this.text1.front = true;
            _this.device = new Engine.Sprite();
            _this.device.enabled = true;
            _this.device.pinned = true;
            _this.device.y = 0 - 6;
            FRAMES[0].applyToSprite(_this.device);
            _this.fill = new Engine.Sprite();
            _this.fill.enabled = true;
            _this.fill.pinned = true;
            _this.fill.setRGBA(0 / 255, 88 / 255, 248 / 255, 1);
            _this.onViewUpdate();
            return _this;
        }
        Object.defineProperty(SceneOrientator, "blocked", {
            get: function () {
                return instance != null && instance.fill.enabled;
            },
            enumerable: false,
            configurable: true
        });
        SceneOrientator.init = function () {
            if (Game.TRACK_ORIENTATION && ready) {
                instance = instance || new SceneOrientator();
            }
        };
        SceneOrientator.prototype.onViewUpdate = function () {
            this.fill.enabled = Engine.Renderer.xSizeView < Engine.Renderer.ySizeView;
            this.device.enabled = this.fill.enabled;
            this.text0.enabled = this.fill.enabled;
            this.text1.enabled = this.fill.enabled;
            this.fill.x = -Engine.Renderer.xSizeView * 0.5;
            this.fill.y = -Engine.Renderer.ySizeView * 0.5;
            this.fill.xSize = Engine.Renderer.xSizeView;
            this.fill.ySize = Engine.Renderer.ySizeView;
        };
        SceneOrientator.prototype.onDrawOrientationUI = function () {
            this.fill.render();
            this.device.render();
        };
        SceneOrientator.prototype.onClearScene = function () {
            instance = null;
        };
        return SceneOrientator;
    }(Engine.Entity));
    Game.SceneOrientator = SceneOrientator;
    var FRAMES = null;
    Game.addAction("init", function () {
        //FRAMES = FrameSelector.complex(Resources.texture, 13, 74);
        //ready = true;
    });
})(Game || (Game = {}));
///<reference path="../../Engine/Entity.ts"/>
var Utils;
(function (Utils) {
    var AnchorAlignment;
    (function (AnchorAlignment) {
        AnchorAlignment[AnchorAlignment["START"] = 0] = "START";
        AnchorAlignment[AnchorAlignment["MIDDLE"] = 1] = "MIDDLE";
        AnchorAlignment[AnchorAlignment["END"] = 2] = "END";
    })(AnchorAlignment = Utils.AnchorAlignment || (Utils.AnchorAlignment = {}));
    var Anchor = /** @class */ (function (_super) {
        __extends(Anchor, _super);
        function Anchor() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._bounds = null;
            _this._xAlignView = AnchorAlignment.MIDDLE;
            _this._yAlignView = AnchorAlignment.MIDDLE;
            _this._xAlignBounds = AnchorAlignment.MIDDLE;
            _this._yAlignBounds = AnchorAlignment.MIDDLE;
            _this._xAligned = 0;
            _this._yAligned = 0;
            return _this;
        }
        Object.defineProperty(Anchor.prototype, "bounds", {
            get: function () {
                return this._bounds;
            },
            set: function (value) {
                this._bounds = value;
                this.fix();
            },
            enumerable: false,
            configurable: true
        });
        ;
        ;
        Object.defineProperty(Anchor.prototype, "xAlignView", {
            get: function () {
                return this._xAlignView;
            },
            set: function (value) {
                this._xAlignView = value;
                this.fix();
            },
            enumerable: false,
            configurable: true
        });
        ;
        ;
        Object.defineProperty(Anchor.prototype, "yAlignView", {
            get: function () {
                return this._yAlignView;
            },
            set: function (value) {
                this._yAlignView = value;
                this.fix();
            },
            enumerable: false,
            configurable: true
        });
        ;
        ;
        Object.defineProperty(Anchor.prototype, "xAlignBounds", {
            get: function () {
                return this._xAlignBounds;
            },
            set: function (value) {
                this._xAlignBounds = value;
                this.fix();
            },
            enumerable: false,
            configurable: true
        });
        ;
        ;
        Object.defineProperty(Anchor.prototype, "yAlignBounds", {
            get: function () {
                return this._yAlignBounds;
            },
            set: function (value) {
                this._yAlignBounds = value;
                this.fix();
            },
            enumerable: false,
            configurable: true
        });
        ;
        ;
        Object.defineProperty(Anchor.prototype, "xAligned", {
            get: function () {
                return this._xAligned;
            },
            set: function (value) {
                this._xAligned = value;
                this.fix();
            },
            enumerable: false,
            configurable: true
        });
        ;
        ;
        Object.defineProperty(Anchor.prototype, "yAligned", {
            get: function () {
                return this._yAligned;
            },
            set: function (value) {
                this._yAligned = value;
                this.fix();
            },
            enumerable: false,
            configurable: true
        });
        ;
        ;
        Object.defineProperty(Anchor.prototype, "x", {
            get: function () {
                return this._bounds.x;
            },
            enumerable: false,
            configurable: true
        });
        ;
        Object.defineProperty(Anchor.prototype, "y", {
            get: function () {
                return this._bounds.y;
            },
            enumerable: false,
            configurable: true
        });
        ;
        Anchor.prototype.fix = function () {
            this.xFix();
            this.yFix();
        };
        Anchor.prototype.xFix = function () {
            var xSizeBounds = this.bounds == null ? 0 : this.bounds.xSize;
            var xScaleBounds = this.bounds == null ? 1 : this.bounds.xScale;
            var x = 0;
            switch (this._xAlignView) {
                case AnchorAlignment.START:
                    x = -Engine.Renderer.xSizeView * 0.5 + this._xAligned;
                    switch (this._xAlignBounds) {
                        case AnchorAlignment.START:
                            break;
                        case AnchorAlignment.MIDDLE:
                            x -= xSizeBounds * xScaleBounds * 0.5;
                            break;
                        case AnchorAlignment.END:
                            x -= xSizeBounds * xScaleBounds;
                            break;
                    }
                    break;
                case AnchorAlignment.MIDDLE:
                    x = this._xAligned;
                    switch (this._xAlignBounds) {
                        case AnchorAlignment.START:
                            break;
                        case AnchorAlignment.MIDDLE:
                            x -= xSizeBounds * xScaleBounds * 0.5;
                            break;
                        case AnchorAlignment.END:
                            x -= xSizeBounds * xScaleBounds;
                            break;
                    }
                    break;
                case AnchorAlignment.END:
                    x = Engine.Renderer.xSizeView * 0.5 + this._xAligned - (xSizeBounds * xScaleBounds);
                    switch (this._xAlignBounds) {
                        case AnchorAlignment.START:
                            x += xSizeBounds * xScaleBounds;
                            break;
                        case AnchorAlignment.MIDDLE:
                            x += xSizeBounds * xScaleBounds * 0.5;
                            break;
                        case AnchorAlignment.END:
                            break;
                    }
                    break;
            }
            this._bounds.x = x;
        };
        Anchor.prototype.yFix = function () {
            var ySizeBounds = this.bounds == null ? 0 : this.bounds.ySize;
            var yScaleBounds = this.bounds == null ? 1 : this.bounds.yScale;
            var y = 0;
            switch (this._yAlignView) {
                case AnchorAlignment.START:
                    y = -Engine.Renderer.ySizeView * 0.5 + this._yAligned;
                    switch (this._yAlignBounds) {
                        case AnchorAlignment.START:
                            break;
                        case AnchorAlignment.MIDDLE:
                            y -= ySizeBounds * yScaleBounds * 0.5;
                            break;
                        case AnchorAlignment.END:
                            y -= ySizeBounds * yScaleBounds;
                            break;
                    }
                    break;
                case AnchorAlignment.MIDDLE:
                    y = this._yAligned;
                    switch (this._yAlignBounds) {
                        case AnchorAlignment.START:
                            break;
                        case AnchorAlignment.MIDDLE:
                            y -= ySizeBounds * yScaleBounds * 0.5;
                            break;
                        case AnchorAlignment.END:
                            y -= ySizeBounds * yScaleBounds;
                            break;
                    }
                    break;
                case AnchorAlignment.END:
                    y = Engine.Renderer.ySizeView * 0.5 + this._yAligned - (ySizeBounds * yScaleBounds);
                    switch (this._yAlignBounds) {
                        case AnchorAlignment.START:
                            y += ySizeBounds * yScaleBounds;
                            break;
                        case AnchorAlignment.MIDDLE:
                            y += ySizeBounds * yScaleBounds * 0.5;
                            break;
                        case AnchorAlignment.END:
                            break;
                    }
                    break;
            }
            this._bounds.y = y;
        };
        Anchor.prototype.setFullPosition = function (xAlignView, yAlignView, xAlignBounds, yAlignBounds, xAligned, yAligned) {
            this._xAlignView = xAlignView;
            this._yAlignView = yAlignView;
            this._xAlignBounds = xAlignBounds;
            this._yAlignBounds = yAlignBounds;
            this._xAligned = xAligned;
            this._yAligned = yAligned;
            this.fix();
            return this;
        };
        //@ts-ignore
        Anchor.prototype.onViewUpdateAnchor = function () {
            this.fix();
        };
        return Anchor;
    }(Engine.Entity));
    Utils.Anchor = Anchor;
})(Utils || (Utils = {}));
///<reference path = "../../Engine/Entity.ts"/>
/*
namespace Game.UI{
    var FRAMES_DEFAULT : Array<Utils.AnimationFrame>;

    addAction("configure", ()=>{
        FRAMES_DEFAULT = FrameSelector.complex("dialog default a", Resources.texture, 21, 159);
        //FRAMES_DEFAULT = FrameSelector.complex("dialog default b", Resources.texture, 45, 159, FRAMES_DEFAULT);
    });

    export class Dialog extends Engine.Entity implements Engine.Bounds{
        private bounds : Engine.InteractableBounds;
        private anchor : Utils.Anchor;

        private dirty = false;

        private spriteTopLeft : Engine.Sprite;
        private spriteTop : Engine.Sprite;
        private spriteTopRight : Engine.Sprite;
        private spriteLeft : Engine.Sprite;
        private spriteMiddle : Engine.Sprite;
        private spriteRight : Engine.Sprite;
        private spriteBottomLeft : Engine.Sprite;
        private spriteBottom : Engine.Sprite;
        private spriteBottomRight : Engine.Sprite;
        private spriteIcon : Engine.Sprite;

        private sprites : Array<Engine.Sprite>;

        public set enabled(value : boolean){
            this.bounds.enabled = value;
            for(var sprite of this.sprites){
                sprite.enabled = this.bounds.enabled;
            }
            this.spriteIcon.enabled = this.bounds.enabled && this.frames.length > 9;
        }
        public get enabled(){
            return this.bounds.enabled;
        }

        public set pinned(value : boolean){
            this.bounds.pinned = value;
            for(var sprite of this.sprites){
                sprite.pinned = this.bounds.pinned;
            }
        }
        public get pinned(){
            return this.bounds.pinned;
        }

        private _frames : Array<Utils.AnimationFrame>;
        public set frames(value : Array<Utils.AnimationFrame>){
            this._frames = value;
            this.dirty = true;
        }
        public get frames(){
            return this._frames;
        }

        public set x(_value : number){
            //this.bounds.x = value;
            //this.dirty = true;
            console.warn("UNIMPLEMENTED");
        }
        public get x(){
            return this.bounds.x;
        }

        public set xAlignView(value : Utils.AnchorAlignment){
            this.anchor.xAlignView = value;
            this.dirty = true;
        }
        public get xAlignView(){
            return this.anchor.xAlignView;
        }

        public set xAlignBounds(value : Utils.AnchorAlignment){
            this.anchor.xAlignBounds = value;
            this.dirty = true;
        }
        public get xAlignBounds(){
            return this.anchor.xAlignBounds;
        }

        public set xAligned(value : number){
            this.anchor.xAligned = value;
            this.dirty = true;
        }
        public get xAligned(){
            return this.anchor.xAlignView;
        }

        public set y(_value : number){
            //this.bounds.y = value;
            //this.dirty = true;
            console.warn("UNIMPLEMENTED");
        }
        public get y(){
            return this.bounds.y;
        }

        public set yAlignView(value : Utils.AnchorAlignment){
            this.anchor.yAlignView = value;
            this.dirty = true;
        }
        public get yAlignView(){
            return this.anchor.yAlignView;
        }

        public set yAlignBounds(value : Utils.AnchorAlignment){
            this.anchor.yAlignBounds = value;
            this.dirty = true;
        }
        public get yAlignBounds(){
            return this.anchor.yAlignBounds;
        }

        public set yAligned(value : number){
            this.anchor.yAligned = value;
            this.dirty = true;
        }
        public get yAligned(){
            return this.anchor.yAlignView;
        }

        private _xSize : number;
        public set xSize(value : number){
            this._xSize = value;
            this.bounds.xSize = this._xSize;
            this.anchor.bounds = this.bounds;
            this.dirty = true;
        }
        public get xSize(){
            return this._xSize;
        }

        private _ySize : number;
        public set ySize(value : number){
            this._ySize = value;
            this.bounds.ySize = this._ySize;
            this.anchor.bounds = this.bounds;
            this.dirty = true;
        }
        public get ySize(){
            return this._ySize;
        }

        public set xOffset(value : number){
            this.bounds.xOffset = value;
            this.dirty = true;
        }
        public get xOffset(){
            return this.bounds.xOffset;
        }

        public set yOffset(value : number){
            this.bounds.yOffset = value;
            this.dirty = true;
        }
        public get yOffset(){
            return this.bounds.yOffset;
        }

        public set xScale(_value : number){
            
        }
        public get xScale(){
            return this.bounds.xScale;
        }

        public set yScale(_value : number){
            
        }
        public get yScale(){
            return this.bounds.yScale;
        }

        public set xMirror(_value : boolean){
            
        }
        public get xMirror(){
            return this.bounds.xMirror;
        }

        public set yMirror(_value : boolean){
           
        }
        public get yMirror(){
            return this.bounds.yMirror;
        }

        public set angle(_value : number){
            
        }
        public get angle(){
            return this.bounds.angle;
        }

        public set useTouchRadius(value : boolean){
            this.bounds.useTouchRadius = value;
        }
        public get useTouchRadius(){
            return this.bounds.useTouchRadius;
        }

        public set data(value : any){
            this.bounds.data = value;
        }
        public get data(){
            return this.bounds.data;
        }

        public get mouseOver(){
            return this.bounds.mouseOver;
        }
        
        public get touched(){
            return this.bounds.touched;
        }

        public get pointed(){
            return this.bounds.pointed;
        }

        public constructor(frames : Array<Utils.AnimationFrame> = null){
            super();
            this.bounds = new Engine.InteractableBounds();
            this.anchor = new Utils.Anchor();
            this.anchor.bounds = this.bounds;
            this._xSize = this.bounds.xSize;
            this._ySize = this.bounds.ySize;
            this.sprites = [];
            this.spriteTopLeft = new Engine.Sprite();
            this.sprites.push(this.spriteTopLeft);
            this.spriteTop = new Engine.Sprite();
            this.sprites.push(this.spriteTop);
            this.spriteTopRight = new Engine.Sprite();
            this.sprites.push(this.spriteTopRight);
            this.spriteLeft = new Engine.Sprite();
            this.sprites.push(this.spriteLeft);
            this.spriteMiddle = new Engine.Sprite();
            this.sprites.push(this.spriteMiddle);
            this.spriteRight = new Engine.Sprite();
            this.sprites.push(this.spriteRight);
            this.spriteBottomLeft = new Engine.Sprite();
            this.sprites.push(this.spriteBottomLeft);
            this.spriteBottom = new Engine.Sprite();
            this.sprites.push(this.spriteBottom);
            this.spriteBottomRight = new Engine.Sprite();
            this.sprites.push(this.spriteBottomRight);
            this.spriteIcon = new Engine.Sprite();
            this.sprites.push(this.spriteIcon);
            this.frames = frames || FRAMES_DEFAULT;
            this.enabled = true;
            this.pinned = true;
        }

        public pointInside(x : number, y :number, radius : number){
            return this.bounds.pointInside(x, y, radius);
        }

        protected onDrawDialogs(){
            this.render();
        }

        public render(){
            if(this.dirty){
                this.fix();
                this.anchor.fix();
            }
            for(var sprite of this.sprites){
                sprite.render();
            }
        }
        
        protected fix(){
            var lengthArraySprites = this.frames.length > 9 ? 10 : 9;
            for(var indexSprite = 0; indexSprite < lengthArraySprites; indexSprite += 1){
                this.frames[indexSprite].applyToSprite(this.sprites[indexSprite]);
            }
            if(lengthArraySprites == 10){
                this._xSize = this._xSize < this.spriteIcon.xSize ? this.spriteIcon.xSize : this._xSize;
                this._ySize = this._ySize < this.spriteIcon.ySize ? this.spriteIcon.ySize : this._ySize;
            }
            this.spriteTop.xSize = this._xSize;
            this.spriteBottom.xSize = this._xSize;
            this.spriteLeft.ySize = this._ySize;
            this.spriteRight.ySize = this._ySize;
            this.spriteMiddle.xSize = this._xSize;
            this.spriteMiddle.ySize = this._ySize;
            this.bounds.xSize = this.spriteLeft.xSize + this.spriteRight.xSize + this._xSize;
            this.bounds.ySize = this.spriteLeft.ySize + this.spriteBottom.ySize + this._ySize;
            this.spriteTopLeft.x = this.bounds.x;
            this.spriteTop.x = this.bounds.x + this.spriteTopLeft.xSize;
            this.spriteTopRight.x = this.bounds.x + this.spriteTopLeft.xSize + this.spriteTop.xSize;
            this.spriteLeft.x = this.bounds.x;
            this.spriteMiddle.x = this.bounds.x + this.spriteTopLeft.xSize;
            this.spriteRight.x = this.bounds.x + this.spriteTopLeft.xSize + this.spriteTop.xSize;
            this.spriteBottomLeft.x = this.bounds.x;
            this.spriteBottom.x = this.bounds.x + this.spriteTopLeft.xSize;
            this.spriteBottomRight.x = this.bounds.x + this.spriteTopLeft.xSize + this.spriteTop.xSize;
            this.spriteTopLeft.y = this.bounds.y;
            this.spriteLeft.y = this.bounds.y + this.spriteTopLeft.ySize;
            this.spriteBottomLeft.y = this.bounds.y + this.spriteTopLeft.ySize + this.spriteLeft.ySize;
            this.spriteTop.y = this.bounds.y;
            this.spriteMiddle.y = this.bounds.y + this.spriteTopLeft.ySize;
            this.spriteBottom.y = this.bounds.y + this.spriteTopLeft.ySize + this.spriteLeft.ySize;
            this.spriteTopRight.y = this.bounds.y;
            this.spriteRight.y = this.bounds.y + this.spriteTopLeft.ySize;
            this.spriteBottomRight.y = this.bounds.y + this.spriteTopLeft.ySize + this.spriteLeft.ySize;
            if(lengthArraySprites == 10){
                this.spriteIcon.x = this.bounds.x + this.spriteTopLeft.xSize;
                this.spriteIcon.y = this.bounds.y + this.spriteTopLeft.ySize;
            }
            for(var sprite of this.sprites){
                sprite.xOffset = this.xOffset;
                sprite.yOffset = this.yOffset;
            }
        }

        //@ts-ignore
        public setRGBA(red : number, green : number, blue : number, alpha : number){
            
        }
    }
}
*/ 
///<reference path="Anchor.ts"/>
var Utils;
(function (Utils) {
    var Text = /** @class */ (function (_super) {
        __extends(Text, _super);
        function Text() {
            var _this = _super.call(this) || this;
            _this.sprites = new Array();
            _this.front = false;
            _this.superFront = false;
            _this._enabled = false;
            _this._pinned = false;
            _this._str = null;
            _this._font = null;
            _this._underlined = false;
            _this._scale = 1;
            _this.superback = false;
            _this._bounds = new Engine.Sprite();
            _this.underline = new Engine.Sprite();
            _this.underline2 = new Engine.Sprite();
            //if(this.underlined){
            //this.underline.setRGBAFromTexture(Game.Resources.textureStiltsTileset, 26, 42);
            //this.underline2.setRGBAFromTexture(Game.Resources.textureStiltsTileset, 18, 34);
            //}
            _this._bounds.setRGBA(1, 1, 1, 0.2);
            return _this;
        }
        Text.prototype.setEnabled = function (value) {
            this._enabled = value;
            this._bounds.enabled = value;
            for (var _i = 0, _a = this.sprites; _i < _a.length; _i++) {
                var sprite = _a[_i];
                sprite.enabled = false;
            }
            if (this._str != null) {
                for (var indexSprite = 0; indexSprite < this._str.length; indexSprite += 1) {
                    this.sprites[indexSprite].enabled = value;
                }
            }
            if (this._underlined) {
                this.underline.enabled = value;
                this.underline2.enabled = value;
            }
        };
        Object.defineProperty(Text.prototype, "enabled", {
            get: function () {
                return this._enabled;
            },
            set: function (value) {
                this.setEnabled(value);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Text.prototype, "pinned", {
            get: function () {
                return this._pinned;
            },
            set: function (value) {
                this._pinned = value;
                this._bounds.pinned = value;
                for (var _i = 0, _a = this.sprites; _i < _a.length; _i++) {
                    var sprite = _a[_i];
                    sprite.pinned = value;
                }
                if (this._underlined) {
                    this.underline.pinned = value;
                    this.underline2.pinned = value;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Text.prototype, "str", {
            get: function () {
                return this._str;
            },
            set: function (value) {
                this._str = value;
                this.fixStr();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Text.prototype, "font", {
            get: function () {
                return this._font;
            },
            set: function (value) {
                this._font = value;
                this.fixStr();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Text.prototype, "underlined", {
            get: function () {
                return this._underlined;
            },
            set: function (value) {
                this._underlined = value;
                this.fixStr();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Text.prototype, "scale", {
            get: function () {
                return this._scale;
            },
            set: function (value) {
                this._scale = value;
                this.fixStr();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Text.prototype, "a", {
            get: function () {
                return this.sprites[0].alpha;
            },
            enumerable: false,
            configurable: true
        });
        Text.prototype.setRGBA = function (r, g, b, a) {
            for (var _i = 0, _a = this.sprites; _i < _a.length; _i++) {
                var sprite = _a[_i];
                sprite.setRGBA(r, g, b, a);
            }
            if (this._underlined) {
                //this.underline.setRGBA(r, g, b, a);
                //this.underline2.setRGBA(r, g, b, a);
            }
        };
        Text.prototype.fixStr = function () {
            if (this._str != null && this._font != null) {
                for (var indexSprite = this.sprites.length; indexSprite < this._str.length; indexSprite += 1) {
                    this.sprites.push(new Engine.Sprite());
                }
                for (var _i = 0, _a = this.sprites; _i < _a.length; _i++) {
                    var sprite = _a[_i];
                    sprite.enabled = false;
                }
                var xSizeText = 0;
                for (var indexChar = 0; indexChar < this._str.length; indexChar += 1) {
                    var sprite = this.sprites[indexChar];
                    sprite.enabled = this._enabled;
                    sprite.pinned = this._pinned;
                    var charDef = this._font.frames[this._str.charCodeAt(indexChar) - " ".charCodeAt(0)];
                    sprite.setFull(this._enabled, this._pinned, this._font.texture, charDef.xSize * this._scale, this._font.ySize * this._scale, 0, 0, charDef.xTexture, charDef.yTexture, charDef.xSize, this._font.ySize);
                    xSizeText += sprite.xSize + this._font.xOffset * this._scale;
                }
                this._bounds.enabled = this._enabled;
                this._bounds.pinned = this._pinned;
                this._bounds.xSize = xSizeText - this._font.xOffset * this._scale;
                this._bounds.ySize = this._font.ySize * this._scale;
                if (this._underlined) {
                    this.underline.enabled = this._enabled;
                    this.underline.pinned = this._pinned;
                    this.underline.xSize = this._bounds.xSize;
                    this.underline.ySize = this._scale;
                    this.underline2.enabled = this._enabled;
                    this.underline2.pinned = this._pinned;
                    this.underline2.xSize = this._bounds.xSize;
                    this.underline2.ySize = this._scale;
                    this._bounds.ySize += this._scale * 2;
                }
                this.fix();
            }
        };
        Text.prototype.fix = function () {
            _super.prototype.fix.call(this);
            if (this._str != null && this._font != null) {
                var x = this._bounds.x;
                for (var indexChar = 0; indexChar < this._str.length; indexChar += 1) {
                    var sprite = this.sprites[indexChar];
                    sprite.x = x;
                    sprite.y = this._bounds.y;
                    x += sprite.xSize + this._font.xOffset * this._scale;
                }
                if (this._underlined) {
                    this.underline.x = this._bounds.x;
                    this.underline.y = this._bounds.y + this._bounds.ySize - this.scale;
                    this.underline2.x = this._bounds.x + this.scale - 2;
                    this.underline2.y = this._bounds.y + this._bounds.ySize;
                }
            }
        };
        Text.prototype.onViewUpdateText = function () {
            this.fix();
        };
        Text.prototype.onDrawTextSuperBack = function () {
            if (this.superFront)
                return;
            if (this.superback) {
                //this._bounds.render();
                for (var indexSprite = 0; indexSprite < this.sprites.length; indexSprite += 1) {
                    this.sprites[indexSprite].render();
                }
                if (this._underlined) {
                    this.underline.render();
                    this.underline2.render();
                }
            }
        };
        Text.prototype.onDrawText = function () {
            if (this.superFront)
                return;
            if (!this.front && !this.superback) {
                //this._bounds.render();
                for (var indexSprite = 0; indexSprite < this.sprites.length; indexSprite += 1) {
                    this.sprites[indexSprite].render();
                }
                if (this._underlined) {
                    this.underline.render();
                    this.underline2.render();
                }
            }
        };
        Text.prototype.onDrawTextFront = function () {
            if (this.superFront)
                return;
            if (this.front && !this.superback) {
                //this._bounds.render();
                for (var indexSprite = 0; indexSprite < this.sprites.length; indexSprite += 1) {
                    this.sprites[indexSprite].render();
                }
                if (this._underlined) {
                    this.underline.render();
                    this.underline2.render();
                }
            }
        };
        Text.prototype.onDrawTextSuperFront = function () {
            if (this.superFront) {
                //this._bounds.render();
                for (var indexSprite = 0; indexSprite < this.sprites.length; indexSprite += 1) {
                    this.sprites[indexSprite].render();
                }
                if (this._underlined) {
                    this.underline.render();
                    this.underline2.render();
                }
            }
        };
        return Text;
    }(Utils.Anchor));
    Utils.Text = Text;
})(Utils || (Utils = {}));
var Utils;
(function (Utils) {
    var Animation = /** @class */ (function () {
        function Animation(name, loop, frames, steps, indexArray, stepArray) {
            if (name === void 0) { name = ""; }
            if (loop === void 0) { loop = false; }
            if (frames === void 0) { frames = null; }
            if (steps === void 0) { steps = 0; }
            if (indexArray === void 0) { indexArray = null; }
            if (stepArray === void 0) { stepArray = null; }
            this.loop = false;
            this.name = name;
            this.loop = loop;
            this.frames = frames;
            this.steps = steps;
            this.indexArray = indexArray;
            this.stepArray = stepArray;
        }
        return Animation;
    }());
    Utils.Animation = Animation;
})(Utils || (Utils = {}));
var Utils;
(function (Utils) {
    Utils.FRAME_EXTRUSION = 0.5;
    var AnimationFrame = /** @class */ (function () {
        function AnimationFrame(texture, xTexture, yTexture, xSize, ySize, xOffset, yOffset, data, hasBox, xSizeBox, ySizeBox, xOffsetBox, yOffsetBox) {
            if (texture === void 0) { texture = null; }
            if (xTexture === void 0) { xTexture = 0; }
            if (yTexture === void 0) { yTexture = 0; }
            if (xSize === void 0) { xSize = 0; }
            if (ySize === void 0) { ySize = 0; }
            if (xOffset === void 0) { xOffset = 0; }
            if (yOffset === void 0) { yOffset = 0; }
            if (data === void 0) { data = null; }
            if (hasBox === void 0) { hasBox = false; }
            if (xSizeBox === void 0) { xSizeBox = 0; }
            if (ySizeBox === void 0) { ySizeBox = 0; }
            if (xOffsetBox === void 0) { xOffsetBox = 0; }
            if (yOffsetBox === void 0) { yOffsetBox = 0; }
            this.xTexture = 0;
            this.yTexture = 0;
            this.xSize = 0;
            this.ySize = 0;
            this.xOffset = 0;
            this.yOffset = 0;
            this.hasBox = false;
            this.xSizeBox = 0;
            this.ySizeBox = 0;
            this.xOffsetBox = 0;
            this.yOffsetBox = 0;
            this.extrude = false;
            this.texture = texture;
            this.xTexture = xTexture;
            this.yTexture = yTexture;
            this.xSize = xSize;
            this.ySize = ySize;
            this.xOffset = xOffset;
            this.yOffset = yOffset;
            this.data = data;
            this.hasBox = hasBox;
            this.xSizeBox = xSizeBox;
            this.ySizeBox = ySizeBox;
            this.xOffsetBox = xOffsetBox;
            this.yOffsetBox = yOffsetBox;
        }
        AnimationFrame.prototype.applyToSprite = function (sprite) {
            if (this.extrude) {
                sprite.setFull(sprite.enabled, sprite.pinned, this.texture, this.xSize + Utils.FRAME_EXTRUSION, this.ySize + Utils.FRAME_EXTRUSION, this.xOffset - Utils.FRAME_EXTRUSION * 0.5, this.yOffset - Utils.FRAME_EXTRUSION * 0.5, this.xTexture - Utils.FRAME_EXTRUSION * 0.5, this.yTexture - Utils.FRAME_EXTRUSION * 0.5, this.xSize + Utils.FRAME_EXTRUSION, this.ySize + Utils.FRAME_EXTRUSION);
            }
            else {
                sprite.setFull(sprite.enabled, sprite.pinned, this.texture, this.xSize, this.ySize, this.xOffset, this.yOffset, this.xTexture, this.yTexture, this.xSize, this.ySize);
            }
            //sprite.setFull(sprite.enabled, sprite.pinned, this.texture, this.xSize + extra, this.ySize + extra, this.xOffset - extra * 0.5, this.yOffset - extra * 0.5, this.xTexture - 0.25, this.yTexture - 0.25, this.xSize + 0.5, this.ySize + 0.5);
        };
        AnimationFrame.prototype.applyToBox = function (box) {
            if (this.hasBox) {
                box.xSize = this.xSizeBox;
                box.ySize = this.ySizeBox;
                box.xOffset = this.xOffsetBox;
                box.yOffset = this.yOffsetBox;
            }
        };
        AnimationFrame.prototype.applyToBoxEx = function (box) {
            if (this.hasBox) {
                box.xSize = this.xSizeBox;
                box.ySize = this.ySizeBox;
                box.xOffset = this.xOffsetBox;
                box.yOffset = this.yOffsetBox;
            }
            else {
                box.enabled = false;
            }
        };
        AnimationFrame.prototype.getGeneric = function () {
            var generic = {};
            generic.xTexture = this.xTexture;
            generic.yTexture = this.yTexture;
            generic.xSize = this.xSize;
            generic.ySize = this.ySize;
            generic.xOffset = this.xOffset;
            generic.yOffset = this.yOffset;
            generic.hasBox = this.hasBox;
            generic.xSizeBox = this.xSizeBox;
            generic.ySizeBox = this.ySizeBox;
            generic.xOffsetBox = this.xOffsetBox;
            generic.yOffsetBox = this.yOffsetBox;
            return generic;
        };
        AnimationFrame.framesFromGrid = function (texture, xTexture, yTexture, columns, maxFrames, xStartOffsetFrame, yStartOffsetFrame, xSeparationFrame, ySeparationFrame, xSizeFrame, ySizeFrame, xStartFrame, yStartFrame, xOffsetFrame, yOffsetFrame, data) {
            var frames = [];
            var indexFrame = 0;
            var y = 0;
            do {
                for (var x = 0; x < columns && indexFrame < maxFrames; x += 1) {
                    var anim = new AnimationFrame();
                    anim.texture = texture;
                    anim.xTexture = xTexture + xStartOffsetFrame + xStartFrame * (xSizeFrame + xSeparationFrame) + x * (xSizeFrame + xSeparationFrame);
                    anim.yTexture = yTexture + yStartOffsetFrame + yStartFrame * (ySizeFrame + ySeparationFrame) + y * (ySizeFrame + ySeparationFrame);
                    anim.xSize = xSizeFrame;
                    anim.ySize = ySizeFrame;
                    anim.xOffset = xOffsetFrame;
                    anim.yOffset = yOffsetFrame;
                    anim.data = data;
                    frames.push(anim);
                    indexFrame += 1;
                }
                y += 1;
            } while (indexFrame < maxFrames);
            return frames;
        };
        return AnimationFrame;
    }());
    Utils.AnimationFrame = AnimationFrame;
})(Utils || (Utils = {}));
var Utils;
(function (Utils) {
    var Animator = /** @class */ (function (_super) {
        __extends(Animator, _super);
        function Animator() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.indexFrame = 0;
            _this.countSteps = 0;
            _this.cycles = 0;
            _this.enabled = true;
            _this.off = 0;
            _this.loofra = 0;
            return _this;
        }
        Object.defineProperty(Animator.prototype, "ended", {
            get: function () {
                return this.cycles > 0;
            },
            enumerable: false,
            configurable: true
        });
        Animator.prototype.reset = function () {
            this.indexFrame = 0;
            this.countSteps = 0;
            this.cycles = 0;
            this.off = 0;
        };
        Animator.prototype.setCurrentFrame = function () {
            if (this.animation != null) {
                var indexFrame = this.animation.indexArray != null ? this.animation.indexArray[this.indexFrame] : this.indexFrame;
                var frame = this.animation.frames[indexFrame + this.off];
                if (this.listener != null) {
                    this.listener.onSetFrame(this, this.animation, frame);
                }
            }
        };
        Animator.prototype.setAnimation = function (animation, preserveStatus) {
            if (preserveStatus === void 0) { preserveStatus = false; }
            this.animation = animation;
            if (!preserveStatus) {
                this.indexFrame = 0;
                this.countSteps = 0;
                this.cycles = 0;
            }
            this.setCurrentFrame();
        };
        Animator.prototype.onAnimationUpdate = function () {
            if (!Game.SceneFreezer.stoped && this.enabled && this.animation != null && (this.animation.loop || this.cycles < 1)) {
                var indexFrame = this.animation.indexArray != null ? this.animation.indexArray[this.indexFrame] : this.indexFrame;
                var steps = this.animation.stepArray != null ? this.animation.stepArray[indexFrame] : this.animation.steps;
                if (this.countSteps >= steps) {
                    this.countSteps = 0;
                    this.indexFrame += 1;
                    var length = this.animation.indexArray != null ? this.animation.indexArray.length : this.animation.frames.length;
                    if (this.indexFrame >= length) {
                        this.indexFrame = this.animation.loop ? this.loofra : length - 1;
                        this.cycles += 1;
                    }
                    this.setCurrentFrame();
                }
                this.countSteps += 1;
            }
        };
        return Animator;
    }(Engine.Entity));
    Utils.Animator = Animator;
})(Utils || (Utils = {}));
///<reference path="../../Engine/Entity.ts"/>
var Game;
(function (Game) {
    var Control = /** @class */ (function (_super) {
        __extends(Control, _super);
        function Control() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._enabled = false;
            _this._selected = false;
            _this._url = null;
            _this.linkCondition = function () { return true; };
            _this.onLinkTrigger = null;
            _this.useMouse = false;
            _this.useKeyboard = false;
            _this.useTouch = false;
            _this.newInteractionRequired = false;
            _this.blockOthersSelection = false;
            _this.freezeable = false;
            _this._firstDown = false;
            _this._firstUp = false;
            _this.firstUpdate = false;
            _this._downSteps = 0;
            _this._stepsSincePressed = 0;
            _this._upSteps = 0;
            _this._stepsSinceReleased = 0;
            _this._touchDown = false;
            return _this;
        }
        Object.defineProperty(Control.prototype, "enabled", {
            get: function () {
                return this._enabled;
            },
            set: function (value) {
                this.setEnabled(value);
            },
            enumerable: false,
            configurable: true
        });
        Control.prototype.setEnabled = function (value) {
            var oldEnabled = this.enabled;
            this._enabled = value;
            if (value != oldEnabled) {
                if (value) {
                    this.onEnable();
                }
                else {
                    if (this._selected) {
                        this._selected = false;
                        if (this._url != null) {
                            Engine.LinkManager.remove(this, this._url);
                        }
                        this.onSelectionEnd();
                    }
                    this.onDisable();
                }
            }
        };
        Object.defineProperty(Control.prototype, "selected", {
            get: function () {
                return this._selected;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Control.prototype, "url", {
            get: function () {
                return this._url;
            },
            set: function (value) {
                if (this._url != null) {
                    Engine.LinkManager.remove(this, this._url);
                }
                this._url = value;
                if (this._url != null) {
                    Engine.LinkManager.add(this, this._url);
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Control.prototype, "downSteps", {
            get: function () {
                return this._downSteps;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Control.prototype, "stepsSincePressed", {
            get: function () {
                return this._stepsSincePressed;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Control.prototype, "pressed", {
            get: function () {
                return this._downSteps == 1;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Control.prototype, "down", {
            get: function () {
                return this._downSteps > 0;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Control.prototype, "upSteps", {
            get: function () {
                return this._upSteps;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Control.prototype, "stepsSinceReleased", {
            get: function () {
                return this._stepsSinceReleased;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Control.prototype, "released", {
            get: function () {
                return this._upSteps == 1;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Control.prototype, "up", {
            get: function () {
                return !this.down;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Control.prototype, "touchDown", {
            get: function () {
                return this._touchDown;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Control.prototype, "touchPressed", {
            get: function () {
                return this._touchDown && this.pressed;
            },
            enumerable: false,
            configurable: true
        });
        Control.prototype.onEnable = function () {
            if (this.onEnableDelegate != null) {
                this.onEnableDelegate.call(this.listener);
            }
        };
        Control.prototype.onDisable = function () {
            if (this.onDisableDelegate != null) {
                this.onDisableDelegate.call(this.listener);
            }
        };
        Control.prototype.onSelectionStart = function () {
            if (this.onSelectionStartDelegate != null) {
                this.onSelectionStartDelegate.call(this.listener);
            }
        };
        Control.prototype.onSelectionStay = function () {
            if (this.onSelectionStayDelegate != null) {
                this.onSelectionStayDelegate.call(this.listener);
            }
        };
        Control.prototype.onSelectionEnd = function () {
            if (this.onSelectionEndDelegate != null) {
                this.onSelectionEndDelegate.call(this.listener);
            }
        };
        Control.prototype.onPressed = function () {
            if (this.onPressedDelegate != null) {
                this.onPressedDelegate.call(this.listener);
            }
        };
        Control.prototype.onReleased = function () {
            if (this.onReleasedDelegate != null) {
                this.onReleasedDelegate.call(this.listener);
            }
        };
        //TODO: Not optimal, change it
        Control.prototype.onClearScene = function () {
            if (this.url != null) {
                Engine.LinkManager.remove(this, this._url);
            }
        };
        //TODO: Not optimal, change it
        Control.prototype.onControlPreUpdate = function () {
            Control.selectionBlocker = null;
        };
        Control.prototype.onControlUpdate = function () {
            if (Game.LevelAdLoader.instance != null && Game.LevelAdLoader.blocked) {
                return;
            }
            var oldSelected = this._selected;
            this.mouseSelected = false;
            this.touchSelected = false;
            var selectedAudio = false;
            var pressedAudio = false;
            if (this.enabled) {
                this.mouseSelected = this.useMouse && (this.bounds == null || this.bounds.mouseOver);
                this.touchSelected = this.useTouch && (this.bounds == null || this.bounds.touched);
                if ((this.freezeable && Game.SceneFreezer.stoped) || Control.selectionBlocker != null) {
                    this.mouseSelected = false;
                    this.touchSelected = false;
                }
                if (!this._selected && (this.mouseSelected || this.touchSelected)) {
                    this._selected = true;
                    this.onSelectionStart();
                    selectedAudio = true;
                }
                else if (this._selected && !(this.mouseSelected || this.touchSelected)) {
                    this._selected = false;
                    this.onSelectionEnd();
                }
                if (this._selected && this.blockOthersSelection) {
                    Control.selectionBlocker = this;
                }
                var used = false;
                if (this.mouseSelected && this.mouseButtons != null) {
                    for (var _i = 0, _a = this.mouseButtons; _i < _a.length; _i++) {
                        var buttonIndex = _a[_i];
                        if (this.newInteractionRequired) {
                            used = this._downSteps == 0 ? Engine.Mouse.pressed(buttonIndex) : Engine.Mouse.down(buttonIndex);
                        }
                        else {
                            used = Engine.Mouse.down(buttonIndex);
                        }
                        if (used) {
                            break;
                        }
                    }
                }
                var touchUsed = false;
                if (this.touchSelected) {
                    if (this.newInteractionRequired) {
                        if (this.bounds != null) {
                            touchUsed = this._downSteps == 0 ? this.bounds.pointed : this.bounds.touched;
                        }
                        else {
                            if (this._downSteps == 0) {
                                touchUsed = Engine.TouchInput.pressed(0, 0, Engine.Renderer.xSizeWindow, Engine.Renderer.ySizeWindow, true);
                            }
                            else {
                                touchUsed = Engine.TouchInput.down(0, 0, Engine.Renderer.xSizeWindow, Engine.Renderer.ySizeWindow, true);
                            }
                        }
                    }
                    else {
                        if (this.bounds != null) {
                            touchUsed = this.bounds.touched;
                        }
                        else {
                            touchUsed = Engine.TouchInput.down(0, 0, Engine.Renderer.xSizeWindow, Engine.Renderer.ySizeWindow, true);
                        }
                    }
                    used = used || touchUsed;
                }
                if (!used && this.useKeyboard && !(this.freezeable && Game.SceneFreezer.stoped)) {
                    for (var _b = 0, _c = this.keys; _b < _c.length; _b++) {
                        var key = _c[_b];
                        if (this.newInteractionRequired) {
                            used = this._downSteps == 0 ? Engine.Keyboard.pressed(key) : Engine.Keyboard.down(key);
                        }
                        else {
                            used = Engine.Keyboard.down(key);
                        }
                        if (used) {
                            break;
                        }
                    }
                }
                if (used) {
                    this._firstDown = true;
                    this._downSteps += 1;
                    this._upSteps = 0;
                    this._touchDown = touchUsed;
                    if (this.pressed) {
                        this._stepsSincePressed = 0;
                        this.onPressed();
                        pressedAudio = true;
                    }
                }
                else if (this._firstDown) {
                    this._firstUp = true;
                    this._downSteps = 0;
                    this._upSteps += 1;
                    this._touchDown = false;
                    if (this.released) {
                        this._stepsSinceReleased = 0;
                        this.onReleased();
                    }
                }
                if (this._firstDown) {
                    this._stepsSincePressed += 1;
                }
                if (this._firstUp) {
                    this._stepsSinceReleased += 1;
                }
            }
            if (this._selected && oldSelected) {
                this.onSelectionStay();
            }
            if (pressedAudio) {
                if (this.audioPressed != null) {
                    this.audioPressed.play();
                }
            }
            else if (selectedAudio) {
                if (this.audioSelected != null && this.firstUpdate && !this.touchSelected) {
                    this.audioSelected.play();
                }
            }
            this.firstUpdate = true;
        };
        Control.selectionBlocker = null;
        return Control;
    }(Engine.Entity));
    Game.Control = Control;
})(Game || (Game = {}));
/*

        protected onControlUpdate(){
            var oldSelected = this._selected;
            if(this.enabled){
                var mouseSelected = this.useMouse && (this.bounds == null || this.bounds.mouseOver);
                var boundsTouched = false;
                if(this.useTouch && this.bounds != null){
                    if(this.newInteractionRequired){
                        boundsTouched = this._downSteps == 0 ? this.bounds.pointed : this.bounds.touched;
                    }
                    else{
                        boundsTouched = this.bounds.touched;
                    }
                }
                else if(this.useTouch && this.bounds == null){
                    if(this.newInteractionRequired){
                        if(this._downSteps == 0){
                            boundsTouched = Engine.TouchInput.down(0, 0, Engine.Renderer.xSizeWindow, Engine.Renderer.ySizeWindow, true);
                        }
                        else{

                        }
                    }
                    else{
                        
                    }

                    
                }
                var touchSelected = boundsTouched || (this.useTouch && this.bounds == null);
                if((this.freezeable && Scene.freezed) || Control.selectionBlocker != null){
                    mouseSelected = false;
                    boundsTouched = false;
                    touchSelected = false;
                }
                if(!this._selected && (mouseSelected || touchSelected)){
                    this._selected = true;
                    if(this._url != null){
                        Engine.LinkManager.add(this, this._url);
                    }
                    this.onSelectionStart();
                }
                else if(this._selected && !(mouseSelected || touchSelected)){
                    this._selected = false;
                    if(this._url != null){
                        Engine.LinkManager.remove(this, this._url);
                    }
                    this.onSelectionEnd();
                }
                if(this._selected && this.blockOthersSelection){
                    Control.selectionBlocker = this;
                }
                var used = false;
                if(mouseSelected && this.mouseButtons != null){
                    for(var buttonIndex of this.mouseButtons){
                        if(this.newInteractionRequired){
                            used = this._downSteps == 0 ? Engine.Mouse.pressed(buttonIndex) : Engine.Mouse.down(buttonIndex);
                        }
                        else{
                            used = Engine.Mouse.down(buttonIndex);
                        }
                        if(used){
                            break;
                        }
                    }
                }
                var touchUsed = false;
                if(this.useTouch && touchSelected){
                    if(this.bounds == null){
                        touchUsed = Engine.TouchInput.down(0, 0, Engine.Renderer.xSizeWindow, Engine.Renderer.ySizeWindow, true);
                    }
                    else{
                        touchUsed = boundsTouched;
                    }
                    used = used || touchUsed;
                }
                if(!used && this.useKeyboard && !(this.freezeable && Scene.freezed)){
                    for(var key of this.keys){
                        if(this.newInteractionRequired){
                            used = this._downSteps == 0 ? Engine.Keyboard.pressed(key) : Engine.Keyboard.down(key);
                        }
                        else{
                            used = Engine.Keyboard.down(key);
                        }
                        if(used){
                            break;
                        }
                    }
                }
                if(used){
                    this._firstDown = true;
                    this._downSteps += 1;
                    this._upSteps = 0;
                    this._touchDown = touchUsed;
                    if(this.pressed){
                        this._stepsSincePressed = 0;
                        this.onPressed();
                    }
                }
                else if(this._firstDown){
                    this._firstUp = true;
                    this._downSteps = 0;
                    this._upSteps += 1;
                    if(this.released){
                        this._stepsSinceReleased = 0;
                        this.onReleased();
                    }
                }
                if(!this.pressed){
                     = false;
                }
                if(this._firstDown){
                    this._stepsSincePressed += 1;
                }
                if(this._firstUp){
                    this._stepsSinceReleased += 1;
                }
            }
            if(this._selected && oldSelected){
                this.onSelectionStay();
            }
        }
    }
}
*/ 
///<reference path="../../Engine/Entity.ts"/>
var Game;
(function (Game) {
    var Dialog = /** @class */ (function (_super) {
        __extends(Dialog, _super);
        function Dialog(x, y, xSize, ySize) {
            var _this = _super.call(this) || this;
            _this.up = new Engine.Sprite();
            _this.left = new Engine.Sprite();
            _this.down = new Engine.Sprite();
            _this.right = new Engine.Sprite();
            _this.fill = new Engine.Sprite();
            _this.leftShadow = new Engine.Sprite();
            _this.downBand = new Engine.Sprite();
            _this.upLight = new Engine.Sprite();
            _this.rightLight = new Engine.Sprite();
            _this.upAnchor = new Utils.Anchor();
            _this.leftAnchor = new Utils.Anchor();
            _this.rightAnchor = new Utils.Anchor();
            _this.downAnchor = new Utils.Anchor();
            _this.fillAnchor = new Utils.Anchor();
            _this.leftShadowAnchor = new Utils.Anchor();
            _this.downBandAnchor = new Utils.Anchor();
            _this.upLightAnchor = new Utils.Anchor();
            _this.rightLightAnchor = new Utils.Anchor();
            _this.x = x;
            _this.y = y;
            _this.up.enabled = true;
            _this.up.pinned = true;
            _this.up.xSize = xSize - 2;
            _this.up.ySize = 1;
            _this.upAnchor.bounds = _this.up;
            _this.upAnchor.xAlignBounds = Utils.AnchorAlignment.START;
            _this.upAnchor.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.upAnchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.upAnchor.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.upAnchor.xAligned = x + 1 - xSize * 0.5;
            _this.upAnchor.yAligned = y;
            _this.upLight.enabled = true;
            _this.upLight.pinned = true;
            _this.upLight.xSize = 1;
            _this.upLight.ySize = 1;
            _this.upLight.setRGBA(255.0 / 255.0, 201.0 / 255.0, 148.0 / 255.0, 1);
            _this.upLightAnchor.bounds = _this.upLight;
            _this.upLightAnchor.xAlignBounds = Utils.AnchorAlignment.START;
            _this.upLightAnchor.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.upLightAnchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.upLightAnchor.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.upLightAnchor.xAligned = x + 1 + xSize * 0.5 - 3;
            _this.upLightAnchor.yAligned = y;
            _this.left.enabled = true;
            _this.left.pinned = true;
            _this.left.xSize = 1;
            _this.left.ySize = ySize - 2;
            _this.leftAnchor.bounds = _this.left;
            _this.leftAnchor.xAlignBounds = Utils.AnchorAlignment.START;
            _this.leftAnchor.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.leftAnchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.leftAnchor.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.leftAnchor.xAligned = x - xSize * 0.5;
            _this.leftAnchor.yAligned = y + 1;
            _this.down.enabled = true;
            _this.down.pinned = true;
            _this.down.xSize = xSize - 2;
            _this.down.ySize = 1;
            _this.downAnchor.bounds = _this.down;
            _this.downAnchor.xAlignBounds = Utils.AnchorAlignment.START;
            _this.downAnchor.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.downAnchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.downAnchor.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.downAnchor.xAligned = x + 1 - xSize * 0.5;
            _this.downAnchor.yAligned = y + ySize - 1;
            _this.downBand.enabled = true;
            _this.downBand.pinned = true;
            _this.downBand.xSize = xSize - 2;
            _this.downBand.ySize = 2;
            _this.downBandAnchor.bounds = _this.downBand;
            _this.downBandAnchor.xAlignBounds = Utils.AnchorAlignment.START;
            _this.downBandAnchor.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.downBandAnchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.downBandAnchor.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.downBandAnchor.xAligned = x + 2 - xSize * 0.5 - 2;
            _this.downBandAnchor.yAligned = y + ySize - 1;
            _this.right.enabled = true;
            _this.right.pinned = true;
            _this.right.xSize = 1;
            _this.right.ySize = ySize - 2;
            _this.rightAnchor.bounds = _this.right;
            _this.rightAnchor.xAlignBounds = Utils.AnchorAlignment.START;
            _this.rightAnchor.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.rightAnchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.rightAnchor.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.rightAnchor.xAligned = x + xSize * 0.5 - 1;
            _this.rightAnchor.yAligned = y + 1;
            _this.rightLight.enabled = true;
            _this.rightLight.pinned = true;
            _this.rightLight.xSize = 1;
            _this.rightLight.ySize = 2;
            _this.rightLight.setRGBA(255.0 / 255.0, 201.0 / 255.0, 148.0 / 255.0, 1);
            _this.rightLightAnchor.bounds = _this.rightLight;
            _this.rightLightAnchor.xAlignBounds = Utils.AnchorAlignment.START;
            _this.rightLightAnchor.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.rightLightAnchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.rightLightAnchor.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.rightLightAnchor.xAligned = x + xSize * 0.5 - 1;
            _this.rightLightAnchor.yAligned = y + 1;
            _this.leftShadow.enabled = true;
            _this.leftShadow.pinned = true;
            _this.leftShadow.xSize = 1;
            _this.leftShadow.ySize = ySize - 2;
            _this.leftShadowAnchor.bounds = _this.leftShadow;
            _this.leftShadowAnchor.xAlignBounds = Utils.AnchorAlignment.START;
            _this.leftShadowAnchor.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.leftShadowAnchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.leftShadowAnchor.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.leftShadowAnchor.xAligned = x - xSize * 0.5 - 1;
            _this.leftShadowAnchor.yAligned = y + 2;
            _this.fill.enabled = true;
            _this.fill.pinned = true;
            _this.fill.xSize = xSize - 2;
            _this.fill.ySize = ySize - 2;
            _this.fillAnchor.bounds = _this.fill;
            _this.fillAnchor.xAlignBounds = Utils.AnchorAlignment.START;
            _this.fillAnchor.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.fillAnchor.yAlignBounds = Utils.AnchorAlignment.START;
            _this.fillAnchor.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.fillAnchor.xAligned = x - xSize * 0.5 + 1;
            _this.fillAnchor.yAligned = y + 1;
            return _this;
        }
        Object.defineProperty(Dialog.prototype, "enabled", {
            set: function (value) {
                this.up.enabled = value;
                this.left.enabled = value;
                this.down.enabled = value;
                this.right.enabled = value;
                this.fill.enabled = value;
                this.leftShadow.enabled = value;
                this.downBand.enabled = value;
                this.upLight.enabled = value;
                this.rightLight.enabled = value;
            },
            enumerable: false,
            configurable: true
        });
        Dialog.prototype.setBorderColor = function (red, green, blue, alpha) {
            this.up.setRGBA(red / 255, green / 255, blue / 255, alpha);
            this.left.setRGBA(red / 255, green / 255, blue / 255, alpha);
            this.right.setRGBA(red / 255, green / 255, blue / 255, alpha);
            this.down.setRGBA(red / 255, green / 255, blue / 255, alpha);
        };
        Dialog.prototype.setFillColor = function (red, green, blue, alpha) {
            this.fill.setRGBA(red / 255, green / 255, blue / 255, alpha);
        };
        Dialog.prototype.setBandColor = function (red, green, blue, alpha) {
            this.leftShadow.setRGBA(red * 0 / 255, green * 0 / 255, blue * 0 / 255, alpha);
            this.downBand.setRGBA(red * 0 / 255, green * 0 / 255, blue * 0 / 255, alpha);
        };
        Dialog.prototype.setBandDisabled = function () {
            this.leftShadow.setRGBA(120.0 / 255, 120.0 / 255, 120.0 / 255, 1);
            this.downBand.setRGBA(120.0 / 255, 120.0 / 255, 120.0 / 255, 1);
        };
        Dialog.prototype.setAlpha = function (alpha) {
            this.up.setRGBA(this.up.red, this.up.green, this.up.blue, alpha);
            this.left.setRGBA(this.left.red, this.left.green, this.left.blue, alpha);
            this.right.setRGBA(this.right.red, this.right.green, this.right.blue, alpha);
            this.down.setRGBA(this.down.red, this.down.green, this.down.blue, alpha);
            this.leftShadow.setRGBA(this.leftShadow.red, this.leftShadow.green, this.leftShadow.blue, alpha);
            this.downBand.setRGBA(this.downBand.red, this.downBand.green, this.downBand.blue, alpha);
            //this.upLight.setRGBA(this.upLight.red , this.upLight.green, this.upLight.blue, alpha);
            //this.rightLight.setRGBA(this.rightLight.red, this.rightLight.green, this.rightLight.blue, alpha);
            this.upLight.setRGBA(1, 1, 1, alpha);
            this.rightLight.setRGBA(1, 1, 1, alpha);
            //this.upLight.setRGBA(this.upLight.red , this.upLight.green, this.upLight.blue, 0.9);
            //this.rightLight.setRGBA(this.rightLight.red, this.rightLight.green, this.rightLight.blue, 0.9);
            this.fill.setRGBA(this.fill.red, this.fill.green, this.fill.blue, alpha);
        };
        Dialog.prototype.onDrawDialogs = function () {
            this.downBand.render();
            this.up.render();
            this.left.render();
            this.right.render();
            this.down.render();
            this.fill.render();
            this.leftShadow.render();
            this.upLight.render();
            this.rightLight.render();
        };
        return Dialog;
    }(Engine.Entity));
    Game.Dialog = Dialog;
    var ColorDialog = /** @class */ (function (_super) {
        __extends(ColorDialog, _super);
        function ColorDialog(style, x, y, xSize, ySize) {
            var _this = _super.call(this, x, y, xSize, ySize) || this;
            _this.style = style;
            return _this;
        }
        Object.defineProperty(ColorDialog.prototype, "style", {
            get: function () {
                return this._style;
            },
            set: function (style) {
                this._style = style;
                switch (style) {
                    case "normal":
                        this.setBorderColor(30, 50, 255, 1);
                        this.setFillColor(0, 120, 255, 1);
                        this.setBandColor(255, 255, 255, 1);
                        this.upLight.setRGBA(103.0 / 255.0, 214.0 / 255.0, 255.0 / 255.0, 1);
                        this.rightLight.setRGBA(103.0 / 255.0, 214.0 / 255.0, 255.0 / 255.0, 1);
                        break;
                    case "purple":
                        this.setBorderColor(88 / 1, 40 / 1, 188 / 1, 1);
                        this.setFillColor(152 / 1, 120 / 1, 248 / 1, 1);
                        this.setBandColor(255 / 1, 255 / 1, 255 / 1, 1);
                        this.upLight.setRGBA(216.0 / 255.0, 184.0 / 255.0, 248.0 / 255.0, 1);
                        this.rightLight.setRGBA(216.0 / 255.0, 184.0 / 255.0, 248.0 / 255.0, 1);
                        break;
                    case "clearblue":
                        this.setBorderColor(184 / 1, 184 / 1, 248 / 1, 1);
                        this.setFillColor(164 / 1, 228 / 1, 252 / 1, 1);
                        this.setBandColor(255 / 1, 255 / 1, 255 / 1, 1);
                        this.upLight.setRGBA(218.0 / 255.0, 214.0 / 255.0, 255.0 / 255.0, 1);
                        this.rightLight.setRGBA(218.0 / 255.0, 214.0 / 255.0, 255.0 / 255.0, 1);
                        this.setBandDisabled();
                        break;
                }
            },
            enumerable: false,
            configurable: true
        });
        return ColorDialog;
    }(Dialog));
    Game.ColorDialog = ColorDialog;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var loabar;
    (function (loabar) {
        loabar.preserved = false;
        var fra;
        var siz = 50;
        var hortex = 201;
        var vertex = 120;
        var vel = 1.0;
        var max = 0.3;
        var cou = 0;
        var addcou = 0;
        var addste = 120;
        var spr = [];
        Game.addAction("init", function () {
            if (Game.plu) {
                fra = Game.FrameSelector.complex("loabar", Game.Resources.texgam, 0, 866, null, 0, false);
                spr[0] = new Engine.Sprite();
                spr[0].enabled = spr[0].pinned = true;
                fra[0].applyToSprite(spr[0]);
                spr[0].x -= spr[0].xSize * 0.5;
                spr[0].y = 6 - spr[0].ySize * 0.5 - 0.5 * 1;
                spr[1] = new Engine.Sprite();
                spr[1].enabled = spr[1].pinned = true;
                fra[1].applyToSprite(spr[1]);
                spr[1].x = spr[0].x + spr[0].xSize - 2 + 0.2;
                spr[1].y = spr[0].y;
                spr[2] = new Engine.Sprite();
                spr[2].enabled = spr[2].pinned = true;
                fra[2].applyToSprite(spr[2]);
                spr[2].x = spr[0].x + spr[0].xSize + 0.25;
                spr[2].y = spr[0].y;
                spr[3] = new Engine.Sprite();
                spr[3].enabled = spr[3].pinned = true;
                fra[3].applyToSprite(spr[3]);
                spr[3].x = spr[0].x;
                spr[3].y = spr[0].y;
            }
            else {
                spr[0] = new Engine.Sprite();
                spr[0].x += 0.5;
                spr[0].y = 1;
                spr[0].setFull(true, true, Game.Resources.texgam, 53, 6, -53 * 0.5, 0, hortex, vertex, 53, 6);
            }
        });
        function mak() {
            Engine.System.addListenersFrom(Game.loabar);
            if (Game.startingSceneClass != Game.maimen.cla)
                vel *= 60000;
            vel *= Utils.Fade.scale;
        }
        loabar.mak = mak;
        function onStepUpdate() {
            addcou += 1;
            if (addcou > addste) {
                max += Math.random() * 0.05;
                if (max > 0.9)
                    max = 0.9;
                addcou = 0;
            }
            var curmax = max;
            if (curmax < Engine.Assets.downloadedRatio)
                curmax = Engine.Assets.downloadedRatio;
            curmax *= siz;
            cou += vel;
            if (cou > curmax)
                cou = curmax;
        }
        loabar.onStepUpdate = onStepUpdate;
        function ful() {
            return Math.floor(cou) == siz;
        }
        loabar.ful = ful;
        function onDrawDialogs() {
            if (Game.plu) {
                spr[0].render();
                spr[1].render();
                spr[1].xScale = -1 + cou / siz;
                spr[2].xScale = spr[1].xScale;
                spr[3].render();
            }
            else {
                spr[0].setFull(true, true, Game.Resources.texgam, 53, 6, -53 * 0.5, 0, hortex, vertex + 7 * (Math.floor(cou)), 53, 6);
                spr[0].render();
            }
        }
        loabar.onDrawDialogs = onDrawDialogs;
    })(loabar = Game.loabar || (Game.loabar = {}));
})(Game || (Game = {}));
///<reference path = "../../Engine/Entity.ts"/>
var Game;
(function (Game) {
    var Transform = /** @class */ (function (_super) {
        __extends(Transform, _super);
        function Transform() {
            var _this = _super.call(this) || this;
            _this._x = 0;
            _this._y = 0;
            _this._xLocal = 0;
            _this._yLocal = 0;
            _this._parent = null;
            _this._parentRelative = true;
            _this._children = [];
            return _this;
        }
        Object.defineProperty(Transform.prototype, "x", {
            get: function () {
                return this._x;
            },
            set: function (value) {
                this._x = value;
                if (this._parent != null && this._parentRelative) {
                    this._xLocal = this._x - this._parent.x;
                }
                for (var _i = 0, _a = this._children; _i < _a.length; _i++) {
                    var child = _a[_i];
                    child.xLocal = child._xLocal;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Transform.prototype, "y", {
            get: function () {
                return this._y;
            },
            set: function (value) {
                this._y = value;
                if (this._parent != null && this._parentRelative) {
                    this._yLocal = this._y - this._parent.y;
                }
                for (var _i = 0, _a = this._children; _i < _a.length; _i++) {
                    var child = _a[_i];
                    child.yLocal = child._yLocal;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Transform.prototype, "xLocal", {
            get: function () {
                return this._xLocal;
            },
            set: function (value) {
                this._xLocal = value;
                if (this._parent != null && this._parentRelative) {
                    this._x = this._parent._x + this._xLocal;
                }
                else {
                    this._x = this._xLocal;
                }
                for (var _i = 0, _a = this._children; _i < _a.length; _i++) {
                    var child = _a[_i];
                    child.xLocal = child._xLocal;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Transform.prototype, "yLocal", {
            get: function () {
                return this._yLocal;
            },
            set: function (value) {
                this._yLocal = value;
                if (this._parent != null && this._parentRelative) {
                    this._y = this._parent._y + this._yLocal;
                }
                else {
                    this._y = this._yLocal;
                }
                for (var _i = 0, _a = this._children; _i < _a.length; _i++) {
                    var child = _a[_i];
                    child.yLocal = child._yLocal;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Transform.prototype, "parent", {
            get: function () {
                return this._parent;
            },
            set: function (value) {
                if (this._parent != null) {
                    this._parent._children.splice(this._parent._children.indexOf(this), 1);
                }
                try {
                    this._parent = value;
                    this.x = this._x;
                    this.y = this._y;
                }
                catch (e) {
                    console.error(e);
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Transform.prototype, "parentRelative", {
            get: function () {
                return this._parentRelative;
            },
            set: function (value) {
                this._parentRelative = value;
                this.x = this._x;
                this.y = this._y;
            },
            enumerable: false,
            configurable: true
        });
        return Transform;
    }(Engine.Entity));
    Game.Transform = Transform;
})(Game || (Game = {}));
/*
///<reference path = "../Transform.ts"/>
namespace Game.Emission{
    export class Emitter extends Transform{
        public enabled = true;

        protected stepsFirstEmitt = 0;
        protected stepsRepeatEmitt = 5;
        protected loop = true;
        protected sizeEmission = 1;

        public xMirror = false;
        public get xDir(){
            return this.xMirror ? -1 : 1;
        }
        public yMirror = false;
        public get yDir(){
            return this.yMirror ? -1 : 1;
        }
        
        private countStepsEmitt : number;
        private indexArrayParticle : number;
        private indexEmissionParticle : number;

        private particles : Array<BaseParticle>;

        public constructor(def : any, particleClass : typeof BaseParticle, countParticles : number){
            super(def);
            this.particles = [];
            for(var indexCount = 0; indexCount < countParticles; indexCount += 1){
                var particle = new particleClass(this);
                particle.parent = this;
                this.particles.push(particle);
            }
        }

        protected onReset(){
            this.countStepsEmitt = this.stepsFirstEmitt;
            this.indexArrayParticle = 0;
            this.indexEmissionParticle = 0;
        }

        protected onStepUpdate(){
            if(!SceneFreezer.stoped && this.enabled && (this.indexArrayParticle < this.particles.length || this.loop)){
                if(this.countStepsEmitt <= 0){
                    for(var indexEmitt = 0; indexEmitt < this.sizeEmission; indexEmitt += 1){
                        this.emittParticle();
                        if(!this.loop && this.indexArrayParticle >= this.particles.length){
                            break;
                        }
                    }
                    this.countStepsEmitt = this.stepsRepeatEmitt;
                }
                else{
                    this.countStepsEmitt -= 1;
                }
            }
        }

        protected emittParticle(){
            if(this.indexArrayParticle < this.particles.length){
                var particle = this.particles[this.indexArrayParticle];
                this.indexArrayParticle += 1;
                if(this.loop && this.indexArrayParticle >= this.particles.length){
                    this.indexArrayParticle = 0;
                }
                var indexEmissionParticle = this.indexEmissionParticle;
                this.indexEmissionParticle += 1;
                particle.emitt(indexEmissionParticle);
                return particle;
            }
            return null;
        }
    }
}
*/ 
///<reference path = "../Transform.ts"/>
var Game;
(function (Game) {
    var Emission;
    (function (Emission) {
        var BaseParticle = /** @class */ (function (_super) {
            __extends(BaseParticle, _super);
            function BaseParticle(emitter) {
                var _this = _super.call(this) || this;
                _this._enabled = false;
                _this._emitter = emitter;
                return _this;
            }
            Object.defineProperty(BaseParticle.prototype, "emitter", {
                get: function () {
                    return this._emitter;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(BaseParticle.prototype, "enabled", {
                get: function () {
                    return this._enabled;
                },
                set: function (value) {
                    this.setEnabled(value);
                },
                enumerable: false,
                configurable: true
            });
            BaseParticle.prototype.onReset = function () {
                this.enabled = false;
            };
            BaseParticle.prototype.emitt = function (index) {
                this.enabled = true;
                this.x = this.parent.x;
                this.y = this.parent.y;
                this.index = index;
            };
            BaseParticle.prototype.setEnabled = function (value) {
                this._enabled = value;
            };
            return BaseParticle;
        }(Game.Transform));
        Emission.BaseParticle = BaseParticle;
    })(Emission = Game.Emission || (Game.Emission = {}));
})(Game || (Game = {}));
///<reference path = "BaseParticle.ts"/>
var Game;
(function (Game) {
    var Emission;
    (function (Emission) {
        var BaseVisualParticle = /** @class */ (function (_super) {
            __extends(BaseVisualParticle, _super);
            function BaseVisualParticle(emitter) {
                var _this = _super.call(this, emitter) || this;
                _this.sprite = new Engine.Sprite();
                return _this;
            }
            BaseVisualParticle.prototype.setEnabled = function (value) {
                _super.prototype.setEnabled.call(this, value);
                this.sprite.enabled = value;
            };
            BaseVisualParticle.prototype.onTimeUpdate = function () {
                this.sprite.x = this.x;
                this.sprite.y = this.y;
            };
            BaseVisualParticle.prototype.onDrawParticles = function () {
                this.sprite.render();
            };
            return BaseVisualParticle;
        }(Emission.BaseParticle));
        Emission.BaseVisualParticle = BaseVisualParticle;
    })(Emission = Game.Emission || (Game.Emission = {}));
})(Game || (Game = {}));
///<reference path = "../Transform.ts"/>
var Game;
(function (Game) {
    var Emission;
    (function (Emission) {
        var Emitter = /** @class */ (function (_super) {
            __extends(Emitter, _super);
            function Emitter(particleClass, countParticles) {
                if (particleClass === void 0) { particleClass = null; }
                if (countParticles === void 0) { countParticles = 0; }
                var _this = _super.call(this) || this;
                _this.sizeEmission = 1;
                _this.emissionSteps = 0;
                _this.xMirror = false;
                _this.yMirror = false;
                _this.particles = [];
                _this.addParticles(particleClass, countParticles);
                return _this;
            }
            Object.defineProperty(Emitter.prototype, "xDir", {
                get: function () {
                    return this.xMirror ? -1 : 1;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(Emitter.prototype, "yDir", {
                get: function () {
                    return this.yMirror ? -1 : 1;
                },
                enumerable: false,
                configurable: true
            });
            Emitter.prototype.addParticles = function (particleClass, countParticles) {
                for (var indexCount = 0; indexCount < countParticles; indexCount += 1) {
                    var particle = new particleClass(this);
                    particle.parent = this;
                    this.particles.push(particle);
                }
            };
            Emitter.prototype.onReset = function () {
                this.indexArrayParticle = 0;
                this.indexEmissionParticle = 0;
                this.countEmitt = 0;
            };
            Emitter.prototype.emittSingle = function () {
                if (this.indexArrayParticle < this.particles.length) {
                    var particle = this.particles[this.indexArrayParticle];
                    this.indexArrayParticle += 1;
                    if (this.indexArrayParticle >= this.particles.length) {
                        this.indexArrayParticle = 0;
                    }
                    var indexEmissionParticle = this.indexEmissionParticle;
                    this.indexEmissionParticle += 1;
                    particle.emitt(indexEmissionParticle);
                    return particle;
                }
                return null;
            };
            Emitter.prototype.emittChunk = function () {
                for (var indexEmitt = 0; indexEmitt < this.sizeEmission; indexEmitt += 1) {
                    this.emittSingle();
                }
            };
            Emitter.prototype.onStepUpdate = function () {
                if (!Game.SceneFreezer.stoped && this.emissionSteps > 0) {
                    this.countEmitt += 1;
                    if (this.countEmitt >= this.emissionSteps + 2) {
                        this.emittChunk();
                        this.countEmitt = 0;
                    }
                }
            };
            Emitter.prototype.hasena = function () {
                for (var _i = 0, _a = this.particles; _i < _a.length; _i++) {
                    var par = _a[_i];
                    if (par.enabled)
                        return true;
                }
                return false;
            };
            return Emitter;
        }(Game.Transform));
        Emission.Emitter = Emitter;
    })(Emission = Game.Emission || (Game.Emission = {}));
})(Game || (Game = {}));
///<reference path = "BaseVisualParticle.ts"/>
var Game;
(function (Game) {
    var Emission;
    (function (Emission) {
        var SimpleParticle = /** @class */ (function (_super) {
            __extends(SimpleParticle, _super);
            function SimpleParticle() {
                var _this = _super !== null && _super.apply(this, arguments) || this;
                _this.eternal = false;
                return _this;
            }
            Object.defineProperty(SimpleParticle.prototype, "xRange", {
                get: function () {
                    return 1;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(SimpleParticle.prototype, "yRange", {
                get: function () {
                    return 1;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(SimpleParticle.prototype, "xRangeVel", {
                get: function () {
                    return 0.1;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(SimpleParticle.prototype, "yRangeVel", {
                get: function () {
                    return 0.1;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(SimpleParticle.prototype, "xRangeAccel", {
                get: function () {
                    return 0.1;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(SimpleParticle.prototype, "yRangeAccel", {
                get: function () {
                    return 0.1;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(SimpleParticle.prototype, "rangeLife", {
                get: function () {
                    return 180;
                },
                enumerable: false,
                configurable: true
            });
            SimpleParticle.prototype.emitt = function (index) {
                _super.prototype.emitt.call(this, index);
                this.x = this.parent.x;
                this.y = this.parent.y;
                this.x += this.xRange * this.emitter.xDir;
                this.y += this.yRange * this.emitter.yDir;
                this.xVel = this.xRangeVel * this.emitter.xDir;
                this.yVel = this.yRangeVel * this.emitter.yDir;
                this.xAccel = this.xRangeAccel * this.emitter.xDir;
                this.yAccel = this.yRangeAccel * this.emitter.yDir;
                this.countLife = this.rangeLife;
            };
            SimpleParticle.prototype.onMoveUpdate = function () {
                if (!Game.SceneFreezer.stoped && this.enabled) {
                    this.x += this.xVel;
                    this.y += this.yVel;
                    this.xVel += this.xAccel;
                    this.yVel += this.yAccel;
                }
            };
            SimpleParticle.prototype.onStepUpdate = function () {
                if (!Game.SceneFreezer.stoped && this.enabled && !this.eternal) {
                    this.countLife -= 1;
                    if (this.countLife <= 0) {
                        this.enabled = false;
                    }
                }
            };
            SimpleParticle.prototype.onTimeUpdate = function () {
                _super.prototype.onTimeUpdate.call(this);
                if (!Game.SceneFreezer.stoped && this.enabled) {
                    this.sprite.x += this.xVel * Engine.System.deltaTime;
                    this.sprite.y += this.yVel * Engine.System.deltaTime;
                }
            };
            return SimpleParticle;
        }(Emission.BaseVisualParticle));
        Emission.SimpleParticle = SimpleParticle;
    })(Emission = Game.Emission || (Game.Emission = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var ExtEntity = /** @class */ (function (_super) {
        __extends(ExtEntity, _super);
        function ExtEntity() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ExtEntity;
    }(Game.Entity));
    Game.ExtEntity = ExtEntity;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var tes = false;
    var lev = [];
    Game.addAction("configure", function () {
        for (var i = 0; i <= Game.maxlev; i++)
            lev[i] = i;
        sor();
        ver();
    });
    function getlev(ind) {
        if (tes)
            console.log(/*ind + " - " + */ lev[ind] + " is " + ind);
        return Game.Resources.PATH_LEVEL + "" + (lev[ind] < 10 ? "0" : "") + lev[ind] + ".json";
    }
    Game.getlev = getlev;
    function ver() {
        if (tes) {
            console.error("TESTING LEVEL FINDER");
            var old = Date.now();
            for (var i = 0; i <= Game.maxlev; i++) {
                var fou = false;
                for (var j = 0; j <= Game.maxlev; j++) {
                    if (lev[j] == i) {
                        fou = true;
                        break;
                    }
                }
                if (!fou)
                    console.error("Level " + i + " is missing");
            }
            console.log("MY TIME: " + (Date.now() - old) / 1000);
        }
    }
    function sor() {
        //return;
        //lev[i++]=1;
        /*
        for(i=28;i<MAX_LEVELS;i++){
            console.log(i + " - " + lev[i] + " is " + i);
        }
        */
    }
})(Game || (Game = {}));
/*
Flip-Spike-Patroller-       -Gravity-        -Bee-    : 102,120
Flip-Spike-         -Cristal-Gravity-        -   -Worm: 115
Flip-     -Patroller-       -       -        -Bee-    : 74
    -Spike-         -Cristal-Gravity-Platform-   -    : 62
    -     -         -       -       -Platform-Bee-    : 147
*/
/*
Put Before
----------48 is 43
----------143 is 77
----------96 is 98
----------78 is 100 or delete it
----------131 is 101
----------111 is 102
----------124 is 103
137 is 118
119 is 120 or Update
----------118 is 121
----------134 is 122
----------93 is 131
80 is 134
----------117 is 138
----------82 is 139 and Edit
----------116 is 142
----------86 is 148
68 is 153
112 is 154

//Put After
141 is 132
140 is 133
146 is 84


Delete
----------138 is 57
156 is 88
122 is 89 or 160 is 90
----------153 is 97
69 is 113
61 is 114
----------88 is 125 or Change Order
----------65 is 126 or Change Order
----------108 is 130 or Change Order
99 is 136
85 is 145 or Change order

Flip?
22 is 36



//Small Update
29 is 28
33 is 26
44 is 29
34 is 31
129 is 123
159 is 140
103 is 152
94 is 156
89 is 157
81 is 160

Really Need an Update
66 is 115
123 is 116
83 is 150
84 is 47
76 is 49


*/ 
/*
    -     -         -       -       -        -   -    : 1,2,3
Flip-     -         -       -       -        -   -    : 4,5,6,7,8,9,10,11,12
Flip-Spike-         -       -       -        -   -    : 14,15,16,17,18,19,20,21,22,23,24,25,26,27,139
Flip-Spike-Patroller-       -       -        -   -    : 33,34,35,36,37,39,40,41,43,44,45,46,47,48,49,138,153,156
Flip-Spike-Patroller-Cristal-       -        -   -    : 50,52,57,79,81,144,152
Flip-Spike-Patroller-Cristal-Gravity-        -   -    : 58,96,140,141,143,146,158
Flip-Spike-Patroller-Cristal-Gravity-        -Bee-    : 91,92
Flip-Spike-Patroller-Cristal-Gravity-        -   -Worm: 113
Flip-Spike-Patroller-       -Gravity-        -   -    : 149
Flip-Spike-Patroller-       -Gravity-Platform-   -    : 151
Flip-Spike-Patroller-       -Gravity-        -Bee-Worm: 94,102,120
Flip-Spike-Patroller-       -Gravity-        -   -Worm: 85,89
Flip-Spike-Patroller-       -       -Platform-   -    : 132,154
Flip-Spike-Patroller-Cristal-Gravity-Platform-Bee-Worm:
Flip-Spike-         -Cristal-       -        -   -    : 76
Flip-Spike-         -Cristal-Gravity-        -   -    : 51
Flip-Spike-         -Cristal-Gravity-Platform-   -    : 68,77
Flip-Spike-         -Cristal-Gravity-        -Bee-    : 101,109,124,126,137
Flip-Spike-         -Cristal-Gravity-        -   -Worm: 115
Flip-Spike-         -Cristal-       -        -Bee-    : 106
Flip-Spike-         -Cristal-       -        -   -Worm: 112
Flip-Spike-         -       -Gravity-        -   -    : 121,145,148
Flip-Spike-         -       -Gravity-Platform-   -    : 64,65
Flip-Spike-         -       -Gravity-Platform-Bee-    : 86,114
Flip-Spike-         -       -Gravity-        -Bee-    : 93,100,103
Flip-Spike-         -       -Gravity-        -   -Worm: 117
Flip-Spike-         -       -       -Platform-   -    : 60,66,69,70
Flip-Spike-         -       -       -        -Bee-    : 130
Flip-Spike-         -       -       -        -   -Worm: 82
Flip-     -Patroller-       -       -        -   -    : 28,29,30,31,32,38
Flip-     -Patroller-Cristal-       -        -   -    : 54,150
Flip-     -Patroller-Cristal-Gravity-        -   -    : 53,55,71,72,73
Flip-     -Patroller-       -Gravity-        -Bee-    : 107,131
Flip-     -Patroller-       -       -        -Bee-    : 74,87,118,133
Flip-     -         -Cristal-       -        -   -    : 78
Flip-     -         -       -Gravity-        -Bee-    : 128
Flip-     -         -       -       -        -Bee-Worm: 116
    -Spike-         -       -       -        -   -    : 13
    -Spike-Patroller-       -       -        -   -    : 42
    -Spike-Patroller-Cristal-Gravity-        -   -    : 75
    -Spike-Patroller-Cristal-Gravity-Platform-   -    : 67
    -Spike-Patroller-       -Gravity-        -   -    : 90,135,164
    -Spike-Patroller-       -Gravity-Platform-   -    : 88,155
    -Spike-Patroller-       -Gravity-        -Bee-    : 83,108
    -Spike-         -Cristal-Gravity-        -   -    : 97
    -Spike-         -Cristal-Gravity-Platfrom-   -    : 61,62,63,123
    -Spike-         -Cristal-Gravity-        -Bee-    : 80,104,105,129
    -Spike-         -       -Gravity-        -   -    : 95,142
    -Spike-         -       -Gravity-Platform-   -    : 159
    -Spike-         -       -Gravity-        -Bee-    : 134,136
    -Spike-         -       -       -        -Bee-    : 122
    -     -Patroller-Cristal-       -        -   -    : 84
    -     -Patroller-Cristal-Gravity-        -   -    : 54,56,110
    -     -Patroller-Cristal-Gravity-        -Bee-    : 111
    -     -Patroller-       -Gravity-Platform-   -    : 59
    -     -Patroller-       -       -        -   -Worm: 99
    -     -         -Cristal-Gravity-        -   -    : 125,157
    -     -         -       -Gravity-        -   -    : 163
    -     -         -       -Gravity-        -Bee-    : 119
    -     -         -       -       -Platform-   -    : 127
    -     -         -       -       -Platform-Bee-    : 147
    -     -         -       -       -        -Bee-    : 160
    -     -         -       -       -        -   -Worm: 98
*/ 
var Game;
(function (Game) {
    function range(start, end) {
        return start + Math.random() * (end - start);
    }
    Game.range = range;
    function sig(val) {
        return val < 0 ? -1 : 1;
    }
    Game.sig = sig;
    function dir(val) {
        return val == 0 ? 0 : val < 0 ? -1 : 1;
    }
    Game.dir = dir;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var fra;
    //addAction("configure",()=>{fra=FrameSelector.complex("plapar",Resources.texgam,1,985);});
    var vel = 1.0;
    var ste = 4;
    var ena = false;
    var cou = 0;
    var toplef = new Engine.Sprite();
    var topcen = new Engine.Sprite();
    var toprig = new Engine.Sprite();
    var midlef = new Engine.Sprite();
    var midrig = new Engine.Sprite();
    var botlef = new Engine.Sprite();
    var botcen = new Engine.Sprite();
    var botrig = new Engine.Sprite();
    toplef.enabled = true;
    topcen.enabled = true;
    toprig.enabled = true;
    midlef.enabled = true;
    midrig.enabled = true;
    botlef.enabled = true;
    botcen.enabled = true;
    botrig.enabled = true;
    var PlayerParticle = /** @class */ (function (_super) {
        __extends(PlayerParticle, _super);
        function PlayerParticle() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        PlayerParticle.prototype.onReset = function () {
            ena = false;
            cou = 0;
        };
        PlayerParticle.act = function (x, y) {
            cou = 0;
            toplef.x = x;
            toplef.y = y;
            topcen.x = x;
            topcen.y = y;
            toprig.x = x;
            toprig.y = y;
            midlef.x = x;
            midlef.y = y;
            midrig.x = x;
            midrig.y = y;
            botlef.x = x;
            botlef.y = y;
            botcen.x = x;
            botcen.y = y;
            botrig.x = x;
            botrig.y = y;
            fra[0].applyToSprite(toplef);
            fra[0].applyToSprite(topcen);
            fra[0].applyToSprite(toprig);
            fra[0].applyToSprite(midlef);
            fra[0].applyToSprite(midrig);
            fra[0].applyToSprite(botlef);
            fra[0].applyToSprite(botcen);
            fra[0].applyToSprite(botrig);
            ena = true;
        };
        PlayerParticle.prototype.onStepUpdate = function () {
            if (ena && !Game.SceneFreezer.stoped) {
                if (cou == ste) {
                    fra[1].applyToSprite(toplef);
                    fra[1].applyToSprite(topcen);
                    fra[1].applyToSprite(toprig);
                    fra[1].applyToSprite(midlef);
                    fra[1].applyToSprite(midrig);
                    fra[1].applyToSprite(botlef);
                    fra[1].applyToSprite(botcen);
                    fra[1].applyToSprite(botrig);
                }
                else if (cou == ste * 2) {
                    fra[2].applyToSprite(toplef);
                    fra[2].applyToSprite(topcen);
                    fra[2].applyToSprite(toprig);
                    fra[2].applyToSprite(midlef);
                    fra[2].applyToSprite(midrig);
                    fra[2].applyToSprite(botlef);
                    fra[2].applyToSprite(botcen);
                    fra[2].applyToSprite(botrig);
                }
                else if (cou == ste * 3) {
                    fra[3].applyToSprite(toplef);
                    fra[3].applyToSprite(topcen);
                    fra[3].applyToSprite(toprig);
                    fra[3].applyToSprite(midlef);
                    fra[3].applyToSprite(midrig);
                    fra[3].applyToSprite(botlef);
                    fra[3].applyToSprite(botcen);
                    fra[3].applyToSprite(botrig);
                }
                else if (cou == ste * 4) {
                    fra[4].applyToSprite(toplef);
                    fra[4].applyToSprite(topcen);
                    fra[4].applyToSprite(toprig);
                    fra[4].applyToSprite(midlef);
                    fra[4].applyToSprite(midrig);
                    fra[4].applyToSprite(botlef);
                    fra[4].applyToSprite(botcen);
                    fra[4].applyToSprite(botrig);
                }
                cou += 1;
            }
        };
        PlayerParticle.prototype.onDrawParticles = function () {
            if (ena && !Game.SceneFreezer.stoped) {
                toplef.x -= vel * Engine.System.deltaTime * 60 * 0.85090352453;
                toplef.y -= vel * Engine.System.deltaTime * 60 * 0.85090352453;
                topcen.y -= vel * Engine.System.deltaTime * 60;
                toprig.x += vel * Engine.System.deltaTime * 60 * 0.85090352453;
                toprig.y -= vel * Engine.System.deltaTime * 60 * 0.85090352453;
                midlef.x -= vel * Engine.System.deltaTime * 60;
                midrig.x += vel * Engine.System.deltaTime * 60;
                botlef.x -= vel * Engine.System.deltaTime * 60 * 0.85090352453;
                botlef.y += vel * Engine.System.deltaTime * 60 * 0.85090352453;
                botcen.y += vel * Engine.System.deltaTime * 60;
                botrig.x += vel * Engine.System.deltaTime * 60 * 0.85090352453;
                botrig.y += vel * Engine.System.deltaTime * 60 * 0.85090352453;
            }
            if (ena) {
                toplef.render();
                topcen.render();
                toprig.render();
                midlef.render();
                midrig.render();
                botlef.render();
                botcen.render();
                botrig.render();
            }
        };
        return PlayerParticle;
    }(Engine.Entity));
    Game.PlayerParticle = PlayerParticle;
})(Game || (Game = {}));
///<reference path="../../Game/System/Entity.ts"/>
var Game;
(function (Game) {
    var SimpleAnimator = /** @class */ (function () {
        function SimpleAnimator() {
            this.sprite = new Engine.Sprite();
            this.animator = new Utils.Animator();
            this.animator.listener = this;
            Engine.System.addListenersFrom(this);
        }
        SimpleAnimator.prototype.onReset = function () {
            this.sprite.enabled = false;
            this.animator.setAnimation(null);
        };
        SimpleAnimator.prototype.trigger = function (animation, x, y) {
            this.sprite.enabled = true;
            this.sprite.x = x;
            this.sprite.y = y;
            this.animator.setAnimation(animation);
        };
        SimpleAnimator.prototype.timeMove = function (dx, dy) {
            if (Game.SceneFreezer.stoped)
                return;
            this.sprite.x += dx * Engine.System.deltaTime;
            this.sprite.y += dy * Engine.System.deltaTime;
        };
        SimpleAnimator.prototype.timeMoveTo = function (x, y, vel, disable) {
            if (Game.SceneFreezer.stoped)
                return;
            vel *= Engine.System.deltaTime;
            var dx = x - this.sprite.x;
            var dy = y - this.sprite.y;
            var mag = Math.sqrt(dx * dx + dy * dy);
            if (mag < vel) {
                this.sprite.x = x;
                this.sprite.y = y;
                this.sprite.enabled = this.sprite.enabled && !disable;
            }
            else {
                this.sprite.x += dx * vel / mag;
                this.sprite.y += dy * vel / mag;
            }
        };
        SimpleAnimator.prototype.onSetFrame = function (_animator, _animation, frame) {
            frame.applyToSprite(this.sprite);
        };
        SimpleAnimator.prototype.render = function () {
            if (!this.animator.ended || (this.animator.animation != null && this.animator.animation.loop)) {
                this.sprite.render();
            }
        };
        return SimpleAnimator;
    }());
    Game.SimpleAnimator = SimpleAnimator;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var spr = new Engine.Sprite();
    var TerrainFill = /** @class */ (function (_super) {
        __extends(TerrainFill, _super);
        function TerrainFill(type) {
            var _this = _super.call(this) || this;
            switch (type) {
                case 0:
                    spr.setFull(true, false, Game.Resources.texgam, 106, 128 - 16, 0, 0, 2, 598 + 8, 106, 128 - 16);
                    spr.x = 8 * 5 - 1;
                    spr.y = 8 * 18;
                    break;
                case 1:
                    if (Game.plu)
                        spr.setFull(true, false, Game.Resources.texgam, 72 + 16 + 2, 128 - 16, 0, 0, 202, 598 + 8, 72 + 16 + 2, 128 - 16);
                    else
                        spr.setFull(true, false, Game.Resources.texgam, 72 + 16 + 2, 128 - 16, 0, 0, 110, 598 + 8, 72 + 16 + 2, 128 - 16);
                    spr.x = 8 * (5 + 2 - 1) - 1;
                    spr.y = 8 * 19;
                    break;
            }
            return _this;
        }
        TerrainFill.prototype.onDrawBubblesDialog = function () {
            var y = spr.y;
            do {
                spr.render();
                spr.y += spr.ySize; //-8;
            } while (spr.onScreenY());
            spr.y = y;
        };
        return TerrainFill;
    }(Engine.Entity));
    Game.TerrainFill = TerrainFill;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var FRAMES;
    Game.addAction("configure", function () {
        if (Game.plu)
            FRAMES = Game.FrameSelector.complex("tutorial", Game.Resources.texgam, 0, 729);
        else
            FRAMES = Game.FrameSelector.complex("tutorial", Game.Resources.texgam, 257, 317);
    });
    var Tutorial = /** @class */ (function (_super) {
        __extends(Tutorial, _super);
        function Tutorial(def) {
            var _this = _super.call(this, def) || this;
            def.instance.x += Game.SceneMap.instance.xSizeTile * 0.5;
            def.instance.y += Tutorial.nextOffset;
            Tutorial.nextOffset = 0;
            var touchOffset = _this.getProperty("touch offset");
            if (Game.Level.speedrun && _this.getProperty("index") == 2) {
                def.instance.y += 3;
            }
            if (Game.IS_TOUCH) {
                if (touchOffset >= 0) {
                    new Game.GenericUI(def, FRAMES[_this.getProperty("index") + touchOffset]);
                }
            }
            else {
                new Game.GenericUI(def, FRAMES[_this.getProperty("index")]);
            }
            return _this;
        }
        Tutorial.nextOffset = 0;
        return Tutorial;
    }(Game.Entity));
    Game.Tutorial = Tutorial;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var Wave = /** @class */ (function (_super) {
        __extends(Wave, _super);
        function Wave() {
            var _this = _super.call(this) || this;
            _this.vel = 0.01;
            return _this;
        }
        Wave.prototype.onReset = function () {
            this.ang = 0;
            this.angdra = 0;
            this.val = 0;
            this.valdra = 0;
        };
        Wave.prototype.onStepUpdate = function () {
            if (!Game.SceneFreezer.stoped) {
                this.ang += this.vel;
                this.val = Math.sin(this.ang);
            }
        };
        Wave.prototype.onTimeUpdate = function () {
            this.angdra = this.ang + this.vel * (Game.SceneFreezer.stoped ? 0 : Engine.System.stepExtrapolation);
            this.valdra = Math.sin(this.angdra);
        };
        return Wave;
    }(Engine.Entity));
    Game.Wave = Wave;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var spr = new Engine.Sprite();
    spr.enabled = spr.pinned = true;
    var fra;
    Game.addAction("configure", function () { fra = Game.FrameSelector.complex("AudioFrame", Game.Resources.texgam, Game.plu ? 718 : 739, Game.plu ? 895 : 222); });
    var AudioFrame = /** @class */ (function (_super) {
        __extends(AudioFrame, _super);
        function AudioFrame(ind) {
            if (ind === void 0) { ind = 0; }
            var _this = _super.call(this) || this;
            fra[ind].applyToSprite(spr);
            _this.onViewUpdate();
            return _this;
        }
        AudioFrame.prototype.onViewUpdate = function () {
            spr.x = -Engine.Renderer.xSizeView * 0.5;
            spr.y = -Engine.Renderer.ySizeView * 0.5;
        };
        AudioFrame.prototype.onDrawBubblesDialog = function () {
            spr.render();
        };
        return AudioFrame;
    }(Engine.Entity));
    Game.AudioFrame = AudioFrame;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var fra;
    Game.addAction("configure", function () {
        if (Game.plu)
            fra = Game.FrameSelector.complex("ButtonFrame", Game.Resources.texgam, 430, 868);
        else
            fra = Game.FrameSelector.complex("ButtonFrame", Game.Resources.texgam, 257, 118);
    });
    var ButtonFrame = /** @class */ (function (_super) {
        __extends(ButtonFrame, _super);
        function ButtonFrame(ind, x, y) {
            var _this = _super.call(this) || this;
            _this.spr = new Engine.Sprite();
            _this.spr.enabled = _this.spr.pinned = true;
            _this.spr.x = x;
            _this.spr.y = y;
            fra[ind].applyToSprite(_this.spr);
            return _this;
        }
        ButtonFrame.prototype.setIndex = function (ind) {
            fra[ind].applyToSprite(this.spr);
        };
        ButtonFrame.prototype.onDrawBubblesDialog = function () {
            this.spr.render();
        };
        return ButtonFrame;
    }(Engine.Entity));
    Game.ButtonFrame = ButtonFrame;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var sprbac = new Engine.Sprite();
    var sprfro = new Engine.Sprite();
    sprbac.enabled = sprbac.pinned = true;
    sprfro.enabled = sprfro.pinned = true;
    Game.addAction("configure", function () {
        var fra = Game.FrameSelector.complex("bydev", Game.Resources.texgam, 882, 221);
        fra[0].applyToSprite(sprbac);
        fra[1].applyToSprite(sprfro);
    });
    var ByDevFrame = /** @class */ (function (_super) {
        __extends(ByDevFrame, _super);
        function ByDevFrame() {
            var _this = _super.call(this) || this;
            _this.onViewUpdate();
            return _this;
        }
        ByDevFrame.prototype.onViewUpdate = function () {
            sprbac.x = sprfro.x = 0;
            sprbac.y = sprfro.y = Engine.Renderer.ySizeView * 0.5 - 10 - 2 + (Game.IS_TOUCH && !Game.HAS_LINKS ? 3 + 1 - 0.5 : 0);
        };
        ByDevFrame.prototype.onDrawObjectsAfterUI = function () {
            if (!Game.plu) {
                sprbac.render();
                sprfro.render();
            }
        };
        return ByDevFrame;
    }(Engine.Entity));
    Game.ByDevFrame = ByDevFrame;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var fra;
    var spr = new Engine.Sprite();
    spr.enabled = spr.pinned = true;
    Game.addAction("configure", function () {
        if (Game.plu)
            fra = Game.FrameSelector.complex("CreditsFrame", Game.Resources.texgam, 931, 863);
        else
            fra = Game.FrameSelector.complex("CreditsFrame", Game.Resources.texgam, 876, 141);
        fra[0].applyToSprite(spr);
        spr.y = -28 + (Game.plu ? -4 : 0);
    });
    var CreditsFrame = /** @class */ (function (_super) {
        __extends(CreditsFrame, _super);
        function CreditsFrame() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(CreditsFrame, "spr", {
            get: function () {
                return spr;
            },
            enumerable: false,
            configurable: true
        });
        CreditsFrame.prototype.onDrawBubblesDialog = function () {
            spr.render();
        };
        return CreditsFrame;
    }(Engine.Entity));
    Game.CreditsFrame = CreditsFrame;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var devlinund;
    (function (devlinund) {
        devlinund.preserved = false;
        var spr = new Engine.Sprite();
        spr.enabled = spr.pinned = true;
        Game.addAction("configure", function () {
            if (Game.plu)
                Game.FrameSelector.complex("devlinund", Game.Resources.texgam, 880, 983)[Game.maimen.morgamind].applyToSprite(spr);
            else
                Game.FrameSelector.complex("devlinund", Game.Resources.texgam, 793, 187)[Game.maimen.morgamind].applyToSprite(spr);
        });
        function mak(x, y) {
            Engine.System.addListenersFrom(Game.devlinund);
            spr.x = x;
            spr.y = y;
        }
        devlinund.mak = mak;
        function onDrawBubblesDialog() {
            spr.render();
        }
        devlinund.onDrawBubblesDialog = onDrawBubblesDialog;
    })(devlinund = Game.devlinund || (Game.devlinund = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var fra;
    Game.addAction("configure", function () {
        if (Game.plu)
            fra = Game.FrameSelector.complex("lasbut", Game.Resources.texgam, 828, 895, null, 0, false)[0];
        else
            fra = Game.FrameSelector.complex("lasbut", Game.Resources.texgam, 696, 222, null, 0, false)[0];
    });
    var LastButtonFrames = /** @class */ (function (_super) {
        __extends(LastButtonFrames, _super);
        function LastButtonFrames() {
            var _this = _super.call(this) || this;
            LastButtonFrames.instance = _this;
            _this.spr = new Engine.Sprite();
            _this.spr.enabled = true;
            _this.spr.pinned = true;
            fra.applyToSprite(_this.spr);
            new Game.AudioFrame();
            _this.onViewUpdate();
            return _this;
        }
        LastButtonFrames.prototype.onViewUpdate = function () {
            this.spr.x = Engine.Renderer.xSizeView * 0.5;
            this.spr.y = -Engine.Renderer.ySizeView * 0.5;
        };
        LastButtonFrames.prototype.onDrawBubblesDialog = function () { this.spr.render(); };
        LastButtonFrames.prototype.onClearScene = function () { LastButtonFrames.instance = null; };
        LastButtonFrames.instance = null;
        return LastButtonFrames;
    }(Engine.Entity));
    Game.LastButtonFrames = LastButtonFrames;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var sprpautex = new Engine.Sprite();
    sprpautex.y = -0.5;
    sprpautex.enabled = sprpautex.pinned = true;
    Game.addAction("configure", function () {
        var fra;
        if (Game.plu)
            fra = Game.FrameSelector.complex("LevelFrame", Game.Resources.texgam, 874, 895);
        else
            fra = Game.FrameSelector.complex("LevelFrame", Game.Resources.texgam, 643, 222);
        fra[2].applyToSprite(sprpautex);
    });
    var LastSceneAdUI = /** @class */ (function (_super) {
        __extends(LastSceneAdUI, _super);
        function LastSceneAdUI() {
            var _this = _super.call(this) || this;
            _this.onViewUpdate();
            return _this;
        }
        LastSceneAdUI.prototype.onViewUpdate = function () {
            sprpautex.xSize = Engine.Renderer.xSizeView + 10;
            sprpautex.xOffset = -sprpautex.xSize * 0.5;
        };
        LastSceneAdUI.prototype.onDrawObjectsAfterAdFade = function () {
            if (Game.LevelAdLoader.instance != null && Game.LevelAdLoader.instance.text.enabled) {
                sprpautex.render();
            }
        };
        return LastSceneAdUI;
    }(Engine.Entity));
    Game.LastSceneAdUI = LastSceneAdUI;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var spr = new Engine.Sprite();
    var sprpau = new Engine.Sprite();
    var sprpautex = new Engine.Sprite();
    sprpautex.y = -0.5;
    spr.enabled = spr.pinned = sprpau.enabled = sprpau.pinned = sprpautex.enabled = sprpautex.pinned = true;
    Game.addAction("configure", function () {
        var fra;
        if (Game.plu)
            fra = Game.FrameSelector.complex("LevelFrame", Game.Resources.texgam, 874, 895);
        else
            fra = Game.FrameSelector.complex("LevelFrame", Game.Resources.texgam, 643, 222);
        fra[0].applyToSprite(spr);
        fra[1].applyToSprite(sprpau);
        fra[2].applyToSprite(sprpautex);
    });
    var LevelFrame = /** @class */ (function (_super) {
        __extends(LevelFrame, _super);
        function LevelFrame() {
            var _this = _super.call(this) || this;
            _this.onViewUpdate();
            return _this;
        }
        Object.defineProperty(LevelFrame, "spr", {
            get: function () {
                return spr;
            },
            enumerable: false,
            configurable: true
        });
        LevelFrame.prototype.onViewUpdate = function () {
            spr.x = -Engine.Renderer.xSizeView * 0.5;
            spr.y = -Engine.Renderer.ySizeView * 0.5;
            sprpau.y = -Engine.Renderer.ySizeView * 0.5;
            sprpau.xSize = Engine.Renderer.xSizeView + 10;
            sprpau.xOffset = -sprpau.xSize * 0.5;
            sprpautex.xSize = Engine.Renderer.xSizeView + 10;
            sprpautex.xOffset = -sprpautex.xSize * 0.5;
        };
        LevelFrame.prototype.onDrawSpeedrunDialog = function () {
            if (!Game.SceneFreezer.paused) {
                spr.render();
            }
        };
        LevelFrame.prototype.onDrawBubblesDialog = function () {
            if (Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) {
                sprpau.render();
                //sprpautex.render();
            }
        };
        LevelFrame.prototype.onDrawObjectsAfterAdFade = function () {
            if (Game.SceneFreezer.paused || (Game.Level.practice && Game.Level.practiceFinished)) {
                sprpautex.render();
            }
            else if (Game.LevelAdLoader.instance != null && Game.LevelAdLoader.instance.text.enabled) {
                sprpautex.render();
            }
        };
        return LevelFrame;
    }(Engine.Entity));
    Game.LevelFrame = LevelFrame;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var fra;
    var spr = [];
    spr[0] = new Engine.Sprite();
    spr[1] = new Engine.Sprite();
    spr[0].enabled = spr[0].pinned = spr[1].enabled = spr[1].pinned = true;
    Game.addAction("configure", function () {
        if (Game.plu)
            fra = Game.FrameSelector.complex("levelframe", Game.Resources.texgam, 0, 994);
        else
            fra = Game.FrameSelector.complex("levelframe", Game.Resources.texgam, 257, 142);
    });
    var ind;
    var hor;
    var ver;
    var LevelSpeedrunTimer = /** @class */ (function (_super) {
        __extends(LevelSpeedrunTimer, _super);
        function LevelSpeedrunTimer() {
            var _this = _super.call(this) || this;
            spr[0].enabled = true;
            spr[1].enabled = true;
            hor = Game.LevelUIAlignment.horspe;
            ver = Game.LevelUIAlignment.verspe;
            ind = Game.LevelUIAlignment.imgspe + (hor + 1) * 2 + 6 * (ver > 0 ? 1 : 0);
            spr[0].enabled = Game.LevelUIAlignment.enaspe && Game.LevelUIAlignment.imgspe >= 0;
            spr[1].enabled = Game.LevelUIAlignment.enaspe && Game.LevelUIAlignment.imgspe >= 0 && Game.LevelUIAlignment.extspe;
            fra[spr[0].enabled ? ind : 0].applyToSprite(spr[0]);
            fra[spr[1].enabled ? ind + 12 : 0].applyToSprite(spr[1]);
            spr[0].setRGBA(1, 1, 1, Game.LevelUIAlignment.alpspe);
            _this.onViewUpdate();
            return _this;
        }
        LevelSpeedrunTimer.prototype.onViewUpdate = function () {
            spr[0].x = hor * (Engine.Renderer.xSizeView * 0.5);
            spr[0].y = ver * (Engine.Renderer.ySizeView * 0.5);
            spr[1].x = hor * (Engine.Renderer.xSizeView * 0.5);
            spr[1].y = ver * (Engine.Renderer.ySizeView * 0.5);
        };
        LevelSpeedrunTimer.prototype.onDrawObjectsAfterUI = function () {
            if (!Game.SceneFreezer.paused) {
                spr[0].render();
                spr[1].render();
            }
        };
        return LevelSpeedrunTimer;
    }(Engine.Entity));
    Game.LevelSpeedrunTimer = LevelSpeedrunTimer;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var sprpau = new Engine.Sprite();
    sprpau.enabled = sprpau.pinned = true;
    Game.addAction("configure", function () {
        if (Game.plu)
            Game.FrameSelector.complex("SpeFramePau", Game.Resources.texgam, 956, 994)[0].applyToSprite(sprpau);
        else
            Game.FrameSelector.complex("SpeFramePau", Game.Resources.texgam, 594, 222)[0].applyToSprite(sprpau);
    });
    var TimerPausedFrame = /** @class */ (function (_super) {
        __extends(TimerPausedFrame, _super);
        function TimerPausedFrame() {
            var _this = _super.call(this) || this;
            sprpau.enabled = Game.Level.speedrun;
            _this.onViewUpdate();
            return _this;
        }
        TimerPausedFrame.prototype.onViewUpdate = function () {
            sprpau.x = 0;
            sprpau.y = Engine.Renderer.ySizeView * 0.5;
        };
        TimerPausedFrame.prototype.onDrawBubblesDialog = function () {
            if (Game.SceneFreezer.paused) {
                sprpau.render();
            }
        };
        return TimerPausedFrame;
    }(Engine.Entity));
    Game.TimerPausedFrame = TimerPausedFrame;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var fra;
    var spr = [];
    spr[0] = new Engine.Sprite();
    spr[1] = new Engine.Sprite();
    spr[0].enabled = spr[0].pinned = spr[1].enabled = spr[1].pinned = true;
    Game.addAction("configure", function () {
        if (Game.plu)
            fra = Game.FrameSelector.complex("levelframe", Game.Resources.texgam, 0, 922);
        else
            fra = Game.FrameSelector.complex("levelframe", Game.Resources.texgam, 0, 48);
    });
    var ind;
    var hor;
    var ver;
    var LevelTextFrame = /** @class */ (function (_super) {
        __extends(LevelTextFrame, _super);
        function LevelTextFrame() {
            var _this = _super.call(this) || this;
            spr[0].enabled = true;
            spr[1].enabled = true;
            hor = Game.LevelUIAlignment.horlev;
            ver = Game.LevelUIAlignment.verlev;
            ind = Game.LevelUIAlignment.imglev + (hor + 1) * 3 + 9 * (ver > 0 ? 1 : 0);
            spr[0].enabled = Game.LevelUIAlignment.enalev && Game.LevelUIAlignment.imglev >= 0;
            spr[1].enabled = Game.LevelUIAlignment.enalev && Game.LevelUIAlignment.imglev >= 0 && Game.LevelUIAlignment.extlev;
            fra[spr[0].enabled ? ind : 0].applyToSprite(spr[0]);
            fra[spr[1].enabled ? ind + 18 : 0].applyToSprite(spr[1]);
            spr[0].setRGBA(1, 1, 1, Game.LevelUIAlignment.alplev);
            _this.onViewUpdate();
            return _this;
        }
        LevelTextFrame.prototype.onViewUpdate = function () {
            spr[0].x = hor * (Engine.Renderer.xSizeView * 0.5);
            spr[0].y = ver * (Engine.Renderer.ySizeView * 0.5);
            spr[1].x = hor * (Engine.Renderer.xSizeView * 0.5);
            spr[1].y = ver * (Engine.Renderer.ySizeView * 0.5);
        };
        LevelTextFrame.prototype.onDrawObjectsAfterUI = function () {
            if (!Game.SceneFreezer.paused && (!Game.Level.practice || !Game.Level.practiceFinished)) {
                spr[0].render();
                spr[1].render();
            }
        };
        return LevelTextFrame;
    }(Engine.Entity));
    Game.LevelTextFrame = LevelTextFrame;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var fra;
    var spr = [];
    spr[0] = new Engine.Sprite();
    spr[1] = new Engine.Sprite();
    spr[0].enabled = spr[0].pinned = spr[1].enabled = spr[1].pinned = true;
    Game.addAction("configure", function () {
        if (Game.plu)
            fra = Game.FrameSelector.complex("levelframe", Game.Resources.texgam, 0, 994);
        else
            fra = Game.FrameSelector.complex("levelframe", Game.Resources.texgam, 257, 142);
    });
    var ind;
    var hor;
    var ver;
    var LevelTimerFrame = /** @class */ (function (_super) {
        __extends(LevelTimerFrame, _super);
        function LevelTimerFrame() {
            var _this = _super.call(this) || this;
            spr[0].enabled = true;
            spr[1].enabled = true;
            hor = Game.LevelUIAlignment.hortim;
            ver = Game.LevelUIAlignment.vertim;
            ind = Game.LevelUIAlignment.imgtim + (hor + 1) * 2 + 6 * (ver > 0 ? 1 : 0);
            spr[0].enabled = Game.LevelUIAlignment.enatim && Game.LevelUIAlignment.imgtim >= 0;
            spr[1].enabled = Game.LevelUIAlignment.enatim && Game.LevelUIAlignment.imgtim >= 0 && Game.LevelUIAlignment.exttim;
            fra[spr[0].enabled ? ind : 0].applyToSprite(spr[0]);
            fra[spr[1].enabled ? ind + 12 : 0].applyToSprite(spr[1]);
            spr[0].setRGBA(1, 1, 1, Game.LevelUIAlignment.alptim);
            _this.onViewUpdate();
            return _this;
        }
        LevelTimerFrame.prototype.onViewUpdate = function () {
            spr[0].x = hor * (Engine.Renderer.xSizeView * 0.5);
            spr[0].y = ver * (Engine.Renderer.ySizeView * 0.5);
            spr[1].x = hor * (Engine.Renderer.xSizeView * 0.5);
            spr[1].y = ver * (Engine.Renderer.ySizeView * 0.5);
        };
        LevelTimerFrame.prototype.onDrawObjectsAfterUI = function () {
            if (!Game.SceneFreezer.paused && (!Game.Level.practice || !Game.Level.practiceFinished)) {
                spr[0].render();
                spr[1].render();
            }
        };
        return LevelTimerFrame;
    }(Engine.Entity));
    Game.LevelTimerFrame = LevelTimerFrame;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var sprpau = new Engine.Sprite();
    sprpau.enabled = sprpau.pinned = true;
    Game.addAction("configure", function () {
        if (Game.plu)
            Game.FrameSelector.complex("TimerFramePau", Game.Resources.texgam, 880, 922)[0].applyToSprite(sprpau);
        else
            Game.FrameSelector.complex("TimerFramePau", Game.Resources.texgam, 822, 198)[0].applyToSprite(sprpau);
    });
    var PracticePausedFrame = /** @class */ (function (_super) {
        __extends(PracticePausedFrame, _super);
        function PracticePausedFrame() {
            var _this = _super.call(this) || this;
            sprpau.enabled = true;
            _this.onViewUpdate();
            return _this;
        }
        Object.defineProperty(PracticePausedFrame, "spr", {
            get: function () {
                return sprpau;
            },
            enumerable: false,
            configurable: true
        });
        PracticePausedFrame.prototype.onViewUpdate = function () {
            sprpau.x = 0;
            sprpau.y = Engine.Renderer.ySizeView * 0.5;
        };
        PracticePausedFrame.prototype.onDrawBubblesDialog = function () {
            if (Game.SceneFreezer.paused) {
                sprpau.render();
            }
        };
        return PracticePausedFrame;
    }(Engine.Entity));
    Game.PracticePausedFrame = PracticePausedFrame;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var wid = 51;
    var hei = 20 + 4 - 4 + 1 + 0.5 + 0.5;
    var LevelLogoFrameLeft = /** @class */ (function (_super) {
        __extends(LevelLogoFrameLeft, _super);
        function LevelLogoFrameLeft() {
            var _this = _super.call(this) || this;
            _this.spr = new Engine.Sprite();
            _this.spr.setFull(true, true, Game.Resources.texgam, wid, hei, 0, 0, 297, 696, wid, hei);
            _this.onViewUpdate();
            return _this;
        }
        LevelLogoFrameLeft.prototype.onViewUpdate = function () {
            this.spr.x = -Engine.Renderer.xSizeView * 0.5 - 5 - 0.5 + 1 + 1 - 1;
            this.spr.y = Engine.Renderer.ySizeView * 0.5 - hei + 5 + 1;
        };
        LevelLogoFrameLeft.prototype.onDrawButtons = function () {
            this.sprfor.render();
        };
        return LevelLogoFrameLeft;
    }(Engine.Entity));
    Game.LevelLogoFrameLeft = LevelLogoFrameLeft;
    var LevelLogoFrameRight = /** @class */ (function (_super) {
        __extends(LevelLogoFrameRight, _super);
        function LevelLogoFrameRight() {
            var _this = _super.call(this) || this;
            _this.spr = new Engine.Sprite();
            _this.spr.setFull(true, true, Game.Resources.texgam, wid, hei, 0, 0, 352, 696, wid, hei);
            _this.onViewUpdate();
            return _this;
        }
        LevelLogoFrameRight.prototype.onViewUpdate = function () {
            this.spr.x = Engine.Renderer.xSizeView * 0.5 - wid + 5 - 1 - 1 + 1;
            this.spr.y = Engine.Renderer.ySizeView * 0.5 - hei + 5 + 1;
        };
        LevelLogoFrameRight.prototype.onDrawButtons = function () {
            this.sprfor.render();
        };
        return LevelLogoFrameRight;
    }(Engine.Entity));
    Game.LevelLogoFrameRight = LevelLogoFrameRight;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var spr = new Engine.Sprite();
    spr.enabled = spr.pinned = true;
    Game.addAction("configure", function () {
        if (Game.plu)
            Game.FrameSelector.complex("mendes", Game.Resources.texgam, Game.HAS_LINKS ? 951 : 880, Game.HAS_LINKS ? 946 : 945)[0].applyToSprite(spr);
        else
            Game.FrameSelector.complex("mendes", Game.Resources.texgam, Game.HAS_LINKS ? 793 : 759, Game.HAS_LINKS ? 141 : 265)[0].applyToSprite(spr);
    });
    var MenuDesktopFrame = /** @class */ (function (_super) {
        __extends(MenuDesktopFrame, _super);
        function MenuDesktopFrame() {
            var _this = _super.call(this) || this;
            _this.onViewUpdate();
            return _this;
        }
        MenuDesktopFrame.prototype.onViewUpdate = function () {
            spr.x = 0;
            if (Game.plu)
                spr.y = Game.HAS_LINKS ? -3 - 1 : -13 + 16 - 1 - 5 - 3;
            else
                spr.y = Game.HAS_LINKS ? -19 : -13;
        };
        MenuDesktopFrame.prototype.onDrawBubblesDialog = function () {
            spr.render();
        };
        return MenuDesktopFrame;
    }(Engine.Entity));
    Game.MenuDesktopFrame = MenuDesktopFrame;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var spr = new Engine.Sprite();
    spr.enabled = spr.pinned = true;
    spr.y = -41;
    Game.addAction("configure", function () {
        if (Game.plu)
            Game.FrameSelector.complex("SpeedrunMenu", Game.Resources.texgam, 670, 803)[0].applyToSprite(spr);
        else
            Game.FrameSelector.complex("SpeedrunMenu", Game.Resources.texgam, 910, 48)[0].applyToSprite(spr);
        spr.y += Game.plu ? 2 : 0;
    });
    var SpeedrunFrame = /** @class */ (function (_super) {
        __extends(SpeedrunFrame, _super);
        function SpeedrunFrame() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(SpeedrunFrame, "spr", {
            get: function () {
                return spr;
            },
            enumerable: false,
            configurable: true
        });
        SpeedrunFrame.prototype.onDrawBubblesDialog = function () {
            spr.render();
        };
        return SpeedrunFrame;
    }(Engine.Entity));
    Game.SpeedrunFrame = SpeedrunFrame;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var spr = new Engine.Sprite();
    spr.enabled = spr.pinned = true;
    spr.y = -32 - 8 + 4 - 2 + 6 - 3;
    Game.addAction("configure", function () {
        if (Game.plu)
            Game.FrameSelector.complex("SpeedrunMenu", Game.Resources.texgam, 670, 803)[0].applyToSprite(spr);
        else
            Game.FrameSelector.complex("SpeedrunMenu", Game.Resources.texgam, 910, 48)[0].applyToSprite(spr);
        spr.y += Game.plu ? 3 : 0;
    });
    var SpeedrunRestFrame = /** @class */ (function (_super) {
        __extends(SpeedrunRestFrame, _super);
        function SpeedrunRestFrame() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(SpeedrunRestFrame, "spr", {
            get: function () {
                return spr;
            },
            enumerable: false,
            configurable: true
        });
        SpeedrunRestFrame.prototype.onDrawBubblesDialog = function () {
            spr.render();
        };
        return SpeedrunRestFrame;
    }(Engine.Entity));
    Game.SpeedrunRestFrame = SpeedrunRestFrame;
})(Game || (Game = {}));
///<reference path="../../ExtEntity.ts"/>
var Game;
(function (Game) {
    var bal;
    (function (bal) {
        bal.cou = 0;
        function onClearScene() {
            bal.cou = 0;
        }
        bal.onClearScene = onClearScene;
        var cla = /** @class */ (function (_super) {
            __extends(cla, _super);
            function cla(def) {
                var _this = _super.call(this, def) || this;
                onConstructor(_this, Game.bal);
                return _this;
            }
            cla.prototype.onSetFrame = function (_, __, fra) { onSetFrame(this.ind, fra); };
            return cla;
        }(Game.ExtEntity));
        bal.cla = cla;
        function getpro(i, nam) {
            return bal.ins[i].getProperty(nam);
        }
        bal.getpro = getpro;
        bal.stacou = 0;
        bal.sta = [];
        bal.consta = [];
        bal.ressta = [];
        bal.begsta = [];
        bal.movsta = [];
        bal.updsta = [];
        bal.linsta = [];
        function maksta() {
            function nul(_) { }
            ;
            bal.consta.push(nul);
            bal.ressta.push(nul);
            bal.begsta.push(nul);
            bal.movsta.push(nul);
            bal.updsta.push(nul);
            bal.linsta.push(nul);
            return bal.stacou++;
        }
        bal.maksta = maksta;
        maksta();
        bal.ins = [];
        bal.def = [];
        bal.concom = [[], [], []];
        function onConstructor(obj, nam) {
            bal.ins[bal.cou] = obj;
            bal.def[bal.cou] = obj.def;
            bal.concom.forEach(function (x) { return x.forEach(function (y) { return y(bal.cou); }); });
            bal.consta.forEach(function (x) { return x(bal.cou); });
            if (bal.cou == 0)
                Engine.System.addListenersFrom(nam);
            obj.ind = bal.cou++;
        }
        bal.onConstructor = onConstructor;
        bal.rescom = [[], [], []];
        function onReset() {
            bal.rescom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < bal.cou; i++)
                bal.sta[i] = 0;
            for (var i = 0; i < bal.cou; i++)
                bal.ressta.forEach(function (x) { return x(i); });
        }
        bal.onReset = onReset;
        bal.begcom = [[], [], []];
        function onStart() {
            bal.begcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < bal.cou; i++)
                bal.begsta.forEach(function (x) { return x(i); });
            for (var i = 0; i < bal.cou; i++)
                bal.linsta.forEach(function (x) { return x(i); });
        }
        bal.onStart = onStart;
        bal.movcom = [[], [], []];
        function onMoveUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            bal.movcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < bal.cou; i++)
                bal.movsta[bal.sta[i]](i);
        }
        bal.onMoveUpdate = onMoveUpdate;
        bal.stecom = [[], [], []];
        function onStepUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            bal.stecom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < bal.cou; i++)
                bal.updsta[bal.sta[i]](i);
            for (var i = 0; i < bal.cou; i++)
                bal.linsta[bal.sta[i]](i);
        }
        bal.onStepUpdate = onStepUpdate;
        bal.anicom = [[], [], []];
        function onSetFrame(i, fra) {
            bal.anicom.forEach(function (x) { return x.forEach(function (y) { return y(i, fra); }); });
        }
        bal.onSetFrame = onSetFrame;
        bal.timcom = [[], [], []];
        function onTimeUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            bal.timcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        bal.onTimeUpdate = onTimeUpdate;
        bal.dracom = [[], [], []];
        function onDrawObjects() {
            bal.dracom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        bal.onDrawObjects = onDrawObjects;
    })(bal = Game.bal || (Game.bal = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bal;
    (function (bal) {
        Game.addAction("preconfigure", function () { bal.fra = Game.FrameSelector.complex("bal", Game.Resources.texgam, 428, 544); });
        bal.ani = [];
        bal.concom[1].push(function (i) {
            bal.ani[i] = new Utils.Animator();
            bal.ani[i].owner = bal.ani[i].listener = bal.ins[i];
        });
        bal.anicom[1].push(function (i, fra) {
            fra.applyToSprite(bal.spr[i]);
        });
    })(bal = Game.bal || (Game.bal = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bal;
    (function (bal) {
        bal.concom[0].push(function (i) {
            bal.def[i].instance.x += Game.SceneMap.instance.xSizeTile * 0.5;
            bal.def[i].instance.y -= Game.SceneMap.instance.ySizeTile * 0.5;
        });
    })(bal = Game.bal || (Game.bal = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bal;
    (function (bal) {
        var box = [];
        var ove = [];
        var horare = [];
        var horste = [];
        var horsta = [];
        var horcou = [];
        var verare = [];
        var verste = [];
        var versta = [];
        var vercou = [];
        bal.hormir = [];
        bal.horext = [];
        bal.verext = [];
        bal.concom[1].push(function (i) {
            box[i] = new Engine.Box();
            box[i].enabled = box[i].renderable = true;
            Game.SceneMap.instance.boxesEnemies.push(box[i]);
            ove[i] = new Engine.Box();
            ove[i].enabled = ove[i].renderable = true;
            Game.SceneMap.instance.boxesEnemies.push(ove[i]);
            horare[i] = bal.ins[i].getProperty("horare") * Game.SceneMap.instance.xSizeTile;
            horste[i] = bal.ins[i].getProperty("horste");
            horsta[i] = bal.ins[i].getProperty("horsta");
            verare[i] = bal.ins[i].getProperty("verare") * Game.SceneMap.instance.xSizeTile;
            verste[i] = bal.ins[i].getProperty("verste");
            versta[i] = bal.ins[i].getProperty("versta");
        });
        bal.rescom[0].push(function () {
            for (var i = 0; i < bal.cou; i++) {
                horcou[i] = horsta[i];
                box[i].x = ove[i].x = finhor(i, horcou[i]);
                vercou[i] = versta[i];
                box[i].y = ove[i].y = finver(i, vercou[i]);
                bal.hormir[i] = false;
            }
        });
        function finhor(i, cou) {
            if (horste[i] == 0)
                return bal.def[i].instance.x;
            var mov = cou / horste[i];
            mov *= 2 * Math.PI;
            mov = (1 + Math.sin(mov - Math.PI * 0.5)) * 0.5 * horare[i];
            return bal.def[i].instance.x + mov;
        }
        function finver(i, cou) {
            if (verste[i] == 0)
                return bal.def[i].instance.y;
            var mov = cou / verste[i];
            mov *= 2 * Math.PI;
            mov = (1 + Math.sin(mov - Math.PI * 0.5)) * 0.5 * verare[i];
            return bal.def[i].instance.y + mov;
        }
        bal.movcom[0].push(function () {
            for (var i = 0; i < bal.cou; i++) {
                horcou[i] += 1;
                if (horcou[i] > horste[i])
                    horcou[i] = 0;
                if (horare[i] != 0)
                    bal.hormir[i] = horcou[i] >= horste[i] * 0.5;
                if (horare[i] < 0)
                    bal.hormir[i] = !bal.hormir[i];
                vercou[i] += 1;
                if (vercou[i] > verste[i])
                    vercou[i] = 0;
                if (verare[i] != 0)
                    bal.hormir[i] = vercou[i] >= verste[i] * 0.5;
                if (verare[i] < 0)
                    bal.hormir[i] = !bal.hormir[i];
                box[i].x = ove[i].x = finhor(i, horcou[i]);
                box[i].y = ove[i].y = finver(i, vercou[i]);
            }
        });
        bal.anicom[0].push(function (i, frm) {
            frm.applyToBox(box[i]);
            bal.fra[bal.fra.indexOf(frm) + 12].applyToBox(ove[i]);
        });
        bal.timcom[0].push(function () {
            for (var i = 0; i < bal.cou; i++) {
                bal.horext[i] = Game.SceneFreezer.stoped ? 0 : Engine.System.stepExtrapolation * (horcou[i] == horste[i] ? -1 : 1);
                bal.horext[i] = finhor(i, horcou[i] + bal.horext[i]);
                bal.verext[i] = Game.SceneFreezer.stoped ? 0 : Engine.System.stepExtrapolation * (vercou[i] == verste[i] ? -1 : 1);
                bal.verext[i] = finver(i, vercou[i] + bal.verext[i]);
            }
        });
        bal.dracom[2].push(function () {
            for (var i = 0; i < bal.cou; i++) {
                box[i].renderAt(bal.horext[i], bal.verext[i] + bal.wav[i]);
                ove[i].renderAt(bal.horext[i], bal.verext[i] + bal.wav[i]);
            }
        });
    })(bal = Game.bal || (Game.bal = {}));
})(Game || (Game = {}));
///<reference path="../bal.ts"/>
var Game;
(function (Game) {
    var bal;
    (function (bal) {
        bal.spr = [];
        bal.concom[1].push(function (i) {
            bal.spr[i] = new Engine.Sprite();
            bal.spr[i].enabled = true;
            bal.fra[0].applyToSprite(bal.spr[i]);
        });
        bal.rescom[1].push(function () {
            for (var i = 0; i < bal.cou; i++) {
                bal.spr[i].xMirror = bal.def[i].flip.x;
                bal.spr[i].yMirror = bal.def[i].flip.y;
                bal.spr[i].x = bal.def[i].instance.x;
                bal.spr[i].y = bal.def[i].instance.y;
            }
        });
        bal.dracom[1].push(function () {
            for (var i = 0; i < bal.cou; i++) {
                bal.spr[i].xMirror = bal.hormir[i];
                bal.spr[i].x = bal.horext[i];
                bal.spr[i].y = bal.verext[i] + bal.wav[i];
                bal.spr[i].render();
            }
        });
    })(bal = Game.bal || (Game.bal = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bal;
    (function (bal) {
        var vel = [];
        var dis = [];
        var ang = [];
        bal.wav = [];
        bal.concom[1].push(function (i) {
            vel[i] = bal.ins[i].getProperty("wavvel");
            dis[i] = bal.ins[i].getProperty("wavdis");
        });
        bal.rescom[1].push(function () {
            for (var i = 0; i < bal.cou; i++) {
                bal.wav[i] = 0;
                ang[i] = 0;
            }
        });
        bal.stecom[1].push(function () {
            for (var i = 0; i < bal.cou; i++)
                ang[i] += vel[i];
        });
        bal.timcom[1].push(function () {
            for (var i = 0; i < bal.cou; i++)
                bal.wav[i] = Math.sin(ang[i] + vel[i] * Engine.System.stepExtrapolation) * dis[i];
        });
    })(bal = Game.bal || (Game.bal = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bal;
    (function (bal) {
        var ind = bal.maksta();
        var cli;
        Game.addAction("configure", function () { cli = new Utils.Animation("cli", false, bal.fra, 2, [3, 4, 5, 6, 7, 8, 9, 9], null); });
        function setgro(i) {
            bal.ani[i].setAnimation(cli);
            bal.sta[i] = ind;
        }
        bal.setgro = setgro;
        bal.updsta[ind] = function (i) {
            if (bal.ani[i].ended)
                bal.setout(i);
        };
    })(bal = Game.bal || (Game.bal = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bal;
    (function (bal) {
        var ind = bal.maksta();
        var ste = [];
        var cou = [];
        var cli;
        Game.addAction("configure", function () { cli = new Utils.Animation("cli", true, bal.fra, 10, [10, 11, 10, 9], null); });
        bal.consta[ind] = function (i) {
            ste[i] = bal.ins[i].getProperty("big");
        };
        bal.ressta[ind] = function (i) {
            if (!bal.ins[i].getProperty("sma"))
                setout(i);
        };
        function setout(i) {
            cou[i] = ste[i];
            bal.ani[i].setAnimation(cli);
            bal.sta[i] = ind;
        }
        bal.setout = setout;
        bal.updsta[ind] = function (i) {
            if (cou[i]-- == 0)
                bal.setshr(i);
        };
    })(bal = Game.bal || (Game.bal = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bal;
    (function (bal) {
        var ind = bal.maksta();
        var cli;
        Game.addAction("configure", function () { cli = new Utils.Animation("cli", false, bal.fra, 2, [10, 9, 8, 7, 6, 5, 4, 3], null); });
        function setshr(i) {
            bal.ani[i].setAnimation(cli);
            bal.sta[i] = ind;
        }
        bal.setshr = setshr;
        bal.updsta[ind] = function (i) {
            if (bal.ani[i].ended)
                bal.setwai(i);
        };
    })(bal = Game.bal || (Game.bal = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bal;
    (function (bal) {
        var ind = bal.maksta();
        var ste = [];
        var cou = [];
        var cli;
        Game.addAction("configure", function () { cli = new Utils.Animation("cli", true, bal.fra, 10, [0, 1, 2, 1], null); });
        bal.consta[ind] = function (i) {
            ste[i] = bal.ins[i].getProperty("wai");
        };
        bal.ressta[ind] = function (i) {
            if (bal.ins[i].getProperty("sma"))
                setwai(i);
        };
        function setwai(i) {
            cou[i] = ste[i];
            bal.ani[i].setAnimation(cli);
            bal.sta[i] = ind;
        }
        bal.setwai = setwai;
        bal.updsta[ind] = function (i) {
            if (cou[i]-- == 0)
                bal.setgro(i);
        };
    })(bal = Game.bal || (Game.bal = {}));
})(Game || (Game = {}));
///<reference path="../../ExtEntity.ts"/>
var Game;
(function (Game) {
    var bub;
    (function (bub) {
        bub.cou = 0;
        function onClearScene() {
            bub.cou = 0;
        }
        bub.onClearScene = onClearScene;
        var cla = /** @class */ (function (_super) {
            __extends(cla, _super);
            function cla(def) {
                var _this = _super.call(this, def) || this;
                onConstructor(_this, Game.bub);
                return _this;
            }
            cla.prototype.onSetFrame = function (_, __, fra) { onSetFrame(this.ind, fra); };
            return cla;
        }(Game.ExtEntity));
        bub.cla = cla;
        function getpro(i, nam) {
            return bub.ins[i].getProperty(nam);
        }
        bub.getpro = getpro;
        bub.stacou = 0;
        bub.sta = [];
        bub.consta = [];
        bub.ressta = [];
        bub.begsta = [];
        bub.movsta = [];
        bub.updsta = [];
        bub.linsta = [];
        function maksta() {
            function nul(_) { }
            ;
            bub.consta.push(nul);
            bub.ressta.push(nul);
            bub.begsta.push(nul);
            bub.movsta.push(nul);
            bub.updsta.push(nul);
            bub.linsta.push(nul);
            return bub.stacou++;
        }
        bub.maksta = maksta;
        maksta();
        bub.ins = [];
        bub.def = [];
        bub.concom = [[], [], []];
        function onConstructor(obj, nam) {
            bub.ins[bub.cou] = obj;
            bub.def[bub.cou] = obj.def;
            bub.concom.forEach(function (x) { return x.forEach(function (y) { return y(bub.cou); }); });
            bub.consta.forEach(function (x) { return x(bub.cou); });
            if (bub.cou == 0)
                Engine.System.addListenersFrom(nam);
            obj.ind = bub.cou++;
        }
        bub.onConstructor = onConstructor;
        bub.rescom = [[], [], []];
        function onReset() {
            bub.rescom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < bub.cou; i++)
                bub.sta[i] = 0;
            for (var i = 0; i < bub.cou; i++)
                bub.ressta.forEach(function (x) { return x(i); });
        }
        bub.onReset = onReset;
        bub.begcom = [[], [], []];
        function onStart() {
            bub.begcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < bub.cou; i++)
                bub.begsta.forEach(function (x) { return x(i); });
            for (var i = 0; i < bub.cou; i++)
                bub.linsta.forEach(function (x) { return x(i); });
        }
        bub.onStart = onStart;
        bub.movcom = [[], [], []];
        function onMoveUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            bub.movcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < bub.cou; i++)
                bub.movsta[bub.sta[i]](i);
        }
        bub.onMoveUpdate = onMoveUpdate;
        bub.stecom = [[], [], []];
        function onStepUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            bub.stecom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < bub.cou; i++)
                bub.updsta[bub.sta[i]](i);
            for (var i = 0; i < bub.cou; i++)
                bub.linsta[bub.sta[i]](i);
        }
        bub.onStepUpdate = onStepUpdate;
        bub.anicom = [[], [], []];
        function onSetFrame(i, fra) {
            bub.anicom.forEach(function (x) { return x.forEach(function (y) { return y(i, fra); }); });
        }
        bub.onSetFrame = onSetFrame;
        bub.timcom = [[], [], []];
        function onTimeUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            bub.timcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        bub.onTimeUpdate = onTimeUpdate;
        bub.dracom = [[], [], []];
        function onDrawObjects() {
            bub.dracom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        bub.onDrawObjects = onDrawObjects;
    })(bub = Game.bub || (Game.bub = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bub;
    (function (bub) {
        var alp = [];
        bub.rescom[1].push(function () {
            for (var i = 0; i < bub.cou; i++)
                alp[i] = 0;
        });
        function resalp(i) {
            bub.spr[i].setRGBA(1, 1, 1, 1);
            alp[i] = 1;
        }
        bub.resalp = resalp;
        function updalp(i) {
            alp[i] -= bub.def[i].alp;
        }
        bub.updalp = updalp;
        bub.timcom[1].push(function () {
            for (var i = 0; i < bub.cou; i++) {
                var dra = alp[i] - bub.def[i].alp;
                dra = dra < 0 ? 0 : dra;
                bub.spr[i].setRGBA(1, 1, 1, dra);
            }
        });
    })(bub = Game.bub || (Game.bub = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bub;
    (function (bub) {
        Game.addAction("preconfigure", function () { bub.fra = Game.FrameSelector.complex("bub", Game.Resources.texgam, 609, 619); });
        bub.ani = [];
        bub.concom[1].push(function (i) {
            bub.ani[i] = new Utils.Animator();
            bub.ani[i].owner = bub.ani[i].listener = bub.ins[i];
        });
        bub.anicom[1].push(function (i, fra) {
            fra.applyToSprite(bub.spr[i]);
        });
    })(bub = Game.bub || (Game.bub = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bub;
    (function (bub) {
        var vel = [];
        var pos = [];
        bub.asc = [];
        bub.rescom[1].push(function () {
            for (var i = 0; i < bub.cou; i++) {
                vel[i] = 0;
                pos[i] = 0;
                bub.asc[i] = 0;
            }
        });
        function setasc(i) {
            vel[i] = bub.def[i].gra + bub.def[i].ext * Math.random();
            pos[i] = 0;
            bub.asc[i] = 0;
        }
        bub.setasc = setasc;
        function updasc(i) {
            pos[i] += vel[i];
        }
        bub.updasc = updasc;
        bub.timcom[1].push(function () {
            for (var i = 0; i < bub.cou; i++)
                bub.asc[i] = pos[i] + vel[i] * Engine.System.stepExtrapolation;
        });
    })(bub = Game.bub || (Game.bub = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bub;
    (function (bub) {
        function mak(ind, box, beg, rep, fre, hor, ver, horoff, veroff, rot, dis, sto, gra, ext, alp) {
            var def = {};
            def.ind = ind;
            def.box = box;
            def.beg = beg;
            def.rep = rep;
            def.fre = fre;
            def.hor = hor;
            def.ver = ver;
            def.horoff = horoff;
            def.veroff = veroff;
            def.rot = rot;
            def.dis = dis;
            def.sto = sto;
            def.gra = gra;
            def.ext = ext;
            def.alp = alp;
            new bub.cla(def);
            return bub.cou - 1;
        }
        bub.mak = mak;
    })(bub = Game.bub || (Game.bub = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bub;
    (function (bub) {
        bub.spr = [];
        bub.concom[1].push(function (i) {
            bub.spr[i] = new Engine.Sprite();
        });
        function onDrawParticlesUnpaused() {
            for (var i = 0; i < bub.cou; i++)
                bub.spr[i].renderAt(bub.spr[i].x + bub.wav[i], bub.spr[i].y - bub.asc[i]);
        }
        bub.onDrawParticlesUnpaused = onDrawParticlesUnpaused;
    })(bub = Game.bub || (Game.bub = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bub;
    (function (bub) {
        var dis = [];
        var dir = [];
        var ang = [];
        bub.wav = [];
        bub.rescom[1].push(function () {
            for (var i = 0; i < bub.cou; i++) {
                dis[i] = 0;
                ang[i] = 0;
                bub.wav[i] = 0;
            }
        });
        function setwav(i) {
            bub.wav[i] = 0;
            ang[i] = 0;
            dis[i] = bub.def[i].dis;
            dir[i] = Math.random() > 0.5 ? 1 : -1;
        }
        bub.setwav = setwav;
        function updwav(i) {
            ang[i] += bub.def[i].rot;
            dis[i] -= bub.def[i].sto;
            dis[i] = dis[i] < 0 ? 0 : dis[i];
        }
        bub.updwav = updwav;
        bub.timcom[1].push(function () {
            for (var i = 0; i < bub.cou; i++) {
                bub.wav[i] = dir[i] * Math.sin(ang[i] + bub.def[i].rot * Engine.System.stepExtrapolation) * dis[i];
            }
        });
    })(bub = Game.bub || (Game.bub = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bub;
    (function (bub) {
        var ind = bub.maksta();
        Game.addAction("configure", function () { bub.cli = new Utils.Animation("asc", false, bub.fra, 10, [0, 1, 2, 3], null); });
        function setsho(i) {
            bub.spr[i].enabled = true;
            bub.spr[i].x = bub.def[i].box.x + bub.def[i].horoff - bub.def[i].hor + bub.def[i].hor * 2 * Math.random();
            bub.spr[i].y = bub.def[i].box.y + bub.def[i].veroff - bub.def[i].ver + bub.def[i].ver * 2 * Math.random();
            bub.ani[i].setAnimation(bub.cli);
            bub.resalp(i);
            bub.setwav(i);
            bub.setasc(i);
            bub.sta[i] = ind;
        }
        bub.setsho = setsho;
        bub.updsta[ind] = function (i) {
            bub.updalp(i);
            bub.updwav(i);
            bub.updasc(i);
            if (bub.spr[i].alpha <= 0)
                bub.setwai(i);
        };
    })(bub = Game.bub || (Game.bub = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var bub;
    (function (bub) {
        var ind = bub.maksta();
        var cou = [];
        bub.ena = [];
        bub.rescom[1].push(function () {
            for (var i = 0; i < bub.cou; i++)
                bub.ena[i] = true;
        });
        bub.ressta[ind] = function (i) {
            bub.spr[i].enabled = false;
            cou[i] = bub.def[i].beg + bub.def[i].ind * bub.def[i].fre;
            bub.sta[i] = ind;
        };
        function setwai(i) {
            bub.ressta[ind](i);
            cou[i] = bub.def[i].rep + bub.def[i].ind * bub.def[i].fre;
        }
        bub.setwai = setwai;
        bub.updsta[ind] = function (i) {
            if (bub.ena[i])
                if (cou[i]-- == 0)
                    bub.setsho(i);
        };
    })(bub = Game.bub || (Game.bub = {}));
})(Game || (Game = {}));
///<reference path="../../ExtEntity.ts"/>
var Game;
(function (Game) {
    var cac;
    (function (cac) {
        cac.cou = 0;
        function onClearScene() {
            cac.cou = 0;
        }
        cac.onClearScene = onClearScene;
        var cla = /** @class */ (function (_super) {
            __extends(cla, _super);
            function cla(def) {
                var _this = _super.call(this, def) || this;
                onConstructor(_this, Game.cac);
                return _this;
            }
            cla.prototype.onSetFrame = function (_, __, fra) { onSetFrame(this.ind, fra); };
            return cla;
        }(Game.ExtEntity));
        cac.cla = cla;
        function getpro(i, nam) {
            return cac.ins[i].getProperty(nam);
        }
        cac.getpro = getpro;
        cac.stacou = 0;
        cac.sta = [];
        cac.consta = [];
        cac.ressta = [];
        cac.begsta = [];
        cac.movsta = [];
        cac.updsta = [];
        cac.linsta = [];
        function maksta() {
            function nul(_) { }
            ;
            cac.consta.push(nul);
            cac.ressta.push(nul);
            cac.begsta.push(nul);
            cac.movsta.push(nul);
            cac.updsta.push(nul);
            cac.linsta.push(nul);
            return cac.stacou++;
        }
        cac.maksta = maksta;
        maksta();
        cac.ins = [];
        cac.def = [];
        cac.concom = [[], [], []];
        function onConstructor(obj, nam) {
            cac.ins[cac.cou] = obj;
            cac.def[cac.cou] = obj.def;
            cac.concom.forEach(function (x) { return x.forEach(function (y) { return y(cac.cou); }); });
            cac.consta.forEach(function (x) { return x(cac.cou); });
            if (cac.cou == 0)
                Engine.System.addListenersFrom(nam);
            obj.ind = cac.cou++;
        }
        cac.onConstructor = onConstructor;
        cac.rescom = [[], [], []];
        function onReset() {
            cac.rescom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < cac.cou; i++)
                cac.sta[i] = 0;
            for (var i = 0; i < cac.cou; i++)
                cac.ressta.forEach(function (x) { return x(i); });
        }
        cac.onReset = onReset;
        cac.begcom = [[], [], []];
        function onStart() {
            cac.begcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < cac.cou; i++)
                cac.begsta.forEach(function (x) { return x(i); });
            for (var i = 0; i < cac.cou; i++)
                cac.linsta.forEach(function (x) { return x(i); });
        }
        cac.onStart = onStart;
        cac.movcom = [[], [], []];
        function onMoveUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            cac.movcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < cac.cou; i++)
                cac.movsta[cac.sta[i]](i);
        }
        cac.onMoveUpdate = onMoveUpdate;
        cac.stecom = [[], [], []];
        function onStepUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            cac.stecom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < cac.cou; i++)
                cac.updsta[cac.sta[i]](i);
            for (var i = 0; i < cac.cou; i++)
                cac.linsta[cac.sta[i]](i);
        }
        cac.onStepUpdate = onStepUpdate;
        cac.anicom = [[], [], []];
        function onSetFrame(i, fra) {
            cac.anicom.forEach(function (x) { return x.forEach(function (y) { return y(i, fra); }); });
        }
        cac.onSetFrame = onSetFrame;
        cac.timcom = [[], [], []];
        function onTimeUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            cac.timcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        cac.onTimeUpdate = onTimeUpdate;
        cac.dracom = [[], [], []];
        function onDrawObjects() {
            cac.dracom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        cac.onDrawObjects = onDrawObjects;
    })(cac = Game.cac || (Game.cac = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var cac;
    (function (cac) {
        var max = [];
        var ste = [];
        var fra = [];
        var off = [];
        cac.concom[2].push(function (i) {
            cac.spr[i].texture = Game.Resources.texgam;
            max[i] = cac.ins[i].getProperty("ani");
            off[i] = cac.ins[i].getProperty("typ");
        });
        cac.rescom[2].push(function () {
            for (var i = 0; i < cac.cou; i++) {
                ste[i] = max[i];
                fra[i] = 0;
                setfra(i, cac.siz[i]);
            }
        });
        function setfra(i, lon) {
            cac.spr[i].u0 = cac.hor[i] ? 779 - lon : 780 + fra[i] * 8;
            cac.spr[i].v0 = cac.hor[i] ? 388 + fra[i] * 8 : 508 - lon;
            cac.spr[i].u1 = cac.hor[i] ? 779 : cac.spr[i].u0 + 7;
            cac.spr[i].v1 = cac.hor[i] ? cac.spr[i].v0 + 7 : 508;
            cac.spr[i].u0 /= cac.spr[i].texture.assetData.xSize;
            cac.spr[i].v0 /= cac.spr[i].texture.assetData.ySize;
            cac.spr[i].u1 /= cac.spr[i].texture.assetData.xSize;
            cac.spr[i].v1 /= cac.spr[i].texture.assetData.ySize;
        }
        function updani(i, lon) {
            if (ste[i]-- == 0) {
                ste[i] = max[i];
                if (++fra[i] == 6)
                    fra[i] = 0;
            }
            setfra(i, lon);
        }
        cac.updani = updani;
    })(cac = Game.cac || (Game.cac = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var cac;
    (function (cac) {
        cac.box = [];
        cac.concom[1].push(function (i) {
            cac.box[i] = new Engine.Box();
            cac.box[i].enabled = cac.box[i].renderable = true;
            cac.box[i].xSize = cac.hor[i] ? 0 : 5;
            cac.box[i].ySize = cac.hor[i] ? 5 : 0;
            cac.box[i].xOffset = cac.hor[i] ? 0 : -2.5;
            cac.box[i].yOffset = cac.hor[i] ? -2.5 : 0;
            Game.SceneMap.instance.boxesEnemies.push(cac.box[i]);
        });
        cac.rescom[1].push(function () {
            for (var i = 0; i < cac.cou; i++) {
                cac.box[i].x = cac.def[i].instance.x;
                cac.box[i].y = cac.def[i].instance.y;
            }
        });
        function boxsiz(i, lon) {
            cac.box[i].xSize = cac.hor[i] ? lon : cac.box[i].xSize;
            cac.box[i].ySize = cac.hor[i] ? cac.box[i].ySize : lon;
            cac.box[i].xOffset = cac.def[i].flip.x ? (cac.min[i] - cac.box[i].xSize) : cac.box[i].xOffset;
            cac.box[i].yOffset = cac.def[i].flip.y ? (cac.min[i] - cac.box[i].ySize) : cac.box[i].yOffset;
        }
        cac.boxsiz = boxsiz;
        cac.movcom[1].push(function () {
            for (var i = 0; i < cac.cou; i++) {
                cac.box[i].x = cac.hor[i] ? cac.box[i].x : cac.pos[i];
                cac.box[i].y = cac.hor[i] ? cac.pos[i] : cac.box[i].y;
            }
        });
        cac.dracom[2].push(function () {
            for (var i = 0; i < cac.cou; i++)
                cac.hor[i] ? cac.box[i].renderAt(cac.box[i].x, cac.dra[i]) : cac.box[i].renderAt(cac.dra[i], cac.box[i].y);
        });
    })(cac = Game.cac || (Game.cac = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var cac;
    (function (cac) {
        cac.hor = [];
        cac.concom[0].push(function (i) {
            cac.hor[i] = cac.ins[i].getProperty("hor");
            cac.def[i].instance.x += cac.hor[i] ? 0 : 4;
            cac.def[i].instance.y -= cac.hor[i] ? 4 : 8;
        });
    })(cac = Game.cac || (Game.cac = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var cac;
    (function (cac) {
        cac.pos = [];
        cac.dra = [];
        var dis = [];
        var sta = [];
        var des = [];
        var vel = [];
        var cur = [];
        var loo = [];
        cac.concom[1].push(function (i) {
            dis[i] = cac.ins[i].getProperty("dis") * 8;
            sta[i] = cac.hor[i] ? cac.def[i].instance.y : cac.def[i].instance.x;
            des[i] = new Float32Array(2);
            des[i][0] = sta[i] + dis[i];
            des[i][1] = sta[i];
        });
        cac.rescom[1].push(function () {
            for (var i = 0; i < cac.cou; i++) {
                cac.dra[i] = cac.pos[i] = cac.hor[i] ? cac.def[i].instance.y : cac.def[i].instance.x;
                vel[i] = cac.ins[i].getProperty("vel") * (dis[i] < 0 ? -1 : 1);
                cur[i] = Math.abs(dis[i]);
                loo[i] = 0;
            }
        });
        cac.movcom[0].push(function () {
            for (var i = 0; i < cac.cou; i++) {
                cac.pos[i] += vel[i];
                cur[i] -= Math.abs(vel[i]);
                if (cur[i] <= 0) {
                    cur[i] = Math.abs(dis[i]);
                    vel[i] *= -1;
                    cac.pos[i] = des[i][loo[i]++];
                    loo[i] = loo[i] % 2;
                }
            }
        });
        cac.dracom[0].push(function () {
            for (var i = 0; i < cac.cou; i++)
                cac.dra[i] = cac.pos[i] + vel[i] * (Game.SceneFreezer.stoped ? 0 : Engine.System.stepExtrapolation);
        });
    })(cac = Game.cac || (Game.cac = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var cac;
    (function (cac) {
        cac.lon = [];
        cac.min = [];
        cac.siz = [];
        cac.concom[1].push(function (i) {
            cac.lon[i] = cac.ins[i].getProperty("lon") * 8;
            cac.min[i] = cac.hor[i] ? cac.def[i].instance.width : cac.def[i].instance.height;
        });
        cac.rescom[1].push(function () {
            for (var i = 0; i < cac.cou; i++) {
                cac.siz[i] = cac.min[i];
                cac.boxsiz(i, cac.siz[i]);
            }
        });
        function gro(i, spe) {
            cac.siz[i] += spe;
            if (cac.siz[i] > cac.lon[i])
                cac.siz[i] = cac.lon[i];
            cac.boxsiz(i, Math.floor(cac.siz[i]));
            cac.sprsiz(i, Math.floor(cac.siz[i]));
        }
        cac.gro = gro;
        function shr(i, spe) {
            cac.siz[i] -= spe;
            if (cac.siz[i] < cac.min[i])
                cac.siz[i] = cac.min[i];
            cac.boxsiz(i, Math.ceil(cac.siz[i]));
            cac.sprsiz(i, Math.ceil(cac.siz[i]));
        }
        cac.shr = shr;
    })(cac = Game.cac || (Game.cac = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var cac;
    (function (cac) {
        cac.spr = [];
        cac.concom[1].push(function (i) {
            cac.spr[i] = new Engine.Sprite();
            cac.spr[i].enabled = true;
            cac.spr[i].xOffset = cac.hor[i] ? 0 : -3.5;
            cac.spr[i].yOffset = cac.hor[i] ? -3.5 : 0;
            cac.spr[i].xMirror = cac.def[i].flip.x;
            cac.spr[i].yMirror = cac.def[i].flip.y;
        });
        cac.rescom[1].push(function () {
            for (var i = 0; i < cac.cou; i++) {
                cac.spr[i].x = cac.def[i].instance.x;
                cac.spr[i].y = cac.def[i].instance.y;
                sprsiz(i, cac.min[i]);
            }
        });
        function sprsiz(i, lon) {
            cac.spr[i].xSize = cac.hor[i] ? lon : 7;
            cac.spr[i].ySize = cac.hor[i] ? 7 : lon;
            cac.spr[i].xOffset = cac.def[i].flip.x ? -8 : cac.spr[i].xOffset;
            cac.spr[i].yOffset = cac.def[i].flip.y ? -8 : cac.spr[i].yOffset;
        }
        cac.sprsiz = sprsiz;
        cac.movcom[1].push(function () {
            for (var i = 0; i < cac.cou; i++) {
                cac.spr[i].x = cac.hor[i] ? cac.spr[i].x : cac.pos[i];
                cac.spr[i].y = cac.hor[i] ? cac.pos[i] : cac.spr[i].y;
            }
        });
        cac.dracom[1].push(function () {
            for (var i = 0; i < cac.cou; i++)
                cac.hor[i] ? cac.spr[i].renderAt(cac.spr[i].x, cac.dra[i]) : cac.spr[i].renderAt(cac.dra[i], cac.spr[i].y);
        });
    })(cac = Game.cac || (Game.cac = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var cac;
    (function (cac) {
        var ind = cac.maksta();
        var spe = [];
        cac.consta[ind] = function (i) {
            spe[i] = cac.ins[i].getProperty("gro");
        };
        function setgro(i) {
            Game.Resources.audcac.play();
            cac.sta[i] = ind;
        }
        cac.setgro = setgro;
        cac.updsta[ind] = function (i) {
            cac.gro(i, spe[i]);
            cac.updani(i, Math.floor(cac.siz[i]));
            if (cac.siz[i] == cac.lon[i])
                cac.setout(i);
        };
    })(cac = Game.cac || (Game.cac = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var cac;
    (function (cac) {
        var ind = cac.maksta();
        var ste = [];
        var cou = [];
        cac.consta[ind] = function (i) {
            ste[i] = cac.ins[i].getProperty("out");
        };
        function setout(i) {
            cou[i] = ste[i];
            cac.sta[i] = ind;
        }
        cac.setout = setout;
        cac.updsta[ind] = function (i) {
            cac.updani(i, cac.siz[i]);
            if (cou[i]-- == 0)
                cac.setshr(i);
        };
    })(cac = Game.cac || (Game.cac = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var cac;
    (function (cac) {
        var ind = cac.maksta();
        var spe = [];
        cac.consta[ind] = function (i) {
            spe[i] = cac.ins[i].getProperty("shr");
        };
        function setshr(i) {
            //Resources.audcacbac.play();
            cac.sta[i] = ind;
        }
        cac.setshr = setshr;
        cac.updsta[ind] = function (i) {
            cac.shr(i, spe[i]);
            cac.updani(i, Math.ceil(cac.siz[i]));
            if (cac.siz[i] == cac.min[i])
                cac.setwai(i);
        };
    })(cac = Game.cac || (Game.cac = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var cac;
    (function (cac) {
        var ind = cac.maksta();
        var ste = [];
        var cou = [];
        cac.consta[ind] = function (i) {
            ste[i] = cac.ins[i].getProperty("wai");
        };
        cac.ressta[ind] = function (i) {
            cou[i] = ste[i];
            cac.sta[i] = ind;
        };
        function setwai(i) {
            cac.ressta[ind](i);
        }
        cac.setwai = setwai;
        cac.updsta[ind] = function (i) {
            cac.updani(i, cac.siz[i]);
            if (cou[i]-- == 0)
                cac.setgro(i);
        };
    })(cac = Game.cac || (Game.cac = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var Goal;
    (function (Goal) {
        Goal.preserved = false;
        Goal.ins = [];
        Goal.def = [];
        Goal.cou = 0;
        var Instance = /** @class */ (function (_super) {
            __extends(Instance, _super);
            function Instance(_df) {
                var _this = _super.call(this, _df) || this;
                Goal.ins[Goal.cou] = _this;
                Goal.def[Goal.cou] = _df;
                Goal.def[Goal.cou].instance.x += Game.SceneMap.instance.xSizeTile * 0.5;
                Goal.def[Goal.cou].instance.y -= Game.SceneMap.instance.ySizeTile * 0.5 - 0.5;
                Goal.conphy(Goal.cou);
                Goal.conspr(Goal.cou);
                Goal.conani(Goal.cou);
                Goal.congot(Goal.cou);
                if (Goal.cou == 0)
                    Engine.System.addListenersFrom(Game.Goal);
                _this.ind = Goal.cou++;
                return _this;
            }
            Instance.prototype.onSetFrame = function (_, __, fra) {
                Goal.fraani(this.ind, fra);
            };
            return Instance;
        }(Game.Entity));
        Goal.Instance = Instance;
        function onReset() {
            Goal.resphy();
            Goal.resgot();
            Goal.resspr();
            Goal.resani();
        }
        Goal.onReset = onReset;
        function onMoveUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            Goal.movphy();
        }
        Goal.onMoveUpdate = onMoveUpdate;
        function onOverlapUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            Goal.ovegot();
        }
        Goal.onOverlapUpdate = onOverlapUpdate;
        function onStepUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            Goal.stegot();
        }
        Goal.onStepUpdate = onStepUpdate;
        function onTimeUpdate() {
            Goal.timphy();
            Goal.timspr();
        }
        Goal.onTimeUpdate = onTimeUpdate;
        function onDrawObjects() {
            Goal.draspr();
            Goal.draphy();
        }
        Goal.onDrawObjects = onDrawObjects;
        function onClearScene() {
            Goal.clegot();
            Goal.cou = 0;
        }
        Goal.onClearScene = onClearScene;
    })(Goal = Game.Goal || (Game.Goal = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var Goal;
    (function (Goal) {
        Goal.ani = [];
        Game.addAction("configure", function () {
            if (Game.plu)
                Goal.fra = Game.FrameSelector.complex("coi", Game.Resources.texgam, 446, 836);
            else
                Goal.fra = Game.FrameSelector.complex("coi", Game.Resources.texgam, 713, 249);
            Goal.anispr = new Utils.Animation("ani", true, Goal.fra, 5, [0, 1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5, 6], null);
        });
        function conani(i) {
            Goal.ani[i] = new Utils.Animator();
            Goal.ani[i].owner = Goal.ani[i].listener = Goal.ins[i];
        }
        Goal.conani = conani;
        function resani() {
            for (var i = 0; i < Goal.cou; i++) {
                Goal.ani[i].setAnimation(Goal.anispr);
                Goal.ani[i].off = 0;
            }
        }
        Goal.resani = resani;
        function fraani(i, fra) {
            fra.applyToSprite(Goal.spr[i]);
        }
        Goal.fraani = fraani;
    })(Goal = Game.Goal || (Game.Goal = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var Goal;
    (function (Goal) {
        Goal.win = false;
        Goal.haswon = false;
        var gotcou;
        var waiste = 26;
        var waicou;
        var anioff = 8;
        var soucou;
        var souste = 4;
        var emi = [];
        function congot(i) {
            emi[i] = new Game.Emission.Emitter(Goal.coipar, 8);
            emi[i].sizeEmission = 4;
            emi[i].x = Goal.def[i].instance.x;
            emi[i].y = Goal.def[i].instance.y - 0.5;
        }
        Goal.congot = congot;
        function resgot() {
            gotcou = 0;
            waicou = 0;
            soucou = 0;
            Goal.win = false;
            Goal.haswon = false;
            for (var i = 0; i < Goal.cou; i++) {
                Goal.box[i].enabled = true;
            }
        }
        Goal.resgot = resgot;
        function ovegot() {
            for (var i = 0; i < Goal.cou; i++) {
                if (Goal.box[i].enabled && Goal.box[i].collideAgainst(Game.pla.box)) {
                    Goal.box[i].enabled = false;
                    Goal.ani[i].off = anioff;
                    emi[i].emittChunk();
                    gotcou++;
                    if (gotcou == Goal.cou) {
                        Game.Resources.audcoi.extraGain.gain.value = 0;
                        Game.Resources.audgoa.play();
                    }
                    else if (soucou < 0) {
                        Game.Resources.audcoi.extraGain.gain.value = 1;
                        Game.Resources.audcoi.play();
                        soucou = souste;
                    }
                }
            }
        }
        Goal.ovegot = ovegot;
        //for(var i=0;i<200;i++)
        //console.error("DELETE SKIP LEVEL BUTTON "+i);
        function stegot() {
            /*
            if(Engine.Keyboard.pressed("s")){
                cou=gotcou;
                win=true;
                haswon=true;
                waicou=waiste;
            }
            */
            soucou--;
            if (gotcou == Goal.cou) {
                Goal.win = true;
                Goal.haswon = waicou++ >= waiste;
            }
        }
        Goal.stegot = stegot;
        function clegot() {
            Goal.win = false;
            Goal.haswon = false;
        }
        Goal.clegot = clegot;
    })(Goal = Game.Goal || (Game.Goal = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var Goal;
    (function (Goal) {
        Goal.spr = [];
        function conspr(i) {
            Goal.spr[i] = new Engine.Sprite();
            Goal.spr[i].enabled = true;
        }
        Goal.conspr = conspr;
        function resspr() {
            for (var i = 0; i < Goal.cou; i++) {
                Goal.spr[i].x = Goal.def[i].instance.x;
                Goal.spr[i].y = Goal.def[i].instance.y;
            }
        }
        Goal.resspr = resspr;
        function timspr() {
            for (var i = 0; i < Goal.cou; i++) {
                Goal.spr[i].x = Goal.horext[i];
                Goal.spr[i].y = Goal.verext[i];
            }
        }
        Goal.timspr = timspr;
        function draspr() {
            for (var i = 0; i < Goal.cou; i++) {
                Goal.spr[i].render();
            }
        }
        Goal.draspr = draspr;
    })(Goal = Game.Goal || (Game.Goal = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var Goal;
    (function (Goal) {
        var ObjectParticle = /** @class */ (function (_super) {
            __extends(ObjectParticle, _super);
            function ObjectParticle(emitter) {
                var _this = _super.call(this, emitter) || this;
                _this.countSteps = 0;
                _this.parentRelative = false;
                return _this;
            }
            Object.defineProperty(ObjectParticle.prototype, "xRange", {
                get: function () {
                    return 0;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(ObjectParticle.prototype, "yRange", {
                get: function () {
                    return 0;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(ObjectParticle.prototype, "xRangeVel", {
                get: function () {
                    //return 0;
                    if (this.index == 0 || this.index == 1) {
                        return 1;
                    }
                    else {
                        return -1;
                    }
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(ObjectParticle.prototype, "yRangeVel", {
                get: function () {
                    //return 0;
                    if (this.index == 0 || this.index == 2) {
                        return 1;
                    }
                    else {
                        return -1;
                    }
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(ObjectParticle.prototype, "xRangeAccel", {
                get: function () {
                    return 0;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(ObjectParticle.prototype, "yRangeAccel", {
                get: function () {
                    return 0;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(ObjectParticle.prototype, "rangeLife", {
                get: function () {
                    return 300;
                },
                enumerable: false,
                configurable: true
            });
            ObjectParticle.prototype.onReset = function () {
                _super.prototype.onReset.call(this);
                this.countSteps = 0;
            };
            ObjectParticle.prototype.emitt = function (index) {
                _super.prototype.emitt.call(this, index);
                this.frames[0].applyToSprite(this.sprite);
            };
            ObjectParticle.prototype.onStepUpdate = function () {
                _super.prototype.onStepUpdate.call(this);
                if (this.enabled && !Game.SceneFreezer.stoped) {
                    //return;
                    if (this.countSteps == ObjectParticle.STEPS) {
                        this.frames[1].applyToSprite(this.sprite);
                    }
                    else if (this.countSteps == ObjectParticle.STEPS * 2) {
                        this.frames[2].applyToSprite(this.sprite);
                    }
                    else if (this.countSteps == ObjectParticle.STEPS * 3) {
                        this.frames[3].applyToSprite(this.sprite);
                    }
                    this.countSteps += 1;
                }
            };
            ObjectParticle.STEPS = 4;
            return ObjectParticle;
        }(Game.Emission.SimpleParticle));
        Goal.ObjectParticle = ObjectParticle;
        var FRAMES_GOAL;
        Game.addAction("configure", function () {
            if (Game.plu)
                FRAMES_GOAL = Game.FrameSelector.complex("goal particles", Game.Resources.texgam, 598, 839);
            else
                FRAMES_GOAL = Game.FrameSelector.complex("goal particles", Game.Resources.texgam, 849, 223);
        });
        var coipar = /** @class */ (function (_super) {
            __extends(coipar, _super);
            function coipar(emitter) {
                var _this = _super.call(this, emitter) || this;
                _this.frames = FRAMES_GOAL;
                return _this;
            }
            coipar.prototype.onDrawLance = function () { this.sprite.render(); };
            coipar.prototype.onDrawParticles = function () { };
            coipar.prototype.onDrawParticlesBack = function () { };
            return coipar;
        }(ObjectParticle));
        Goal.coipar = coipar;
    })(Goal = Game.Goal || (Game.Goal = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var Goal;
    (function (Goal) {
        Goal.box = [];
        var horare = [];
        var horste = [];
        var horsta = [];
        var horcou = [];
        var verare = [];
        var verste = [];
        var versta = [];
        var vercou = [];
        Goal.hormir = [];
        Goal.horext = [];
        Goal.verext = [];
        function conphy(i) {
            Goal.box[i] = new Engine.Box();
            Goal.box[i].enabled = Goal.box[i].renderable = true;
            Goal.fra[0].applyToBox(Goal.box[i]);
            horare[i] = Goal.ins[i].getProperty("horare") * Game.SceneMap.instance.xSizeTile;
            horste[i] = Goal.ins[i].getProperty("horste");
            horsta[i] = Goal.ins[i].getProperty("horsta");
            verare[i] = Goal.ins[i].getProperty("verare") * Game.SceneMap.instance.xSizeTile;
            verste[i] = Goal.ins[i].getProperty("verste");
            versta[i] = Goal.ins[i].getProperty("versta");
        }
        Goal.conphy = conphy;
        function resphy() {
            for (var i = 0; i < Goal.cou; i++) {
                horcou[i] = horsta[i];
                Goal.box[i].x = finhor(i, horcou[i]);
                vercou[i] = versta[i];
                Goal.box[i].y = finver(i, vercou[i]);
                Goal.hormir[i] = false;
            }
        }
        Goal.resphy = resphy;
        function finhor(i, cou) {
            if (horste[i] == 0)
                return Goal.def[i].instance.x;
            var mov = cou / horste[i];
            mov *= 2 * Math.PI;
            mov = (1 + Math.sin(mov - Math.PI * 0.5)) * 0.5 * horare[i];
            return Goal.def[i].instance.x + mov;
        }
        function finver(i, cou) {
            if (verste[i] == 0)
                return Goal.def[i].instance.y;
            var mov = cou / verste[i];
            mov *= 2 * Math.PI;
            mov = (1 + Math.sin(mov - Math.PI * 0.5)) * 0.5 * verare[i];
            return Goal.def[i].instance.y + mov;
        }
        function movphy() {
            for (var i = 0; i < Goal.cou; i++) {
                horcou[i] += 1;
                if (horcou[i] > horste[i])
                    horcou[i] = 0;
                if (horare[i] != 0)
                    Goal.hormir[i] = horcou[i] >= horste[i] * 0.5;
                if (horare[i] < 0)
                    Goal.hormir[i] = !Goal.hormir[i];
                vercou[i] += 1;
                if (vercou[i] > verste[i])
                    vercou[i] = 0;
                if (verare[i] != 0)
                    Goal.hormir[i] = vercou[i] >= verste[i] * 0.5;
                if (verare[i] < 0)
                    Goal.hormir[i] = !Goal.hormir[i];
                Goal.box[i].x = finhor(i, horcou[i]);
                Goal.box[i].y = finver(i, vercou[i]);
            }
        }
        Goal.movphy = movphy;
        function timphy() {
            for (var i = 0; i < Goal.cou; i++) {
                Goal.horext[i] = Game.SceneFreezer.stoped ? 0 : Engine.System.stepExtrapolation * (horcou[i] == horste[i] ? -1 : 1);
                Goal.horext[i] = finhor(i, horcou[i] + Goal.horext[i]);
                Goal.verext[i] = Game.SceneFreezer.stoped ? 0 : Engine.System.stepExtrapolation * (vercou[i] == verste[i] ? -1 : 1);
                Goal.verext[i] = finver(i, vercou[i] + Goal.verext[i]);
            }
        }
        Goal.timphy = timphy;
        function draphy() {
            for (var i = 0; i < Goal.cou; i++)
                Goal.box[i].renderAt(Goal.horext[i], Goal.verext[i]);
        }
        Goal.draphy = draphy;
    })(Goal = Game.Goal || (Game.Goal = {}));
})(Game || (Game = {}));
///<reference path="../../ExtEntity.ts"/>
var Game;
(function (Game) {
    var fis;
    (function (fis) {
        fis.cou = 0;
        function onClearScene() {
            fis.cou = 0;
        }
        fis.onClearScene = onClearScene;
        var cla = /** @class */ (function (_super) {
            __extends(cla, _super);
            function cla(def) {
                var _this = _super.call(this, def) || this;
                onConstructor(_this, Game.fis);
                return _this;
            }
            cla.prototype.onSetFrame = function (_, __, fra) { onSetFrame(this.ind, fra); };
            return cla;
        }(Game.ExtEntity));
        fis.cla = cla;
        function getpro(i, nam) {
            return fis.ins[i].getProperty(nam);
        }
        fis.getpro = getpro;
        fis.stacou = 0;
        fis.sta = [];
        fis.consta = [];
        fis.ressta = [];
        fis.begsta = [];
        fis.movsta = [];
        fis.updsta = [];
        fis.linsta = [];
        function maksta() {
            function nul(_) { }
            ;
            fis.consta.push(nul);
            fis.ressta.push(nul);
            fis.begsta.push(nul);
            fis.movsta.push(nul);
            fis.updsta.push(nul);
            fis.linsta.push(nul);
            return fis.stacou++;
        }
        fis.maksta = maksta;
        maksta();
        fis.ins = [];
        fis.def = [];
        fis.concom = [[], [], []];
        function onConstructor(obj, nam) {
            fis.ins[fis.cou] = obj;
            fis.def[fis.cou] = obj.def;
            fis.concom.forEach(function (x) { return x.forEach(function (y) { return y(fis.cou); }); });
            fis.consta.forEach(function (x) { return x(fis.cou); });
            if (fis.cou == 0)
                Engine.System.addListenersFrom(nam);
            obj.ind = fis.cou++;
        }
        fis.onConstructor = onConstructor;
        fis.rescom = [[], [], []];
        function onReset() {
            fis.rescom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < fis.cou; i++)
                fis.sta[i] = 0;
            for (var i = 0; i < fis.cou; i++)
                fis.ressta.forEach(function (x) { return x(i); });
        }
        fis.onReset = onReset;
        fis.begcom = [[], [], []];
        function onStart() {
            fis.begcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < fis.cou; i++)
                fis.begsta.forEach(function (x) { return x(i); });
            for (var i = 0; i < fis.cou; i++)
                fis.linsta.forEach(function (x) { return x(i); });
        }
        fis.onStart = onStart;
        fis.movcom = [[], [], []];
        function onMoveUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            fis.movcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < fis.cou; i++)
                fis.movsta[fis.sta[i]](i);
        }
        fis.onMoveUpdate = onMoveUpdate;
        fis.stecom = [[], [], []];
        function onStepUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            fis.stecom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < fis.cou; i++)
                fis.updsta[fis.sta[i]](i);
            for (var i = 0; i < fis.cou; i++)
                fis.linsta[fis.sta[i]](i);
        }
        fis.onStepUpdate = onStepUpdate;
        fis.anicom = [[], [], []];
        function onSetFrame(i, fra) {
            fis.anicom.forEach(function (x) { return x.forEach(function (y) { return y(i, fra); }); });
        }
        fis.onSetFrame = onSetFrame;
        fis.timcom = [[], [], []];
        function onTimeUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            fis.timcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        fis.onTimeUpdate = onTimeUpdate;
        fis.dracom = [[], [], []];
        function onDrawObjects() {
            fis.dracom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        fis.onDrawObjects = onDrawObjects;
    })(fis = Game.fis || (Game.fis = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var fis;
    (function (fis) {
        var cli;
        Game.addAction("preconfigure", function () {
            var fra = Game.FrameSelector.complex("fis", Game.Resources.texgam, 634, 544);
            cli = new Utils.Animation("des", true, fra, 7, [0, 1, 2, 1], null);
        });
        fis.ani = [];
        fis.concom[1].push(function (i) {
            fis.ani[i] = new Utils.Animator();
            fis.ani[i].owner = fis.ani[i].listener = fis.ins[i];
        });
        fis.rescom[1].push(function () {
            for (var i = 0; i < fis.cou; i++)
                fis.ani[i].setAnimation(cli);
        });
        fis.anicom[1].push(function (i, fra) {
            fra.applyToSprite(fis.spr[i]);
        });
    })(fis = Game.fis || (Game.fis = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var fis;
    (function (fis) {
        fis.box = [];
        fis.concom[1].push(function (i) {
            fis.box[i] = new Engine.Box();
            fis.box[i].enabled = fis.box[i].renderable = true;
            fis.box[i].x = fis.def[i].instance.x;
            fis.box[i].y = fis.def[i].instance.y;
            Game.SceneMap.instance.boxesEnemies.push(fis.box[i]);
        });
        fis.rescom[1].push(function () {
            for (var i = 0; i < fis.cou; i++) {
                fis.box[i].x = fis.def[i].instance.x;
                fis.box[i].y = fis.def[i].instance.y;
            }
        });
        fis.movcom[1].push(function () {
            for (var i = 0; i < fis.cou; i++) {
                fis.box[i].x = fis.pos[i];
                fis.box[i].y = fis.box[i].y;
            }
        });
        fis.anicom[1].push(function (i, fra) {
            fra.applyToBox(fis.box[i]);
        });
        fis.dracom[2].push(function () {
            for (var i = 0; i < fis.cou; i++)
                fis.box[i].renderAt(fis.dra[i], fis.box[i].y + fis.wav[i]);
        });
    })(fis = Game.fis || (Game.fis = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var fis;
    (function (fis) {
        fis.concom[0].push(function (i) {
            fis.def[i].instance.x += 4;
            fis.def[i].instance.y -= 4;
        });
    })(fis = Game.fis || (Game.fis = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var fis;
    (function (fis) {
        fis.pos = [];
        fis.dra = [];
        var dis = [];
        var sta = [];
        var des = [];
        fis.vel = [];
        var cur = [];
        var loo = [];
        fis.concom[1].push(function (i) {
            dis[i] = fis.ins[i].getProperty("dis") * 8;
            sta[i] = fis.def[i].instance.x;
            des[i] = new Float32Array(2);
            des[i][0] = sta[i] + dis[i];
            des[i][1] = sta[i];
        });
        fis.rescom[1].push(function () {
            for (var i = 0; i < fis.cou; i++) {
                fis.dra[i] = fis.pos[i] = fis.def[i].instance.x;
                fis.vel[i] = fis.ins[i].getProperty("vel") * (dis[i] < 0 ? -1 : 1);
                cur[i] = Math.abs(dis[i]);
                loo[i] = 0;
            }
        });
        fis.movcom[0].push(function () {
            for (var i = 0; i < fis.cou; i++) {
                fis.pos[i] += fis.vel[i];
                cur[i] -= Math.abs(fis.vel[i]);
                if (cur[i] <= 0) {
                    cur[i] = Math.abs(dis[i]);
                    fis.vel[i] *= -1;
                    fis.pos[i] = des[i][loo[i]++];
                    loo[i] = loo[i] % 2;
                }
            }
        });
        fis.timcom[0].push(function () {
            for (var i = 0; i < fis.cou; i++)
                fis.dra[i] = fis.pos[i] + fis.vel[i] * (Game.SceneFreezer.stoped ? 0 : Engine.System.stepExtrapolation);
        });
    })(fis = Game.fis || (Game.fis = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var fis;
    (function (fis) {
        fis.spr = [];
        fis.concom[1].push(function (i) {
            fis.spr[i] = new Engine.Sprite();
            fis.spr[i].enabled = true;
        });
        fis.rescom[1].push(function () {
            for (var i = 0; i < fis.cou; i++) {
                fis.spr[i].x = fis.def[i].instance.x;
                fis.spr[i].y = fis.def[i].instance.y;
                fis.spr[i].xMirror = fis.def[i].flip.x;
                fis.spr[i].yMirror = fis.def[i].flip.y;
            }
        });
        fis.movcom[1].push(function () {
            for (var i = 0; i < fis.cou; i++) {
                fis.spr[i].x = fis.pos[i];
                fis.spr[i].y = fis.spr[i].y;
                fis.spr[i].xMirror = fis.vel[i] < 0;
            }
        });
        fis.anicom[1].push(function (i, fra) {
            fra.applyToSprite(fis.spr[i]);
        });
        fis.dracom[1].push(function () {
            for (var i = 0; i < fis.cou; i++)
                fis.spr[i].renderAt(fis.dra[i], fis.spr[i].y + fis.wav[i]);
        });
    })(fis = Game.fis || (Game.fis = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var fis;
    (function (fis) {
        var vel = [];
        var dis = [];
        var ang = [];
        fis.wav = [];
        fis.concom[1].push(function (i) {
            vel[i] = fis.ins[i].getProperty("wavvel");
            dis[i] = fis.ins[i].getProperty("wavdis");
        });
        fis.rescom[1].push(function () {
            for (var i = 0; i < fis.cou; i++) {
                fis.wav[i] = 0;
                ang[i] = 0;
            }
        });
        fis.stecom[1].push(function () {
            for (var i = 0; i < fis.cou; i++)
                ang[i] += vel[i];
        });
        fis.timcom[1].push(function () {
            for (var i = 0; i < fis.cou; i++)
                fis.wav[i] = Math.sin(ang[i] + vel[i] * Engine.System.stepExtrapolation) * dis[i];
        });
    })(fis = Game.fis || (Game.fis = {}));
})(Game || (Game = {}));
///<reference path="../../ExtEntity.ts"/>
var Game;
(function (Game) {
    var gey;
    (function (gey) {
        gey.cou = 0;
        function onClearScene() {
            gey.cou = 0;
        }
        gey.onClearScene = onClearScene;
        var cla = /** @class */ (function (_super) {
            __extends(cla, _super);
            function cla(def) {
                var _this = _super.call(this, def) || this;
                onConstructor(_this, Game.gey);
                return _this;
            }
            cla.prototype.onSetFrame = function (_, __, fra) { onSetFrame(this.ind, fra); };
            return cla;
        }(Game.ExtEntity));
        gey.cla = cla;
        function getpro(i, nam) {
            return gey.ins[i].getProperty(nam);
        }
        gey.getpro = getpro;
        gey.stacou = 0;
        gey.sta = [];
        gey.consta = [];
        gey.ressta = [];
        gey.begsta = [];
        gey.movsta = [];
        gey.updsta = [];
        gey.linsta = [];
        function maksta() {
            function nul(_) { }
            ;
            gey.consta.push(nul);
            gey.ressta.push(nul);
            gey.begsta.push(nul);
            gey.movsta.push(nul);
            gey.updsta.push(nul);
            gey.linsta.push(nul);
            return gey.stacou++;
        }
        gey.maksta = maksta;
        maksta();
        gey.ins = [];
        gey.def = [];
        gey.concom = [[], [], []];
        function onConstructor(obj, nam) {
            gey.ins[gey.cou] = obj;
            gey.def[gey.cou] = obj.def;
            gey.concom.forEach(function (x) { return x.forEach(function (y) { return y(gey.cou); }); });
            gey.consta.forEach(function (x) { return x(gey.cou); });
            if (gey.cou == 0)
                Engine.System.addListenersFrom(nam);
            obj.ind = gey.cou++;
        }
        gey.onConstructor = onConstructor;
        gey.rescom = [[], [], []];
        function onReset() {
            gey.rescom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < gey.cou; i++)
                gey.sta[i] = 0;
            for (var i = 0; i < gey.cou; i++)
                gey.ressta.forEach(function (x) { return x(i); });
        }
        gey.onReset = onReset;
        gey.begcom = [[], [], []];
        function onStart() {
            gey.begcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < gey.cou; i++)
                gey.begsta.forEach(function (x) { return x(i); });
            for (var i = 0; i < gey.cou; i++)
                gey.linsta.forEach(function (x) { return x(i); });
        }
        gey.onStart = onStart;
        gey.movcom = [[], [], []];
        function onMoveUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            gey.movcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < gey.cou; i++)
                gey.movsta[gey.sta[i]](i);
        }
        gey.onMoveUpdate = onMoveUpdate;
        gey.stecom = [[], [], []];
        function onStepUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            gey.stecom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < gey.cou; i++)
                gey.updsta[gey.sta[i]](i);
            for (var i = 0; i < gey.cou; i++)
                gey.linsta[gey.sta[i]](i);
        }
        gey.onStepUpdate = onStepUpdate;
        gey.anicom = [[], [], []];
        function onSetFrame(i, fra) {
            gey.anicom.forEach(function (x) { return x.forEach(function (y) { return y(i, fra); }); });
        }
        gey.onSetFrame = onSetFrame;
        gey.timcom = [[], [], []];
        function onTimeUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            gey.timcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        gey.onTimeUpdate = onTimeUpdate;
        gey.dracom = [[], [], []];
        function onDrawObjects() {
            gey.dracom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        gey.onDrawObjects = onDrawObjects;
    })(gey = Game.gey || (Game.gey = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var gey;
    (function (gey) {
        var siz = [];
        var ste = [];
        gey.frabod = [];
        gey.fratip = [];
        gey.concom[0].push(function (i) {
            siz[i] = gey.ins[i].getProperty("aniste");
        });
        gey.rescom[1].push(function () {
            for (var i = 0; i < gey.cou; i++) {
                ste[i] = 0;
                gey.frabod[i] = 0;
                gey.fratip[i] = 0;
            }
        });
        function updani(i) {
            if (ste[i]++ > siz[i]) {
                ste[i] = 0;
                if (gey.frabod[i] == 16)
                    gey.frabod[i] = 0;
                else
                    gey.frabod[i] += 8;
                if (gey.fratip[i] == 14)
                    gey.fratip[i] = 0;
                else
                    gey.fratip[i] += 14;
            }
        }
        gey.updani = updani;
    })(gey = Game.gey || (Game.gey = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var gey;
    (function (gey) {
        gey.box = [];
        gey.concom[1].push(function (i) {
            gey.box[i] = new Engine.Box();
            gey.box[i].renderable = true;
            gey.box[i].x = gey.def[i].instance.x;
            gey.box[i].y = gey.def[i].instance.y;
            Game.SceneMap.instance.boxesEnemies.push(gey.box[i]);
        });
        gey.dracom[2].push(function () {
            for (var i = 0; i < gey.cou; i++)
                gey.box[i].render();
        });
    })(gey = Game.gey || (Game.gey = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var gey;
    (function (gey) {
        gey.hor = [];
        var pow = [];
        var gro = [];
        var shr = [];
        gey.wid = [];
        gey.hei = [];
        var oldwid = [];
        var oldhei = [];
        gey.dir = [];
        gey.concom[0].push(function (i) {
            gey.hor[i] = gey.ins[i].getProperty("hor");
            pow[i] = gey.ins[i].getProperty("pow");
            gro[i] = gey.ins[i].getProperty("gro");
            shr[i] = gey.ins[i].getProperty("shr");
            gey.wid[i] = gey.def[i].instance.width + (gey.hor[i] ? 8 : 0);
            gey.hei[i] = gey.def[i].instance.height + (gey.hor[i] ? 0 : 8);
            gey.def[i].instance.x += gey.hor[i] ? (gey.def[i].flip.x ? gey.wid[i] - 8 : 0) : gey.wid[i] * 0.5;
            gey.def[i].instance.y -= gey.hor[i] ? gey.hei[i] * 0.5 : (gey.def[i].flip.y ? 0 : gey.hei[i] - 8);
        });
        function setsiz(i, lon, thi) {
            lon = lon > (gey.hor[i] ? gey.wid[i] : gey.hei[i]) ? (gey.hor[i] ? gey.wid[i] : gey.hei[i]) : lon;
            thi = thi > (gey.hor[i] ? gey.hei[i] : gey.wid[i]) ? (gey.hor[i] ? gey.hei[i] : gey.wid[i]) : thi;
            lon = lon < 0 ? 0 : lon;
            thi = thi < 0 ? 0 : thi;
            gey.box[i].xSize = gey.hor[i] ? lon : thi;
            gey.box[i].ySize = gey.hor[i] ? thi : lon;
            gey.box[i].xOffset = gey.hor[i] ? (gey.spr[i][0].xMirror ? 8 - lon : -8) : -thi * 0.5;
            gey.box[i].yOffset = gey.hor[i] ? -thi * 0.5 : (gey.spr[i][0].yMirror ? 8 - lon : -8);
            gey.spr[i][0].xSize = gey.hor[i] ? lon : thi;
            gey.spr[i][0].ySize = gey.hor[i] ? thi : lon;
            gey.spr[i][0].xOffset = gey.hor[i] ? -8 : -thi * 0.5;
            gey.spr[i][0].yOffset = gey.hor[i] ? -thi * 0.5 : -8;
            gey.spr[i][0].u0 = gey.hor[i] ? 418 + gey.frabod[i] : 356 - thi * 0.5;
            gey.spr[i][0].v0 = gey.hor[i] ? 449 - thi * 0.5 : 388 + gey.frabod[0];
            gey.spr[i][0].u1 = gey.spr[i][0].u0 + (gey.hor[i] ? lon : thi);
            gey.spr[i][0].v1 = gey.spr[i][0].v0 + (gey.hor[i] ? thi : lon);
            gey.spr[i][0].u0 /= gey.spr[i][0].texture.assetData.xSize;
            gey.spr[i][0].v0 /= gey.spr[i][0].texture.assetData.ySize;
            gey.spr[i][0].u1 /= gey.spr[i][0].texture.assetData.xSize;
            gey.spr[i][0].v1 /= gey.spr[i][0].texture.assetData.ySize;
            gey.spr[i][1].xSize = gey.hor[i] ? gey.spr[i][0].xSize : 1;
            gey.spr[i][1].ySize = gey.hor[i] ? 1 : gey.spr[i][0].ySize;
            gey.spr[i][1].xOffset = gey.hor[i] ? gey.spr[i][0].xOffset : -gey.spr[i][0].xSize * 0.5;
            gey.spr[i][1].yOffset = gey.hor[i] ? -gey.spr[i][0].ySize * 0.5 : gey.spr[i][0].yOffset;
            gey.spr[i][2].xSize = gey.hor[i] ? gey.spr[i][0].xSize : 1;
            gey.spr[i][2].ySize = gey.hor[i] ? 1 : gey.spr[i][0].ySize;
            gey.spr[i][2].xOffset = gey.hor[i] ? gey.spr[i][0].xOffset : gey.spr[i][0].xSize * 0.5 - 1;
            gey.spr[i][2].yOffset = gey.hor[i] ? gey.spr[i][0].ySize * 0.5 - 1 : gey.spr[i][0].yOffset;
            gey.spr[i][3].xSize = gey.hor[i] ? 4 : thi - 4;
            gey.spr[i][3].xSize = gey.spr[i][3].xSize < 0 ? 0 : gey.spr[i][3].xSize;
            gey.spr[i][3].ySize = gey.hor[i] ? thi - 4 : 4;
            gey.spr[i][3].ySize = gey.spr[i][3].ySize < 0 ? 0 : gey.spr[i][3].ySize;
            gey.spr[i][3].xOffset = gey.hor[i] ? gey.spr[i][0].xSize - 12 : -gey.spr[i][3].xSize * 0.5;
            gey.spr[i][3].yOffset = gey.hor[i] ? -gey.spr[i][3].ySize * 0.5 : gey.spr[i][0].ySize - 12;
            gey.spr[i][3].u0 = gey.hor[i] ? 299 : 296;
            gey.spr[i][3].v0 = gey.hor[i] ? 658 : 657;
            gey.spr[i][3].u1 = gey.spr[i][3].u0 + (gey.hor[i] ? 4 : 1);
            gey.spr[i][3].v1 = gey.spr[i][3].v0 + (gey.hor[i] ? 1 : 4);
            gey.spr[i][3].u0 /= gey.spr[i][3].texture.assetData.xSize;
            gey.spr[i][3].v0 /= gey.spr[i][3].texture.assetData.ySize;
            gey.spr[i][3].u1 /= gey.spr[i][3].texture.assetData.xSize;
            gey.spr[i][3].v1 /= gey.spr[i][3].texture.assetData.ySize;
            gey.spr[i][4].xOffset = gey.hor[i] ? gey.spr[i][0].xSize - 14 : -thi * 0.5 - 2;
            gey.spr[i][4].yOffset = gey.hor[i] ? -thi * 0.5 - 2 : gey.spr[i][0].ySize - 14;
            gey.spr[i][4].u0 = gey.hor[i] ? 318 + gey.fratip[i] : 295;
            gey.spr[i][4].v0 = gey.hor[i] ? 629 : 629 + gey.fratip[0];
            gey.spr[i][4].u1 = gey.spr[i][4].u0 + (gey.hor[i] ? 6 : 4);
            gey.spr[i][4].v1 = gey.spr[i][4].v0 + (gey.hor[i] ? 4 : 6);
            gey.spr[i][4].u0 /= gey.spr[i][4].texture.assetData.xSize;
            gey.spr[i][4].v0 /= gey.spr[i][4].texture.assetData.ySize;
            gey.spr[i][4].u1 /= gey.spr[i][4].texture.assetData.xSize;
            gey.spr[i][4].v1 /= gey.spr[i][4].texture.assetData.ySize;
            gey.spr[i][5].xOffset = gey.hor[i] ? gey.spr[i][0].xSize - 14 : -thi * 0.5 - 2;
            gey.spr[i][5].yOffset = gey.hor[i] ? -thi * 0.5 - 2 : gey.spr[i][0].ySize - 14;
            gey.spr[i][5].u0 = gey.hor[i] ? 318 + 7 + gey.fratip[i] : 295;
            gey.spr[i][5].v0 = gey.hor[i] ? 629 : 629 + 7 + gey.fratip[0];
            gey.spr[i][5].u1 = gey.spr[i][5].u0 + (gey.hor[i] ? 6 : 4);
            gey.spr[i][5].v1 = gey.spr[i][5].v0 + (gey.hor[i] ? 4 : 6);
            gey.spr[i][5].u0 /= gey.spr[i][5].texture.assetData.xSize;
            gey.spr[i][5].v0 /= gey.spr[i][5].texture.assetData.ySize;
            gey.spr[i][5].u1 /= gey.spr[i][5].texture.assetData.xSize;
            gey.spr[i][5].v1 /= gey.spr[i][5].texture.assetData.ySize;
            gey.spr[i][6].xOffset = gey.hor[i] ? gey.spr[i][0].xSize - 14 : thi * 0.5 - 2;
            gey.spr[i][6].yOffset = gey.hor[i] ? thi * 0.5 - 2 : gey.spr[i][0].ySize - 14;
            gey.spr[i][6].u0 = gey.hor[i] ? 318 + gey.fratip[i] : 302;
            gey.spr[i][6].v0 = gey.hor[i] ? 636 : 629 + gey.fratip[0];
            gey.spr[i][6].u1 = gey.spr[i][6].u0 + (gey.hor[i] ? 6 : 4);
            gey.spr[i][6].v1 = gey.spr[i][6].v0 + (gey.hor[i] ? 4 : 6);
            gey.spr[i][6].u0 /= gey.spr[i][6].texture.assetData.xSize;
            gey.spr[i][6].v0 /= gey.spr[i][6].texture.assetData.ySize;
            gey.spr[i][6].u1 /= gey.spr[i][6].texture.assetData.xSize;
            gey.spr[i][6].v1 /= gey.spr[i][6].texture.assetData.ySize;
            gey.spr[i][7].xOffset = gey.hor[i] ? gey.spr[i][0].xSize - 14 : thi * 0.5 - 2;
            gey.spr[i][7].yOffset = gey.hor[i] ? thi * 0.5 - 2 : gey.spr[i][0].ySize - 14;
            gey.spr[i][7].u0 = gey.hor[i] ? 318 + 7 + gey.fratip[i] : 302;
            gey.spr[i][7].v0 = gey.hor[i] ? 636 : 629 + 7 + gey.fratip[0];
            gey.spr[i][7].u1 = gey.spr[i][7].u0 + (gey.hor[i] ? 6 : 4);
            gey.spr[i][7].v1 = gey.spr[i][7].v0 + (gey.hor[i] ? 4 : 6);
            gey.spr[i][7].u0 /= gey.spr[i][7].texture.assetData.xSize;
            gey.spr[i][7].v0 /= gey.spr[i][7].texture.assetData.ySize;
            gey.spr[i][7].u1 /= gey.spr[i][7].texture.assetData.xSize;
            gey.spr[i][7].v1 /= gey.spr[i][7].texture.assetData.ySize;
        }
        gey.setsiz = setsiz;
        function updsiz(i) {
            setsiz(i, (gey.hor[i] ? gey.spr[i][0].xSize : gey.spr[i][0].ySize) + pow[i] * Engine.System.stepExtrapolation * (gey.dir[i] > 0 ? 1 : 0), (gey.hor[i] ? gey.spr[i][0].ySize : gey.spr[i][0].xSize) + (gey.dir[i] < 0 ? shr[i] : gro[i]) * Engine.System.stepExtrapolation * gey.dir[i]);
        }
        gey.updsiz = updsiz;
        gey.dracom[0].push(function () {
            for (var i = 0; i < gey.cou; i++) {
                oldwid[i] = gey.spr[i][0].xSize;
                oldhei[i] = gey.spr[i][0].ySize;
                updsiz(i);
            }
        });
        gey.dracom[2].push(function () {
            for (var i = 0; i < gey.cou; i++) {
                gey.spr[i][0].xSize = oldwid[i];
                gey.spr[i][0].ySize = oldhei[i];
            }
        });
    })(gey = Game.gey || (Game.gey = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var gey;
    (function (gey) {
        gey.spr = [];
        gey.concom[1].push(function (i) {
            gey.spr[i] = [];
            gey.spr[i][0] = new Engine.Sprite();
            gey.spr[i][0].x = gey.def[i].instance.x;
            gey.spr[i][0].y = gey.def[i].instance.y;
            gey.spr[i][0].xMirror = gey.def[i].flip.x;
            gey.spr[i][0].yMirror = gey.def[i].flip.y;
            gey.spr[i][0].texture = Game.Resources.texgam;
            gey.spr[i][1] = new Engine.Sprite();
            gey.spr[i][1].x = gey.def[i].instance.x;
            gey.spr[i][1].y = gey.def[i].instance.y;
            gey.spr[i][1].xMirror = gey.def[i].flip.x;
            gey.spr[i][1].yMirror = gey.def[i].flip.y;
            gey.spr[i][1].texture = Game.Resources.texgam;
            gey.spr[i][1].u0 = 422;
            gey.spr[i][1].v0 = 391;
            gey.spr[i][1].u1 = gey.spr[i][1].u0 + 1;
            gey.spr[i][1].v1 = gey.spr[i][1].v0 + 1;
            gey.spr[i][1].u0 /= gey.spr[i][1].texture.assetData.xSize;
            gey.spr[i][1].v0 /= gey.spr[i][1].texture.assetData.ySize;
            gey.spr[i][1].u1 /= gey.spr[i][1].texture.assetData.xSize;
            gey.spr[i][1].v1 /= gey.spr[i][1].texture.assetData.ySize;
            gey.spr[i][2] = new Engine.Sprite();
            gey.spr[i][2].x = gey.def[i].instance.x;
            gey.spr[i][2].y = gey.def[i].instance.y;
            gey.spr[i][2].xMirror = gey.def[i].flip.x;
            gey.spr[i][2].yMirror = gey.def[i].flip.y;
            gey.spr[i][2].texture = Game.Resources.texgam;
            gey.spr[i][2].u0 = 422;
            gey.spr[i][2].v0 = 391;
            gey.spr[i][2].u1 = gey.spr[i][2].u0 + 1;
            gey.spr[i][2].v1 = gey.spr[i][2].v0 + 1;
            gey.spr[i][2].u0 /= gey.spr[i][2].texture.assetData.xSize;
            gey.spr[i][2].v0 /= gey.spr[i][2].texture.assetData.ySize;
            gey.spr[i][2].u1 /= gey.spr[i][2].texture.assetData.xSize;
            gey.spr[i][2].v1 /= gey.spr[i][2].texture.assetData.ySize;
            gey.spr[i][3] = new Engine.Sprite();
            gey.spr[i][3].x = gey.def[i].instance.x;
            gey.spr[i][3].y = gey.def[i].instance.y;
            gey.spr[i][3].xMirror = gey.def[i].flip.x;
            gey.spr[i][3].yMirror = gey.def[i].flip.y;
            gey.spr[i][3].texture = Game.Resources.texgam;
            gey.spr[i][4] = new Engine.Sprite();
            gey.spr[i][4].x = gey.def[i].instance.x;
            gey.spr[i][4].y = gey.def[i].instance.y;
            gey.spr[i][4].xMirror = gey.def[i].flip.x;
            gey.spr[i][4].yMirror = gey.def[i].flip.y;
            gey.spr[i][4].xSize = gey.hor[i] ? 6 : 4;
            gey.spr[i][4].ySize = gey.hor[i] ? 4 : 6;
            gey.spr[i][4].texture = Game.Resources.texgam;
            gey.spr[i][5] = new Engine.Sprite();
            gey.spr[i][5].x = gey.def[i].instance.x;
            gey.spr[i][5].y = gey.def[i].instance.y;
            gey.spr[i][5].xMirror = gey.def[i].flip.x;
            gey.spr[i][5].yMirror = gey.def[i].flip.y;
            gey.spr[i][5].xSize = gey.hor[i] ? 6 : 4;
            gey.spr[i][5].ySize = gey.hor[i] ? 4 : 6;
            gey.spr[i][5].texture = Game.Resources.texgam;
            gey.spr[i][6] = new Engine.Sprite();
            gey.spr[i][6].x = gey.def[i].instance.x;
            gey.spr[i][6].y = gey.def[i].instance.y;
            gey.spr[i][6].xMirror = gey.def[i].flip.x;
            gey.spr[i][6].yMirror = gey.def[i].flip.y;
            gey.spr[i][6].xSize = gey.hor[i] ? 6 : 4;
            gey.spr[i][6].ySize = gey.hor[i] ? 4 : 6;
            gey.spr[i][6].texture = Game.Resources.texgam;
            gey.spr[i][7] = new Engine.Sprite();
            gey.spr[i][7].x = gey.def[i].instance.x;
            gey.spr[i][7].y = gey.def[i].instance.y;
            gey.spr[i][7].xMirror = gey.def[i].flip.x;
            gey.spr[i][7].yMirror = gey.def[i].flip.y;
            gey.spr[i][7].xSize = gey.hor[i] ? 6 : 4;
            gey.spr[i][7].ySize = gey.hor[i] ? 4 : 6;
            gey.spr[i][7].texture = Game.Resources.texgam;
            gey.spr[i][8] = new Engine.Sprite();
            gey.spr[i][8].enabled = true;
            gey.spr[i][8].x = gey.def[i].instance.x;
            gey.spr[i][8].y = gey.def[i].instance.y;
            gey.spr[i][8].xMirror = gey.def[i].flip.x;
            gey.spr[i][8].yMirror = gey.def[i].flip.y;
            gey.spr[i][8].xSize = gey.hor[i] ? 8 : gey.wid[i];
            gey.spr[i][8].ySize = gey.hor[i] ? gey.hei[i] : 8;
            gey.spr[i][8].xOffset = gey.hor[i] ? -8 : -gey.wid[i] * 0.5;
            gey.spr[i][8].yOffset = gey.hor[i] ? -gey.hei[i] * 0.5 : -8;
            gey.spr[i][8].texture = Game.Resources.texgam;
            gey.spr[i][8].u0 = gey.hor[i] ? 419 : 489 - gey.spr[i][8].xSize * 0.5;
            gey.spr[i][8].v0 = gey.hor[i] ? 572 - gey.spr[i][8].ySize * 0.5 : 512;
            gey.spr[i][8].u1 = gey.spr[i][8].u0 + (gey.hor[i] ? 8 : gey.spr[i][8].xSize);
            gey.spr[i][8].v1 = gey.spr[i][8].v0 + (gey.hor[i] ? gey.spr[i][8].ySize : 8);
            gey.spr[i][8].u0 /= gey.spr[i][8].texture.assetData.xSize;
            gey.spr[i][8].v0 /= gey.spr[i][8].texture.assetData.ySize;
            gey.spr[i][8].u1 /= gey.spr[i][8].texture.assetData.xSize;
            gey.spr[i][8].v1 /= gey.spr[i][8].texture.assetData.ySize;
            gey.spr[i][9] = new Engine.Sprite();
            gey.spr[i][9].enabled = true;
            gey.spr[i][9].x = gey.def[i].instance.x;
            gey.spr[i][9].y = gey.def[i].instance.y;
            gey.spr[i][9].xMirror = gey.def[i].flip.x;
            gey.spr[i][9].yMirror = gey.def[i].flip.y;
            gey.spr[i][9].xSize = gey.hor[i] ? 8 : 4;
            gey.spr[i][9].ySize = gey.hor[i] ? 4 : 8;
            gey.spr[i][9].xOffset = gey.hor[i] ? -8 : -gey.wid[i] * 0.5;
            gey.spr[i][9].yOffset = gey.hor[i] ? -gey.hei[i] * 0.5 : -8;
            gey.spr[i][9].texture = Game.Resources.texgam;
            gey.spr[i][9].u0 = gey.hor[i] ? 419 : 429;
            gey.spr[i][9].v0 = gey.hor[i] ? 512 : 512;
            gey.spr[i][9].u1 = gey.spr[i][9].u0 + (gey.hor[i] ? 8 : 4);
            gey.spr[i][9].v1 = gey.spr[i][9].v0 + (gey.hor[i] ? 4 : 8);
            gey.spr[i][9].u0 /= gey.spr[i][9].texture.assetData.xSize;
            gey.spr[i][9].v0 /= gey.spr[i][9].texture.assetData.ySize;
            gey.spr[i][9].u1 /= gey.spr[i][9].texture.assetData.xSize;
            gey.spr[i][9].v1 /= gey.spr[i][9].texture.assetData.ySize;
            gey.spr[i][10] = new Engine.Sprite();
            gey.spr[i][10].enabled = true;
            gey.spr[i][10].x = gey.def[i].instance.x;
            gey.spr[i][10].y = gey.def[i].instance.y;
            gey.spr[i][10].xMirror = gey.def[i].flip.x;
            gey.spr[i][10].yMirror = gey.def[i].flip.y;
            gey.spr[i][10].xSize = gey.hor[i] ? 8 : 4;
            gey.spr[i][10].ySize = gey.hor[i] ? 4 : 8;
            gey.spr[i][10].xOffset = gey.hor[i] ? -8 : gey.wid[i] * 0.5 - 4;
            gey.spr[i][10].yOffset = gey.hor[i] ? gey.hei[i] * 0.5 - 4 : -8;
            gey.spr[i][10].texture = Game.Resources.texgam;
            gey.spr[i][10].u0 = gey.hor[i] ? 419 : 545;
            gey.spr[i][10].v0 = gey.hor[i] ? 628 : 512;
            gey.spr[i][10].u1 = gey.spr[i][10].u0 + (gey.hor[i] ? 8 : 4);
            gey.spr[i][10].v1 = gey.spr[i][10].v0 + (gey.hor[i] ? 4 : 8);
            gey.spr[i][10].u0 /= gey.spr[i][10].texture.assetData.xSize;
            gey.spr[i][10].v0 /= gey.spr[i][10].texture.assetData.ySize;
            gey.spr[i][10].u1 /= gey.spr[i][10].texture.assetData.xSize;
            gey.spr[i][10].v1 /= gey.spr[i][10].texture.assetData.ySize;
        });
        gey.dracom[1].push(function () {
            for (var i = 0; i < gey.cou; i++) {
                gey.spr[i][0].render();
                gey.spr[i][1].render();
                gey.spr[i][2].render();
                gey.spr[i][3].render();
                gey.spr[i][4].render();
                gey.spr[i][5].render();
                gey.spr[i][6].render();
                gey.spr[i][7].render();
                gey.spr[i][8].render();
                gey.spr[i][9].render();
                gey.spr[i][10].render();
            }
        });
    })(gey = Game.gey || (Game.gey = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var gey;
    (function (gey) {
        var ind = gey.maksta();
        var def = [];
        var ste = [];
        gey.consta[ind] = function (i) {
            def[i] = gey.ins[i].getProperty("out");
        };
        gey.ressta[ind] = function (i) {
            if (gey.ins[i].getProperty("big")) {
                gey.spr[i][0].enabled = true;
                gey.spr[i][1].enabled = true;
                gey.spr[i][2].enabled = true;
                gey.spr[i][3].enabled = true;
                gey.spr[i][4].enabled = true;
                gey.spr[i][5].enabled = true;
                gey.spr[i][6].enabled = true;
                gey.spr[i][7].enabled = true;
                gey.box[i].enabled = true;
                gey.setsiz(i, gey.hor[i] ? gey.wid[i] : gey.hei[i], gey.hor[i] ? gey.hei[i] : gey.wid[i]);
                setout(i);
            }
        };
        function setout(i) {
            gey.dir[i] = 0;
            ste[i] = def[i];
            gey.sta[i] = ind;
        }
        gey.setout = setout;
        gey.updsta[ind] = function (i) {
            gey.updani(i);
            if (ste[i]-- == 0)
                gey.setshr(i);
        };
    })(gey = Game.gey || (Game.gey = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var gey;
    (function (gey) {
        var ind = gey.maksta();
        function setsho(i) {
            gey.spr[i][0].enabled = true;
            gey.spr[i][1].enabled = true;
            gey.spr[i][2].enabled = true;
            gey.spr[i][3].enabled = true;
            gey.spr[i][4].enabled = true;
            gey.spr[i][5].enabled = true;
            gey.spr[i][6].enabled = true;
            gey.spr[i][7].enabled = true;
            gey.box[i].enabled = true;
            gey.setsiz(i, 8, 0);
            gey.dir[i] = 1;
            gey.sta[i] = ind;
            Game.Resources.audgey.play();
        }
        gey.setsho = setsho;
        ;
        gey.updsta[ind] = function (i) {
            gey.updani(i);
            gey.updsiz(i);
            if (gey.hor ? gey.spr[i][0].xSize == gey.wid[i] : gey.spr[i][0].ySize == gey.hei[i])
                gey.setout(i);
        };
    })(gey = Game.gey || (Game.gey = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var gey;
    (function (gey) {
        var ind = gey.maksta();
        function setshr(i) {
            gey.dir[i] = -1;
            gey.sta[i] = ind;
        }
        gey.setshr = setshr;
        ;
        gey.updsta[ind] = function (i) {
            gey.updani(i);
            gey.updsiz(i);
            if (gey.hor ? gey.spr[i][0].ySize == 0 : gey.spr[i][0].xSize == 0)
                gey.setwai(i);
        };
    })(gey = Game.gey || (Game.gey = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var gey;
    (function (gey) {
        var stawai = gey.maksta();
        var def = [];
        var ste = [];
        var end;
        gey.consta[stawai] = function (i) {
            def[i] = gey.ins[i].getProperty("wai");
        };
        gey.ressta[stawai] = function (i) {
            if (!gey.ins[i].getProperty("big"))
                setwai(i);
            end = false;
            Game.Resources.audgey.extraGain.gain.value = 1;
        };
        function setwai(i) {
            ste[i] = def[i];
            gey.spr[i][0].enabled = false;
            gey.spr[i][1].enabled = false;
            gey.spr[i][2].enabled = false;
            gey.spr[i][3].enabled = false;
            gey.spr[i][4].enabled = false;
            gey.spr[i][5].enabled = false;
            gey.spr[i][6].enabled = false;
            gey.spr[i][7].enabled = false;
            gey.box[i].enabled = false;
            gey.dir[i] = 0;
            gey.sta[i] = stawai;
            end = true;
        }
        gey.setwai = setwai;
        gey.updsta[stawai] = function (i) {
            if (end)
                return;
            if (Game.pla.box.x > Game.SceneMap.instance.xSizeMap * 0.5)
                if (ste[i]-- == 0)
                    gey.setsho(i);
        };
    })(gey = Game.gey || (Game.gey = {}));
})(Game || (Game = {}));
///<reference path="../../ExtEntity.ts"/>
var Game;
(function (Game) {
    var jel;
    (function (jel) {
        jel.cou = 0;
        function onClearScene() {
            jel.cou = 0;
        }
        jel.onClearScene = onClearScene;
        var cla = /** @class */ (function (_super) {
            __extends(cla, _super);
            function cla(def) {
                var _this = _super.call(this, def) || this;
                onConstructor(_this, Game.jel);
                return _this;
            }
            cla.prototype.onSetFrame = function (_, __, fra) { onSetFrame(this.ind, fra); };
            return cla;
        }(Game.ExtEntity));
        jel.cla = cla;
        function getpro(i, nam) {
            return jel.ins[i].getProperty(nam);
        }
        jel.getpro = getpro;
        jel.stacou = 0;
        jel.sta = [];
        jel.consta = [];
        jel.ressta = [];
        jel.begsta = [];
        jel.movsta = [];
        jel.updsta = [];
        jel.linsta = [];
        function maksta() {
            function nul(_) { }
            ;
            jel.consta.push(nul);
            jel.ressta.push(nul);
            jel.begsta.push(nul);
            jel.movsta.push(nul);
            jel.updsta.push(nul);
            jel.linsta.push(nul);
            return jel.stacou++;
        }
        jel.maksta = maksta;
        maksta();
        jel.ins = [];
        jel.def = [];
        jel.concom = [[], [], []];
        function onConstructor(obj, nam) {
            jel.ins[jel.cou] = obj;
            jel.def[jel.cou] = obj.def;
            jel.concom.forEach(function (x) { return x.forEach(function (y) { return y(jel.cou); }); });
            jel.consta.forEach(function (x) { return x(jel.cou); });
            if (jel.cou == 0)
                Engine.System.addListenersFrom(nam);
            obj.ind = jel.cou++;
        }
        jel.onConstructor = onConstructor;
        jel.rescom = [[], [], []];
        function onReset() {
            jel.rescom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < jel.cou; i++)
                jel.sta[i] = 0;
            for (var i = 0; i < jel.cou; i++)
                jel.ressta.forEach(function (x) { return x(i); });
        }
        jel.onReset = onReset;
        jel.begcom = [[], [], []];
        function onStart() {
            jel.begcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < jel.cou; i++)
                jel.begsta.forEach(function (x) { return x(i); });
            for (var i = 0; i < jel.cou; i++)
                jel.linsta.forEach(function (x) { return x(i); });
        }
        jel.onStart = onStart;
        jel.movcom = [[], [], []];
        function onMoveUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            jel.movcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < jel.cou; i++)
                jel.movsta[jel.sta[i]](i);
        }
        jel.onMoveUpdate = onMoveUpdate;
        jel.stecom = [[], [], []];
        function onStepUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            jel.stecom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < jel.cou; i++)
                jel.updsta[jel.sta[i]](i);
            for (var i = 0; i < jel.cou; i++)
                jel.linsta[jel.sta[i]](i);
        }
        jel.onStepUpdate = onStepUpdate;
        jel.anicom = [[], [], []];
        function onSetFrame(i, fra) {
            jel.anicom.forEach(function (x) { return x.forEach(function (y) { return y(i, fra); }); });
        }
        jel.onSetFrame = onSetFrame;
        jel.timcom = [[], [], []];
        function onTimeUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            jel.timcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        jel.onTimeUpdate = onTimeUpdate;
        jel.dracom = [[], [], []];
        function onDrawObjects() {
            jel.dracom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        jel.onDrawObjects = onDrawObjects;
    })(jel = Game.jel || (Game.jel = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var jel;
    (function (jel) {
        Game.addAction("preconfigure", function () { jel.fra = Game.FrameSelector.complex("jel", Game.Resources.texgam, 428, 619); });
        jel.ani = [];
        jel.concom[1].push(function (i) {
            jel.ani[i] = new Utils.Animator();
            jel.ani[i].owner = jel.ani[i].listener = jel.ins[i];
        });
        jel.anicom[1].push(function (i, fra) {
            fra.applyToSprite(jel.spr[i]);
            jel.spr[i].yOffset += jel.spr[i].yMirror ? jel.box[i].ySize : 0;
        });
    })(jel = Game.jel || (Game.jel = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var jel;
    (function (jel) {
        jel.box = [];
        jel.concom[1].push(function (i) {
            jel.box[i] = new Engine.Box();
            jel.box[i].enabled = jel.box[i].renderable = true;
            jel.fra[0].applyToBox(jel.box[i]);
            Game.SceneMap.instance.boxesEnemies.push(jel.box[i]);
        });
        jel.rescom[1].push(function () {
            for (var i = 0; i < jel.cou; i++) {
                jel.box[i].enabled = true;
                jel.box[i].x = jel.def[i].instance.x;
                jel.box[i].y = jel.def[i].instance.y;
            }
        });
        jel.dracom[2].push(function () {
            for (var i = 0; i < jel.cou; i++)
                jel.box[i].renderAt(jel.hordrapos[i] + jel.wav[i], jel.verdrapos[i]);
        });
    })(jel = Game.jel || (Game.jel = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var jel;
    (function (jel) {
        jel.concom[0].push(function (i) {
            jel.def[i].instance.x += Game.SceneMap.instance.xSizeTile * 0.5;
            jel.def[i].instance.y -= Game.SceneMap.instance.ySizeTile * 0.5;
        });
    })(jel = Game.jel || (Game.jel = {}));
})(Game || (Game = {}));
///<reference path="../jel.ts"/>
var Game;
(function (Game) {
    var jel;
    (function (jel) {
        jel.vervel = [];
        jel.verdravel = [];
        jel.verdraoff = [];
        jel.hordrapos = [];
        jel.verdrapos = [];
        jel.rescom[1].push(function () {
            for (var i = 0; i < jel.cou; i++) {
                jel.vervel[i] = 0;
                jel.verdravel[i] = 0;
                jel.verdraoff[i] = 0;
                jel.hordrapos[i] = jel.def[i].instance.x;
                jel.verdrapos[i] = jel.def[i].instance.y;
            }
        });
        jel.movcom[1].push(function () {
            for (var i = 0; i < jel.cou; i++) {
                jel.box[i].translate(null, false, jel.vervel[i], true);
            }
        });
        jel.timcom[1].push(function () {
            for (var i = 0; i < jel.cou; i++) {
                var drapos = jel.box[i].getExtrapolation(Game.SceneMap.instance.boxesSolids, 0, jel.vervel[i] + jel.verdravel[i], true);
                jel.hordrapos[i] = drapos.x;
                jel.verdrapos[i] = drapos.y + jel.verdraoff[i];
                jel.verdravel[i] = 0;
                jel.verdraoff[i] = 0;
            }
        });
    })(jel = Game.jel || (Game.jel = {}));
})(Game || (Game = {}));
///<reference path="../jel.ts"/>
var Game;
(function (Game) {
    var jel;
    (function (jel) {
        jel.spr = [];
        jel.concom[1].push(function (i) {
            jel.spr[i] = new Engine.Sprite();
            jel.spr[i].enabled = true;
            jel.spr[i].xMirror = jel.def[i].flip.x;
            jel.fra[0].applyToSprite(jel.spr[i]);
        });
        jel.rescom[1].push(function () {
            for (var i = 0; i < jel.cou; i++) {
                jel.spr[i].x = jel.def[i].instance.x;
                jel.spr[i].y = jel.def[i].instance.y;
            }
        });
        jel.dracom[1].push(function () {
            for (var i = 0; i < jel.cou; i++) {
                jel.spr[i].x = jel.hordrapos[i] + jel.wav[i];
                jel.spr[i].y = jel.verdrapos[i];
                jel.spr[i].render();
            }
        });
    })(jel = Game.jel || (Game.jel = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var jel;
    (function (jel) {
        var vel = [];
        var dis = [];
        var ang = [];
        jel.wav = [];
        jel.concom[1].push(function (i) {
            vel[i] = jel.ins[i].getProperty("wavvel");
            dis[i] = jel.ins[i].getProperty("wavdis");
        });
        jel.rescom[1].push(function () {
            for (var i = 0; i < jel.cou; i++) {
                jel.wav[i] = 0;
                ang[i] = 0;
            }
        });
        jel.stecom[1].push(function () {
            for (var i = 0; i < jel.cou; i++)
                ang[i] += vel[i];
        });
        jel.timcom[1].push(function () {
            for (var i = 0; i < jel.cou; i++)
                jel.wav[i] = Math.sin(ang[i] + vel[i] * Engine.System.stepExtrapolation) * dis[i];
        });
    })(jel = Game.jel || (Game.jel = {}));
})(Game || (Game = {}));
///<reference path="../jel.ts"/>
var Game;
(function (Game) {
    var jel;
    (function (jel) {
        var ind = jel.maksta();
        var cli;
        Game.addAction("configure", function () { cli = new Utils.Animation("asc", true, jel.fra, 7, [0, 1, 2, 1], null); });
        var vel = [];
        var lim = [];
        jel.consta[ind] = function (i) {
            vel[i] = jel.ins[i].getProperty("vel");
            lim[i] = jel.def[i].instance.y - jel.ins[i].getProperty("are") * 8;
        };
        jel.ressta[ind] = function (i) {
            if (jel.ins[i].getProperty("asc"))
                setasc(i);
        };
        function setasc(i) {
            jel.vervel[i] = -vel[i];
            jel.ani[i].setAnimation(cli);
            jel.sta[i] = ind;
        }
        jel.setasc = setasc;
        jel.linsta[ind] = function (i) {
            if (jel.box[i].y < lim[i])
                jel.setdes(i);
        };
    })(jel = Game.jel || (Game.jel = {}));
})(Game || (Game = {}));
///<reference path="../jel.ts"/>
var Game;
(function (Game) {
    var jel;
    (function (jel) {
        var ind = jel.maksta();
        var cli;
        Game.addAction("configure", function () { cli = new Utils.Animation("des", true, jel.fra, 7, [3, 4, 5, 4], null); });
        var gra = [];
        var cap = [];
        var lim = [];
        jel.consta[ind] = function (i) {
            gra[i] = jel.ins[i].getProperty("gra");
            cap[i] = jel.ins[i].getProperty("cap");
            lim[i] = jel.def[i].instance.y;
        };
        jel.ressta[ind] = function (i) {
            if (!jel.ins[i].getProperty("asc"))
                setdes(i);
        };
        function setdes(i) {
            jel.vervel[i] = 0;
            jel.ani[i].setAnimation(cli);
            jel.sta[i] = ind;
        }
        jel.setdes = setdes;
        jel.updsta[ind] = function (i) {
            jel.vervel[i] += gra[i];
            jel.vervel[i] = jel.vervel[i] > cap[i] ? cap[i] : jel.vervel[i];
        };
        jel.linsta[ind] = function (i) {
            if (jel.box[i].y > lim[i])
                jel.setasc(i);
        };
    })(jel = Game.jel || (Game.jel = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var GenericUI = /** @class */ (function (_super) {
        __extends(GenericUI, _super);
        function GenericUI(def, frame) {
            var _this = _super.call(this, def) || this;
            GenericUI.instance = _this;
            _this.sprite = new Engine.Sprite();
            _this.sprite.enabled = true;
            frame.applyToSprite(_this.sprite);
            _this.sprite.xMirror = def.flip.x;
            return _this;
        }
        GenericUI.prototype.onStart = function () {
            this.sprite.x = this.def.instance.x;
            this.sprite.x += Game.SceneMap.instance.xSizeTile * 0.5;
            this.sprite.y = this.def.instance.y;
        };
        GenericUI.prototype.onDrawTextSuperBack = function () {
            this.sprite.render();
        };
        return GenericUI;
    }(Game.Entity));
    Game.GenericUI = GenericUI;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var titlab;
    (function (titlab) {
        titlab.preserved = false;
        var tex;
        var spr = new Engine.Sprite();
        spr.enabled = spr.pinned = true;
        var sprmin = new Engine.Sprite();
        sprmin.enabled = sprmin.pinned = true;
        Game.addAction("init", function () {
            if (Game.plu) {
                Game.FrameSelector.complex("titlabmin", Game.Resources.texgam, 818, 813, null, 0, false)[0].applyToSprite(sprmin);
                Game.FrameSelector.complex("titlab", Game.Resources.texgam, 818, 835, null, 0, false)[0].applyToSprite(spr);
            }
        });
        function mak(y) {
            if (Game.plu) {
                Engine.System.addListenersFrom(Game.titlab);
                spr.y = y + 1;
                sprmin.y = y - 13;
                tex = new Utils.Text();
                tex.font = Game.FontManager.a;
                tex.scale = 1;
                tex.enabled = true;
                tex.pinned = true;
                tex.str = "BY NOADEV";
                tex.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
                tex.xAlignView = Utils.AnchorAlignment.MIDDLE;
                tex.yAlignBounds = Utils.AnchorAlignment.START;
                tex.yAlignView = Utils.AnchorAlignment.MIDDLE;
                tex.yAligned = y + 20 + 1 + 1;
            }
            else {
                var texmin = new Utils.Text();
                texmin.font = Game.FontManager.a;
                texmin.scale = 1;
                texmin.enabled = true;
                texmin.pinned = true;
                texmin.str = "MINI";
                texmin.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
                texmin.xAlignView = Utils.AnchorAlignment.MIDDLE;
                texmin.yAlignBounds = Utils.AnchorAlignment.START;
                texmin.yAlignView = Utils.AnchorAlignment.MIDDLE;
                texmin.xAligned = 0;
                texmin.yAligned = -60 + 6 + 6 + 0;
                var texgam = new Utils.Text();
                texgam.font = Game.FontManager.a;
                texgam.scale = 2;
                texgam.enabled = true;
                texgam.pinned = true;
                texgam.str = "SWIM!";
                texgam.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
                texgam.xAlignView = Utils.AnchorAlignment.MIDDLE;
                texgam.yAlignBounds = Utils.AnchorAlignment.START;
                texgam.yAlignView = Utils.AnchorAlignment.MIDDLE;
                texgam.xAligned = 0;
                texgam.yAligned = -60 + 6 + 13 + 0;
            }
        }
        titlab.mak = mak;
        var TitleLabel = /** @class */ (function (_super) {
            __extends(TitleLabel, _super);
            function TitleLabel(_) {
                return _super.call(this) || this;
            }
            return TitleLabel;
        }(Engine.Entity));
        titlab.TitleLabel = TitleLabel;
        function onDrawBubblesDialog() {
            spr.render();
            sprmin.render();
        }
        titlab.onDrawBubblesDialog = onDrawBubblesDialog;
    })(titlab = Game.titlab || (Game.titlab = {}));
})(Game || (Game = {}));
///<reference path="../../ExtEntity.ts"/>
var Game;
(function (Game) {
    var med;
    (function (med) {
        med.cou = 0;
        function onClearScene() {
            med.cou = 0;
        }
        med.onClearScene = onClearScene;
        var cla = /** @class */ (function (_super) {
            __extends(cla, _super);
            function cla(def) {
                var _this = _super.call(this, def) || this;
                onConstructor(_this, Game.med);
                return _this;
            }
            cla.prototype.onSetFrame = function (_, __, fra) { onSetFrame(this.ind, fra); };
            return cla;
        }(Game.ExtEntity));
        med.cla = cla;
        function getpro(i, nam) {
            return med.ins[i].getProperty(nam);
        }
        med.getpro = getpro;
        med.stacou = 0;
        med.sta = [];
        med.consta = [];
        med.ressta = [];
        med.begsta = [];
        med.movsta = [];
        med.updsta = [];
        med.linsta = [];
        function maksta() {
            function nul(_) { }
            ;
            med.consta.push(nul);
            med.ressta.push(nul);
            med.begsta.push(nul);
            med.movsta.push(nul);
            med.updsta.push(nul);
            med.linsta.push(nul);
            return med.stacou++;
        }
        med.maksta = maksta;
        maksta();
        med.ins = [];
        med.def = [];
        med.concom = [[], [], []];
        function onConstructor(obj, nam) {
            med.ins[med.cou] = obj;
            med.def[med.cou] = obj.def;
            med.concom.forEach(function (x) { return x.forEach(function (y) { return y(med.cou); }); });
            med.consta.forEach(function (x) { return x(med.cou); });
            if (med.cou == 0)
                Engine.System.addListenersFrom(nam);
            obj.ind = med.cou++;
        }
        med.onConstructor = onConstructor;
        med.rescom = [[], [], []];
        function onReset() {
            med.rescom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < med.cou; i++)
                med.sta[i] = 0;
            for (var i = 0; i < med.cou; i++)
                med.ressta.forEach(function (x) { return x(i); });
        }
        med.onReset = onReset;
        med.begcom = [[], [], []];
        function onStart() {
            med.begcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < med.cou; i++)
                med.begsta.forEach(function (x) { return x(i); });
            for (var i = 0; i < med.cou; i++)
                med.linsta.forEach(function (x) { return x(i); });
        }
        med.onStart = onStart;
        med.movcom = [[], [], []];
        function onMoveUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            med.movcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < med.cou; i++)
                med.movsta[med.sta[i]](i);
        }
        med.onMoveUpdate = onMoveUpdate;
        med.stecom = [[], [], []];
        function onStepUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            med.stecom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < med.cou; i++)
                med.updsta[med.sta[i]](i);
            for (var i = 0; i < med.cou; i++)
                med.linsta[med.sta[i]](i);
        }
        med.onStepUpdate = onStepUpdate;
        med.anicom = [[], [], []];
        function onSetFrame(i, fra) {
            med.anicom.forEach(function (x) { return x.forEach(function (y) { return y(i, fra); }); });
        }
        med.onSetFrame = onSetFrame;
        med.timcom = [[], [], []];
        function onTimeUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            med.timcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        med.onTimeUpdate = onTimeUpdate;
        med.dracom = [[], [], []];
        function onDrawObjects() {
            med.dracom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        med.onDrawObjects = onDrawObjects;
    })(med = Game.med || (Game.med = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var med;
    (function (med) {
        var cli;
        Game.addAction("init", function () { cli = new Utils.Animation("idl", true, med.fra, 9, [0, 1, 2, 1], null); });
        med.ani = [];
        med.concom[1].push(function (i) {
            med.ani[i] = new Utils.Animator();
            med.ani[i].owner = med.ani[i].listener = med.ins[i];
        });
        med.rescom[1].push(function () {
            for (var i = 0; i < med.cou; i++)
                med.ani[i].setAnimation(cli);
        });
        med.anicom[1].push(function (i, fra) {
            fra.applyToSprite(med.spr[i]);
        });
    })(med = Game.med || (Game.med = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var med;
    (function (med) {
        var cou;
        var cousta = 10;
        var courep = 40;
        med.rescom[1].push(function () {
            cou = cousta;
        });
        med.stecom[1].push(function () {
            if (cou-- == 0) {
                //Resources.audmed.play();
                cou = courep;
            }
        });
    })(med = Game.med || (Game.med = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var med;
    (function (med) {
        med.box = [];
        med.ove = [];
        med.concom[1].push(function (i) {
            med.box[i] = new Engine.Box();
            med.box[i].enabled = med.box[i].renderable = true;
            med.fra[0].applyToBox(med.box[i]);
            med.ove[i] = [];
            med.ove[i][0] = new Engine.Box();
            med.ove[i][0].enabled = med.ove[i][0].renderable = true;
            Game.SceneMap.instance.boxesEnemies.push(med.ove[i][0]);
            med.ove[i][1] = new Engine.Box();
            med.ove[i][1].enabled = med.ove[i][1].renderable = true;
            Game.SceneMap.instance.boxesEnemies.push(med.ove[i][1]);
            med.ove[i][2] = new Engine.Box();
            med.ove[i][2].enabled = med.ove[i][2].renderable = true;
            Game.SceneMap.instance.boxesEnemies.push(med.ove[i][2]);
        });
        med.rescom[1].push(function () {
            for (var i = 0; i < med.cou; i++) {
                med.box[i].enabled = true;
                med.box[i].x = med.def[i].instance.x;
                med.box[i].y = med.def[i].instance.y;
                med.ove[i][0].x = med.ove[i][1].x = med.ove[i][2].x = med.box[i].x;
                med.ove[i][0].y = med.ove[i][1].y = med.ove[i][2].y = med.box[i].y;
                med.ove[i][0].xMirror = med.ove[i][1].xMirror = med.ove[i][2].xMirror = med.def[i].flip.x;
                med.ove[i][0].yMirror = med.ove[i][1].yMirror = med.ove[i][2].yMirror = med.def[i].flip.y;
            }
        });
        med.movcom[1].push(function () {
            for (var i = 0; i < med.cou; i++) {
                med.ove[i][0].x = med.ove[i][1].x = med.ove[i][2].x = med.box[i].x;
                med.ove[i][0].y = med.ove[i][1].y = med.ove[i][2].y = med.box[i].y;
            }
        });
        med.anicom[1].push(function (i, frm) {
            if (frm == med.fra[0]) {
                med.fra[3].applyToBox(med.ove[i][0]);
                med.fra[6].applyToBox(med.ove[i][1]);
                med.fra[9].applyToBox(med.ove[i][2]);
            }
            else if (frm == med.fra[1]) {
                med.fra[4].applyToBox(med.ove[i][0]);
                med.fra[7].applyToBox(med.ove[i][1]);
                med.fra[10].applyToBox(med.ove[i][2]);
            }
            else {
                med.fra[5].applyToBox(med.ove[i][0]);
                med.fra[8].applyToBox(med.ove[i][1]);
                med.fra[11].applyToBox(med.ove[i][2]);
            }
        });
        med.dracom[2].push(function () {
            for (var i = 0; i < med.cou; i++) {
                //box[i].renderAt(hordrapos[i],verdrapos[i]);
                med.ove[i][0].renderAt(med.hordrapos[i], med.verdrapos[i]);
                med.ove[i][1].renderAt(med.hordrapos[i], med.verdrapos[i]);
                med.ove[i][2].renderAt(med.hordrapos[i], med.verdrapos[i]);
            }
        });
    })(med = Game.med || (Game.med = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var med;
    (function (med) {
        Game.addAction("preinit", function () { med.fra = Game.FrameSelector.complex("med", Game.Resources.texgam, 428, 521); });
        med.concom[0].push(function (i) {
            med.def[i].instance.x += Game.SceneMap.instance.xSizeTile * 0.5;
            med.def[i].instance.y += Game.SceneMap.instance.ySizeTile * 0.5 - Game.SceneMap.instance.ySizeTile;
            med.def[i].flip.x = med.ins[i].getProperty("hormir");
            med.def[i].flip.y = med.ins[i].getProperty("vermir");
        });
    })(med = Game.med || (Game.med = {}));
})(Game || (Game = {}));
///<reference path="../med.ts"/>
var Game;
(function (Game) {
    var med;
    (function (med) {
        var vel = [];
        var max = [];
        var bou = [];
        med.concom[1].push(function (i) {
            vel[i] = med.ins[i].getProperty("vel");
            max[i] = med.ins[i].getProperty("bou");
        });
        med.rescom[2].push(function () {
            for (var i = 0; i < med.cou; i++) {
                med.horvel[i] = vel[i] * (med.def[i].flip.x ? -1 : 1);
                med.vervel[i] = vel[i] * (med.def[i].flip.y ? 1 : -1);
                bou[i] = max[i];
            }
        });
        med.stecom[1].push(function () {
            for (var i = 0; i < med.cou; i++) {
                if (med.horhit[i] != null || med.verhit[i] != null) {
                    bou[i]--;
                    if (bou[i] == 0) {
                        bou[i] = max[i];
                        flihor(i);
                        fliver(i);
                        med.ani[i].setCurrentFrame();
                    }
                    else {
                        if (med.horhit[i] != null) {
                            flihor(i);
                            med.ani[i].setCurrentFrame();
                        }
                        if (med.verhit[i] != null) {
                            fliver(i);
                            med.ani[i].setCurrentFrame();
                        }
                    }
                }
            }
        });
        function flihor(i) {
            med.horvel[i] *= -1;
            med.spr[i].xMirror = !med.spr[i].xMirror;
            med.ove[i][0].xMirror = med.ove[i][1].xMirror = med.ove[i][2].xMirror = med.spr[i].xMirror;
        }
        function fliver(i) {
            med.vervel[i] *= -1;
            med.spr[i].yMirror = !med.spr[i].yMirror;
            med.ove[i][0].yMirror = med.ove[i][1].yMirror = med.ove[i][2].yMirror = med.spr[i].yMirror;
        }
    })(med = Game.med || (Game.med = {}));
})(Game || (Game = {}));
///<reference path="../med.ts"/>
var Game;
(function (Game) {
    var med;
    (function (med) {
        med.horvel = [];
        med.vervel = [];
        var hordravel = [];
        var verdravel = [];
        var hordraoff = [];
        var verdraoff = [];
        med.hordrapos = [];
        med.verdrapos = [];
        med.horhit = [];
        med.verhit = [];
        med.rescom[1].push(function () {
            for (var i = 0; i < med.cou; i++) {
                med.horvel[i] = 0;
                med.vervel[i] = 0;
                hordravel[i] = 0;
                verdravel[i] = 0;
                hordraoff[i] = 0;
                verdraoff[i] = 0;
                med.hordrapos[i] = med.def[i].instance.x;
                med.verdrapos[i] = med.def[i].instance.y;
                med.horhit[i] = null;
                med.verhit[i] = null;
            }
        });
        med.movcom[1].push(function () {
            for (var i = 0; i < med.cou; i++) {
                med.horhit[i] = med.box[i].cast(Game.SceneMap.instance.boxesSolids, null, true, med.horvel[i], true, Engine.Box.LAYER_ALL);
                med.box[i].translate(med.horhit[i], true, med.horvel[i], true);
                med.verhit[i] = med.box[i].cast(Game.SceneMap.instance.boxesSolids, null, false, med.vervel[i], true, Engine.Box.LAYER_ALL);
                med.box[i].translate(med.verhit[i], false, med.vervel[i], true);
            }
        });
        med.timcom[1].push(function () {
            for (var i = 0; i < med.cou; i++) {
                var drapos = med.box[i].getExtrapolation(Game.SceneMap.instance.boxesSolids, med.horvel[i] + hordravel[i], med.vervel[i] + verdravel[i], true);
                med.hordrapos[i] = drapos.x + hordraoff[i];
                med.verdrapos[i] = drapos.y + verdraoff[i];
                hordravel[i] = 0;
                verdravel[i] = 0;
                hordraoff[i] = 0;
                verdraoff[i] = 0;
            }
        });
    })(med = Game.med || (Game.med = {}));
})(Game || (Game = {}));
///<reference path="../med.ts"/>
var Game;
(function (Game) {
    var med;
    (function (med) {
        med.spr = [];
        med.concom[1].push(function (i) {
            med.spr[i] = new Engine.Sprite();
            med.spr[i].enabled = true;
        });
        med.rescom[1].push(function () {
            for (var i = 0; i < med.cou; i++) {
                med.spr[i].x = med.def[i].instance.x;
                med.spr[i].y = med.def[i].instance.y;
                med.spr[i].xMirror = med.def[i].flip.x;
                med.spr[i].yMirror = med.def[i].flip.y;
            }
        });
        med.dracom[1].push(function () {
            for (var i = 0; i < med.cou; i++) {
                med.spr[i].x = med.hordrapos[i];
                med.spr[i].y = med.verdrapos[i];
                med.spr[i].render();
            }
        });
    })(med = Game.med || (Game.med = {}));
})(Game || (Game = {}));
///<reference path="../../ExtEntity.ts"/>
var Game;
(function (Game) {
    var obs;
    (function (obs) {
        obs.cou = 0;
        function onClearScene() {
            obs.cou = 0;
        }
        obs.onClearScene = onClearScene;
        var cla = /** @class */ (function (_super) {
            __extends(cla, _super);
            function cla(def) {
                var _this = _super.call(this, def) || this;
                onConstructor(_this, Game.obs);
                return _this;
            }
            cla.prototype.onSetFrame = function (_, __, fra) { onSetFrame(this.ind, fra); };
            return cla;
        }(Game.ExtEntity));
        obs.cla = cla;
        function getpro(i, nam) {
            return obs.ins[i].getProperty(nam);
        }
        obs.getpro = getpro;
        obs.stacou = 0;
        obs.sta = [];
        obs.consta = [];
        obs.ressta = [];
        obs.begsta = [];
        obs.movsta = [];
        obs.updsta = [];
        obs.linsta = [];
        function maksta() {
            function nul(_) { }
            ;
            obs.consta.push(nul);
            obs.ressta.push(nul);
            obs.begsta.push(nul);
            obs.movsta.push(nul);
            obs.updsta.push(nul);
            obs.linsta.push(nul);
            return obs.stacou++;
        }
        obs.maksta = maksta;
        maksta();
        obs.ins = [];
        obs.def = [];
        obs.concom = [[], [], []];
        function onConstructor(obj, nam) {
            obs.ins[obs.cou] = obj;
            obs.def[obs.cou] = obj.def;
            obs.concom.forEach(function (x) { return x.forEach(function (y) { return y(obs.cou); }); });
            obs.consta.forEach(function (x) { return x(obs.cou); });
            if (obs.cou == 0)
                Engine.System.addListenersFrom(nam);
            obj.ind = obs.cou++;
        }
        obs.onConstructor = onConstructor;
        obs.rescom = [[], [], []];
        function onReset() {
            obs.rescom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < obs.cou; i++)
                obs.sta[i] = 0;
            for (var i = 0; i < obs.cou; i++)
                obs.ressta.forEach(function (x) { return x(i); });
        }
        obs.onReset = onReset;
        obs.begcom = [[], [], []];
        function onStart() {
            obs.begcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < obs.cou; i++)
                obs.begsta.forEach(function (x) { return x(i); });
            for (var i = 0; i < obs.cou; i++)
                obs.linsta.forEach(function (x) { return x(i); });
        }
        obs.onStart = onStart;
        obs.movcom = [[], [], []];
        function onMoveUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            obs.movcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < obs.cou; i++)
                obs.movsta[obs.sta[i]](i);
        }
        obs.onMoveUpdate = onMoveUpdate;
        obs.stecom = [[], [], []];
        function onStepUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            obs.stecom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            for (var i = 0; i < obs.cou; i++)
                obs.updsta[obs.sta[i]](i);
            for (var i = 0; i < obs.cou; i++)
                obs.linsta[obs.sta[i]](i);
        }
        obs.onStepUpdate = onStepUpdate;
        obs.anicom = [[], [], []];
        function onSetFrame(i, fra) {
            obs.anicom.forEach(function (x) { return x.forEach(function (y) { return y(i, fra); }); });
        }
        obs.onSetFrame = onSetFrame;
        obs.timcom = [[], [], []];
        function onTimeUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            obs.timcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        obs.onTimeUpdate = onTimeUpdate;
        obs.dracom = [[], [], []];
        function onDrawObjects() {
            obs.dracom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        obs.onDrawObjects = onDrawObjects;
    })(obs = Game.obs || (Game.obs = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var obs;
    (function (obs) {
        Game.addAction("preconfigure", function () { obs.fra = Game.FrameSelector.complex("obs", Game.Resources.texgam, 548, 619); });
        var cli;
        Game.addAction("configure", function () { cli = new Utils.Animation("asc", true, obs.fra, 9, [0, 1, 2, 1], null); });
        obs.ani = [];
        obs.concom[1].push(function (i) {
            obs.ani[i] = new Utils.Animator();
            obs.ani[i].owner = obs.ani[i].listener = obs.ins[i];
        });
        obs.rescom[1].push(function () {
            for (var i = 0; i < obs.cou; i++)
                obs.ani[i].setAnimation(cli);
        });
        obs.anicom[1].push(function (i, fra) {
            fra.applyToSprite(obs.spr[i]);
            obs.spr[i].yOffset += obs.spr[i].yMirror ? obs.box[i].ySize : 0;
        });
    })(obs = Game.obs || (Game.obs = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var obs;
    (function (obs) {
        obs.box = [];
        obs.concom[1].push(function (i) {
            obs.box[i] = new Engine.Box();
            obs.box[i].enabled = obs.box[i].renderable = true;
            obs.fra[0].applyToBox(obs.box[i]);
            Game.SceneMap.instance.boxesEnemies.push(obs.box[i]);
        });
        obs.rescom[1].push(function () {
            for (var i = 0; i < obs.cou; i++) {
                obs.box[i].enabled = true;
                obs.box[i].x = obs.def[i].instance.x;
                obs.box[i].y = obs.def[i].instance.y;
            }
        });
        obs.dracom[2].push(function () {
            for (var i = 0; i < obs.cou; i++)
                obs.box[i].renderAt(obs.box[i].x, obs.box[i].y + obs.wav[i]);
        });
    })(obs = Game.obs || (Game.obs = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var obs;
    (function (obs) {
        obs.concom[0].push(function (i) {
            obs.def[i].instance.x += Game.SceneMap.instance.xSizeTile * 0.5;
            obs.def[i].instance.y -= Game.SceneMap.instance.ySizeTile * 0.5;
        });
    })(obs = Game.obs || (Game.obs = {}));
})(Game || (Game = {}));
///<reference path="../obs.ts"/>
var Game;
(function (Game) {
    var obs;
    (function (obs) {
        obs.spr = [];
        obs.concom[1].push(function (i) {
            obs.spr[i] = new Engine.Sprite();
            obs.spr[i].enabled = true;
            obs.spr[i].xMirror = obs.def[i].flip.x;
            obs.fra[0].applyToSprite(obs.spr[i]);
        });
        obs.rescom[1].push(function () {
            for (var i = 0; i < obs.cou; i++) {
                obs.spr[i].x = obs.def[i].instance.x;
                obs.spr[i].y = obs.def[i].instance.y;
            }
        });
        obs.dracom[1].push(function () {
            for (var i = 0; i < obs.cou; i++)
                obs.spr[i].renderAt(obs.spr[i].x, obs.spr[i].y + obs.wav[i]);
        });
    })(obs = Game.obs || (Game.obs = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var obs;
    (function (obs) {
        var vel = [];
        var dis = [];
        var ang = [];
        obs.wav = [];
        obs.concom[1].push(function (i) {
            vel[i] = obs.ins[i].getProperty("wavvel");
            dis[i] = obs.ins[i].getProperty("wavdis");
        });
        obs.rescom[1].push(function () {
            for (var i = 0; i < obs.cou; i++) {
                obs.wav[i] = 0;
                ang[i] = 0;
            }
        });
        obs.stecom[1].push(function () {
            for (var i = 0; i < obs.cou; i++)
                ang[i] += vel[i];
        });
        obs.timcom[1].push(function () {
            for (var i = 0; i < obs.cou; i++)
                obs.wav[i] = Math.sin(ang[i] + vel[i] * Engine.System.stepExtrapolation) * dis[i];
        });
    })(obs = Game.obs || (Game.obs = {}));
})(Game || (Game = {}));
///<reference path="../../ExtEntity.ts"/>
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        var cla = /** @class */ (function (_super) {
            __extends(cla, _super);
            function cla(def) {
                var _this = _super.call(this, def) || this;
                _this.platformParent = null;
                onConstructor(_this, Game.pla);
                return _this;
            }
            cla.prototype.xMoveOnPlatform = function (_dis) { };
            cla.prototype.yMoveOnPlatform = function (_dis) { };
            cla.prototype.onPlatformOverlapX = function () { };
            cla.prototype.onPlatformOverlapY = function () { };
            return cla;
        }(Game.ExtEntity));
        pla.cla = cla;
        function getpro(nam) {
            return pla.ins.getProperty(nam);
        }
        pla.getpro = getpro;
        pla.stacou = 0;
        pla.sta = 0;
        pla.consta = [];
        pla.ressta = [];
        pla.begsta = [];
        pla.movsta = [];
        pla.updsta = [];
        pla.linsta = [];
        function maksta() {
            function nul() { }
            ;
            pla.consta.push(nul);
            pla.ressta.push(nul);
            pla.begsta.push(nul);
            pla.movsta.push(nul);
            pla.updsta.push(nul);
            pla.linsta.push(nul);
            return pla.stacou++;
        }
        pla.maksta = maksta;
        maksta();
        pla.concom = [[], [], []];
        function onConstructor(obj, nam) {
            pla.ins = obj;
            pla.def = obj.def;
            pla.concom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            pla.consta.forEach(function (x) { return x(); });
            Engine.System.addListenersFrom(nam);
        }
        pla.onConstructor = onConstructor;
        pla.rescom = [[], [], []];
        function onReset() {
            pla.sta = 0;
            pla.rescom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            pla.ressta.forEach(function (x) { return x(); });
        }
        pla.onReset = onReset;
        pla.begcom = [[], [], []];
        function onStart() {
            pla.begcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            pla.begsta.forEach(function (x) { return x(); });
            pla.linsta.forEach(function (x) { return x(); });
        }
        pla.onStart = onStart;
        pla.movcom = [[], [], []];
        function onMoveUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            pla.movcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            pla.movsta[pla.sta]();
        }
        pla.onMoveUpdate = onMoveUpdate;
        pla.stecom = [[], [], []];
        function onStepUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            pla.stecom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
            pla.updsta[pla.sta]();
            pla.linsta[pla.sta]();
        }
        pla.onStepUpdate = onStepUpdate;
        pla.anicom = [[], [], []];
        function onSetFrame(_, __, fra) {
            pla.anicom.forEach(function (x) { return x.forEach(function (y) { return y(fra); }); });
        }
        pla.onSetFrame = onSetFrame;
        pla.timcom = [[], [], []];
        function onTimeUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            pla.timcom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        pla.onTimeUpdate = onTimeUpdate;
        pla.dracom = [[], [], []];
        function onDrawPlayerUnpaused() {
            if (!Game.SceneFreezer.stoped)
                pla.dracom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        pla.onDrawPlayerUnpaused = onDrawPlayerUnpaused;
        function onDrawPlayerPaused() {
            if (Game.SceneFreezer.stoped)
                pla.dracom.forEach(function (x) { return x.forEach(function (y) { return y(); }); });
        }
        pla.onDrawPlayerPaused = onDrawPlayerPaused;
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var ANIM_STAND;
    var FRAMES;
    Game.addAction("init", function () {
        if (Game.plu)
            FRAMES = Game.FrameSelector.complex("player sprites", Game.Resources.texgam, 446, 819);
        else
            FRAMES = Game.FrameSelector.complex("player sprites", Game.Resources.texgam, 428, 602);
        ANIM_STAND = new Utils.Animation("stand", true, FRAMES, 10, [1, 2, 3, 2], null);
    });
    var plamen = /** @class */ (function (_super) {
        __extends(plamen, _super);
        function plamen(def) {
            var _this = _super.call(this, def) || this;
            _this.sprite = new Engine.Sprite();
            _this.animator = new Utils.Animator();
            _this.sprite.enabled = true;
            _this.sprite.x = def.instance.x + 4;
            _this.sprite.y = def.instance.y;
            _this.animator.owner = _this;
            _this.animator.listener = _this;
            _this.animator.setAnimation(ANIM_STAND);
            var box = new Engine.Box();
            box.x = _this.sprite.x;
            box.y = _this.sprite.y;
            Game.bub.mak(0, box, 10, 1, 60, 3.0, 1.5, 0, -3, 0.1, 1, 0.01, 0.3, 0.05, 0.022);
            return _this;
        }
        plamen.prototype.onSetFrame = function (_animator, _animation, _frame) {
            _frame.applyToSprite(this.sprite);
        };
        plamen.prototype.onDrawPlayerUnpaused = function () {
            if (!Game.SceneFreezer.stoped) {
                this.sprite.render();
            }
        };
        plamen.prototype.onDrawPlayerPaused = function () {
            if (Game.SceneFreezer.stoped) {
                this.sprite.render();
            }
        };
        return plamen;
    }(Game.Entity));
    Game.plamen = plamen;
})(Game || (Game = {}));
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        pla.concom[1].push(function () {
            pla.ani = new Utils.Animator();
            pla.ani.enabled = true;
            pla.ani.owner = pla.ani.listener = Game.pla;
        });
        pla.rescom[1].push(function () {
            pla.ani.enabled = true;
        });
        pla.anicom[1].push(function (fra) {
            fra.applyToSprite(pla.spr);
            pla.spr.yOffset += pla.spr.yMirror ? 0 : pla.box.ySize;
        });
        pla.timcom[1].push(function () {
            pla.ani.setCurrentFrame();
        });
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        pla.concom[1].push(function () {
            pla.bubind = Game.bub.mak(0, pla.box, 10, 1, 60, 3.0, 1.5, 0, pla.box.ySize * 0.5, 0.1, 1, 0.01, 0.3, 0.05, 0.022);
        });
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        pla.concom[1].push(function () {
            pla.horcam = Game.SceneMap.instance.xSizeMap * 0.5;
            pla.vercam = Game.SceneMap.instance.ySizeMap * 0.5;
        });
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        pla.concom[0].push(function () {
            pla.def.instance.x += Game.SceneMap.instance.xSizeTile * 0.5;
            pla.def.instance.y -= pla.def.flip.y ? Game.SceneMap.instance.ySizeTile : pla.box.ySize;
        });
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        Game.addAction("preinit", function () {
            if (Game.plu)
                pla.fra = Game.FrameSelector.complex("Player", Game.Resources.texgam, 446, 819);
            else
                pla.fra = Game.FrameSelector.complex("Player", Game.Resources.texgam, 428, 602);
        });
        pla.spr = new Engine.Sprite();
        pla.rescom[1].push(function () {
            pla.spr.enabled = true;
            pla.spr.xMirror = pla.def.flip.x;
            pla.spr.yMirror = pla.def.flip.y;
            pla.spr.x = pla.def.instance.x;
            pla.spr.y = pla.def.instance.y;
        });
        pla.stecom[1].push(function () {
            pla.spr.xMirror = pla.horvel == 0 ? pla.spr.xMirror : pla.horvel < 0;
        });
        pla.dracom[1].push(function () {
            pla.spr.x = pla.ext.x;
            pla.spr.y = pla.ext.y;
            pla.spr.render();
            pla.box.renderAt(pla.ext.x, pla.ext.y);
        });
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        pla.inpvel = 0.65;
        pla.concom[1].push(function () {
            pla.LeftControl.condes();
            pla.LeftControl.contou();
            pla.RightControl.condes();
            pla.RightControl.contou();
            pla.JumpControl.condes();
            pla.JumpControl.contou();
        });
        pla.rescom[1].push(function () {
            pla.inpmov = true;
            pla.inpvelsca = 1;
        });
        pla.stecom[0].push(function () {
            pla.horvel = (pla.inpmov ? pla.inpvelsca : 0) * (pla.LeftControl.inp.down ? -pla.inpvel : 0) * (pla.RightControl.inp.down ? 0 : 1);
            pla.horvel += (pla.inpmov ? pla.inpvelsca : 0) * (pla.RightControl.inp.down ? pla.inpvel : 0);
        });
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        var ObjectParticle = /** @class */ (function (_super) {
            __extends(ObjectParticle, _super);
            function ObjectParticle(emitter) {
                var _this = _super.call(this, emitter) || this;
                _this.countSteps = 0;
                _this.parentRelative = false;
                return _this;
            }
            Object.defineProperty(ObjectParticle.prototype, "xRange", {
                get: function () {
                    return 0;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(ObjectParticle.prototype, "yRange", {
                get: function () {
                    return 0;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(ObjectParticle.prototype, "xRangeVel", {
                get: function () {
                    //return 0;
                    if (this.index == 0 || this.index == 1) {
                        return 1;
                    }
                    else {
                        return -1;
                    }
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(ObjectParticle.prototype, "yRangeVel", {
                get: function () {
                    //return 0;
                    if (this.index == 0 || this.index == 2) {
                        return 1;
                    }
                    else {
                        return -1;
                    }
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(ObjectParticle.prototype, "xRangeAccel", {
                get: function () {
                    return 0;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(ObjectParticle.prototype, "yRangeAccel", {
                get: function () {
                    return 0;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(ObjectParticle.prototype, "rangeLife", {
                get: function () {
                    return 300;
                },
                enumerable: false,
                configurable: true
            });
            ObjectParticle.prototype.onReset = function () {
                _super.prototype.onReset.call(this);
                this.countSteps = 0;
            };
            ObjectParticle.prototype.emitt = function (index) {
                _super.prototype.emitt.call(this, index);
                this.frames[0].applyToSprite(this.sprite);
            };
            ObjectParticle.prototype.onStepUpdate = function () {
                _super.prototype.onStepUpdate.call(this);
                if (this.enabled && !Game.SceneFreezer.stoped) {
                    //return;
                    if (this.countSteps == ObjectParticle.STEPS) {
                        this.frames[1].applyToSprite(this.sprite);
                    }
                    else if (this.countSteps == ObjectParticle.STEPS * 2) {
                        this.frames[2].applyToSprite(this.sprite);
                    }
                    else if (this.countSteps == ObjectParticle.STEPS * 3) {
                        this.frames[3].applyToSprite(this.sprite);
                    }
                    this.countSteps += 1;
                }
            };
            ObjectParticle.STEPS = 4;
            return ObjectParticle;
        }(Game.Emission.SimpleParticle));
        pla.ObjectParticle = ObjectParticle;
        var FRAMES_GOAL;
        Game.addAction("configure", function () {
            if (Game.plu)
                FRAMES_GOAL = Game.FrameSelector.complex("dead particles", Game.Resources.texgam, 631, 839);
            else
                FRAMES_GOAL = Game.FrameSelector.complex("dead particles", Game.Resources.texgam, 849, 236);
        });
        var deapar = /** @class */ (function (_super) {
            __extends(deapar, _super);
            function deapar(emitter) {
                var _this = _super.call(this, emitter) || this;
                _this.frames = FRAMES_GOAL;
                return _this;
            }
            deapar.prototype.onDrawLance = function () { this.sprite.render(); };
            deapar.prototype.onDrawParticles = function () { };
            deapar.prototype.onDrawParticlesBack = function () { };
            return deapar;
        }(ObjectParticle));
        pla.deapar = deapar;
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
/*
namespace Game.pla{
var pau:boolean;
concom[1].push(function(){
    pau=true;
});
stecom[1].push(function(){
    if(pau!=(SceneFreezer.stoped||(Level.practice&&Level.practiceFinished))){
        pau=SceneFreezer.stoped||(Level.practice&&Level.practiceFinished);
        if(pau)triggerActions("gameplayStop");
        else triggerActions("gameplayStart");
    }
});}
*/ 
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        pla.box = new Engine.Box();
        pla.box.xSize = 7;
        pla.box.ySize = 6;
        pla.box.xOffset = -3.5;
        pla.box.renderable = true;
        pla.maxvervel = 1.0;
        pla.gra = 0.03;
        pla.concom[1].push(function () {
            Game.Platform.sol.push(pla.box);
        });
        pla.rescom[1].push(function () {
            pla.box.enabled = true;
            pla.box.x = pla.def.instance.x;
            pla.box.y = pla.def.instance.y;
            pla.horvel = 0;
            pla.vervel = 0;
            pla.movdir = pla.def.flip.x ? -1 : 1;
            pla.grasca = 1;
            pla.gradir = pla.def.flip.y ? -1 : 1;
            pla.horhit = null;
            pla.verhit = null;
            pla.horhitdir = 0;
            pla.verhitdir = 0;
            pla.horextvel = 0;
            pla.verextvel = 0;
        });
        pla.movcom[1].push(function () {
            pla.horhit = pla.box.cast(Game.SceneMap.instance.boxesSolids, null, true, pla.horvel, pla.horvel != 0, Engine.Box.LAYER_ALL);
            pla.box.translate(pla.horhit, true, pla.horvel, true);
            pla.horhitdir = pla.horhit == null ? 0 : (pla.horvel < 0 ? -1 : 1);
            //xvel=xhit!=null?0:xvel;
            pla.horvel = 0;
            pla.vervel += pla.gra * pla.grasca * pla.gradir;
            pla.vervel = pla.vervel > pla.maxvervel ? pla.maxvervel : pla.vervel;
            pla.verhit = pla.box.cast(Game.SceneMap.instance.boxesSolids, null, false, pla.vervel == 0 ? pla.gradir : pla.vervel, pla.vervel != 0, Engine.Box.LAYER_ALL);
            pla.box.translate(pla.verhit, false, pla.vervel, true);
            pla.verhitdir = pla.verhit == null ? 0 : (pla.vervel < 0 ? -1 : 1);
            pla.vervel = pla.verhit != null ? 0 : pla.vervel;
        });
        pla.timcom[1].push(function () {
            pla.horextvel = (pla.horextvel + pla.horvel) * (Game.SceneFreezer.stoped ? 0 : 1);
            pla.verextvel = (pla.verextvel + pla.vervel) * (Game.SceneFreezer.stoped ? 0 : 1);
            pla.ext = pla.box.getExtrapolation(Game.SceneMap.instance.boxesSolids, pla.horextvel, pla.verextvel, true);
            pla.horextvel = 0;
            pla.verextvel = 0;
        });
        pla.dracom[2].push(function () {
            pla.box.renderAt(pla.ext.x, pla.ext.y);
        });
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
/*
namespace Game.Player{
var pla:Platform;
export function respla(){
    pla=null;
}
export function movpla(){
    if(yhitdir==gradir){
        for(var hit of yhit){
            var nexpla=null;
            if(hit.other.data instanceof Platform){
                nexpla=hit.other.data;
                if(hit.other.data==pla)break;
            }
        }
        pla=nexpla;
        if(pla!=null){
            pla.chi.push(box);
        }
    }
    else pla=null;
}
export function timpla(){
    if(pla!=null){
        horextvel+=pla.xvelmov()/Engine.Box.UNIT;
        verextvel+=pla.yvelmov()/Engine.Box.UNIT;
    }
}}
*/ 
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        var JumpControl;
        (function (JumpControl) {
            JumpControl.preserved = false;
            JumpControl.ste = 5;
            function condes() {
                JumpControl.inp = new Game.Control();
                JumpControl.inp.enabled = true;
                JumpControl.inp.freezeable = true;
                JumpControl.inp.listener = JumpControl;
                JumpControl.inp.useKeyboard = true;
                JumpControl.inp.newInteractionRequired = false;
                JumpControl.inp.useMouse = false;
                JumpControl.inp.mouseButtons = [0];
                JumpControl.inp.keys = [Engine.Keyboard.W, Engine.Keyboard.U, Engine.Keyboard.UP, Engine.Keyboard.SPACE, "spacebar", "Space", "space", " "];
                Engine.System.addListenersFrom(JumpControl);
            }
            JumpControl.condes = condes;
            function onReset() {
                JumpControl.cou = 0;
            }
            JumpControl.onReset = onReset;
            function onStepUpdate() {
                if (!Game.SceneFreezer.stoped) {
                    JumpControl.cou--;
                    JumpControl.cou = JumpControl.inp.pressed ? JumpControl.ste : JumpControl.cou;
                }
            }
            JumpControl.onStepUpdate = onStepUpdate;
        })(JumpControl = pla.JumpControl || (pla.JumpControl = {}));
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        var JumpControl;
        (function (JumpControl) {
            var fra;
            Game.addAction("configure", function () {
                if (Game.plu)
                    fra = Game.FrameSelector.complex("JumpControl", Game.Resources.texgam, 178, 818);
                else
                    fra = Game.FrameSelector.complex("JumpControl", Game.Resources.texgam, 491, 269);
            });
            function contou() {
                if (Game.IS_TOUCH) {
                    JumpControl.inp.useTouch = true;
                    JumpControl.inp.bounds = new Engine.Sprite();
                    JumpControl.inp.bounds.enabled = true;
                    JumpControl.inp.bounds.pinned = true;
                    fra[0].applyToSprite(JumpControl.inp.bounds);
                    JumpControl.inp.listener = JumpControl;
                    JumpControl.inp.onPressedDelegate = function () { fra[1].applyToSprite(JumpControl.inp.bounds); };
                    JumpControl.inp.onReleasedDelegate = function () { fra[0].applyToSprite(JumpControl.inp.bounds); };
                }
            }
            JumpControl.contou = contou;
            function onViewUpdate() {
                if (Game.IS_TOUCH) {
                    JumpControl.inp.bounds.x = Engine.Renderer.xSizeView * 0.5 - JumpControl.inp.bounds.xSize;
                    JumpControl.inp.bounds.y = Math.floor(Engine.Renderer.ySizeView * 0.5 - JumpControl.inp.bounds.ySize) + 1;
                }
            }
            JumpControl.onViewUpdate = onViewUpdate;
            function onDrawControlsUnpaused() {
                if (Game.IS_TOUCH && !Game.SceneFreezer.stoped)
                    JumpControl.inp.bounds.render();
            }
            JumpControl.onDrawControlsUnpaused = onDrawControlsUnpaused;
            function onDrawControlsPaused() {
                if (Game.IS_TOUCH && Game.SceneFreezer.stoped)
                    JumpControl.inp.bounds.render();
            }
            JumpControl.onDrawControlsPaused = onDrawControlsPaused;
        })(JumpControl = pla.JumpControl || (pla.JumpControl = {}));
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        var LeftControl;
        (function (LeftControl) {
            LeftControl.preserved = false;
            function condes() {
                LeftControl.inp = new Game.Control();
                LeftControl.inp.enabled = true;
                LeftControl.inp.freezeable = true;
                LeftControl.inp.listener = LeftControl;
                LeftControl.inp.useKeyboard = true;
                LeftControl.inp.newInteractionRequired = false;
                LeftControl.inp.useMouse = false;
                LeftControl.inp.mouseButtons = [0];
                LeftControl.inp.keys = [Engine.Keyboard.A, Engine.Keyboard.LEFT];
                Engine.System.addListenersFrom(LeftControl);
            }
            LeftControl.condes = condes;
        })(LeftControl = pla.LeftControl || (pla.LeftControl = {}));
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        var LeftControl;
        (function (LeftControl) {
            var fra;
            Game.addAction("configure", function () {
                if (Game.plu)
                    fra = Game.FrameSelector.complex("LeftControl", Game.Resources.texgam, 0, 818);
                else
                    fra = Game.FrameSelector.complex("LeftControl", Game.Resources.texgam, 313, 269);
            });
            function contou() {
                if (Game.IS_TOUCH) {
                    LeftControl.inp.useTouch = true;
                    LeftControl.inp.bounds = new Engine.Sprite();
                    LeftControl.inp.bounds.enabled = true;
                    LeftControl.inp.bounds.pinned = true;
                    fra[0].applyToSprite(LeftControl.inp.bounds);
                    LeftControl.inp.listener = LeftControl;
                    LeftControl.inp.onPressedDelegate = function () { fra[1].applyToSprite(LeftControl.inp.bounds); };
                    LeftControl.inp.onReleasedDelegate = function () { fra[0].applyToSprite(LeftControl.inp.bounds); };
                }
            }
            LeftControl.contou = contou;
            function onViewUpdate() {
                if (Game.IS_TOUCH) {
                    LeftControl.inp.bounds.x = -Engine.Renderer.xSizeView * 0.5;
                    LeftControl.inp.bounds.y = Math.floor(Engine.Renderer.ySizeView * 0.5 - LeftControl.inp.bounds.ySize) + 1;
                }
            }
            LeftControl.onViewUpdate = onViewUpdate;
            function onDrawControlsUnpaused() {
                if (Game.IS_TOUCH && !Game.SceneFreezer.stoped)
                    LeftControl.inp.bounds.render();
            }
            LeftControl.onDrawControlsUnpaused = onDrawControlsUnpaused;
            function onDrawControlsPaused() {
                if (Game.IS_TOUCH && Game.SceneFreezer.stoped)
                    LeftControl.inp.bounds.render();
            }
            LeftControl.onDrawControlsPaused = onDrawControlsPaused;
        })(LeftControl = pla.LeftControl || (pla.LeftControl = {}));
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        var RightControl;
        (function (RightControl) {
            RightControl.preserved = false;
            function condes() {
                RightControl.inp = new Game.Control();
                RightControl.inp.enabled = true;
                RightControl.inp.freezeable = true;
                RightControl.inp.listener = RightControl;
                RightControl.inp.useKeyboard = true;
                RightControl.inp.newInteractionRequired = false;
                RightControl.inp.useMouse = false;
                RightControl.inp.mouseButtons = [0];
                RightControl.inp.keys = [Engine.Keyboard.D, Engine.Keyboard.RIGHT];
                Engine.System.addListenersFrom(RightControl);
            }
            RightControl.condes = condes;
        })(RightControl = pla.RightControl || (pla.RightControl = {}));
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        var RightControl;
        (function (RightControl) {
            var fra;
            Game.addAction("configure", function () {
                if (Game.plu)
                    fra = Game.FrameSelector.complex("RightControl", Game.Resources.texgam, 90, 818);
                else
                    fra = Game.FrameSelector.complex("RightControl", Game.Resources.texgam, 403, 269);
            });
            function contou() {
                if (Game.IS_TOUCH) {
                    RightControl.inp.useTouch = true;
                    RightControl.inp.bounds = new Engine.Sprite();
                    RightControl.inp.bounds.enabled = true;
                    RightControl.inp.bounds.pinned = true;
                    fra[0].applyToSprite(RightControl.inp.bounds);
                    RightControl.inp.listener = RightControl;
                    RightControl.inp.onPressedDelegate = function () { fra[1].applyToSprite(RightControl.inp.bounds); };
                    RightControl.inp.onReleasedDelegate = function () { fra[0].applyToSprite(RightControl.inp.bounds); };
                }
            }
            RightControl.contou = contou;
            function onViewUpdate() {
                if (Game.IS_TOUCH) {
                    RightControl.inp.bounds.x = Math.floor(pla.LeftControl.inp.bounds.x + pla.LeftControl.inp.bounds.xSize);
                    RightControl.inp.bounds.y = Math.floor(Engine.Renderer.ySizeView * 0.5 - RightControl.inp.bounds.ySize) + 1;
                }
            }
            RightControl.onViewUpdate = onViewUpdate;
            function onDrawControlsUnpaused() {
                if (Game.IS_TOUCH && !Game.SceneFreezer.stoped)
                    RightControl.inp.bounds.render();
            }
            RightControl.onDrawControlsUnpaused = onDrawControlsUnpaused;
            function onDrawControlsPaused() {
                if (Game.IS_TOUCH && Game.SceneFreezer.stoped)
                    RightControl.inp.bounds.render();
            }
            RightControl.onDrawControlsPaused = onDrawControlsPaused;
        })(RightControl = pla.RightControl || (pla.RightControl = {}));
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
///<reference path="../pla.ts"/>
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        var staasc = pla.maksta();
        var sou;
        var sousta = 10;
        var sourep = 35;
        Game.addAction("init", function () { pla.asccli = new Utils.Animation("asc", true, pla.fra, 8, [13, 14, 13, 12], null); });
        function entasc() {
            if (pla.JumpControl.inp.down) {
                pla.ani.setAnimation(pla.asccli);
                sou = sousta;
                pla.sta = staasc;
                return true;
            }
            return false;
        }
        pla.entasc = entasc;
        pla.updsta[staasc] = function () {
            if (pla.JumpControl.inp.down)
                pla.vervel = -0.5;
            else if (pla.vervel < -0.1)
                pla.vervel = -0.1;
            if (sou-- == 0) {
                Game.Resources.audjum.play();
                sou = sourep;
            }
        };
        pla.linsta[staasc] = function () {
            if (pla.entlos())
                return;
            if (pla.entfal())
                return;
            if (pla.entlan())
                return;
        };
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
///<reference path="../pla.ts"/>
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        var stafal = pla.maksta();
        var cli;
        Game.addAction("init", function () { cli = new Utils.Animation("fal", false, pla.fra, 4, [9, 10, 11], null); });
        function setfal() {
            pla.ani.setAnimation(cli);
            pla.sta = stafal;
        }
        pla.setfal = setfal;
        function entfal() {
            if (pla.verhitdir == 0 && Game.dir(pla.vervel) == pla.gradir) {
                setfal();
                return true;
            }
            return false;
        }
        pla.entfal = entfal;
        pla.linsta[stafal] = function () {
            if (pla.entlos())
                return;
            if (pla.entasc())
                return;
            if (pla.entlan())
                return;
        };
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
///<reference path="../pla.ts"/>
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        var staidl = pla.maksta();
        var cli;
        Game.addAction("init", function () { cli = new Utils.Animation("idl", true, pla.fra, 10, [1, 2, 3, 2], null); });
        pla.ressta[staidl] = function () {
            if (!pla.def.flip.y)
                setidl();
        };
        function setidl() {
            pla.ani.setAnimation(cli);
            pla.sta = staidl;
        }
        pla.setidl = setidl;
        function entidl() {
            if (!pla.LeftControl.inp.down && !pla.RightControl.inp.down) {
                setidl();
                return true;
            }
            return false;
        }
        pla.entidl = entidl;
        pla.linsta[staidl] = function () {
            if (pla.entlos())
                return;
            if (pla.entasc())
                return;
            if (pla.entfal())
                return;
            if (pla.entwal())
                return;
        };
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
///<reference path="../pla.ts"/>
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        var stalan = pla.maksta();
        var cli;
        Game.addAction("init", function () { cli = new Utils.Animation("lan", false, pla.fra, 3, [2, 3, 2], null); });
        function entlan() {
            if (Game.dir(pla.verhitdir) == Game.dir(pla.gradir)) {
                pla.ani.setAnimation(cli);
                pla.sta = stalan;
                pla.linsta[stalan]();
                return true;
            }
            return false;
        }
        pla.entlan = entlan;
        function endlan() {
            return pla.ani.ended;
        }
        pla.endlan = endlan;
        pla.linsta[stalan] = function () {
            if (pla.entlos())
                return;
            if (pla.entasc())
                return;
            if (pla.entfal())
                return;
            if (pla.entwal())
                return;
            if (endlan()) {
                pla.setidl();
                return;
            }
        };
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        var stalos = pla.maksta();
        var stecou;
        var maxste = 26;
        var emi;
        pla.consta[stalos] = function () {
            emi = new Game.Emission.Emitter(pla.deapar, 8);
            emi.sizeEmission = 4;
        };
        pla.ressta[stalos] = function () {
            pla.los = false;
            pla.haslos = false;
            stecou = 0;
        };
        function entlos() {
            if (pla.box.collide(Game.SceneMap.instance.boxesEnemies) != null || pla.box.collide(Game.SceneMap.instance.boxesSolids) != null) {
                pla.los = true;
                pla.spr.enabled = false;
                pla.grasca = 0;
                pla.horvel = 0;
                pla.vervel = 0;
                pla.box.enabled = false;
                Game.Resources.auddea.play();
                emi.x = pla.box.x;
                emi.y = pla.box.y + pla.box.ySize * 0.5;
                emi.emittChunk();
                Game.bub.ena[pla.bubind] = false;
                pla.sta = stalos;
                return true;
            }
            return false;
        }
        pla.entlos = entlos;
        pla.updsta[stalos] = function () {
            pla.haslos = stecou++ > maxste;
        };
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
///<reference path="../pla.ts"/>
var Game;
(function (Game) {
    var pla;
    (function (pla) {
        var stawal = pla.maksta();
        var cli;
        Game.addAction("init", function () { cli = new Utils.Animation("wal", true, pla.fra, 7, [5, 6, 5, 4], null); });
        function entwal() {
            if (pla.LeftControl.inp.down || pla.RightControl.inp.down) {
                pla.ani.setAnimation(cli);
                pla.sta = stawal;
                return true;
            }
            return false;
        }
        pla.entwal = entwal;
        pla.linsta[stawal] = function () {
            if (pla.entlos())
                return;
            if (pla.entasc())
                return;
            if (pla.entfal())
                return;
            if (pla.entidl())
                return;
        };
    })(pla = Game.pla || (Game.pla = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var Spike;
    (function (Spike) {
        Spike.preserved = false;
        Spike.ins = [];
        Spike.def = [];
        Spike.cou = 0;
        function onClearScene() { Spike.cou = 0; }
        Spike.onClearScene = onClearScene;
        var Instance = /** @class */ (function (_super) {
            __extends(Instance, _super);
            function Instance(_df) {
                var _this = _super.call(this, _df) || this;
                Spike.ins[Spike.cou] = _this;
                Spike.def[Spike.cou] = _df;
                Spike.conani(Spike.cou);
                Spike.conphy(Spike.cou);
                Spike.conspr(Spike.cou);
                Spike.conove(Spike.cou);
                if (Spike.cou == 0)
                    Engine.System.addListenersFrom(Game.Spike);
                _this.ind = Spike.cou++;
                return _this;
            }
            Instance.prototype.onSetFrame = function (_, __, fra) {
                Spike.fraani(this.ind, fra);
                Spike.fraove(this.ind, fra);
            };
            return Instance;
        }(Game.Entity));
        Spike.Instance = Instance;
        function onReset() {
            Spike.resphy();
            Spike.resspr();
            Spike.resani();
            Spike.resove();
        }
        Spike.onReset = onReset;
        function onStart() {
            Spike.stapla();
        }
        Spike.onStart = onStart;
        function onMoveUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
            Spike.movove();
            Spike.movpla();
        }
        Spike.onMoveUpdate = onMoveUpdate;
        function onStepUpdate() {
            if (Game.SceneFreezer.stoped)
                return;
        }
        Spike.onStepUpdate = onStepUpdate;
        function onTimeUpdate() {
            Spike.timpla();
            Spike.timphy();
            Spike.timspr();
            Spike.timove();
        }
        Spike.onTimeUpdate = onTimeUpdate;
        function onDrawObjects() {
            Spike.draspr();
            Spike.draphy();
            Spike.draove();
        }
        Spike.onDrawObjects = onDrawObjects;
    })(Spike = Game.Spike || (Game.Spike = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var Spike;
    (function (Spike) {
        Spike.fra = [];
        Spike.anispr = [];
        Spike.ani = [];
        Spike.fra = [];
        Game.addAction("configure", function () {
            if (Game.plu) {
                Spike.fra[0] = Game.FrameSelector.complex("spi000", Game.Resources.texgam, 446, 852);
                Spike.fra[1] = Game.FrameSelector.complex("spi090", Game.Resources.texgam, 498, 852);
                Spike.fra[2] = Game.FrameSelector.complex("spi180", Game.Resources.texgam, 550, 852);
                Spike.fra[3] = Game.FrameSelector.complex("spi270", Game.Resources.texgam, 602, 852);
            }
            else {
                Spike.fra[0] = Game.FrameSelector.complex("spi000", Game.Resources.texgam, 489, 252);
                Spike.fra[1] = Game.FrameSelector.complex("spi090", Game.Resources.texgam, 541, 252);
                Spike.fra[2] = Game.FrameSelector.complex("spi180", Game.Resources.texgam, 593, 252);
                Spike.fra[3] = Game.FrameSelector.complex("spi270", Game.Resources.texgam, 645, 252);
            }
            Spike.anispr[0] = new Utils.Animation("ani", true, Spike.fra[0], 8, [1, 2, 3, 2], null);
            Spike.anispr[1] = new Utils.Animation("ani", true, Spike.fra[1], 8, [1, 2, 3, 2], null);
            Spike.anispr[2] = new Utils.Animation("ani", true, Spike.fra[2], 8, [1, 2, 3, 2], null);
            Spike.anispr[3] = new Utils.Animation("ani", true, Spike.fra[3], 8, [1, 2, 3, 2], null);
        });
        Spike.rot = [];
        function conani(i) {
            Spike.ani[i] = new Utils.Animator();
            Spike.ani[i].owner = Spike.ani[i].listener = Spike.ins[i];
            setrot(i);
        }
        Spike.conani = conani;
        function setrot(i) {
            Spike.rot[i] = Spike.ins[i].getProperty("rot");
            switch (Spike.rot[i]) {
                case 0:
                    Spike.def[i].instance.x += Game.SceneMap.instance.xSizeTile * 0.5;
                    break;
                case 1:
                    Spike.def[i].instance.y -= Game.SceneMap.instance.ySizeTile * 0.5;
                    break;
                case 2:
                    Spike.def[i].instance.x += Game.SceneMap.instance.xSizeTile * 0.5;
                    Spike.def[i].instance.y -= Game.SceneMap.instance.ySizeTile;
                    break;
                case 3:
                    Spike.def[i].instance.x += Game.SceneMap.instance.xSizeTile;
                    Spike.def[i].instance.y -= Game.SceneMap.instance.ySizeTile * 0.5;
                    break;
            }
        }
        function resani() {
            for (var i = 0; i < Spike.cou; i++)
                Spike.ani[i].setAnimation(Spike.anispr[Spike.rot[i]]);
        }
        Spike.resani = resani;
        function fraani(i, fra) {
            fra.applyToSprite(Spike.spr[i]);
        }
        Spike.fraani = fraani;
    })(Spike = Game.Spike || (Game.Spike = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var Spike;
    (function (Spike) {
        var ove = [];
        function conove(i) {
            ove[i] = new Engine.Box();
            ove[i].enabled = ove[i].renderable = true;
            ove[i].red = 1;
            ove[i].green = ove[i].blue = 0;
            Game.SceneMap.instance.boxesEnemies.push(ove[i]);
        }
        Spike.conove = conove;
        function resove() {
            for (var i = 0; i < Spike.cou; i++) {
                ove[i].x = Spike.box[i].x;
                ove[i].y = Spike.box[i].y;
            }
        }
        Spike.resove = resove;
        function movove() {
            for (var i = 0; i < Spike.cou; i++) {
                ove[i].x = Spike.box[i].x;
                ove[i].y = Spike.box[i].y;
            }
        }
        Spike.movove = movove;
        function fraove(i, fra) {
            fra.applyToBox(ove[i]);
        }
        Spike.fraove = fraove;
        function timove() {
            for (var i = 0; i < Spike.cou; i++) {
                ove[i].x = Spike.horext[i];
                ove[i].y = Spike.verext[i];
            }
        }
        Spike.timove = timove;
        function draove() {
            for (var i = 0; i < Spike.cou; i++)
                ove[i].render();
        }
        Spike.draove = draove;
    })(Spike = Game.Spike || (Game.Spike = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var Spike;
    (function (Spike) {
        Spike.box = [];
        Spike.horext = [];
        Spike.verext = [];
        Spike.horextvel = [];
        Spike.verextvel = [];
        function conphy(i) {
            Spike.box[i] = new Engine.Box();
            Spike.box[i].enabled = Spike.box[i].renderable = true;
            Spike.fra[Spike.rot[i]][0].applyToBox(Spike.box[i]);
        }
        Spike.conphy = conphy;
        function resphy() {
            for (var i = 0; i < Spike.cou; i++) {
                Spike.box[i].x = Spike.def[i].instance.x;
                Spike.box[i].y = Spike.def[i].instance.y;
                Spike.horextvel[i] = 0;
                Spike.verextvel[i] = 0;
            }
        }
        Spike.resphy = resphy;
        function timphy() {
            for (var i = 0; i < Spike.cou; i++) {
                Spike.horext[i] = Spike.box[i].x + Spike.horextvel[i] * Engine.System.stepExtrapolation * (Game.SceneFreezer.stoped ? 0 : 1);
                Spike.verext[i] = Spike.box[i].y + Spike.verextvel[i] * Engine.System.stepExtrapolation * (Game.SceneFreezer.stoped ? 0 : 1);
                Spike.horextvel[i] = 0;
                Spike.verextvel[i] = 0;
            }
        }
        Spike.timphy = timphy;
        function draphy() {
            for (var i = 0; i < Spike.cou; i++)
                Spike.box[i].renderAt(Spike.horext[i], Spike.verext[i]);
        }
        Spike.draphy = draphy;
    })(Spike = Game.Spike || (Game.Spike = {}));
})(Game || (Game = {}));
/*
namespace Game{

    export class Spike extends Arcade.WorldEntity implements Arcade.Platformer.IPlatformInteractable, Utils.AnimatorListener{
        public static boxes : Array<Engine.Box> = [];

        public platformParent : Arcade.Platformer.Platform;
        public boxSolid : Engine.Box;

        protected boxesDamage : Array<Engine.Box>;

        protected constructor(def: any, frameBoxSolid : Array<Utils.AnimationFrame>, framesBoxesDamage : Array<Utils.AnimationFrame>, anim : Utils.Animation){
            super(def);
            this.boxesDamage = [];
            frameBoxSolid[0].applyToBox(this.boxSolid);
            for(var frame of framesBoxesDamage){
                var boxDamage = new Engine.Box();
                boxDamage.enabled = true;
                boxDamage.renderable = true;
                frame.applyToBox(boxDamage);
                SceneMap.instance.boxesEnemies.push(boxDamage);
                this.boxesDamage.push(boxDamage);
                Spike.boxes.push(boxDamage);
            }
            this.animator.setAnimation(anim);
        }

        protected onReset(){
            super.onReset();
            for(var boxDamage of this.boxesDamage){
                boxDamage.x = this.boxSolid.x;
                boxDamage.y = this.boxSolid.y;
            }
        }

        protected onStart(){
            var contacts = this.boxSolid.collide(SceneMap.instance.boxesSolids, null, false, 0, false, Engine.Box.LAYER_ALL);
            if(contacts != null){
                for(var contact of contacts){
                    if(contact.other.data instanceof Arcade.Platformer.Platform){
                        (contact.other.data as Arcade.Platformer.Platform).addChild(this);
                        break;
                    }
                }
            }
        }

        public xMoveOnPlatform(dist : number){
            this.boxSolid.x += dist;
            for(var boxDamage of this.boxesDamage){
                boxDamage.x += dist;
            }
        }

        public yMoveOnPlatform(dist : number){
            this.boxSolid.y += dist;
            for(var boxDamage of this.boxesDamage){
                boxDamage.y += dist;
            }
        }

        onPlatformOverlapX(){
            
        }

        onPlatformOverlapY(){
            
        }

        protected onDrawObjectsBack(){
            if(this.platformParent != null){
                this.sprite.x += this.platformParent.xGetVelMove() * Engine.System.deltaTime;
                this.sprite.y += this.platformParent.yGetVelMove() * Engine.System.deltaTime;
            }
            this.sprite.render();
            if(Engine.Box.debugRender){
                for(var boxDamage of this.boxesDamage){
                    boxDamage.render();
                }
            }
        }

        protected onClearScene(){
            Spike.boxes = [];
        }
    }

    var FRAME_BOX_SOLID_180 : Array<Utils.AnimationFrame>;
    var FRAMES_BOXES_DAMAGE_180 : Array<Utils.AnimationFrame>;
    var FRAMES_ANIM_180 : Array<Utils.AnimationFrame>;
    var ANIM_180 : Utils.Animation;

    addAction("configure", function(){
        FRAME_BOX_SOLID_180 = FrameSelector.complex("spike 180 solid", Resources.texture, 263, 119);
        FRAMES_BOXES_DAMAGE_180 = FrameSelector.complex("spike 180 damage", Resources.texture, 287, 119);
        FRAMES_ANIM_180 = FrameSelector.complex("spike 180 anim", Resources.texture, 263, 143);
        ANIM_180 = new Utils.Animation("spike 180", false, FRAMES_ANIM_180, 1, [0], null);
    });

    export class Spike180 extends Spike{
        protected constructor(def : any){
            super(def, FRAME_BOX_SOLID_180, FRAMES_BOXES_DAMAGE_180, ANIM_180);
            this.xAlign = "middle";
        }
    }

    var FRAME_BOX_SOLID_360 : Array<Utils.AnimationFrame>;
    var FRAMES_BOXES_DAMAGE_360 : Array<Utils.AnimationFrame>;
    var FRAMES_ANIM_360 : Array<Utils.AnimationFrame>;
    var ANIM_360 : Utils.Animation;

    addAction("configure", function(){
        FRAME_BOX_SOLID_360 = FrameSelector.complex("spike 360 solid", Resources.texture, 263, 167);
        FRAMES_BOXES_DAMAGE_360 = FrameSelector.complex("spike 360 damage", Resources.texture, 287, 167);
        FRAMES_ANIM_360 = FrameSelector.complex("spike 360 anim", Resources.texture, 263, 191);
        ANIM_360 = new Utils.Animation("spike 360", false, FRAMES_ANIM_360, 1, [0], null);
    });

    export class Spike360 extends Spike{
        protected constructor(def : any){
            super(def, FRAME_BOX_SOLID_360, FRAMES_BOXES_DAMAGE_360, ANIM_360);
            this.xAlign = "middle";
            this.yAlign = "start";
        }
    }

    var FRAME_BOX_SOLID_90 : Array<Utils.AnimationFrame>;
    var FRAMES_BOXES_DAMAGE_90 : Array<Utils.AnimationFrame>;
    var FRAMES_ANIM_90 : Array<Utils.AnimationFrame>;
    var ANIM_90 : Utils.Animation;

    addAction("configure", function(){
        FRAME_BOX_SOLID_90 = FrameSelector.complex("spike 90 solid", Resources.texture, 351, 119);
        FRAMES_BOXES_DAMAGE_90 = FrameSelector.complex("spike 90 damage", Resources.texture, 375, 119);
        FRAMES_ANIM_90 = FrameSelector.complex("spike 90 anim", Resources.texture, 351, 143);
        ANIM_90 = new Utils.Animation("spike 90", false, FRAMES_ANIM_90, 1, [0], null);
    });

    export class Spike90 extends Spike{
        protected constructor(def : any){
            super(def, FRAME_BOX_SOLID_90, FRAMES_BOXES_DAMAGE_90, ANIM_90);
            this.xAlign = "start";
            this.yAlign = "middle";
        }
    }

    var FRAME_BOX_SOLID_270 : Array<Utils.AnimationFrame>;
    var FRAMES_BOXES_DAMAGE_270 : Array<Utils.AnimationFrame>;
    var FRAMES_ANIM_270 : Array<Utils.AnimationFrame>;
    var ANIM_270 : Utils.Animation;

    addAction("configure", function(){
        FRAME_BOX_SOLID_270 = FrameSelector.complex("spike 270 solid", Resources.texture, 351, 167);
        FRAMES_BOXES_DAMAGE_270 = FrameSelector.complex("spike 270 damage", Resources.texture, 375, 167);
        FRAMES_ANIM_270 = FrameSelector.complex("spike 270 anim", Resources.texture, 351, 191);
        ANIM_270 = new Utils.Animation("spike 270", false, FRAMES_ANIM_270, 1, [0], null);
    });

    export class Spike270 extends Spike{
        protected constructor(def : any){
            super(def, FRAME_BOX_SOLID_270, FRAMES_BOXES_DAMAGE_270, ANIM_270);
            this.xAlign = "end";
            this.yAlign = "middle";
        }
    }
}
*/ 
var Game;
(function (Game) {
    var Spike;
    (function (Spike) {
        var pla = [];
        function stapla() {
            for (var i = 0; i < Spike.cou; i++) {
                pla[i] = null;
                Spike.rot[i] = Spike.ins[i].getProperty("rot");
                var hor = 0;
                var ver = 0;
                switch (Spike.rot[i]) {
                    case 0:
                        ver++;
                        break;
                    case 1:
                        hor--;
                        break;
                    case 2:
                        ver--;
                        break;
                    case 3:
                        hor++;
                        break;
                }
                Spike.box[i].x += hor;
                Spike.box[i].y += ver;
                var plahit = Spike.box[i].collide(Game.SceneMap.instance.boxesSolids);
                Spike.box[i].x -= hor;
                Spike.box[i].y -= ver;
                if (plahit != null) {
                    for (var _i = 0, plahit_1 = plahit; _i < plahit_1.length; _i++) {
                        var hit = plahit_1[_i];
                        if (hit.other.data instanceof Game.Platform) {
                            pla[i] = hit.other.data;
                            pla[i].chi.push(Spike.box[i]);
                            break;
                        }
                    }
                }
            }
        }
        Spike.stapla = stapla;
        function movpla() {
            for (var i = 0; i < Spike.cou; i++) {
                if (pla[i] != null)
                    pla[i].chi.push(Spike.box[i]);
            }
        }
        Spike.movpla = movpla;
        function timpla() {
            for (var i = 0; i < Spike.cou; i++) {
                if (pla[i] != null) {
                    Spike.horextvel[i] += pla[i].xvelmov() / Engine.Box.UNIT;
                    Spike.verextvel[i] += pla[i].yvelmov() / Engine.Box.UNIT;
                }
            }
        }
        Spike.timpla = timpla;
    })(Spike = Game.Spike || (Game.Spike = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var Spike;
    (function (Spike) {
        Spike.spr = [];
        function conspr(i) {
            Spike.spr[i] = new Engine.Sprite();
            Spike.spr[i].enabled = true;
        }
        Spike.conspr = conspr;
        function resspr() {
            for (var i = 0; i < Spike.cou; i++) {
                Spike.spr[i].x = Spike.def[i].instance.x;
                Spike.spr[i].y = Spike.def[i].instance.y;
            }
        }
        Spike.resspr = resspr;
        function timspr() {
            for (var i = 0; i < Spike.cou; i++) {
                Spike.spr[i].x = Spike.horext[i];
                Spike.spr[i].y = Spike.verext[i];
            }
        }
        Spike.timspr = timspr;
        function draspr() {
            for (var i = 0; i < Spike.cou; i++) {
                Spike.spr[i].render();
            }
        }
        Spike.draspr = draspr;
    })(Spike = Game.Spike || (Game.Spike = {}));
})(Game || (Game = {}));
var Game;
(function (Game) {
    var stanul = 0;
    var staoff = 1;
    var staori = 2;
    var stafor = 3;
    var stades = 4;
    var stabac = 5;
    var Platform = /** @class */ (function (_super) {
        __extends(Platform, _super);
        //audori:Engine.AudioPlayer=null;
        //auddes:Engine.AudioPlayer=null;
        function Platform(def) {
            var _this = _super.call(this, def) || this;
            _this.box = new Engine.Box();
            _this.box.enabled = _this.box.renderable = true;
            _this.box.xSize = Game.SceneMap.instance.xSizeTile;
            _this.box.ySize = Game.SceneMap.instance.ySizeTile;
            _this.box.data = _this;
            Game.SceneMap.instance.boxesSolids.push(_this.box);
            //this.sprite=new Engine.Sprite();
            _this.xori = def.instance.x * Engine.Box.UNIT;
            _this.yori = (def.instance.y - Game.SceneMap.instance.ySizeTile) * Engine.Box.UNIT;
            _this.xdes = _this.xori + _this.getProperty("xdis") * Game.SceneMap.instance.xSizeTile * Engine.Box.UNIT;
            _this.ydes = _this.yori + _this.getProperty("ydis") * Game.SceneMap.instance.ySizeTile * Engine.Box.UNIT;
            _this.velori = _this.getProperty("velori") * Engine.Box.UNIT;
            _this.veldes = _this.getProperty("veldes") * Engine.Box.UNIT;
            _this.stebeg = _this.getProperty("stebeg");
            _this.steori = _this.getProperty("steori");
            _this.stedes = _this.getProperty("stedes");
            _this.box.position[0] = _this.xori;
            _this.box.position[1] = _this.yori;
            return _this;
            //this.shakeOrigin=this.getProperty("shake origin");
            //this.shakeDestiny=this.getProperty("shake destiny");
            //this.onScreenCheck=this.getProperty("on screen check");
            //this.xOnScreenActive=this.getProperty("on screen active x");
            //this.yOnScreenActive=this.getProperty("on screen active y");
            //this.initStates();
            //this.sprite.enabled=true;
            //this.activationIndex=this.getProperty("activation index");
            //Jumper.activables.push(this);
        }
        Platform.prototype.onReset = function () {
            this.box.position[0] = this.xori;
            this.box.position[1] = this.yori;
            this.sta = stanul;
            this.chi = [];
            this.hordraoff = 0;
            this.verdraoff = 0;
            this.oldhor = 0;
            this.oldver = 0;
            if (false)
                this.setsta(staoff);
            else
                this.setsta(staori);
        };
        Platform.prototype.onMoveUpdate = function () {
            if (Game.SceneFreezer.stoped)
                return;
            this.cou--;
            this.xmov();
            this.ymov();
            this.chi = [];
            this.linsta();
        };
        Platform.prototype.xmov = function () {
            if (this.xmagmov() != 0) {
                this.box.position[0] += this.xvelmov();
                for (var _i = 0, _a = this.chi; _i < _a.length; _i++) {
                    var chi = _a[_i];
                    var hit = chi.cast(Game.SceneMap.instance.boxesSolids, null, true, this.xvelmov(), false);
                    chi.translate(hit, true, this.xvelmov(), false);
                }
                this.xdis -= this.xmagmov();
                if (this.xdis <= 0) {
                    var del = this.xnex - this.box.position[0];
                    this.box.position[0] = this.xnex;
                    if (this.xdis < 0) {
                        for (var _b = 0, _c = this.chi; _b < _c.length; _b++) {
                            var chi = _c[_b];
                            var hit = chi.cast(Game.SceneMap.instance.boxesSolids, null, true, del, false);
                            chi.translate(hit, true, del, false);
                        }
                    }
                }
                var dirMove = this.xdir > 0 ? 1 : -1;
                if (this.box.enabled)
                    for (var _d = 0, _e = Platform.sol; _d < _e.length; _d++) {
                        var sol = _e[_d];
                        var hit = this.box.collideAgainst(sol, null, true, 0, false);
                        if (hit != null) {
                            var dis = this.box.getDist(sol, dirMove, true);
                            hit = sol.cast(Game.SceneMap.instance.boxesSolids, null, true, -dis, false);
                            sol.translate(hit, true, -dis, false);
                        }
                    }
            }
        };
        Platform.prototype.xmagmov = function () {
            return this.xdis > this.xvel ? this.xvel : this.xdis;
        };
        Platform.prototype.xvelmov = function () {
            return this.xmagmov() * (this.xdir > 0 ? 1 : -1);
        };
        Platform.prototype.ymov = function () {
            if (this.ymagmov() != 0) {
                this.box.position[1] += this.yvelmov();
                for (var _i = 0, _a = this.chi; _i < _a.length; _i++) {
                    var chi = _a[_i];
                    var hit = chi.cast(Game.SceneMap.instance.boxesSolids, null, false, this.yvelmov(), false);
                    chi.translate(hit, false, this.yvelmov(), false);
                }
                this.ydis -= this.ymagmov();
                if (this.ydis <= 0) {
                    var del = this.ynex - this.box.position[1];
                    this.box.position[1] = this.ynex;
                    if (this.ydis < 0) {
                        for (var _b = 0, _c = this.chi; _b < _c.length; _b++) {
                            var chi = _c[_b];
                            var hit = chi.cast(Game.SceneMap.instance.boxesSolids, null, false, del, false);
                            chi.translate(hit, false, del, false);
                        }
                    }
                }
                var dirMove = this.ydir > 0 ? 1 : -1;
                if (this.box.enabled)
                    for (var _d = 0, _e = Platform.sol; _d < _e.length; _d++) {
                        var sol = _e[_d];
                        var hit = this.box.collideAgainst(sol, null, true, 0, true);
                        if (hit != null) {
                            var dis = this.box.getDist(sol, dirMove, false);
                            hit = sol.cast(Game.SceneMap.instance.boxesSolids, null, false, -dis, false);
                            sol.translate(hit, false, -dis, false);
                        }
                    }
            }
        };
        Platform.prototype.ymagmov = function () {
            return this.ydis > this.yvel ? this.yvel : this.ydis;
        };
        Platform.prototype.yvelmov = function () {
            return this.ymagmov() * (this.ydir > 0 ? 1 : -1);
        };
        Platform.prototype.linsta = function () {
            switch (this.sta) {
                case staori:
                    if (this.cou <= 0) {
                        this.setsta(stafor);
                        return;
                    }
                    break;
                case stafor:
                    if (this.xdis <= 0 && this.ydis <= 0) {
                        this.setsta(stades);
                        return;
                    }
                    break;
                case stades:
                    if (this.cou <= 0) {
                        this.setsta(stabac);
                        return;
                    }
                    break;
                case stabac:
                    if (this.xdis <= 0 && this.ydis <= 0) {
                        this.setsta(staori);
                        return;
                    }
                    break;
            }
        };
        Platform.prototype.setidl = function () {
            this.xdis = 0;
            this.ydis = 0;
            this.xdir = 0;
            this.ydir = 0;
            this.xvel = 0;
            this.yvel = 0;
        };
        Platform.prototype.setmov = function () {
            this.xdis = this.xnex - this.box.position[0];
            this.ydis = this.ynex - this.box.position[1];
            var mag = Math.sqrt(this.xdis * this.xdis + this.ydis * this.ydis);
            this.xdir = this.xdis / mag;
            this.ydir = this.ydis / mag;
            this.xvel = (this.ori ? this.veldes : this.velori) * this.xdir * (this.xdir < 0 ? -1 : 1);
            this.yvel = (this.ori ? this.veldes : this.velori) * this.ydir * (this.ydir < 0 ? -1 : 1);
            this.xdis *= (this.xdis < 0 ? -1 : 1);
            this.ydis *= (this.ydis < 0 ? -1 : 1);
        };
        Platform.prototype.setsta = function (nex) {
            this.exista();
            this.entsta(nex);
        };
        Platform.prototype.exista = function () {
            switch (this.sta) {
                case stafor:
                    //if(this.soundDestiny!=null){
                    //    this.soundDestiny.boxPlay(this.box,this.xSoundExtra,this.ySoundExtra,this.shakeDestiny);
                    //}
                    break;
                case stabac:
                    //if(this.soundOrigin!=null){
                    //    this.soundOrigin.boxPlay(this.box,this.xSoundExtra,this.ySoundExtra,this.shakeOrigin);
                    //}
                    break;
            }
        };
        Platform.prototype.entsta = function (nex) {
            var old = this.sta;
            this.sta = nex;
            switch (this.sta) {
                case staoff:
                    this.setidl();
                    break;
                case staori:
                    this.ori = true;
                    this.cou = old == staoff || old == stanul ? this.stebeg : this.steori;
                    this.setidl();
                    break;
                case stafor:
                    this.xnex = this.xdes;
                    this.ynex = this.ydes;
                    this.setmov();
                    break;
                case stades:
                    this.ori = false;
                    this.cou = this.stedes;
                    this.setidl();
                    break;
                case stabac:
                    this.xnex = this.xori;
                    this.ynex = this.yori;
                    this.setmov();
                    break;
            }
        };
        Platform.prototype.onPlatformTimePreUpdate = function () {
            this.oldhor = this.box.position[0];
            this.oldver = this.box.position[1];
            this.hordraoff = this.xvelmov() * Engine.System.stepExtrapolation * (Game.SceneFreezer.stoped ? 0 : 1) / Engine.Box.UNIT;
            this.verdraoff = this.yvelmov() * Engine.System.stepExtrapolation * (Game.SceneFreezer.stoped ? 0 : 1) / Engine.Box.UNIT;
            this.box.x += this.hordraoff;
            this.box.y += this.verdraoff;
        };
        Platform.prototype.onDrawObjects = function () {
            //this.box.render();
        };
        Platform.prototype.onFinalTimeUpdate = function () {
            this.box.position[0] = this.oldhor;
            this.box.position[1] = this.oldver;
        };
        Platform.prototype.onClearScene = function () {
            Platform.sol = [];
        };
        Platform.sol = [];
        return Platform;
    }(Game.Entity));
    Game.Platform = Platform;
    var AutoPlatform = /** @class */ (function (_super) {
        __extends(AutoPlatform, _super);
        function AutoPlatform(def, fra) {
            var _this = _super.call(this, def) || this;
            _this.spr = [];
            _this.wid = def.instance.width / Game.SceneMap.instance.xSizeTile;
            _this.hei = def.instance.height / Game.SceneMap.instance.ySizeTile;
            _this.fix(fra);
            return _this;
        }
        AutoPlatform.prototype.fix = function (fra) {
            for (var rig = 0; rig < this.wid; rig += 1) {
                for (var yIndex = 0; yIndex < this.hei; yIndex += 1) {
                    var spr = new Engine.Sprite();
                    spr.enabled = true;
                    if (this.wid == 1 && this.hei == 1)
                        fra[0].applyToSprite(spr);
                    else if (this.wid == 1) {
                        if (yIndex == 0)
                            fra[4].applyToSprite(spr);
                        else if (yIndex == this.hei - 1)
                            fra[12].applyToSprite(spr);
                        else
                            fra[8].applyToSprite(spr);
                    }
                    else if (this.hei == 1) {
                        if (rig == 0)
                            fra[1].applyToSprite(spr);
                        else if (rig == this.wid - 1)
                            fra[3].applyToSprite(spr);
                        else
                            fra[2].applyToSprite(spr);
                    }
                    else {
                        if (rig == 0 && yIndex == 0)
                            fra[5].applyToSprite(spr);
                        else if (rig == 0 && yIndex == this.hei - 1)
                            fra[13].applyToSprite(spr);
                        else if (rig == this.wid - 1 && yIndex == 0)
                            fra[7].applyToSprite(spr);
                        else if (rig == this.wid - 1 && yIndex == this.hei - 1)
                            fra[15].applyToSprite(spr);
                        else if (rig == 0)
                            fra[9].applyToSprite(spr);
                        else if (rig == this.wid - 1)
                            fra[11].applyToSprite(spr);
                        else if (yIndex == 0)
                            fra[6].applyToSprite(spr);
                        else if (yIndex == this.hei - 1)
                            fra[14].applyToSprite(spr);
                        else
                            fra[10].applyToSprite(spr);
                    }
                    spr.xOffset = rig * Game.SceneMap.instance.xSizeTile;
                    spr.yOffset = yIndex * Game.SceneMap.instance.ySizeTile;
                    this.spr.push(spr);
                }
            }
            this.box.xSize = this.wid * Game.SceneMap.instance.xSizeTile;
            this.box.ySize = this.hei * Game.SceneMap.instance.ySizeTile;
            this.box.yOffset -= (this.hei - 1) * Game.SceneMap.instance.ySizeTile;
        };
        AutoPlatform.prototype.onDrawPlatforms = function () {
            for (var _i = 0, _a = this.spr; _i < _a.length; _i++) {
                var spr = _a[_i];
                spr.x = this.box.x;
                spr.y = this.box.y + this.box.yOffset;
                spr.render();
            }
            this.box.render();
        };
        return AutoPlatform;
    }(Platform));
    Game.AutoPlatform = AutoPlatform;
})(Game || (Game = {}));
///<reference path="Platform.ts"/>
var Game;
(function (Game) {
    var fra;
    Game.addAction("configure", function () {
        if (Game.plu)
            fra = Game.FrameSelector.complex("defpla", Game.Resources.texgam, 762, 806);
        else
            fra = Game.FrameSelector.complex("defpla", Game.Resources.texgam, 257, 255);
    });
    var DefaultAutoPlatform = /** @class */ (function (_super) {
        __extends(DefaultAutoPlatform, _super);
        function DefaultAutoPlatform(def) {
            return _super.call(this, def, fra) || this;
        }
        return DefaultAutoPlatform;
    }(Game.AutoPlatform));
    Game.DefaultAutoPlatform = DefaultAutoPlatform;
})(Game || (Game = {}));
///<reference path="../../Engine/Entity.ts"/>
var Game;
(function (Game) {
    var X_LOADING_START = 0;
    var STEPS_DOTS = 20;
    //TODO: CHANGE SCENE FREEZER
    var LevelAdLoader = /** @class */ (function (_super) {
        __extends(LevelAdLoader, _super);
        function LevelAdLoader() {
            var _this = _super.call(this) || this;
            _this.count = 0;
            LevelAdLoader.instance = _this;
            _this.text = new Utils.Text();
            _this.text.font = Game.FontManager.a;
            _this.text.scale = 1;
            _this.text.enabled = false;
            _this.text.pinned = true;
            _this.text.str = "   PLEASE WAIT   ";
            _this.text.xAlignBounds = Utils.AnchorAlignment.MIDDLE;
            _this.text.xAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.text.yAlignBounds = Utils.AnchorAlignment.MIDDLE;
            _this.text.yAlignView = Utils.AnchorAlignment.MIDDLE;
            _this.text.xAligned = X_LOADING_START;
            _this.text.yAligned = 0;
            _this.text.superFront = true;
            _this.red = Game.SceneFade.instance.red;
            _this.green = Game.SceneFade.instance.green;
            _this.blue = Game.SceneFade.instance.blue;
            _this.alpha = 0;
            _this.sprite.setRGBA(_this.red, _this.green, _this.blue, 0);
            _this.maxAlpha = 0.5;
            _this.speed = 0.0166666666666667 * 4;
            return _this;
        }
        Object.defineProperty(LevelAdLoader, "blocked", {
            get: function () {
                return LevelAdLoader.instance.alpha != 0;
            },
            enumerable: false,
            configurable: true
        });
        LevelAdLoader.prototype.onStepUpdate = function () {
            if (this.direction > 0 && !this.text.enabled && this.alpha > 0.05) {
                //this.text.enabled = true;
            }
            else if (this.direction < 0 && this.text.enabled && this.alpha < 0.05) {
                //this.text.enabled = false;
            }
            if (this.text.enabled) {
                this.count += 1;
                if (this.count == STEPS_DOTS) {
                    this.count = 0;
                    if (this.text.str == "   PLEASE WAIT   ") {
                        this.text.str = "  .PLEASE WAIT.  ";
                    }
                    else if (this.text.str == "  .PLEASE WAIT.  ") {
                        this.text.str = " ..PLEASE WAIT.. ";
                    }
                    else if (this.text.str == " ..PLEASE WAIT.. ") {
                        this.text.str = "...PLEASE WAIT...";
                    }
                    else if (this.text.str == "...PLEASE WAIT...") {
                        this.text.str = "   PLEASE WAIT   ";
                    }
                }
                if (!LevelAdLoader.blocked) {
                    this.text.enabled = false;
                }
            }
        };
        LevelAdLoader.prototype.onDrawFade = function () {
        };
        LevelAdLoader.prototype.onDrawAdFade = function () {
            this.sprite.render();
        };
        LevelAdLoader.show = function () {
            //LevelAdLoader.instance.red = 1;
            //LevelAdLoader.instance.green = 1;
            //LevelAdLoader.instance.blue = 1;
            LevelAdLoader.instance.sprite.setRGBA(LevelAdLoader.instance.red, LevelAdLoader.instance.green, LevelAdLoader.instance.blue, LevelAdLoader.instance.alpha);
            LevelAdLoader.instance.text.enabled = true;
            Game.LevelPauseUI.instance.text.enabled = false;
            LevelAdLoader.instance.text.str = "   PLEASE WAIT   ";
            LevelAdLoader.instance.count = 0;
            LevelAdLoader.instance.direction = 1;
            //LevelAdLoader.instance.speed = 0.0166666666666667 * 9999;
        };
        LevelAdLoader.hide = function (slowOnSpeedrun) {
            if (slowOnSpeedrun === void 0) { slowOnSpeedrun = false; }
            if (Game.Level.speedrun && slowOnSpeedrun && (Game.Scene.nextSceneClass == Game.Level || Game.Scene.nextSceneClass == "reset")) {
                LevelAdLoader.instance.speed = 0.0166666666666667 * 1;
            }
            else {
                LevelAdLoader.instance.speed = 0.0166666666666667 * 4;
            }
            LevelAdLoader.instance.direction = -1;
        };
        LevelAdLoader.prototype.onClearScene = function () {
            LevelAdLoader.instance = null;
        };
        LevelAdLoader.instance = null;
        return LevelAdLoader;
    }(Utils.Fade));
    Game.LevelAdLoader = LevelAdLoader;
})(Game || (Game = {}));
