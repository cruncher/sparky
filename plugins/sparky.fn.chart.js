(function(window) {
	var Fn        = window.Fn;
	var Sparky    = window.Sparky;
	var isDefined = Fn.isDefined;

	function collectionToPath(collection, x, y) {
		var state = 0;

		return collection
		.sort(Fn.by(x))
		.reduce(function(string, object) {
			if (!isDefined(object[x]) || !isDefined(object[y])) {
				state = 0;
				return string;
			}

			return string + ((state++ === 0) ? 'M' : 'L') + object[x] + ',' + object[y];
		}, '');
	}

	var fns = {
		'chart-path': function(node) {
			var x = 'x';
			var y = 'y';
			var collection;

			function update() {
				node.setAttribute('d', collectionToPath(collection, x, y));
			}

			var throttle = Fn.Throttle(update);

			function observe(collection, object) {
				Sparky.observe(object, x, throttle);
				Sparky.observe(object, y, throttle);
			}

			function unobserve(collection, object) {
				Sparky.unobserve(object, x, throttle);
				Sparky.unobserve(object, y, throttle);
			}

			this.on('scope', function(sparky, scope) {
				if (!scope) { return; }

				if (collection) {
					collection
					.off('add', observe)
					.off('remove', unobserve);
				}

				collection = scope;

				collection
				.on('add', observe)
				.on('remove', unobserve)
				.forEach(function(object, i, collection) {
					observe(collection, object);
				});

				throttle();
			});
		},

		'x-axis': function(node) {
			var x = 'x';
			var y = 'y';
			var data = this.data;
			var axis = {
				labels: Collection(),
				ticks: Collection(),
				lines: Collection()
			};

			function update() {
				var labels = axis.labels;
				var min    = data['x-min'];
				var range  = data['x-range'];
				var step   = data['x-label-step'];
				var max    = min + range;
				var x      = Math.ceil(min / step) * step;

				labels.length = 0;

				while (x <= max) {
					labels.push({ x: x,  text: '' + x });
					x += step;
				}
			}

			Sparky.observe(data, 'x-range', update);
			Sparky.observe(data, 'x-min',   update);
			update();
			return axis;
		},

		'y-axis': function(node) {
			var x = 'x';
			var y = 'y';
			var data = this.data;
			var axis = {
				labels: Collection(),
				ticks: Collection(),
				lines: Collection()
			};

			function update() {
				var labels = axis.labels;
				var min    = data['y-min'];
				var range  = data['y-range'];
				var step   = data['y-label-step'];
				var max    = min + range;
				var y      = Math.ceil(min / step) * step;

				labels.length = 0;

				while (y <= max) {
					labels.push({ y: y,  text: '' + y });
					y += step;
				}

				var ticks  = axis.ticks;
				var step   = data['y-tick-step'];
				var y      = Math.ceil(min / step) * step;

				ticks.length = 0;

				while (y <= max) {
					ticks.push({ y: y });
					y += step;
				}

				var lines  = axis.lines;
				var step   = data['y-line-step'];
				var y      = Math.ceil(min / step) * step;

				lines.length = 0;

				while (y <= max) {
					lines.push({ y: y });
					y += step;
				}
			}

			Sparky.observe(data, 'y-range', update);
			Sparky.observe(data, 'y-min',   update);
			update();
			return axis;
		}
	};

	Sparky.fn['series-chart'] = function(node) {
		var x = 'x';
		var y = 'y';

		var scope = {
			'x-min': 0,
			'x-range': 100,
			'x-label-step': 10,
			'x-line-step': 10,
			'x-tick-step': 10,
			'y-min': 0,
			'y-range': 50,
			'y-label-step': 10,
			'y-line-step': 10,
			'y-tick-step': 10,
			'y-headroom': 10
		};

		Object.assign(this.fn, fns);
		this.data = scope;

		scope['series-1'] = Sparky.data.series1;
		scope['series-2'] = Sparky.data.series2;

		// Propogate changes to min and range to child scopes

		function updateXMax() {
			var xMax = scope['x-min'] + scope['x-range'];
			scope['x-max'] = xMax;
		}

		function updateYMax() {
			var yMax = scope['y-min'] + scope['y-range'];
			scope['y-max'] = yMax;
		}

		Sparky.observe(scope, 'x-range', updateXMax);
		Sparky.observe(scope, 'y-range', updateYMax);
		Sparky.observe(scope, 'x-min',   updateXMax);
		//Sparky.observe(scope, 'y-min',   updateYMax);

window.s = scope['series-1'];

		function update() {
			scope['x-min'] = scope['series-1'].map(Fn.get(x)).reduce(Fn.min, Infinity);
			scope['x-range'] = scope['series-1'].map(Fn.get(x)).reduce(Fn.max, 0) - scope['x-min'];
			//scope['y-min'] = scope['series-1'].map(Fn.get(y)).reduce(Fn.min, Infinity);
			scope['y-range'] = scope['series-1'].map(Fn.get(y)).reduce(Fn.max, 0) - scope['y-min'] + scope['y-headroom'];
		}

		function observe(collection, object) {
			Sparky.observe(object, x, update);
			Sparky.observe(object, y, update);
		}

		function unobserve(collection, object) {
			Sparky.unobserve(object, x, update);
			Sparky.unobserve(object, y, update);
		}

		scope['series-1']
		.on('add', observe)
		.on('remove', unobserve)
		.forEach(function(object, i, collection) {
			observe(collection, object);
		});

		this.on('destroy', function() {
			Sparky.unobserve(scope, 'x-range', updateXMax);
			Sparky.unobserve(scope, 'y-range', updateYMax);
			Sparky.unobserve(scope, 'x-min',   updateXMax);
			Sparky.unobserve(scope, 'y-min',   updateYMax);

			Sparky.unobserve(scope, 'x-range', updateXAxis);
			Sparky.unobserve(scope, 'y-range', updateYAxis);
			Sparky.unobserve(scope, 'x-min',   updateXAxis);
			Sparky.unobserve(scope, 'y-min',   updateYAxis);

			scope['series-1']
			.forEach(function(object, i, collection) {
				unobserve(collection, object);
			});
		});

		// Initilise the data
		update();

		return scope;
	};
})(this);
