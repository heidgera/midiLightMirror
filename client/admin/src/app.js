'use strict';

obtain(['µ/commandClient.js', 'µ/color.js', './src/keyboard.js'], ({ MuseControl }, { Color, rainbow }, { Keyboard, midiKeyOffset: mkOff })=> {
  exports.app = {};

  var control = new MuseControl(window.location.hostname);

  exports.app.start = ()=> {

    var keys = new Keyboard(µ('#keyholder'));

    var Chord = function (cKeys, config) {
      var name = cKeys.reduce((acc, val)=>
        acc + ((acc.length) ? '-' : '') + keys[val - mkOff].getAttribute('note').replace('_sharp', '#'), '');
      return {
        name: name,
        keys: cKeys,
        config: config,
      };
    };

    var chords = []; //new Chord([10, 14, 16], {})

    var currentChord = -1;

    var openedFile = null;

    keys.forEach(function (key, ind, arr) {
      if (key.midiNum < 48) key.lightStyle = { mode: 'fade', color: new Color([127, 0, 0]) };
      else key.lightStyle = { mode: 'rainbow', start: 48, end: 80 };
      if (key.lightStyle.mode == 'rainbow') {
        key.lightStyle.color = rainbow(key.midiNum - 48, 32);
      }

      key.style.backgroundColor = key.lightStyle.color.styleString();
    });

    control.onConnect = ()=> {
      console.log('Connecting to server...');
      control.send({ adminSession: 'password' });
    };

    control.connect();

    control.addListener('notePressed', (key)=> {
      if (key.vel && key.note >= mkOff) {
        keys[key.note - mkOff].toggle();
      }
    });

    control.addListener('listMIDI', (reply)=> {
      var drop = µ('#deviceDrop');
      drop.innerHTML = '';
      reply.devices.forEach(function (device, ind, arr) {
        let newOpt = µ('+option', drop);
        newOpt.value = device;
        newOpt.textContent = device;
      });
    });

    control.addListener('listConfigs', (configs)=> {
      var confg = µ('#configFiles');
      var del = µ('#deleteFiles');
      confg.innerHTML = '';
      del.innerHTML = '';
      configs.forEach(function (conf, ind, arr) {
        let newOpt = µ('+option', confg);
        let delOpt = µ('+option', del);
        delOpt.value = newOpt.value = conf;
        delOpt.textContent = newOpt.textContent = conf;
      });
    });

    control.addListener('serverChords', (servChrd)=> {
      //console.log(reply.devices);
      chords = [];
      servChrd.forEach(function (chrd, ind, arr) {
        chords.push(new Chord(chrd.keys, chrd.config));
      });
    });

    control.addListener('keyConfig', (config)=> {
      config.forEach(function (cfg, ind, arr) {
        cfg.color = (cfg.color) ?
          new Color(cfg.color) :
          rainbow(ind - cfg.start, cfg.end - cfg.start);
      });

      keys.forEach(function (key, ind, arr) {
        key.lightStyle = config[ind];
        key.style.backgroundColor = key.lightStyle.color.styleString();
      });
    });

    var closeSettings = ()=> {
      µ('#settingsTab').hidden = true;
    };

    var closeConfig = ()=> {
      keys.deselectAll();
      µ('#configurator').hidden = true;
    };

    var getNum = el => isNaN(parseInt(el.value)) ? 0 : parseInt(el.value);

    var makeConfig = (which)=> {
      var cfg = {};
      cfg.mode = µ('[name="mode"]').reduce((acc, val)=>(val.checked ? val.value : acc), null);
      cfg.color = new Color([getNum(µ('#rCol')), getNum(µ('#gCol')), getNum(µ('#bCol'))]);
      cfg.range = { start: getNum(µ('#rangeStart')) - 9, dist: getNum(µ('#rangeDist')) };
      cfg.time = getNum(µ('#actTime'));
      cfg.rainbow = µ('#rainbow').checked;
      cfg.bothDirs = µ('#double').checked;

      if (!cfg.time) cfg.time = 1000;

      if (µ('#rainbow').checked) {
        var min = getNum(µ('#rbowMin'));
        var max = getNum(µ('#rbowMax'));
        cfg.rbow = {};
        cfg.rbow.min = min;
        cfg.rbow.max = max;
        cfg.color = rainbow(which - min, max - min);
        console.log(cfg.color);
      }

      return cfg;
    };

    µ('#read').onclick = (e)=> {
      e.preventDefault();
      //control.send({ getConfiguration: 'default' });
      control.send({ listConfigs: true });
      µ('#readDialog').hidden = false;
    };

    µ('#okayRead').onclick = (e)=> {
      e.preventDefault();
      let which = µ('[name="readMode"]').reduce((acc, val)=>(val.checked ? val.value : acc), null);
      if (which == 'default' || which == 'open') {
        openedFile = (which == 'default') ? 'current' : µ('#configFiles').value;
        control.send({ getConfiguration: openedFile });
      } else if (which == 'delete') {
        control.send({ deleteConfig: µ('#deleteFiles').value });
      }

      µ('#readDialog').hidden = true;
    };

    µ('#cancelRead').onclick = (e)=> {
      e.preventDefault();
      µ('#readDialog').hidden = true;
    };

    µ('#write').onclick = (e)=> {
      e.preventDefault();
      µ('#writeDialog').hidden = false;
      if (openedFile) {
        µ('#replaceOpt').hidden = false;
        µ('#openedFile').textContent = openedFile;
      }
    };

    µ('#writeConfig').onclick = (e)=> {
      e.preventDefault();
      µ('#writeDialog').hidden = true;
      let which = µ('[name="writeMode"]').reduce((acc, val)=>(val.checked ? val.value : acc), null);
      let name = (which == 'save') ? openedFile : ((which == 'saveAs') ? µ('#writeFile').value : which);
      control.send({ setConfiguration: {
        keys: keys.map(key=>key.lightStyle),
        chords: chords,
        filename: name,
        load: false,
      }, });
    };

    µ('#writeLoadConfig').onclick = (e)=> {
      e.preventDefault();
      µ('#writeDialog').hidden = true;
      let which = µ('[name="writeMode"]').reduce((acc, val)=>(val.checked ? val.value : acc), null);
      let name = (which == 'save') ? openedFile : ((which == 'saveAs') ? µ('#writeFile').value : which);
      console.log(name);
      control.send({ setConfiguration: {
        keys: keys.map(key=>key.lightStyle),
        chords: chords,
        filename: name,
        load: true,
      }, });
    };

    µ('#cancelWrite').onclick = (e)=> {
      e.preventDefault();
      µ('#writeDialog').hidden = true;
    };

    µ('#settings').onclick = (e)=> {
      e.preventDefault();
      control.send({ requestMIDIDevices: 'input' });

      keys.deselectAll();
      µ('#settingsTab').hidden = false;
    };

    µ('#selectAll').onclick = (e)=> {
      e.preventDefault();
      keys.selectAll();
    };

    µ('#closeConfig').onclick = (e)=> {
      e.preventDefault();
      closeConfig();
    };

    µ('#closeSettings').onclick = (e)=> {
      e.preventDefault();
      //keys.deselectAll();
      µ('#settingsTab').hidden = true;
    };

    µ('#cancelSettings').onclick = (e)=> {
      e.preventDefault();
      //keys.deselectAll();
      closeSettings();
    };

    µ('#chords').onchange = ()=> {
      var val = µ('#chords').value;
      if (val >= 0) {
        keys.deselectAll(()=> {currentChord = val;});
        chords[val].keys.forEach(function (key, ind, arr) {
          keys[key - mkOff].select();
        });
      }
    };

    µ('#deleteChord').onclick = (e)=> {
      e.preventDefault();
      if (currentChord > -1) {
        chords.splice(currentChord, 1);
      }

      closeConfig();
    };

    µ('#saveChord').onclick = (e)=> {
      e.preventDefault();

      var sKeys = keys.filter(val=>val.selected).map(val=>val.midiNum);
      var cfg = makeConfig(getNum(µ('#rangeStart')));
      chords.forEach((val, ind)=> {
        if (val.keys.toString() == sKeys.toString()) currentChord = ind;
      });
      if (currentChord > -1 && sKeys.toString() == chords[currentChord].keys.toString()) {
        chords[currentChord] = new Chord(sKeys, cfg);
      } else {
        chords.push(new Chord(sKeys, cfg));
      }

      console.log(chords);

      closeConfig();
    };

    µ('#saveCloseSettings').onclick = (e)=> {
      e.preventDefault();

      control.send({ setMIDIDevice: {
        mode: 'input',
        name: µ('#deviceDrop').value,
      }, });

      closeSettings();
    };

    µ('#saveClose').onclick = (e)=> {
      e.preventDefault();

      keys.forEach(function (key, ind, arr) {
        if (key.selected) {
          key.lightStyle = makeConfig(ind);

          key.style.backgroundColor = key.lightStyle.color.styleString();
        }
      });

      closeConfig();
    };

    keys.onSelect = (which)=> {
      µ('#configurator').hidden = false;
      if (chords.length) {
        var cDiv = µ('#chords');
        cDiv.innerHTML = '<option value = "-1">Select Chord</span>';
        chords.forEach(function (chord, ind, arr) {
          let newOpt = µ('+option', cDiv);
          newOpt.value = ind;
          newOpt.textContent = chord.name;
        });
      } else {
        var cDiv = µ('#chords');
        cDiv.innerHTML = '<option value = "-1">No Chords</span>';
      }

      µ('#whichKeys').textContent = keys.selectionString();
    };

    keys.onDeselect = (which)=> {
      if (keys.noneSelected()) currentChord = -1;
      µ('#configurator').hidden = keys.noneSelected();
      µ('#whichKeys').textContent = keys.selectionString();
    };

    var makeSampleColor = ()=> {
      var col = new Color([getNum(µ('#rCol')), getNum(µ('#gCol')), getNum(µ('#bCol'))]);
      µ('#sampleColor').style.backgroundColor = col.styleString();
    };

    µ('#rCol').onblur = makeSampleColor;
    µ('#gCol').onblur = makeSampleColor;
    µ('#bCol').onblur = makeSampleColor;

    µ('[name="mode"]').forEach((radio)=> {
      radio.onchange = ()=> {
        /*if (radio.value == 'pulse' ||  radio.value == ''&& radio.checked) {
          µ('#pulseDir').hidden = false;
        } else {
          µ('#pulseDir').hidden = true;
        }*/
      };
    });

    µ('#rainbow').onchange = ()=> {
      if (µ('#rainbow').checked) {
        µ('#colorInputs').hidden = true;
        µ('#colorRange').hidden = false;
      } else {
        µ('#colorInputs').hidden = false;
        µ('#colorRange').hidden = true;
      }
    };

    var lights = [];

    for (var i = 0; i < 88; i++) {
      lights[i] = [0, 0, 0];
    }

    lights[44] = [255, 0, 0];

    document.onkeypress = (e)=> {
      if (e.key == ' ') console.log('Space pressed');
      else if (e.key == 'k') {
        control.send({ setLights: lights });
        console.log('Sent');
      } else if (e.key == 'j') {
        control.send({ keyMode: {
          key: 60,
          mode: 'fade',
          color: [0, 127, 0],
        }, });
      } else if (e.key == 'r') {
        control.send({ keyMode: {
          range: { low: 50, high: 59 },
          mode: 'color',
          color: [0, 0, 127],
        }, });
      }
    };

  };

  provide(exports);
});
