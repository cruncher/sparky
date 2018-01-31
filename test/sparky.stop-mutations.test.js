
Sparky.fn['pass-through'] = function(node, stream) {

};


group('.stop() mutations', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;

	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div    = fixture.querySelector('div');
		var p      = fixture.querySelector('p');
		var scope  = Observable({ property: '0' });
		var sparky = Sparky(div, scope);

		frame(function() {
			equals('0', p.innerHTML);

			scope.property = '1';

			frame(function() {
				equals('1', p.innerHTML);

				sparky.stop();
				scope.property = '2';

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


group('.stop() mutations to child', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;

	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div    = fixture.querySelector('div');
		var p      = fixture.querySelector('p');
		var scope  = Observable({ property: '0' });
		var sparky = Sparky(div, scope);

		frame(function() {
			equals('0', p.innerHTML);

			scope.property = '1';

			frame(function() {
				equals('1', p.innerHTML);

				sparky.stop();
				scope.property = '2';

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



group('.stop() mutations to templated child', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;

	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div    = fixture.querySelector('div');
		var scope  = Observable({ property: '0' });
		var sparky = Sparky(div, scope);

		frame(function() {
			equals('0', fixture.querySelector('p').innerHTML);

			scope.property = '1';

			frame(function() {
				equals('1', fixture.querySelector('p').innerHTML);

				sparky.stop();
				scope.property = '2';

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



group('.stop() mutations to each child', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;

	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div    = fixture.querySelector('div');
		var scope  = Observable([{ property: '1' }, { property: '2' }]);
		var sparky = Sparky(div, scope);

		frame(function() {
			equals('1', fixture.querySelector('p:nth-child(1)').innerHTML);
			equals('2', fixture.querySelector('p:nth-child(2)').innerHTML);
			equals(null, fixture.querySelector('p:nth-child(3)'));

			scope.push({ property: '3' });

			frame(function() {
				equals('1', fixture.querySelector('p:nth-child(1)').innerHTML);
				equals('2', fixture.querySelector('p:nth-child(2)').innerHTML);
				equals('3', fixture.querySelector('p:nth-child(3)').innerHTML);
				equals(null, fixture.querySelector('p:nth-child(4)'));

				sparky.stop();
				scope.push({ property: '4' });

				frame(function() {
					equals('1', fixture.querySelector('p:nth-child(1)').innerHTML);
					equals('2', fixture.querySelector('p:nth-child(2)').innerHTML);
					equals('3', fixture.querySelector('p:nth-child(3)').innerHTML);
					equals(null, fixture.querySelector('p:nth-child(4)'));
					done();
				});
			});
		});
	}, 11);
}, function() {/*

<div>
	<p sparky-fn="each">{[property]}</p>
</div>

*/});
