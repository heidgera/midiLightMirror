'use strict';

var obtains = [
  'µ/socket.js',
  './src/neopixels.js',
  'child_process',
];

obtain(obtains, (socket, { pixels, rainbow, Color }, { exec })=> {
  exports.app = {};

  var ws = socket.get('localhost');
  ws.connect();

  pixels.init(88);

  var openedFile = null;

  var mkOff = 9; //Piano keyboards start at midi 9

  var keyStyles = [];

  for (var i = 0; i < pixels.data.length; i++) {
    if (i < 48) keyStyles[i] = { mode: 'fade', color: new Color([127, 0, 0]), time: 1000 };
    else keyStyles[i] = { mode: 'color', start: 48, end: 80, color: rainbow(i - 48, 32) };
    keyStyles[i].range = { low: 9, high: 97 };
  }

  var admin = null;

  var noteHeld = [];

  ws.onconnect = ()=>{
    console.log('connected to server');
  }

  ws.addListener('notePressed', ({note, vel})=>{
    if (note >= mkOff && note < mkOff + 88) {
      var s = vel / 127.;
      noteHeld[note] = vel;

      chords.forEach((chrd, i)=>chrd.check(note, vel));

      setLightsFromConfig(keyStyles[note - mkOff], s, note - mkOff);

    }
  })

  var Chord = function (cKeys, config) {
    this.keys = cKeys;
    let keypresses = [];
    this.config = config;

    this.config.color = new Color(this.config.color);

    let timer = null;

    let reset = ()=> {
      keypresses = [];
    };

    var fired = false;

    var allPressed = ()=>this.keys.reduce((acc, v, i)=>acc && keypresses[i], true);

    var nextCheck = (pressed)=> {};

    this.launch = ()=> {
      var scale = this.keys.reduce((acc, v, i)=>acc + keypresses[i], 0) / (this.keys.length * 127.);
      setLightsFromConfig(this.config, scale);
      if (this.config.mode == 'color') nextCheck = ()=> {
        if (!allPressed()) {
          setLightsFromConfig(this.config, 0);
          nextCheck = ()=> {};
        }
      };
    };

    this.check = (note, vel)=> {
      var ind = this.keys.indexOf(note);
      if (ind > -1) {
        keypresses[ind] = vel;
        clearTimeout(timer);
        if (allPressed()) this.launch();
        else if (vel) timer = setTimeout(reset, 250);
        nextCheck();
      }
    };
  };

  var chords = [];

  var holdColor = [];

  var fadeVal = 0;

  var fadeTO = null;

  var fadeOut = (cfg, time)=> {
    clearTimeout(fadeTO);
    fadeVal -= .01;
    if (fadeVal <= 0) fadeVal = 0;
    var start = cfg.range.start;
    var end = cfg.range.start + cfg.range.dist;
    if (cfg.bothDirs) start = cfg.range.start - cfg.range.dist;
    pixels.setEachRGB(
      (cur, ind)=>(holdColor[ind] || ind < cfg.range.start || ind >= cfg.range.start + cfg.range.dist) ? cur :
        ((cfg.rainbow) ? rainbow(ind - cfg.rbow.min, cfg.rbow.max - cfg.rbow.min) : cfg.color).scale(fadeVal)
    );
    pixels.show();
    if (fadeVal > 0) fadeTO = setTimeout(()=>fadeOut(cfg, time), time);
  };

  var onThenFade = (scale, cfg, time)=> {
    fadeVal = scale;
    fadeOut(cfg, time / (100 * scale));
  };

  var pulseTimer = null;

  var doPulse = (which, counter, cfg, time)=> {
    var color = ()=>cfg.color;
    counter += 1;
    var half = Math.abs(cfg.range.dist);
    var dir = cfg.range.dist > 0;
    if (cfg.rainbow) color = (ind)=>rainbow(ind - cfg.rbow.min, cfg.rbow.max - cfg.rbow.min);
    var chaseUp = (cur, ind)=> {
      if (counter < half && ind >= which && ind < which + counter) return color(ind);
      else if (counter >= half && ind >= which + (counter - half) && ind < which + cfg.range.dist) return color(ind);
      return null;
    };

    var chaseDown = (cur, ind)=> {
      if (counter < half && ind < which && ind >= which - counter) return color(ind);
      else if (counter >= half && ind < which - (counter - half) && ind >= which - cfg.range.dist) return color(ind);
      return null;
    };

    var colorChain = (cur, ind)=> {
      var ret = null;
      if (cfg.bothDirs) {
        ret = chaseUp(cur, ind);
        if (!ret) ret = chaseDown(cur, ind);
      } else if (dir) ret = chaseUp(cur, ind);
      else ret = chaseDown(cur, ind);
      if (!ret && holdColor[ind]) ret = cur;
      else if (!ret) ret = new Color([0, 0, 0]);
      return ret;
    };

    pixels.setEachRGB(colorChain);
    pixels.show();
    if (counter < 2 * half) setTimeout(()=> {
      doPulse(which, counter, cfg, time);
    }, time);
  };

  var startPulse = (which, cfg)=> {
    if (which == null) which  = cfg.range.start;
    var tm = cfg.time / (2 * Math.abs(cfg.range.dist));
    doPulse(which, 0, cfg, tm);
  };

  var setLightsFromConfig = (cfg, s, note, range)=> {
    console.log(cfg.mode);
    switch (cfg.mode) {
      case 'fade':
        if (s) onThenFade(s, cfg, cfg.time);
        break;
      case 'color':
        if (note) {
          holdColor[note] = s;
          pixels.setByArray(note, cfg.color.scale(s));
        } else if (cfg.range) {
          var low = cfg.range.start;
          var high = cfg.range.start + cfg.range.dist;
          if (cfg.bothDirs) low = cfg.range.start - cfg.range.dist;
          for (var i = low; i < high; i++) {
            if (cfg.rainbow) {
              var min = cfg.rbow.min;
              var max = cfg.rbow.max;
              pixels.setByArray(i, rainbow(i - min, max - min).scale(s));
            } else pixels.setByArray(i, cfg.color.scale(s));
          }
        }

        pixels.show();
        break;
      case 'pulse':
        if (s) startPulse(note, cfg);
        break;
      default:

    }
  };

  ws.addListener('shutdown', (data)=> {
    pixels.setIndicator([127, 0, 0]);
    setTimeout(()=> {
      exec('sudo shutdown now');
    }, 1000);
  });

  ws.addListener('keyConfig', data=>{
    keyStyles = [];
    console.log('got new key configs');
    data.forEach(function (cfg, ind, arr) {
      cfg.color = new Color(cfg.color);

      keyStyles[ind] = cfg;
    });
  });

  ws.addListener('serverChords', data=>{
    chords = [];
    data.forEach(function (chrd, ind, arr) {
      chords.push(new Chord(chrd.keys, chrd.config));
    });
  });

  ws.addListener('currentConfig',(data)=>{
    console.log('changed config');
    ws.send('getConfiguration', {which: 'current'})
  });

  var setStyle = (set, key, which)=> {
    if (set.hasOwnProperty(key) && key != 'key') {
      if (key == 'color') keyStyles[which][key] = new Color(set[key]);
      else keyStyles[which][key] = set[key];
    }
  };

  var process = require('electron').remote.process;

  process.on('SIGINT', function () {
    pixels.reset();
    process.nextTick(function () { process.exit(0); });
  });

  exports.app.start = ()=> {
    console.log('started');

    setTimeout(()=> {
      pixels.setEachRGB(()=>[0, 0, 0]);
      pixels.show();
    }, 1000);

    document.onkeyup = (e)=> {
      if (e.which == 27) {
        var electron = require('electron');
        electron.remote.process.exit();
      }
    };

  };

  provide(exports);
});
