// Karma configuration
// Generated on Sun Jul 06 2014 04:18:28 GMT+0200 (CEST)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['qunit'],

    // list of files / patterns to load in the browser
    files: [
      'src/jquery-2.1.1.js',
      'src/number.isnan.js',
      'src/math.log10.js',
      'src/window.customevent.js',
      'src/window.requestanimationframe.js',
      'src/observe.js',
      'src/mixin.array.js',
      'src/mixin.events.js',
      'src/mixin.storage.js',
      'src/collection.js',
      'src/sparky.js',
      'src/sparky.observe.js',
      'src/sparky.throttle.js',
      'src/sparky.bind.js',
      'src/sparky.ctrl.js',
      'src/sparky.filters.js',
      'src/sparky.ready.js',

      'test/module.js',
      'test/test.*.js'
      //'test/test.sparky-inputs.js',
      //'test/test.sparky-events.js'
    ],

    // list of files to exclude
    exclude: [
      
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'src/sparky*.js': ['coverage'],
      'src/mixin*.js': ['coverage'],
      'src/observe.js': ['coverage'],
      'src/collection.js': ['coverage']
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter

    // Commented for everyday use - the coverage reporter reduces scripts to one
    // line, meaning that karma gives false line numbers for errors
    reporters: ['progress', 'coverage'],

    // optionally, configure the reporter
    coverageReporter: {
      type : 'lcov',
      dir : 'test-coverage/'
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome', 'Firefox', 'Safari'],
    //browsers: ['Firefox'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};
