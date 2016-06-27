(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var Sparky    = window.Sparky;
	var isDefined = Fn.isDefined;

	function groupBy(name, array) {
		return array.reduce(function(groups, object) {
			var group = groups[groups.length - 1];

			if (!group) {
				groups.push([object]);
				return groups;
			}

			var prev = group[group.length - 1];

			if (object[name] === prev[name]) {
				group.push(object);
			}
			else {
				groups.push([object]);
			}

			return groups;
		}, []);
	}

	function collectionToPath(collection, x, y, textToX) {
		var state = 0;

		collection.sort(Fn.by(x));

		var groups = groupBy(x, collection);
console.log('G', groups);
		return groups.reduce(function(string, group) {
			var agregate = group.reduce(function(agregate, object) {
				agregate[y] = (agregate[y] || 0) + object[y];
				agregate[x] = object[x];
				return agregate;
			}, {});

console.log(agregate, x, y);

			//if (!isDefined(object[x]) || !isDefined(object[y])) {
			//	state = 0;
			//	return string;
			//}

			var xpos = typeof agregate[x] === 'string' ?
				textToX(agregate[x]) :
				agregate[x] ;

			var ypos = agregate[y];

			return string + ((state++ === 0) ? 'M' : 'L') + xpos + ',' + ypos;
		}, '');
	}

	function same(a, b) {
		return a === b && a ;
	}

	function lower(a, b) {
		return a.localeCompare(b) > 0 ? b : a ;
	}

	function higher(a, b) {
		return a.localeCompare(b) > 0 ? a : b ;
	}

	function unique(array, value) {
		if (array.indexOf(value) === -1) {
			array.push(value);
		}

		return array;
	}

	var fns = {
		'chart-path': function(node) {
			var data = this.data;
			var x    = data.x || 'x';
			var y    = data.y || 'y';
			var collection;

			function update() {
				node.setAttribute('d', collectionToPath(collection, x, y, function textToX(text) {
					var index = data['x-labels'].map(Fn.get('text')).indexOf(text);
					var label = data['x-labels'][index];
					return label.x;
				}));
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

		'chart-bar': function(node) {
			var data = this.data;
			var x    = data.x || 'x';
			var y    = data.y || 'y';
			var point;

			// We have to do it in a fn, because scope problems...
			// Todo: sort out scope problems

			function update() {
				var index = data['x-labels'].map(Fn.get('text')).indexOf(point[x]);
				var label = data['x-labels'][index];
				node.setAttribute('x', label.x);
			}

			var throttle = Fn.Throttle(update);

			this.on('scope', function(sparky, scope) {
				if (!scope) { return; }
				point = scope;
				throttle();
			});
		},

		'x-axis': function(node) {
			var data = this.data;
			var x    = data.x || 'x';
			var y    = data.y || 'y';
			var axis = {
				labels: Collection(),
				ticks:  Collection(),
				lines:  Collection()
			};

			function update() {
				if (data['x-labels']) {
					axis.labels = data['x-labels'];
					return;
				}

				axis.labels.length = 0;

				var min    = data['x-min'];
				var range  = data['x-range'];
				var step   = data['x-label-step'];
				var max    = min + range;
				var x      = Math.ceil(min / step) * step;

				while (x <= max) {
					axis.labels.push({ x: x,  text: '' + x });
					x += step;
				}
			}

			Sparky.observe(data, 'x-range', update);
			Sparky.observe(data, 'x-min',   update);
			update();
			return axis;
		},

		'y-axis': function(node) {
			var data = this.data;
			var x    = data.x || 'x';
			var y    = data.y || 'y';
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
		var x = node.getAttribute('data-chart-x') || 'x';
		var y = node.getAttribute('data-chart-y') || 'y';
		var data = this.data = {
			'x': x,
			'x-min': 0,
			'x-range': 100,
			'x-label-step': 10,
			'x-line-step': 10,
			'x-tick-step': 10,
			'y': y,
			'y-min': 0,
			'y-range': 50,
			'y-label-step': 10,
			'y-line-step': 10,
			'y-tick-step': 10,
			'y-headroom': 10
		};

		Object.assign(this.fn, fns);

		var series;// = Sparky.data.stats;
		//data.series = series;

window.s = series;
window.d = data;

		//data['series-2'] = Sparky.data.series2;

		// Propogate changes to min and range to child datas

		function updateXMax() {
			var xMax = data['x-min'] + data['x-range'];
			data['x-max'] = xMax;
		}

		function updateYMax() {
			var yMax = data['y-min'] + data['y-range'];
			data['y-max'] = yMax;
		}

		Sparky.observe(data, 'x-range', updateXMax);
		Sparky.observe(data, 'y-range', updateYMax);
		Sparky.observe(data, 'x-min',   updateXMax);
		//Sparky.observe(data, 'y-min',   updateYMax);

		var scaleX = Fn.multiply(8);

		function update() {
			var xType = series.map(Fn.compose(Fn.toStringType, Fn.get(x))).reduce(same) || 'string';

			if (xType === 'number') {
				data['x-min']   = series.map(Fn.get(x)).reduce(Fn.min, Infinity);
				data['x-range'] = series.map(Fn.get(x)).reduce(Fn.max, 0) - data['x-min'];
			}
			else if (xType === 'date') {
				data['x-labels'] = Collection(series.map(Fn.get(x)).reduce(unique, []).sort(Fn.byGreater).map(function createLabel(text, i) {
					return { x: scaleX(i), text: text } ;
				}));
				data['x-min'] = scaleX(0);
				data['x-range'] = scaleX(data['x-labels'].length);
			}
			else {
				data['x-labels'] = Collection(series.map(Fn.get(x)).reduce(unique, []).sort(Fn.byAlphabet).map(function createLabel(text, i) {
					return { x: scaleX(i), text: text } ;
				}));
				data['x-min'] = scaleX(0);
				data['x-range'] = scaleX(data['x-labels'].length);
			}

			//data['y-min'] = series.map(Fn.get(y)).reduce(Fn.min, Infinity);
			data['y-range'] = series.map(Fn.get(y)).reduce(Fn.max, 0) - data['y-min'] + data['y-headroom'];
		}

		function observe(collection, object) {
			Sparky.observe(object, x, update);
			Sparky.observe(object, y, update);
		}

		function unobserve(collection, object) {
			Sparky.unobserve(object, x, update);
			Sparky.unobserve(object, y, update);
		}

		this
		.on('scope', function(sparky, scope) {
			series = scope;

			if (!series) { return; }
console.log('SERIES', series);
			series
			.on('add', observe)
			.on('remove', unobserve)
			.forEach(function(object, i, collection) {
				observe(collection, object);
			});

			data.series = series;
			update();
		})
		.on('destroy', function() {
			Sparky.unobserve(data, 'x-range', updateXMax);
			Sparky.unobserve(data, 'y-range', updateYMax);
			Sparky.unobserve(data, 'x-min',   updateXMax);
			Sparky.unobserve(data, 'y-min',   updateYMax);
			Sparky.unobserve(data, 'x-range', updateXAxis);
			Sparky.unobserve(data, 'y-range', updateYAxis);
			Sparky.unobserve(data, 'x-min',   updateXAxis);
			Sparky.unobserve(data, 'y-min',   updateYAxis);

			series
			.forEach(function(object, i, collection) {
				unobserve(collection, object);
			});
		});

		// Initilise the data
		//update();
	};
})(this);
