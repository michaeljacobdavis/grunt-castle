define(function () {

    'use strict';

    var isServer = true,
        _Squire;

    try {
        window;
        isServer = false;
    } catch (e) {
        ; // gulp. yummy error.
    }

    return {

        _resolveMockPath: function (mock) {
            var mocks = this.conf.mocks;
            return mocks.baseUrl + '/' + (mocks && mocks.paths && mocks.paths[mock] ? mocks.paths[mock] : mock) + '.js';
        },

        _loadMock: function (mock, callback) {
            requirejs([this._resolveMockPath(mock)], function (module) {
                callback(module);
            });
        },

        _loadMocks: function (modules, callback) {
            var count = 0,
                mocks = {},
                self = this;
            if (!modules || !modules.length) {
                return callback();
            }

            for (var i = 0; i < modules.length; i++) {
                (function (i) {
                    self._loadMock(modules[i], function (module) {
                        if (typeof module === 'function') {
                            mocks[modules[i]] = _Squire.Helpers.returns(module);
                        } else {
                            mocks[modules[i]] = module;
                        }
                        count++;
                        if (count === modules.length) {
                            callback(mocks);
                        }
                    });
                })(i);
            }
        },

        _loadGlobals: function (modules, callback) {
            var count = 0,
                self = this;
            if (!modules || !modules.length) {
                return callback();
            }
            for (var i = 0; i < modules.length; i++) {
                (function (i) {
                    requirejs([self._resolveMockPath(modules[i].module)], function (module) {
                        count++;
                        if (isServer) {
                            global[modules[i].exports] = global[modules[i].exports] || module;
                        } else {
                            window[modules[i].exports] = window[modules[i].exports] || module;
                        }
                        if (count === modules.length) {
                            callback();
                        }
                    });
                })(i);
            }
        },

        test: function (options) {
            var self = this,
                count = 0,
                done = false,
                moduleToTest;
            options = options || {};

            if (isServer) {
                this.conf = global.castle.config;
            } else {
                this.conf = window.castle.config;
            }

            function cb() {
                if (count === 2) { // wait for globals, mocks, and module
                    options.callback(moduleToTest);
                }
            }

            requirejs(['squire'], function (Squire) {
                var injector = new Squire(options.context || '_');
                _Squire = Squire;

                self._loadMocks(options.mocks, function (mocks) {
                    count++;

                    injector.mock(mocks).require([options.module], function (module) {
                        moduleToTest = module;
                        options.callback(module);
                    });
                });
            });

            this._loadGlobals(options.globals, function () {
                count++;
            });
        }

    };

});