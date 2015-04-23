/* jshint maxstatements: false, maxlen: false */
/* global beforeEach, describe, it */
'use strict';

var assert = require('proclaim');

describe('lib/pacer', function () {
    var createPacer;

    beforeEach(function () {

        createPacer = require('../../../lib/pacer');

    });

    it('should be a function', function () {
        assert.isFunction(createPacer);
    });

});