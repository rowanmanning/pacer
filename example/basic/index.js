'use strict';

var createPacer = require('../..');

// Create a pacer
var pacer = createPacer({
    limit: 5,  // Allow 5 requests...
    reset: 10  // ...every 10 seconds
});

// Require an argument
if (!process.argv[0]) {
    console.log('Please send an argument to identify the client');
    process.exit(1);
}

// Consume a rate-limit token for the specified client
pacer.consume(process.argv[0], function (info) {
    // Output the rate-limiting details
    console.log(info);
    process.exit();
});
