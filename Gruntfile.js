module.exports = function(grunt) {
	grunt.initConfig({
		concat: {
			'package/sparky.js': [
				'modules/object.assign/object.assign.js',
				'modules/polyfills/number.isnan.js',
				'modules/polyfills/math.log10.js',
				'modules/polyfills/window.customevent.js',
				'modules/polyfills/window.requestanimationframe.js',
				'modules/collection/js/mixin.events.js',
				'modules/collection/js/observe.js',
				'modules/collection/js/collection.js',
				'js/sparky.js',
				'js/sparky.dom.js',
				'js/sparky.observe.js',
				'js/sparky.throttle.js',
				'js/sparky.render.js',
				'js/sparky.parse.js',
				'js/sparky.fn.js',
				'js/sparky.fn.each.js',
				'js/sparky.fn.value.js',
				'js/sparky.filters.js',
				'js/sparky.ready.js',
				'build-settings.js'
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
