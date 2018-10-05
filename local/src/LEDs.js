obtain(['µ/SerialElectron.js'], ({ Serial })=> {
  var Neopixel = function () {
    var _this = this;

    var ser = new Serial();
    ser.endBit = 128;
    ser.openByName('/dev/ttyAMA0', ()=> {}, 57600);

    _this.setColor = (which, r, g, b)=> {
      if (r > 127 || g > 127 || b > 127) console.error('Color values must be less than 128');
      else {
        ser.send([128 + 32, which, r, g, b]);
      }
    };

    _this.setColorRange = (low, high, r, g, b)=> {
      if (r > 127 || g > 127 || b > 127) console.error('Color values must be less than 128');
      else {
        ser.send([128 + 24, low, high, r, g, b]);
      }
    };

    _this.show = ()=> {
      ser.send([128 + 64]);
    };

    _this.setMaxLEDs = (num)=> {
      if (num > 300) console.error('Max LEDs must be less than 88');
      else ser.send([128 + 96, num]);
    };

    _this.indicatorOn = ()=> {
      //ser.send([105,110,105,116]);
      ser.send([128 + 16]);
    };

    _this.indicatorOff = ()=> {
      ser.send([128 + 8]);
    };
  };

  exports.LEDs = new Neopixel();
});
