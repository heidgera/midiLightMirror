'use strict';

var obtains = [
  'µ/midi.js',
  './src/neopixels.js',
  './src/server/express.js',
  './src/server/wsServer.js',
  'fs',
  'child_process',
];

obtain(obtains, (midi, { pixels, rainbow, Color }, { fileServer }, { wss }, fs, { exec })=> {
  exports.app = {};

  pixels.init(88);

  fileServer.get('/shutdownOthers', ()=> {
    wss.broadcast({ shutdown: true });
  });

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

  var conf = require('os').homedir() + '/.midiLight.json';

  var configDir = require('os').homedir() + '/midiLightConfigs';
  var settingsDir = require('os').homedir() + '/midiLightSettings';

  var defaultConf = configDir + 'default.json';

  if (fs.existsSync(conf)) {
    let data = fs.readFileSync(conf); //file exists, get the contents
    var styles = JSON.parse(data);
    keyStyles = [];
    styles.keys.forEach(function (style, ind, arr) {
      style.color = new Color(style.color);

      keyStyles[ind] = style;
    });

    chords = [];
    styles.chords.forEach(function (chrd, ind, arr) {
      chords.push(new Chord(chrd.keys, chrd.config));
    });
  }

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

  wss.addListener('setLights', (dataSet, data)=> {
    if (dataSet.length == pixels.data.length) {
      pixels.setEachRGB((val, ind)=>dataSet[ind]);
      pixels.show();
    }
  });

  wss.addListener('shutdown', (dataSet, data)=> {
    pixels.setIndicator([127, 0, 0]);
    wss.broadcast({ shutdown: true });
    setTimeout(()=> {
      exec('sudo shutdown now');
    }, 1000);
  });

  wss.addListener('listConfigs', (dataSet, data, client)=> {
    fs.readdir(configDir, (err, files) => {
      console.log(files);
      client.sendPacket({ listConfigs: files.map((file)=>file.replace('.json', '')) });
      if (openedFile) client.sendPacket({ currentConfig: openedFile });
    });
  });

  wss.addListener('deleteConfig', (which, data, client)=> {
    if (client === admin) {
      fs.unlink(configDir + '/' + which + '.json', (err, files) => {
        console.log('Deleted ' + which);
      });
    }
  });

  wss.addListener('requestMIDIDevices', (request, data, client)=> {
    if (client === admin) {
      var mid = (request == 'input') ? midi.in : midi.out;
      admin.sendPacket({
        listMIDI: {
          which: request,
          devices: mid.devices.map((dev)=>dev.name),
        },
      });
    }
  });

  wss.addListener('setMIDIDevice', (request, data, client)=> {
    if (client === admin) {
      var mid = (request.mode == 'input') ? midi.in : midi.out;
      var newIn = null;
      console.log(`Looking for ${request.name}`);
      mid.devices.forEach((el)=> {
        if (el.name == request.name && !newIn) {
          newIn = el;
          console.log(`Connecting to ${request.name}`);
        }
      });
      midi.in.select(newIn);

      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir);
      }

      fs.writeFileSync(settingsDir + '/MIDI_Device.json', JSON.stringify(request));
    }
  });

  wss.addListener('getConfiguration', (which, data, client)=> {
    //if (client === admin){
    if (which == 'current') client.sendPacket({
      keyConfig: keyStyles,
      serverChords: chords,
    });
    else {
      let data = fs.readFileSync(configDir + '/' + which + '.json'); //file exists, get the contents
      var styles = JSON.parse(data);
      client.sendPacket({
        keyConfig: styles.keys,
        serverChords: styles.chords,
      });
    }
    //}
  });

  wss.addListener('setConfigByName', (name, dataPack, client)=> {
    openedFile = name;
    let data = fs.readFileSync(configDir + '/' + name + '.json'); //file exists, get the contents
    var styles = JSON.parse(data);
    keyStyles = [];
    styles.keys.forEach(function (cfg, ind, arr) {
      cfg.color = new Color(cfg.color);

      keyStyles[ind] = cfg;
    });

    chords = [];
    styles.chords.forEach(function (chrd, ind, arr) {
      chords.push(new Chord(chrd.keys, chrd.config));
    });

    console.log('Opened ' + openedFile);

    wss.broadcast({ currentConfig: openedFile });
  });

  wss.addListener('setConfiguration', (config, data, client)=> {
    if (client === admin) {
      if (config.load) {
        keyStyles = [];
        config.keys.forEach(function (cfg, ind, arr) {
          cfg.color = new Color(cfg.color);

          keyStyles[ind] = cfg;
        });

        chords = [];
        config.chords.forEach(function (chrd, ind, arr) {
          chords.push(new Chord(chrd.keys, chrd.config));
        });

        openedFile = config.filename;

        wss.broadcast({ currentConfig: openedFile });
      }

      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir);
      }

      let file = configDir + '/' + config.filename + '.json';
      console.log(file);

      fs.writeFileSync(file, JSON.stringify({ keys: keyStyles, chords: chords }));
    }
  });

  wss.addListener('adminSession', (password, data, client)=> {
    if (password == 'password') {
      console.log('admin connected');
      admin = client;
    }
  });

  var setStyle = (set, key, which)=> {
    if (set.hasOwnProperty(key) && key != 'key') {
      if (key == 'color') keyStyles[which][key] = new Color(set[key]);
      else keyStyles[which][key] = set[key];
    }
  };

  wss.addListener('keyMode', (set, data, client)=> {
    if (client === admin) {
      if (!set.range) {
        for (var key in set) setStyle(set, key, set.key);
      } else for (var key in set) {
        for (var i = set.range.low; i < set.range.high + 1; i++) {
          setStyle(set, key, i);
        }
      }
    }
  });

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

    midi.in.onReady = ()=> {
      var newIn = null;
      midi.in.devices.forEach((el)=> {
        //console.log(el.name);
        if (!el.name.includes('Through') && !newIn) {
          newIn = el;
          console.log(el.name);
        }
      });
      midi.in.select(newIn);

      if (fs.existsSync(settingsDir + '/MIDI_Device.json')) {
        let data = fs.readFileSync(settingsDir + '/MIDI_Device.json'); //file exists, get the contents
        var request = JSON.parse(data);
        var mid = (request.mode == 'input') ? midi.in : midi.out;
        var newIn = null;
        console.log(`Looking for ${request.name}`);
        mid.devices.forEach((el)=> {
          if (el.name == request.name && !newIn) {
            newIn = el;
            console.log(`Connecting to ${request.name}`);
          }
        });
        midi.in.select(newIn);
      }
    };

    /*midi.out.onReady = ()=> {
      var newOut = null;
      midi.out.devices.forEach((el)=> {
        if (el.name.includes('Tesla') && !newOut) {
          newOut = el;
          console.log(el.name);
        }
      });
      midi.out.select(newOut);
    };*/

    midi.in.setNoteHandler((note, vel)=> {
      if (note >= mkOff && note < mkOff + 88) {
        //note -= 9;

        //if (vel > 0) midi.out.playNote(note, 1);
        //if (vel == 0) midi.out.playNote(note, 0);

        //if (admin) admin.sendPacket({ notePressed: { note: note, vel: vel } });
        wss.broadcast({ notePressed: { note: note, vel: vel } });

        var s = vel / 127.;
        noteHeld[note] = vel;

        chords.forEach((chrd, i)=>chrd.check(note, vel));

        setLightsFromConfig(keyStyles[note - mkOff], s, note - mkOff);

      }
    });

    document.onkeyup = (e)=> {
      if (e.which == 27) {
        var electron = require('electron');
        electron.remote.process.exit();
      }
    };

  };

  provide(exports);
});
