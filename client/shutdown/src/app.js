'use strict';

obtain(['µ/commandClient.js'], ({ MuseControl })=> {
  exports.app = {};

  var control = new MuseControl(window.location.hostname);

  exports.app.start = ()=> {
    control.onConnect = ()=> {
      console.log('Connecting to server...');
      control.send({ shutdown: true });
    };

    control.connect();
  };

  provide(exports);
});
