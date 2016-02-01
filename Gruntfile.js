module.exports = function(grunt) {
	grunt.initConfig({
		concat: {
			'package/sparky.js': [
				'modules/object.assign/object.assign.js',
				'src/number.isnan.js',
				'src/math.log10.js',
				'src/window.customevent.js',
				'src/window.requestanimationframe.js',
				'src/mixin.array.js',
				'src/mixin.events.js',
				'src/observe.js',
				'modules/collection/js/collection.js',
				'js/sparky.js',
				'js/sparky.dom.js',
				'js/sparky.observe.js',
				'js/sparky.throttle.js',
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
