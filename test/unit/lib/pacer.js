/* jshint maxstatements: false, maxlen: false */
/* global beforeEach, describe, it */
'use strict';

var assert = require('proclaim');
var mockery = require('mockery');
var sinon = require('sinon');

describe('lib/pacer', function () {
    var createPacer, redis, underscore;

    beforeEach(function () {

        redis = require('../mock/redis');
        mockery.registerMock('redis', redis);

        underscore = require('../mock/underscore');
        mockery.registerMock('underscore', underscore);

        createPacer = require('../../../lib/pacer');

    });

    it('should be a function', function () {
        assert.isFunction(createPacer);
    });

    it('should have a `defaults` property', function () {
        assert.isObject(createPacer.defaults);
    });

    describe('.defaults', function () {
        var defaults;

        beforeEach(function () {
            defaults = createPacer.defaults;
        });

        it('should have an `allowOnError` property', function () {
            assert.isTrue(defaults.allowOnError);
        });

        it('should have a `redisHost` property', function () {
            assert.strictEqual(defaults.redisHost, 'localhost');
        });

        it('should have a `redisPort` property', function () {
            assert.strictEqual(defaults.redisPort, 6379);
        });

        it('should have a `redisIndex` property', function () {
            assert.strictEqual(defaults.redisIndex, 0);
        });

        it('should have a `limit` property', function () {
            assert.strictEqual(defaults.limit, 100);
        });

        it('should have a `reset` property', function () {
            assert.strictEqual(defaults.reset, 3600);
        });

    });

    describe('createPacer()', function () {
        var options, pacer, redisClient;

        beforeEach(function () {
            options = {
                allowOnError: true,
                redisHost: 'localhost',
                redisPort: 6379,
                redisIndex: 0,
                limit: 100,
                reset: 3600
            };
            pacer = createPacer(options);
            redisClient = redis.createClient.firstCall.returnValue;
        });

        it('should default the options', function () {
            assert.isTrue(underscore.defaults.calledOnce);
            assert.deepEqual(underscore.defaults.firstCall.args[0], {});
            assert.strictEqual(underscore.defaults.firstCall.args[1], options);
            assert.strictEqual(underscore.defaults.firstCall.args[2], createPacer.defaults);
        });

        it('should create a Redis client', function () {
            assert.isTrue(redis.createClient.withArgs(options.redisPort, options.redisHost).calledOnce);
        });

        it('should select a Redis database', function () {
            assert.isTrue(redisClient.select.withArgs(options.redisIndex).calledOnce);
        });

        it('should return an object', function () {
            assert.isObject(pacer);
        });

        describe('returned object', function () {

            it('should have a `consume` method', function () {
                assert.isFunction(pacer.consume);
            });

            describe('.consume() with a string client', function () {
                var client, multi;

                beforeEach(function (done) {
                    client = 'foo';
                    pacer.consume(client, function () {
                        multi = redisClient.multi.firstCall.returnValue;
                        done();
                    });
                });

                it('should create a Redis multi command', function () {
                    assert.isTrue(redisClient.multi.calledOnce);
                });

                it('should SET the client key in Redis', function () {
                    assert.isTrue(multi.set.calledOnce);
                    assert.deepEqual(multi.set.firstCall.args[0], [
                        client,
                        options.limit,
                        'NX',
                        'EX',
                        options.reset
                    ]);
                });

                it('should DECR the client key in Redis', function () {
                    assert.isTrue(multi.decr.withArgs(client).calledOnce);
                });

                it('should not GET the client key in Redis', function () {
                    assert.isFalse(multi.get.called);
                });

                it('should get the TTL of the client key in Redis', function () {
                    assert.isTrue(multi.ttl.withArgs(client).calledOnce);
                });

                it('should execute the multi command with a callback', function () {
                    assert.isTrue(multi.exec.calledOnce);
                    assert.isFunction(multi.exec.firstCall.args[0]);
                });

                it('should call Redis multi functions in order', function () {
                    sinon.assert.callOrder(
                        redisClient.multi,
                        multi.set,
                        multi.decr,
                        multi.ttl,
                        multi.exec
                    );
                });

            });

            describe('.consume() with an object client', function () {
                var client, multi;

                beforeEach(function (done) {
                    client = {
                        id: 'foo',
                        limit: 1234,
                        reset: 5678
                    };
                    pacer.consume(client, function () {
                        multi = redisClient.multi.firstCall.returnValue;
                        done();
                    });
                });

                it('should create a Redis multi command', function () {
                    assert.isTrue(redisClient.multi.calledOnce);
                });

                it('should SET the client key in Redis', function () {
                    assert.isTrue(multi.set.calledOnce);
                    assert.deepEqual(multi.set.firstCall.args[0], [
                        client.id,
                        client.limit,
                        'NX',
                        'EX',
                        client.reset
                    ]);
                });

                it('should DECR the client key in Redis', function () {
                    assert.isTrue(multi.decr.withArgs(client.id).calledOnce);
                });

                it('should not GET the client key in Redis', function () {
                    assert.isFalse(multi.get.called);
                });

                it('should get the TTL of the client key in Redis', function () {
                    assert.isTrue(multi.ttl.withArgs(client.id).calledOnce);
                });

                it('should execute the multi command with a callback', function () {
                    assert.isTrue(multi.exec.calledOnce);
                    assert.isFunction(multi.exec.firstCall.args[0]);
                });

                it('should call Redis multi functions in order', function () {
                    sinon.assert.callOrder(
                        redisClient.multi,
                        multi.set,
                        multi.decr,
                        multi.ttl,
                        multi.exec
                    );
                });

            });

            describe('.consume() result handler', function () {
                var exec;

                beforeEach(function () {
                    exec = redisClient.multi.defaultBehavior.returnValue.exec;
                });

                describe('when there are tokens remaining', function () {
                    var info, resultHandler;

                    beforeEach(function (done) {
                        exec.yields(null, [
                            null,
                            '12', // remaining
                            '345' // reset
                        ]);
                        pacer.consume('foo', function (result) {
                            info = result;
                            resultHandler = exec.firstCall.args[0];
                            done();
                        });
                    });

                    it('should callback with the expected info object', function () {
                        assert.strictEqual(info.id, 'foo');
                        assert.strictEqual(info.limit, 100);
                        assert.strictEqual(info.reset, 345);
                        assert.strictEqual(info.remaining, 12);
                        assert.isNull(info.error);
                        assert.isTrue(info.allowed);
                    });

                });

                describe('when no more tokens are remaining', function () {
                    var info, resultHandler;

                    beforeEach(function (done) {
                        exec.yields(null, [
                            null,
                            '0' // remaining
                        ]);
                        pacer.consume('foo', function (result) {
                            info = result;
                            resultHandler = exec.firstCall.args[0];
                            done();
                        });
                    });

                    it('should callback with the expected info object', function () {
                        assert.strictEqual(info.remaining, 0);
                        assert.isNull(info.error);
                        assert.isFalse(info.allowed);
                    });

                });

                describe('when remaining tokens are negative', function () {
                    var info, resultHandler;

                    beforeEach(function (done) {
                        exec.yields(null, [
                            null,
                            '-1' // remaining
                        ]);
                        pacer.consume('foo', function (result) {
                            info = result;
                            resultHandler = exec.firstCall.args[0];
                            done();
                        });
                    });

                    it('should callback with the expected info object', function () {
                        assert.strictEqual(info.remaining, 0);
                        assert.isNull(info.error);
                        assert.isFalse(info.allowed);
                    });

                });

                describe('when the Redis query errors and `options.allowOnError` is `true`', function () {
                    var error, info, resultHandler;

                    beforeEach(function (done) {
                        error = new Error('...');
                        exec.yields(error, null);
                        pacer.consume('foo', function (result) {
                            info = result;
                            resultHandler = exec.firstCall.args[0];
                            done();
                        });
                    });

                    it('should callback with the expected info object', function () {
                        assert.strictEqual(info.id, 'foo');
                        assert.strictEqual(info.limit, 100);
                        assert.strictEqual(info.reset, 0);
                        assert.strictEqual(info.remaining, 100);
                        assert.strictEqual(info.error, error);
                        assert.isTrue(info.allowed);
                    });

                });

                describe('when the Redis query errors and `options.allowOnError` is `false`', function () {
                    var error, info, resultHandler;

                    beforeEach(function (done) {
                        error = new Error('...');
                        exec.yields(error, null);
                        options.allowOnError = false;
                        pacer = createPacer(options);
                        pacer.consume('foo', function (result) {
                            info = result;
                            resultHandler = exec.firstCall.args[0];
                            done();
                        });
                    });

                    it('should callback with the expected info object', function () {
                        assert.strictEqual(info.id, 'foo');
                        assert.strictEqual(info.limit, 100);
                        assert.strictEqual(info.reset, 0);
                        assert.strictEqual(info.remaining, 0);
                        assert.strictEqual(info.error, error);
                        assert.isFalse(info.allowed);
                    });

                });

            });

            it('should have a `query` method', function () {
                assert.isFunction(pacer.query);
            });

            describe('.query() with a string client', function () {
                var client, multi;

                beforeEach(function (done) {
                    client = 'foo';
                    pacer.query(client, function () {
                        multi = redisClient.multi.firstCall.returnValue;
                        done();
                    });
                });

                it('should create a Redis multi command', function () {
                    assert.isTrue(redisClient.multi.calledOnce);
                });

                it('should SET the client key in Redis', function () {
                    assert.isTrue(multi.set.calledOnce);
                    assert.deepEqual(multi.set.firstCall.args[0], [
                        client,
                        options.limit,
                        'NX',
                        'EX',
                        options.reset
                    ]);
                });

                it('should GET the client key in Redis', function () {
                    assert.isTrue(multi.get.withArgs(client).calledOnce);
                });

                it('should not DECR the client key in Redis', function () {
                    assert.isFalse(multi.decr.called);
                });

                it('should get the TTL of the client key in Redis', function () {
                    assert.isTrue(multi.ttl.withArgs(client).calledOnce);
                });

                it('should execute the multi command with a callback', function () {
                    assert.isTrue(multi.exec.calledOnce);
                    assert.isFunction(multi.exec.firstCall.args[0]);
                });

                it('should call Redis multi functions in order', function () {
                    sinon.assert.callOrder(
                        redisClient.multi,
                        multi.set,
                        multi.get,
                        multi.ttl,
                        multi.exec
                    );
                });

            });

            describe('.query() with an object client', function () {
                var client, multi;

                beforeEach(function (done) {
                    client = {
                        id: 'foo',
                        limit: 1234,
                        reset: 5678
                    };
                    pacer.query(client, function () {
                        multi = redisClient.multi.firstCall.returnValue;
                        done();
                    });
                });

                it('should create a Redis multi command', function () {
                    assert.isTrue(redisClient.multi.calledOnce);
                });

                it('should SET the client key in Redis', function () {
                    assert.isTrue(multi.set.calledOnce);
                    assert.deepEqual(multi.set.firstCall.args[0], [
                        client.id,
                        client.limit,
                        'NX',
                        'EX',
                        client.reset
                    ]);
                });

                it('should GET the client key in Redis', function () {
                    assert.isTrue(multi.get.withArgs(client.id).calledOnce);
                });

                it('should not DECR the client key in Redis', function () {
                    assert.isFalse(multi.decr.called);
                });

                it('should get the TTL of the client key in Redis', function () {
                    assert.isTrue(multi.ttl.withArgs(client.id).calledOnce);
                });

                it('should execute the multi command with a callback', function () {
                    assert.isTrue(multi.exec.calledOnce);
                    assert.isFunction(multi.exec.firstCall.args[0]);
                });

                it('should call Redis multi functions in order', function () {
                    sinon.assert.callOrder(
                        redisClient.multi,
                        multi.set,
                        multi.get,
                        multi.ttl,
                        multi.exec
                    );
                });

            });

            describe('.query() result handler', function () {
                var exec;

                beforeEach(function () {
                    exec = redisClient.multi.defaultBehavior.returnValue.exec;
                });

                describe('when there are tokens remaining', function () {
                    var info, resultHandler;

                    beforeEach(function (done) {
                        exec.yields(null, [
                            null,
                            '12', // remaining
                            '345' // reset
                        ]);
                        pacer.query('foo', function (result) {
                            info = result;
                            resultHandler = exec.firstCall.args[0];
                            done();
                        });
                    });

                    it('should callback with the expected info object', function () {
                        assert.strictEqual(info.id, 'foo');
                        assert.strictEqual(info.limit, 100);
                        assert.strictEqual(info.reset, 345);
                        assert.strictEqual(info.remaining, 12);
                        assert.isNull(info.error);
                        assert.isTrue(info.allowed);
                    });

                });

                describe('when no more tokens are remaining', function () {
                    var info, resultHandler;

                    beforeEach(function (done) {
                        exec.yields(null, [
                            null,
                            '0' // remaining
                        ]);
                        pacer.query('foo', function (result) {
                            info = result;
                            resultHandler = exec.firstCall.args[0];
                            done();
                        });
                    });

                    it('should callback with the expected info object', function () {
                        assert.strictEqual(info.remaining, 0);
                        assert.isNull(info.error);
                        assert.isFalse(info.allowed);
                    });

                });

                describe('when remaining tokens are negative', function () {
                    var info, resultHandler;

                    beforeEach(function (done) {
                        exec.yields(null, [
                            null,
                            '-1' // remaining
                        ]);
                        pacer.query('foo', function (result) {
                            info = result;
                            resultHandler = exec.firstCall.args[0];
                            done();
                        });
                    });

                    it('should callback with the expected info object', function () {
                        assert.strictEqual(info.remaining, 0);
                        assert.isNull(info.error);
                        assert.isFalse(info.allowed);
                    });

                });

                describe('when the Redis query errors and `options.allowOnError` is `true`', function () {
                    var error, info, resultHandler;

                    beforeEach(function (done) {
                        error = new Error('...');
                        exec.yields(error, null);
                        pacer.query('foo', function (result) {
                            info = result;
                            resultHandler = exec.firstCall.args[0];
                            done();
                        });
                    });

                    it('should callback with the expected info object', function () {
                        assert.strictEqual(info.id, 'foo');
                        assert.strictEqual(info.limit, 100);
                        assert.strictEqual(info.reset, 0);
                        assert.strictEqual(info.remaining, 100);
                        assert.strictEqual(info.error, error);
                        assert.isTrue(info.allowed);
                    });

                });

                describe('when the Redis query errors and `options.allowOnError` is `false`', function () {
                    var error, info, resultHandler;

                    beforeEach(function (done) {
                        error = new Error('...');
                        exec.yields(error, null);
                        options.allowOnError = false;
                        pacer = createPacer(options);
                        pacer.query('foo', function (result) {
                            info = result;
                            resultHandler = exec.firstCall.args[0];
                            done();
                        });
                    });

                    it('should callback with the expected info object', function () {
                        assert.strictEqual(info.id, 'foo');
                        assert.strictEqual(info.limit, 100);
                        assert.strictEqual(info.reset, 0);
                        assert.strictEqual(info.remaining, 0);
                        assert.strictEqual(info.error, error);
                        assert.isFalse(info.allowed);
                    });

                });

            });

        });

    });

});