'use strict';

obtain(['µ/commandClient.js'], ({ MuseControl })=> {
  exports.app = {};

  var control = new MuseControl(window.location.hostname);

  exports.app.start = ()=> {

    control.connect();

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
      }
    };

  };

  provide(exports);
});
