module.exports = function(grunt) {
	grunt.initConfig({
		concat: {
			'package/sparky.js': [
				'config-package.js'

				'fn/js/fn.js',
				'fn/js/observable.js',
				'fn/js/stream.js',
				'fn/js/stream.observe.js',
				'dom/js/dom.js',

				'js/mount.js',
				'js/sparky.js',
				'js/sparky.fn.js',
				'js/sparky.fn.each.js',
				'js/sparky.transforms.js',
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
