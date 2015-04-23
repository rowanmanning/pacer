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
        allowOnError: !!options.allowOnError
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

function consumeRateLimit (pacer, client, done) {
    performQuery(pacer, client, true, done);
}

function queryRateLimit (pacer, client, done) {
    performQuery(pacer, client, false, done);
}

function performQuery (pacer, client, shouldConsume, done) {
    client = resolveClient(client, pacer);
    var multi = pacer.database.multi();
    multi.set([client.id, client.limit, 'NX', 'EX', client.reset]);
    if (shouldConsume) {
        multi.decr(client.id);
    } else {
        multi.get(client.id);
    }
    multi.ttl(client.id);
    multi.exec(function (error, results) {
        if (error || !results) {
            client.remaining = (pacer.allowOnError ? client.limit : 0);
            client.reset = 0;
        } else {
            client.remaining = Math.max(0, parseInt(results[1], 10));
            client.reset = parseInt(results[2], 10);
        }
        client.error = error;
        client.allowed = (client.remaining > 0);
        done(client);
    });
}

function resolveClient (client, pacer) {
    return {
        id: resolveClientId(client),
        limit: parseInt(resolveClientLimit(client, pacer), 10),
        reset: parseInt(resolveClientReset(client, pacer), 10)
    };
}

function resolveClientId (client) {
    if (isObject(client)) {
        return client.id;
    }
    return client + '';
}

function resolveClientLimit (client, pacer) {
    if (isObject(client)) {
        return client.limit || pacer.limit;
    }
    return pacer.limit;
}

function resolveClientReset (client, pacer) {
    if (isObject(client)) {
        return client.reset || pacer.reset;
    }
    return pacer.reset;
}

function defaultOptions (options) {
    return _.defaults({}, options, createPacer.defaults);
}

function isObject (value) {
    return (value !== null && !Array.isArray(value) && typeof value === 'object');
}
