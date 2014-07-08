module('Sparky collections', function(fixture) {
	test('Initial length', function() {
		var collection = Sparky.Collection([{
		    	property: 1
		    }, {
		    	property: 2
		    }]);
		
		Sparky.controllers['test-ctrl'] = function(node, model, sparky) {
			return {
				collection: collection
			};
		};

		var ul = fixture.querySelector('[data-ctrl="test-ctrl"]');
		var sparky = Sparky(ul);

		ok(ul.querySelectorAll('li').length === 2, 'All is well.');
	});

	asyncTest("Two or three", function(assert) {
		var collection = Sparky.Collection([{
		    	property: 1
		    }, {
		    	property: 2
		    }]);
		
		Sparky.controllers['test-ctrl'] = function(node, model, sparky) {
			return {
				collection: collection
			};
		};

		var ul = fixture.querySelector('[data-ctrl="test-ctrl"]');
		var sparky = Sparky(ul);

		ok(ul.querySelectorAll('li').length === 2, 'All is well.');

		collection.push({
			property: 3
		});

		window.requestAnimationFrame(function() {
			ok(ul.querySelectorAll('li').length === 3, 'All is well.');
		});

		// Restart QUnit
		window.requestAnimationFrame(function() {
			QUnit.start();
		});
	});

	asyncTest("Zero to hero", function(assert) {
		var collection = Sparky.Collection([]);

		Sparky.controllers['test-ctrl'] = function(node, model, sparky) {
			return {
				collection: collection
			};
		};

		var ul = fixture.querySelector('[data-ctrl="test-ctrl"]');
		var sparky = Sparky(ul);

		ok(ul.querySelectorAll('li').length === 0, 'All is well.');

		collection.push({ property: 1 });
		collection.push({ property: 2 });

		window.requestAnimationFrame(function() {
			ok(ul.querySelectorAll('li').length === 2, 'All is well.');
		});

		// Restart QUnit
		window.requestAnimationFrame(function() {
			QUnit.start();
		});
	});

}, function() {/*

<ul data-ctrl="test-ctrl">
	<li data-model="{{collection}}">{{property}}</li>
</ul>

*/});

