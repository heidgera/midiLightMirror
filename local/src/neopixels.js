var ws2812_nonRPi = { render: ()=> {}, init: ()=> {}, reset: ()=> {} };

//'rpi-ws281x-native'
var os = require('os');

var obtains = [
  'µ/color.js',
  (os.platform() == 'linux') ? 'rpi-ws281x-native' : './src/dummyLights.js'
];
if (os.release() !== '4.10.0-35-generic' && os.platform() == 'linux') obtains[1] = 'rpi-ws281x-native';

obtain(obtains, ({ rainbow, Color }, ws2812 = ws2812_nonRPi)=> {//'rpi-ws281x-native'

  console.log(ws2812);

  exports.Color = Color;

  exports.rainbow = rainbow;

  exports.pixels = {

    color: (r, g, b)=>((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff),

    show: function () {
      ws2812.render(this.data);
    },

    setIndicator: function (color) {
      this.data[0] = this.color.apply(null, color);
      this.show();
    },

    set: function (num, r, g, b) {
      this.data[num + 1] = this.color(r, g, b);
    },

    setByArray: function (num, arr) {
      this.data[num + 1] = this.color.apply(null, arr);
    },

    setEach: function (cb) { // cb in form of (ind,arr)
      var orig = this.data[0];
      this.data = this.data.map((val, ind, arr)=>cb(ind, arr));
      this.data[0] = orig;
    },

    setEachRGB: function (cb) { // cb in form of (ind,arr)
      var _this = this;
      var orig = this.data[0];
      this.data = this.data.map((val, ind, arr)=>_this.color.apply(
        null,
        cb(new Color([(val >> 16) & 0xff, (val >> 8) & 0xff, val & 0xff]), ind, arr)
      ));
      this.data[0] = orig;
    },

    init: function (numLEDs) {
      var _this = this;
      _this.data = new Uint32Array(numLEDs + 1);
      ws2812.init(numLEDs + 1);

      this.setIndicator([0, 127, 0]);
    },

    reset: ws2812.reset,
  };
});
