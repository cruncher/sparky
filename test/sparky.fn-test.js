group('[sparky-fn]', function(test, log, fixture) {
	test('[sparky-fn]', function(equals, done) {
		var sparky;
		var scope = { property: 'value-1' };
		var p = fixture.querySelector('p');

		var model   = { n: 0 };
		var object1 = { property: 'value-1' };
		var object2 = { property: 'value-2' };
		var object3 = { property: 'value-3' };

		Sparky.fn['ctrl-1'] = function(node, scopes) {
			sparky = this;
			equals(p, node, 'Function should be called with node');

			return scopes.map(function(scope) {
				equals(model, scope);
				return object1;
			});
		};

		Sparky.fn['ctrl-2'] = function(node, scopes) {
			equals(sparky, this, 'Functions should share sparky *this* context.');
			//equals(Sparky.data.isPrototypeOf(this.data), 'data should inherit from Sparky.data');
			//equals(Sparky.fn.isPrototypeOf(this.fn), 'fn should inherit from Sparky.fn');

			return scopes.map(function(scope) {
				equals(object1, scope);
				return object2;
			});
		};

		Sparky.fn['ctrl-3'] = function(node, scopes, params) {
			equals(sparky, this, 'Functions should share sparky *this* context.');
			equals([0,'1',true,[]], params);

			return scopes.map(function(scope) {
				equals(object2, scope);
				return object3;
			});
		};

		Sparky(fixture, model);

		requestAnimationFrame(function() {
			equals('value-3', p.innerHTML);
			done();
		});
	}, 8);
}, function() {/*

<div>
	<p sparky-fn="ctrl-1 ctrl-2 ctrl-3: 0, '1', true, []">{[property]}</p>
</div>

*/});
