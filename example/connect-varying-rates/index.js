'use strict';

var connect = require('connect');
var createPacer = require('../..');

// Create a connect application
var app = connect();

// Create a pacer
var pacer = createPacer({
    limit: 5,  // Allow 5 requests...
    reset: 10  // ...every 10 seconds
});

// Add a request handler
app.use(function (request, response) {

    // We're only interested in traffic to / for this example
    if (request.url !== '/') {
        response.writeHead(404);
        return response.end('Not Found');
    }

    // Create consumer information
    var consumer = {
        id: request.connection.remoteAddress + ', ' + request.headers['user-agent'],
    };

    // Give Google Chrome users a better rate limit and reset time
    if (request.headers['user-agent'].indexOf('Chrome/') !== -1) {
        consumer.limit = 10;  // Allow 10 requests...
        consumer.reset = 5;   // ...every 5 seconds
    }

    // Consume a rate-limit token for the consumer
    pacer.consume(consumer, function (consumer) {
        // Output the rate-limiting details
        response.end(JSON.stringify(consumer, null, 4));
    });

});

// Listen on a port
var port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log('Application running on port %s', port);
    console.log('Visit http://localhost:%s/ in your browser', port);
});
