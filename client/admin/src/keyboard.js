obtain(['µ/color.js'], ({ Color, rainbow })=> {
  var mkOff = 9;

  exports.midiKeyOffset = mkOff;

  exports.Keyboard = function (holder) {
    var keys = [];

    var notes = [
      'A',
      'A_sharp',
      'B',
      'C',
      'C_sharp',
      'D',
      'D_sharp',
      'E',
      'F',
      'F_sharp',
      'G',
      'G_sharp',
    ];

    keys.onSelect = ()=> {};

    keys.onDeselect = ()=> {};

    var mouseState = false;
    var mouseMode = false;

    document.addEventListener('mouseup', ()=> {
      mouseState = false;
    });

    for (let i = 0; i < 88; i++) {
      keys.push(µ('+div', holder));
      keys[i].className = 'key';
      keys[i].setAttribute('note', notes[i % 12]);
      keys[i].selected = false;
      keys[i].midiNum = i + mkOff;

      keys[i].style.backgroundColor = ((notes[i % 12].includes('sharp')) ? 'black' : 'white');

      //keys[i].onSelect = ()=> {};

      keys[i].onmousedown = (e)=> {
        e.preventDefault();
        mouseState = true;
        if (!keys[i].selected) {
          keys[i].select();
          mouseMode = true;
        } else {
          keys[i].deselect();
          mouseMode = false;
        }

        console.log(keys.selectionString());
      };

      keys[i].onmouseover = (e)=> {
        if (mouseState) (mouseMode) ? keys[i].select() : keys[i].deselect();
      };

      keys[i].select = ()=> {
        keys[i].selected = true;
        keys[i].style.borderColor = '#fff';
        keys.onSelect(i);
      };

      keys[i].deselect = ()=> {
        keys[i].selected = false;
        keys[i].style.borderColor = '#000';
        keys.onDeselect(i);
      };

      keys[i].toggle = ()=> {
        if (keys[i].selected) keys[i].deselect();
        else keys[i].select();
      };
    }

    keys.selectAll = (afterCB)=> {
      keys.forEach(function (key, ind, arr) {
        key.select();
      });

      if (afterCB) afterCB();
    };

    keys.deselectAll = (afterCB)=> {
      keys.forEach(function (key, ind, arr) {
        key.deselect();
      });

      if (afterCB) afterCB();
    };

    keys.noneSelected = () => keys.reduce((acc, key)=>acc && !key.selected, true);

    keys.selectionString = ()=> {
      var selStr = '';
      var prevSelected = 0;
      var groups = 0;
      for (var i = 0; i < keys.length; i++) {
        var j = keys[i].midiNum;
        if (keys[i].selected && !prevSelected) {
          groups++;
          selStr += ((selStr.length) ? ', ' : '') + (j);
          prevSelected = i + 1;
        } else if (prevSelected && ((!keys[i].selected && prevSelected != i) || i == keys.length - 1)) {
          selStr += '-' + j;
        }

        prevSelected = (keys[i].selected) ? prevSelected : 0;
      }

      if (groups > 3) selStr = 'Many';
      if (!selStr.length) selStr = 'None';

      return selStr;
    };

    return keys;
  };

  provide(exports);
});
