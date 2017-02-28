module('Multiple controllers', function(test) {
	console.log('Test ctrls...');

	test('Sparky should handle multiple controllers', function(assert, done, fixture) {
		Sparky.data.model = { n: 0 };

		var sparky;
		var scope = { property: 'value-1' };
		var p = fixture.querySelector('p');

		var object1 = { property: 'value-1' };
		var object2 = { property: 'value-2' };
		var object3 = { property: 'value-3' };

		assert.expect(9);

		Sparky.fn['ctrl-1'] = function(node, scopes) {
			sparky = this;
			assert.ok(node === p, 'Function should be called with node');

			return scopes.map(function(scope) {
				assert.ok(scope === Sparky.data.model, scope);
				return object1;
			});
		};

		Sparky.fn['ctrl-2'] = function(node, scopes) {
			assert.ok(this === sparky, 'Functions should share sparky *this* context.');
			assert.ok(Sparky.data.isPrototypeOf(this.data), 'data should inherit from Sparky.data');
			assert.ok(Sparky.fn.isPrototypeOf(this.fn), 'fn should inherit from Sparky.fn');

			return scopes.map(function(scope) {
				assert.ok(scope === object1, scope);
				return object2;
			});
		};

		Sparky.fn['ctrl-3'] = function(node, scopes) {
			assert.ok(this === sparky, 'Functions should share sparky *this* context.');

			return scopes.map(function(scope) {
				assert.ok(scope === object2, scope);
				return object3;
			});
		};

		Sparky(fixture);

		window.requestAnimationFrame(function() {
			assert.ok(p.innerHTML === 'value-3');
			done();
		});
	});
}, function() {/*

<div data-scope="model">
	<p data-fn="ctrl-1 ctrl-2 ctrl-3">{[property]}</p>
</div>

*/});
