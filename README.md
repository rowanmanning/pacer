
Pacer
=====

A flexible, fault-tolerant, Redis-based rate-limiter for Node.js.

[![NPM version][shield-npm]][info-npm]
[![Node.js version support][shield-node]][info-node]
[![Build status][shield-build]][info-build]
[![Dependencies][shield-dependencies]][info-dependencies]
[![MIT licensed][shield-license]][info-license]

```js
var createPacer = require('pacer');

var pacer = createPacer({
    limit: 5,  // Allow 5 requests...
    reset: 10  // ...every 10 seconds
});

pacer.consume('consumer-identifier', function (consumer) {
    // consumer == {
    //     id: 'consumer-identifier',
    //     limit: 5,
    //     remaining: 4,
    //     reset: 10,
    //     allowed: true
    // }
});
```

Table Of Contents
-----------------

- [Install](#install)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Options](#options)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)


Install
-------

Install Pacer with [npm][npm]:

```sh
npm install pacer
```


Getting Started
---------------

Require in and Pacer:

```js
var createPacer = require('pacer');
```

Create a Pacer instance, passing in some [options](#options):

```js
var pacer = createPacer({
    limit: 5,  // Allow 5 requests...
    reset: 10  // ...every 10 seconds
});
```

Consume a token for the `'foo'` consumer. The consumer identifier can be any string you like, for example the request IP, or a username.

```js
pacer.consume('foo', function (consumer) {
    // consumer == {
    //     id: 'foo',
    //     limit: 5,
    //     remaining: 4,
    //     reset: 10,
    //     allowed: true
    // }
});
```

Consumer can also be an object, allowing you to specify a custom limit and reset time for them. This could be used to provide different tiers of rate limiting depending on the user that is accessing your application.

```js
pacer.consume({
    id: 'foo',
    limit: 10,  // Allow 10 requests...
    reset: 5    // ...every 5 seconds
}, function (consumer) {
    // consumer == {
    //     id: 'consumer-identifier',
    //     limit: 10,
    //     remaining: 9,
    //     reset: 5,
    //     allowed: true
    // }
});
```

If you don't wish to consume a token but want to query how many tokens a consumer has remaining, you can use the `query` method. This works with string or object consumers.

```js
pacer.query('foo', function (consumer) {
    // consumer == {
    //     id: 'foo',
    //     limit: 5,
    //     remaining: 5,
    //     reset: 10,
    //     allowed: true
    // }
});
```


Usage
-----

TODO


Options
-------

#### `allowOnError` (boolean)

Whether to allow access for all consumers if the Redis server errors or is down. Defaults to `true`.

#### `limit` (number)

The maximum number of tokens a consumer can use. Defaults to `100`.

#### `redisHost` (string)

The host Redis is running on. Defaults to `'localhost'`.

#### `redisIndex` (number)

The Redis database index to use. Defaults to `0`.

#### `redisPort` (number)

The port Redis is running on. Defaults to `6379`.

#### `reset` (number)

The amount of time (in seconds) before tokens for a consumer are reset to their maximum. Defaults to `3600`.


Examples
--------

Pacer comes with a few examples which demonstrate how you can integrate it with your applications:

#### Basic Example

A simple command-line interface which consumes a rate-limiting token for the given consumer every time it's called.

```
node example/basic myconsumerid
```

#### Query Example

A simple command-line interface which queries the rate-limiting tokens for the given consumer every time it's called, without consuming one.

```
node example/query myconsumerid
```

#### Basic Connect Example

A connect application which consumes a rate-limiting token for the client IP whenever a request it made.

```
node example/connect-basic
```

Then open http://localhost:3000/ in your browser.

#### Connect With Varying Rates Example

A connect application which consumes a rate-limiting token for the client IP whenever a request it made. Google Chrome users get a higher rate limit and a faster reset time, to demonstrate varying rates for different consumer types.

```
node example/connect-varying-rates
```

Then open http://localhost:3000/ in your browser.


Contributing
------------

To contribute to Pacer, clone this repo locally and commit your code on a separate branch.

Please write unit tests for your code, and check that everything works by running the following before opening a pull-request:

```sh
make lint test
```


License
-------

Pacer is licensed under the [MIT][info-license] license.  
Copyright &copy; 2015, Rowan Manning



[npm]: https://npmjs.org/

[info-dependencies]: https://gemnasium.com/rowanmanning/pacer
[info-license]: LICENSE
[info-node]: package.json
[info-npm]: https://www.npmjs.com/package/pacer
[info-build]: https://travis-ci.org/rowanmanning/pacer
[shield-dependencies]: https://img.shields.io/gemnasium/rowanmanning/pacer.svg
[shield-license]: https://img.shields.io/badge/license-MIT-blue.svg
[shield-node]: https://img.shields.io/node/v/pacer.svg?label=node.js%20support
[shield-npm]: https://img.shields.io/npm/v/pacer.svg
[shield-build]: https://img.shields.io/travis/rowanmanning/pacer/master.svg
