'use strict';

var cc     = require('ceci-core');
var Buffer = require('./buffers').Buffer;


function Channel(buffer) {
  this.buffer   = buffer;
  this.pending  = [];
  this.data     = [];
  this.pressure = 0;
  this.isClosed = false;
};

Channel.prototype.pushBuffer = function(val) {
  return this.buffer ? this.buffer.push(val) : false;
};

Channel.prototype.pullBuffer = function() {
  if (this.buffer)
    return this.buffer.pull()[0];
};

Channel.prototype.tryPush = function(val) {
  if (this.pressure < 0) {
    var client = this.pending.shift();
    client.resolve(this.pushBuffer(val) ? this.pullBuffer() : val);
    ++this.pressure;
    return true;
  } else
    return this.pushBuffer(val);
};

Channel.prototype.requestPush = function(val, client) {
  if (val === undefined)
    client.reject(new Error("push() requires an value"));
  else if (this.isClosed)
    client.resolve(false);
  else if (this.tryPush(val))
    client.resolve(true);
  else {
    this.pending.push(client);
    this.data.push(val);
    ++this.pressure;
  }
};

Channel.prototype.tryPull = function() {
  if (this.pressure > 0) {
    var client = this.pending.shift();
    var val    = this.data.shift();
    var pulled = this.pullBuffer();
    if (pulled !== undefined) {
      this.pushBuffer(val);
      val = pulled;
    }
    client.resolve(true);
    --this.pressure;
    return val;
  } else
    return this.pullBuffer();
};

Channel.prototype.requestPull = function(client) {
  var res = this.tryPull();
  if (res !== undefined)
    client.resolve(res);
  else if (this.isClosed)
    client.resolve();
  else {
    this.pending.push(client);
    --this.pressure;
  }
};

Channel.prototype.cancelRequest = function(client) {
  for (var i = 0; i < this.pending.length; ++i) {
    if (this.pending[i] === client) {
      this.pending.splice(i, 1);
      if (this.pressure > 0) {
        this.data.splice(i, 1);
        --this.pressure;
      } else
        ++this.pressure;
      break;
    }
  }
};

Channel.prototype.close = function() {
  var val = this.pressure < 0 ? undefined : false;

  this.pending.forEach(function(client) {
    client.resolve(val);
  });

  this.pending = [];
  this.data = [];
  this.pressure = 0;
  this.isClosed = true;
};


exports.chan = function(arg) {
  var buffer;
  if (typeof arg == "object")
    buffer = arg;
  else if (arg)
    buffer = new Buffer(arg);
  return new Channel(buffer);
};

exports.push = function(ch, val) {
  var a = cc.defer();
  ch.requestPush(val, a);
  return a;
};

exports.pull = function(ch) {
  var a = cc.defer();
  ch.requestPull(a);
  return a;
};

exports.close = function(ch) {
  ch.close();
};


var isObject = function(x) {
  return x != null && x.constructor === Object;
};


var randomShuffle = function(a) {
  var i, k, t;
  for (i = a.length; i > 1; --i) {
    k = Math.floor(Math.random() * i);
    t = a[k];
    a[k] = a[i-1];
    a[i-1] = t;
  }
};


var makeClient = function(channel, result, cleanup) {
  return {
    resolve: function(val) {
      cleanup();
      result.resolve({ channel: channel, value: val });
    },
    reject: function(err) {
      cleanup();
      result.reject(new Error(err));
    },
    cancel: function() {
      if (channel)
        channel.cancelRequest(this);
    }
  };
};


exports.select = function() {
  var args    = Array.prototype.slice.call(arguments);
  var options = isObject(args[args.length - 1]) ? args.pop() : {};
  var result  = cc.defer();
  var active  = [];
  var cleanup = function() {
    for (var i = 0; i < active.length; ++i)
      active[i].cancel();
  };
  var i, op, channel, client;

  if (!options.priority)
    randomShuffle(args);

  for (i = 0; i < args.length; ++i) {
    op = args[i];

    if (!Array.isArray(op)) {
      channel = op;
      client = makeClient(channel, result, cleanup);
      channel.requestPull(client);
    } else {
      channel = op[0];
      client = makeClient(channel, result, client);
      channel.requestPush(client, op[1]);
    }

    active.push(client);

    if (result.isResolved())
      break;
  }

  if (options.hasOwnProperty('default') && !result.isResolved()) {
    cleanup();
    result.resolve({ channel: null, value: options['default'] });
  }

  return result;
};
