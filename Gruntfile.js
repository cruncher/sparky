module.exports = function(grunt) {
	grunt.initConfig({
		concat: {
			'package/sparky.js': [
				'modules/fn/polyfills/object.assign.js',
				'modules/fn/polyfills/number.isnan.js',
				'modules/fn/polyfills/math.log10.js',
				'modules/fn/polyfills/window.customevent.js',
				'modules/fn/polyfills/window.requestanimationframe.js',
				'modules/fn/js/fn.js',
				'modules/fn/js/events.js',
				'modules/collection/js/observe.js',
				'modules/collection/js/collection.js',
				'js/sparky.js',
				'js/sparky.dom.js',
				'js/sparky.observe.js',
				'js/sparky.render.js',
				'js/sparky.parse.js',
				'js/sparky.fn.js',
				'js/sparky.fn.each.js',
				'js/sparky.fn.value.js',
				'js/sparky.filters.js',
				'config-package.js'
			]
		},

		uglify: {
			target: {
				files: {
					'package/sparky.min.js': ['package/sparky.js']
				}
			},
			options: {
				maxLineLen: 4096,
				compress: {
					dead_code: true
				}
			}
		}
	});

	// Load Our Plugins
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	// Register Default Task
	grunt.registerTask('default', ['concat', 'uglify']);
};
