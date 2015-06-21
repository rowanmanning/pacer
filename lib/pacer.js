'use strict';

var _ = require('underscore');
var redis = require('redis');

module.exports = createPacer;
module.exports.defaults = {
    allowOnError: true,
    redisHost: 'localhost',
    redisPort: 6379,
    redisIndex: 0,
    limit: 100,
    reset: 3600
};

function createPacer (options) {
    options = defaultOptions(options);
    var pacer = {
        database: createRedisClient(
            options.redisHost,
            options.redisPort,
            options.redisIndex
        ),
        limit: options.limit,
        reset: options.reset,
        allowOnError: Boolean(options.allowOnError)
    };
    return {
        consume: consumeRateLimit.bind(null, pacer),
        query: queryRateLimit.bind(null, pacer)
    };
}

function createRedisClient (host, port, database) {
    var client = redis.createClient(port, host);
    client.select(database);
    return client;
}

function consumeRateLimit (pacer, consumer, done) {
    performQuery(pacer, consumer, true, done);
}

function queryRateLimit (pacer, consumer, done) {
    performQuery(pacer, consumer, false, done);
}

function performQuery (pacer, consumer, shouldConsume, done) {
    consumer = resolveConsumer(consumer, pacer);
    var multi = pacer.database.multi();
    multi.set([consumer.id, consumer.limit, 'NX', 'EX', consumer.reset]);
    if (shouldConsume) {
        multi.decr(consumer.id);
    }
    else {
        multi.get(consumer.id);
    }
    multi.ttl(consumer.id);
    multi.exec(function (error, results) {
        if (error || !results) {
            consumer.remaining = (pacer.allowOnError ? consumer.limit : 0);
            consumer.reset = 0;
        }
        else {
            consumer.remaining = Math.max(0, parseInt(results[1], 10));
            consumer.reset = parseInt(results[2], 10);
        }
        consumer.error = error;
        consumer.allowed = (consumer.remaining > 0);
        done(consumer);
    });
}

function resolveConsumer (consumer, pacer) {
    return {
        id: resolveConsumerId(consumer),
        limit: parseInt(resolveConsumerLimit(consumer, pacer), 10),
        reset: parseInt(resolveConsumerReset(consumer, pacer), 10)
    };
}

function resolveConsumerId (consumer) {
    if (isObject(consumer)) {
        return consumer.id;
    }
    return String(consumer);
}

function resolveConsumerLimit (consumer, pacer) {
    if (isObject(consumer)) {
        return consumer.limit || pacer.limit;
    }
    return pacer.limit;
}

function resolveConsumerReset (consumer, pacer) {
    if (isObject(consumer)) {
        return consumer.reset || pacer.reset;
    }
    return pacer.reset;
}

function defaultOptions (options) {
    return _.defaults({}, options, createPacer.defaults);
}

function isObject (value) {
    return (value !== null && !Array.isArray(value) && typeof value === 'object');
}
