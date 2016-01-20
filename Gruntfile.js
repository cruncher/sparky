module.exports = function(grunt) {
	grunt.initConfig({
		concat: {
			'js/sparky.js': [
				'modules/object.assign/object.assign.js',
				'src/number.isnan.js',
				'src/math.log10.js',
				'src/window.customevent.js',
				'src/window.requestanimationframe.js',
				'src/mixin.array.js',
				'src/mixin.events.js',
				'src/observe.js',
				'modules/collection/js/collection.js',
				'src/sparky.js',
				'src/sparky.dom.js',
				'src/sparky.observe.js',
				'src/sparky.throttle.js',
				'src/sparky.bind.js',
				'src/sparky.ctrl.js',
				'src/sparky.filters.js',
				'src/sparky.ready.js',
				'build-settings.js'
			]
		},

		uglify: {
			target: {
				files: {
					'js/sparky.min.js': ['js/sparky.js']
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
