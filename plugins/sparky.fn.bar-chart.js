(function(window) {
	var fns = {};

	Sparky.fn['bar-chart'] = function(svg) {
		//if (svg is not an SVG) { throw error }

		var scope = {
			'x-min': 0,
			'x-max': 100,
			'y-min': 0,
			'y-max': 50
		};

		Object.assign(this.fn, fns);

		scope['y-lines'] = Collection([
			{ 'x-max': 100, y: 0 },
			{ 'x-max': 100, y: 10 },
			{ 'x-max': 100, y: 20 },
			{ 'x-max': 100, y: 30 }
		]);

		scope['series-1'] = Collection([
			{ x: 0,  y: 0  },
			{ x: 10, y: 10 },
			{ x: 20, y: 20 },
			{ x: 30, y: 30 }
		]);

		scope['series-2'] = Collection([
			{ x: 5,  y: 0  },
			{ x: 15, y: 10 },
			{ x: 25, y: 20 },
			{ x: 35, y: 30 }
		]);

		scope['x-axis'] = {
			'x-max': 100,

			labels: Collection([
				{ x: 5,  text: '0' },
				{ x: 15, text: '1' },
				{ x: 25, text: 'Good' },
				{ x: 35, text: 'Bad' }
			]),

			ticks: Collection([])
		};

		scope['y-axis'] = {
			'y-max': 100,

			labels: Collection([
				{ y: 0,  text: '0' },
				{ y: 10, text: '10' },
				{ y: 20, text: '20' },
				{ y: 30, text: '30' }
			]),

			ticks: Collection([])
		};

		scope['y-axis-2'] = {
			'x-max': 100,
			'y-max': 100,

			labels: Collection([
				{ y: 0,  text: '0'  },
				{ y: 10, text: '10' },
				{ y: 20, text: '20' },
				{ y: 30, text: '30' }
			]),

			ticks: Collection([])
		};

		return scope;
	};
})(this);
