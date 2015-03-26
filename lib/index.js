// Load modules

var Fs = require('fs');
var GoodReporter = require('good-reporter');
var Hoek = require('hoek');
var Joi = require('joi');
var Os = require('os');
var Path = require('path');
var Stream = require('stream');
var Stringify = require('json-stringify-safe');


// Declare internals

var internals = {
    defaults: {},
    delimiter: Os.EOL,
    sanitize: new RegExp(Hoek.escapeRegex(Path.sep), 'g'),
    filter: {
        response: ['error', 'payload', 'validation']
    },
    schema: {
        options: Joi.string().required()
    }
};


module.exports = internals.GoodScribe = function (options, events) {

    Hoek.assert(this.constructor === internals.GoodScribe, 'Must be instantiated using new');
    Joi.assert(options, internals.schema.options);

    this.settings = { file: options };
    this.state = { active: true };

    GoodReporter.call(this, events);
    return this;
};


Hoek.inherits(internals.GoodScribe, GoodReporter);


internals.GoodScribe.prototype.start = function (emitter, callback) {

    var onReport = this._handleEvent.bind(this);
    emitter.on('report', onReport);

    var onStreamError = function (err) {

        emitter.removeListener('report', onReport);
        console.error(err);
    };

    this.readableStream = new Stream.Readable();
    this.readableStream._read = Hoek.ignore;

    this.writeStream = Fs.createWriteStream(this.settings.file, { flags: 'a' });
    this.writeStream.once('error', onStreamError);

    this.readableStream.pipe(this.writeStream);
    return callback();
};


internals.GoodScribe.prototype.stop = function () {

    this.state.active = false;
    this.readableStream.push(null);
};


internals.GoodScribe.prototype._report = function (event, eventData) {

    if (eventData.event === 'response' && eventData.log) {
        for (var i = 0, il = eventData.log.length ; i < il; i++) {
            var log = eventData.log[i];
            if (log.tags && Hoek.contain(log.tags, internals.filter.response)) {
                // Remove Joi _object which may contain sensitive data
                delete log.data.data._object;
            }
        };
    }

    if (this.state.active) {
        this.readableStream.push(Stringify(eventData) + internals.delimiter);
    }
};
