module('Multiple controllers', function(fixture) {
	console.log('Test ctrls...');

	asyncTest('Sparky should handle multiple controllers', function() {
		Sparky.data.model = {};

		var sparky;
		var scope = { property: 'value-1' };
		var p = fixture.querySelector('p');

		expect(9);

		Sparky.fn['ctrl-1'] = function(node, scopes) {
			sparky = this;
			ok(node === p, 'Function should be called with node');
			scopes.tap(function(object) {
				ok(scope === object, 'Should recieve scope from ctrl-2');
			});
		};

		Sparky.fn['ctrl-2'] = function(node, scopes) {
			ok(this === sparky, 'Functions should share sparky *this* context.');
			ok(Sparky.data.isPrototypeOf(this.data), 'data should inherit from Sparky.data');
			ok(Sparky.fn.isPrototypeOf(this.fn), 'fn should inherit from Sparky.fn');
			return scopes.tap(function(object) {
				ok(scope === object, 'Should recieve scope from ctrl-2');
			});
		};

		Sparky.fn['ctrl-3'] = function(node, scopes) {
			ok(this === sparky, 'Functions should share sparky *this* context.');
			scopes.tap(function(object) {
				ok(scope === object, 'Should recieve scope from ctrl-2');
			});
		};

		Sparky(fixture);

		window.requestAnimationFrame(function() {
			ok(p.innerHTML === 'value-1');
			QUnit.start();
		});
	});
}, function() {/*

<div data-scope="model">
	<p data-fn="ctrl-1 ctrl-2 ctrl-3">{{property}}</p>
</div>

*/});
