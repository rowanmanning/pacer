'use strict';

var sinon = require('sinon');

module.exports = {
    createClient: sinon.stub().returns({
        select: sinon.spy(),
        multi: sinon.stub().returns({
            decr: sinon.spy(),
            exec: sinon.stub().yields(),
            get: sinon.spy(),
            set: sinon.spy(),
            ttl: sinon.spy()
        })
    })
};
