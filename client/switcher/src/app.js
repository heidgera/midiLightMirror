'use strict';

obtain(['µ/commandClient.js'], ({ MuseControl })=> {
  exports.app = {};

  var control = new MuseControl(window.location.hostname);

  exports.app.start = ()=> {
    control.onConnect = ()=> {
      console.log('Connecting to server...');
      control.send({ listConfigs: true });
    };

    control.connect();

    control.addListener('listConfigs', (configs)=> {
      var cfgLst = µ('#configList');
      cfgLst.innerHTML = '';
      var cfg = µ('+optgroup', cfgLst);
      configs.forEach(function (conf, ind, arr) {
        let newOpt = µ('+option', cfg);
        newOpt.value = conf;
        newOpt.textContent = conf;
      });
    });

    control.addListener('currentConfig', (config)=> {
      µ('#current').textContent = config + ' is currently loaded.';
    });

    µ('#load').onclick = (e)=> {
      e.preventDefault();
      control.send({ setConfigByName: µ('#configList').value });
    };
  };

  provide(exports);
});
