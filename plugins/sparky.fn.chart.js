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
		'line-path': function(node) {
			var x = 'x';
			var y = 'y';
			var collection;

			function update() {
				node.setAttribute('d', collectionToPath(collection, x, y));
			}

			function observe(collection, object) {
				Sparky.observe(object, x, update);
				Sparky.observe(object, y, update);
			}

			function unobserve(collection, object) {
				Sparky.unobserve(object, x, update);
				Sparky.unobserve(object, y, update);
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

				update();
			});
		}
	};

	Sparky.fn['line-chart'] = function(node) {
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
			'y-tick-step': 10
		};

		Object.assign(this.fn, fns);

		scope['series-1'] = Collection([
			{ x: 0,  y: 30  },
			{ x: 10, y: 60 },
			{ x: 20, y: 80 },
			{ x: 30, y: 10 },
			{ x: 40, y: 50 },
			{ x: 55, y: 70 },
			{ x: 61, y: 12 },
			{ x: 80, y: 25 }
		]);

		scope['series-2'] = Collection([
			{ x: 0,  y: 20 },
			{ x: 10, y: 5  },
			{ x: 20, y: 30 },
			{ x: 30, y: 30 },
			{ x: 45, y: 40 }
		]);

		scope['x-axis'] = {
			labels: Collection(),
			ticks: Collection(),
			lines: Collection()
		};

		scope['y-axis'] = {
			labels: Collection(),
			ticks: Collection(),
			lines: Collection()
		};

		scope['y-axis-2'] = {
			labels: Collection(),
			ticks: Collection(),
			lines: Collection()
		};

		// Propogate changes to min and range to child scopes

		function updateXMax() {
			var xMax = scope['x-min'] + scope['x-range'];
			scope['x-max'] = xMax;
		}

		function updateYMax() {
			var yMax = scope['y-min'] + scope['y-range'];
			scope['y-max'] = yMax;
		}

		function updateXAxis() {
			var labels = scope['x-axis'].labels;
			var min    = scope['x-min'];
			var range  = scope['x-range'];
			var step   = scope['x-label-step'];
			var max    = min + range;
			var x      = Math.ceil(min / step) * step;

			labels.length = 0;

			while (x <= max) {
				labels.push({ x: x,  text: '' + x });
				x += step;
			}
		}

		function updateYAxis() {
			var labels = scope['y-axis'].labels;
			var min    = scope['y-min'];
			var range  = scope['y-range'];
			var step   = scope['y-label-step'];
			var max    = min + range;
			var y      = Math.ceil(min / step) * step;

			labels.length = 0;

			while (y <= max) {
				labels.push({ y: y,  text: '' + y });
				y += step;
			}

			var ticks  = scope['y-axis'].ticks;
			var step   = scope['y-tick-step'];
			var y      = Math.ceil(min / step) * step;

			ticks.length = 0;

			while (y <= max) {
				ticks.push({ y: y });
				y += step;
			}

			var lines  = scope['y-axis'].lines;
			var step   = scope['y-line-step'];
			var y      = Math.ceil(min / step) * step;

			lines.length = 0;

			while (y <= max) {
				lines.push({ y: y });
				y += step;
			}
		}

		Sparky.observe(scope, 'x-range', updateXMax);
		Sparky.observe(scope, 'y-range', updateYMax);
		Sparky.observe(scope, 'x-min',   updateXMax);
		Sparky.observe(scope, 'y-min',   updateYMax);

		Sparky.observe(scope, 'x-range', updateXAxis);
		Sparky.observe(scope, 'y-range', updateYAxis);
		Sparky.observe(scope, 'x-min',   updateXAxis);
		Sparky.observe(scope, 'y-min',   updateYAxis);

		//updateXMax();
		//updateYMax();
		//updateXAxis();
		//updateYAxis();
window.s = scope['series-1'];

		function update() {
			scope['x-min'] = scope['series-1'].map(Fn.get(x)).reduce(Fn.min, Infinity);
			scope['x-range'] = scope['series-1'].map(Fn.get(x)).reduce(Fn.max, 0) - scope['x-min'];
			scope['y-min'] = scope['series-1'].map(Fn.get(y)).reduce(Fn.min, Infinity);
			scope['y-range'] = scope['series-1'].map(Fn.get(y)).reduce(Fn.max, 0) - scope['y-min'];
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

		update();

		return scope;
	};
})(this);
