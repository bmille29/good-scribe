// Load modules

var Boom = require('boom');
var Code = require('code');
var EventEmitter = require('events').EventEmitter;
var Fs = require('fs');
var Hoek = require('hoek');
var Joi = require('joi');
var Lab = require('lab');
var Os = require('os');
var Path = require('path');

var GoodScribe = require('../');


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


// Declare internals

var internals = {
    tempDir: Os.tmpDir()
};


internals.removeLog = function (path) {

    if (Fs.existsSync(path)) {
        Fs.unlinkSync(path);
    }
};


internals.getLog = function (path, callback) {

    Fs.readFile(path, { encoding: 'utf8' }, function (err, data) {

        if (err) {
            return callback(err);
        }

        var results = JSON.parse('[' + data.replace(/\n/g,',').slice(0,-1) + ']');
        return callback(null, results);
    });
};


describe('GoodScribe', function () {

    describe('start()', function () {

        it('logs to the specified file', function (done) {

            var file = Hoek.uniqueFilename(internals.tempDir)
            var reporter = new GoodScribe(file);
            var ee = new EventEmitter();

            reporter.start(ee, function (err) {

                expect(err).to.not.exist();

                expect(reporter.writeStream.path).to.equal(file);
                internals.removeLog(reporter.writeStream.path);
                done();
            });
        });
    });

    describe('stop()', function () {

        it('logs a stream error if it occurs', function (done) {

            var file = Hoek.uniqueFilename(internals.tempDir);
            var reporter = new GoodScribe(file, { request:  '*' });
            var ee = new EventEmitter();
            var logError = console.error;

            console.error = function (value) {

                console.error = logError;
                expect(value.message).to.equal('mock error');
                internals.removeLog(reporter.writeStream.path);
                done();
            };

            reporter.start(ee, function (err) {

                expect(err).to.not.exist();
                reporter.writeStream.emit('error', new Error('mock error'));
            });
        });

        it('ends the stream', function (done) {

            var file = Hoek.uniqueFilename(internals.tempDir);
            var reporter = new GoodScribe(file, { request:  '*' });
            var ee = new EventEmitter();

            reporter.start(ee, function (err) {

                expect(err).to.not.exist();

                ee.emit('report', 'request', { id: 1, timestamp: Date.now() });

                reporter.stop();

                // This should NOT get reported because the stream has been stopped
                ee.emit('report', 'request', { id: 2, timestamp: Date.now() });

                reporter.writeStream.on('finish', function() {

                    expect(reporter.writeStream.bytesWritten).to.equal(35);
                    expect(reporter.writeStream.path).to.equal(file);
                    expect(reporter.writeStream._writableState.ended).to.be.true();

                    internals.removeLog(reporter.writeStream.path);
                    done();
                });
            });
        });
    });

    describe('_report()', function () {

        it('Removes Joi _object data', function (done) {

            var file = Hoek.uniqueFilename(internals.tempDir);
            var reporter = new GoodScribe(file, { request:  '*' });
            var ee = new EventEmitter();

            reporter.start(ee, function (err) {

                expect(err).to.not.exist();

                // Example Joi validation error from Hapi logging
                // _object contains the pre-validation values and should be scrubbed
                var error = {
                    event: 'response',
                    log: [
                        {
                            tags: ['validation', 'error', 'payload'],
                            data: {
                                data: {
                                    name: 'ValidationError',
                                    details: [],
                                    _object: {}
                                },
                                isBoom: true,
                                output: { statusCode: 400 }
                            }
                        }
                    ]
                };

                ee.emit('report', 'request', error);

                reporter.writeStream.on('finish', function() {

                    expect(err).to.not.exist();
                    internals.getLog(reporter.writeStream.path, function (err, results) {

                        expect(err).to.not.exist();
                        expect(results.length).to.equal(1);
                        expect(results[0].log[0].data.data.details).to.exist();
                        expect(results[0].log[0].data.data._object).to.not.exist();

                        internals.removeLog(reporter.writeStream.path);
                        done();
                    });
                });

                reporter.stop();
            });
        });

        it('only modifies logs events with tags', function (done) {

            var file = Hoek.uniqueFilename(internals.tempDir);
            var reporter = new GoodScribe(file, { request:  '*' });
            var ee = new EventEmitter();

            reporter.start(ee, function (err) {

                expect(err).to.not.exist();

                // Example Joi validation error from Hapi logging (without tags)
                var error = {
                    event: 'response',
                    log: [{ tags: false } ]
                };

                ee.emit('report', 'request', error);

                reporter.writeStream.on('finish', function() {

                    expect(err).to.not.exist();
                    internals.getLog(reporter.writeStream.path, function (err, results) {

                        expect(err).to.not.exist();
                        expect(results.length).to.equal(1);
                        internals.removeLog(reporter.writeStream.path);
                        done();
                    });
                });

                reporter.stop();
            });
        });

        it('writes to the current file and does not create a new one', function (done) {

            var file = Hoek.uniqueFilename(internals.tempDir);
            var reporter = new GoodScribe(file, { request:  '*' });
            var ee = new EventEmitter();

            reporter.start(ee, function (err) {

                expect(err).to.not.exist();
                expect(reporter.writeStream.path).to.equal(file);

                for (var i = 0; i < 20; ++i) {
                    ee.emit('report', 'request', { statusCode: 200, id: i, tag: 'my test ' + i });
                }

                reporter.writeStream.on('finish', function() {

                    expect(err).to.not.exist();
                    expect(reporter.writeStream.bytesWritten).to.equal(900);
                    internals.removeLog(reporter.writeStream.path);
                    done();
                });

                reporter.stop();
            });
        });

        it('handles circular references in objects', function (done) {

            var file = Hoek.uniqueFilename(internals.tempDir);
            var reporter = new GoodScribe(file, { request: '*' });
            var ee = new EventEmitter();

            reporter.start(ee, function (err) {

                expect(err).to.not.exist();

                var data = {
                    id: 1,
                    timestamp: Date.now()
                };

                data._data = data;

                ee.emit('report', 'request', data);

                reporter.writeStream.on('finish', function() {

                    internals.getLog(reporter.writeStream.path, function (err, results) {

                        expect(err).to.not.exist();
                        expect(results.length).to.equal(1);
                        expect(results[0]._data).to.equal('[Circular ~]');

                        internals.removeLog(reporter.writeStream.path);

                        done();
                    });
                });

                reporter.stop();
            });
        });

        it('can handle a large number of events', function (done) {

            var file = Hoek.uniqueFilename(internals.tempDir);
            var reporter = new GoodScribe(file, { request: '*' });
            var ee = new EventEmitter();

            reporter.start(ee, function (err) {

                expect(err).to.not.exist();
                expect(reporter.writeStream.path).to.equal(file);

                for (var i = 0; i <= 10000; i++) {
                    ee.emit('report', 'request', { id: i, timestamp: Date.now(), value: 'value for iteration ' + i });
                }

                reporter.writeStream.on('finish', function() {

                    expect(reporter.writeStream.bytesWritten).to.equal(727855);
                    internals.removeLog(reporter.writeStream.path);

                    done();
                });

                reporter.stop();
            });
        });

        it('will log events even after a delay', function (done) {

            var file = Hoek.uniqueFilename(internals.tempDir);
            var reporter = new GoodScribe(file, { request: '*' });
            var ee = new EventEmitter();

            reporter.start(ee, function (err) {

                expect(err).to.not.exist();
                expect(reporter.writeStream.path).to.equal(file);

                for (var i = 0; i <= 100; i++) {
                    ee.emit('report', 'request', { id: i, timestamp: Date.now(), value: 'value for iteration ' + i });
                }

                setTimeout(function() {

                    for (var i = 0; i <= 100; i++) {
                        ee.emit('report', 'request', { id: i, timestamp: Date.now(), value: 'inner iteration ' + i });
                    }

                    reporter.writeStream.on('finish', function() {

                        expect(reporter.writeStream.bytesWritten).to.equal(13498);
                        internals.removeLog(reporter.writeStream.path);
                        done();
                    });

                    reporter.stop();
                }, 500);
            });
        });
    });
});
