
group('.stop()', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;

	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div    = fixture.querySelector('div');
		var p      = fixture.querySelector('p');
		var sparky = Sparky(div, { property: '0' });

		frame(function() {
			equals('0', p.innerHTML);

			sparky.push({ property: '1' });

			frame(function() {
				equals('1', p.innerHTML);

				sparky
				.stop()
				.push({ property: '2' });

				frame(function() {
					equals('1', p.innerHTML);
					done();
				});
			});
		});
	}, 3);
}, function() {/*

<div>
	<p>{[property]}</p>
</div>

*/});


group('.stop()', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;

	Sparky.fn['pass-through'] = function(node, stream) {
		return stream.tap(console.log);
	};

	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div    = fixture.querySelector('div');
		var p      = fixture.querySelector('p');
		var sparky = Sparky(div, { property: '0' });

		frame(function() {
			equals('0', p.innerHTML);

			sparky.push({ property: '1' });

			frame(function() {
				equals('1', p.innerHTML);

				sparky
				.stop()
				.push({ property: '2' });

				frame(function() {
					equals('1', p.innerHTML);
					done();
				});
			});
		});
	}, 3);
}, function() {/*

<div>
	<p sparky-fn="pass-through">{[property]}</p>
</div>

*/});



group('.stop()', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;

	Sparky.fn['pass-through'] = function(node, stream) {
		return stream.tap(console.log);
	};

	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div    = fixture.querySelector('div');
		var sparky = Sparky(div, { property: '0' });

		frame(function() {
			equals('0', fixture.querySelector('p').innerHTML);

			sparky.push({ property: '1' });

			frame(function() {
				equals('1', fixture.querySelector('p').innerHTML);

				sparky
				.stop()
				.push({ property: '2' });

				frame(function() {
					equals('1', fixture.querySelector('p').innerHTML);
					done();
				});
			});
		});
	}, 3);
}, function() {/*

<div sparky-fn="template:'#stop-test-1'">
	Unrendered
</div>

<template id="stop-test-1">
	<p sparky-fn="pass-through">{[property]}</p>
</template>

*/});
