'use strict';

var createPacer = require('../..');

// Create a pacer
var pacer = createPacer({
    limit: 5, // Allow 5 requests...
    reset: 10 // ...every 10 seconds
});

// Require an argument
if (!process.argv[2]) {
    console.log('Please send an argument to identify the consumer');
    process.exit(1);
}

// Query the rate-limit for the specified consumer without consuming a token
pacer.query(process.argv[2], function (consumer) {
    // Output the rate-limiting details
    console.log(consumer);
    process.exit();
});
