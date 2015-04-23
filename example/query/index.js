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

// Query the rate-limit for the specified client without consuming a token
pacer.query(process.argv[0], function (info) {
    // Output the rate-limiting details
    console.log(info);
    process.exit();
});
