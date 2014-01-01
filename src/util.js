'use strict';

var cc       = require('ceci-core');
var channels = require('./channels');


exports.timeout = function(ms) {
  var ch = channels.chan();
  var t = setTimeout(function() {
    clearTimeout(t);
    channels.close(ch);
  }, ms);
  return ch;
};


exports.ticker = function(ms) {
  var ch = channels.chan();
  var t;
  var step = function() {
    clearTimeout(t);
    t = setTimeout(step, ms);
    cc.go(function*() {
      if (!(yield channels.push(ch, null)))
        clearTimeout(t);
    });
  };
  t = setTimeout(step, ms);
  return ch;
};


exports.fromStream = function(stream, outch, keepOpen)
{
  var ch = outch || channels.chan();

  stream.on('readable', function() {
    cc.go(function*() {
      var chunk;
      while (null !== (chunk = stream.read()))
        yield channels.push(ch, chunk);
    });
  });

  stream.on('end', function() {
    if (!keepOpen)
      cc.go(function*() { channels.close(ch); });
  });

  stream.on('error', function(err) {
    throw new Error(err);
  });

  return ch;
};
