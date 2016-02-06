module('Sparky:collections', function(fixture) {
	console.log('Test Collection()...');

	asyncTest('Sparky should bind to an empty collection by inserting no nodes.', function() {
		expect(1);

		var collection = Collection([]);

		Sparky.fn['test-ctrl'] = function(node, model) {
			return {
				collection: collection
			};
		};

		var ul = fixture.querySelector('[data-fn="test-ctrl"]');

		Sparky(ul);

		window.requestAnimationFrame(function() {
			ok(ul.querySelectorAll('li').length === 0, 'All is well.');
			QUnit.start();
		});
	});
}, function() {/*

<ul data-fn="test-ctrl">
	<li class="li-{{property}}" data-scope="{{collection}}" data-fn="each">{{property}}</li>
</ul>

*/});

module('Sparky:collections', function(fixture) {
	asyncTest('Initial length', function() {
		expect(3);

		var collection = Collection([{ property: 1 }, { property: 2 }]);

		Sparky.fn['test-ctrl'] = function(node, model) {
			return {
				collection: collection
			};
		};

		var ul = fixture.querySelector('[data-fn="test-ctrl"]');

		Sparky(ul);

		window.requestAnimationFrame(function() {
			var lis = ul.querySelectorAll('li');
			ok(lis.length === 2, 'Two <li>s expected in the DOM, actually ' + lis.length);
			ok(lis[0] && lis[0].innerHTML === '1', "First li content from collection item should be '1', is '" + (lis[0] && lis[0].innerHTML) + "'");
			ok(lis[1] && lis[1].innerHTML === '2', "Second li content from collection item should be '2', is '" + (lis[1] && lis[1].innerHTML) + "'");
			QUnit.start();
		});
	});
}, function() {/*

<ul data-fn="test-ctrl">
	<li class="li-{{property}}" data-scope="{{collection}}" data-fn="each">{{property}}</li>
</ul>

*/});

module('Sparky:collections', function(fixture) {
	asyncTest("Two or three", function(assert) {
		expect(2);

		var collection = Collection([{ property: 1 }, { property: 2 }]);

		Sparky.fn['test-ctrl'] = function(node, model) {
			return { collection: collection };
		};

		var ul = fixture.querySelector('[data-fn="test-ctrl"]');
		Sparky(ul);

		window.requestAnimationFrame(function functionName() {
			ok(ul.querySelectorAll('li').length === 2, 'All is well.');

			collection.push({ property: 3 });

			window.requestAnimationFrame(function() {
				ok(ul.querySelectorAll('li').length === 3, 'All is well.');
				QUnit.start();
			});
		});
	});
}, function() {/*

<ul data-fn="test-ctrl">
	<li class="li-{{property}}" data-scope="{{collection}}" data-fn="each">{{property}}</li>
</ul>

*/});

module('Sparky:collections', function(fixture) {
	asyncTest("Zero to hero", function(assert) {
		expect(2);

		var collection = Collection();

		Sparky.fn['test-ctrl'] = function(node, model, sparky) {
			return {
				collection: collection
			};
		};

		var ul = fixture.querySelector('[data-fn="test-ctrl"]');
		var sparky = Sparky(ul);

		window.requestAnimationFrame(function() {
			ok(ul.querySelectorAll('li').length === 0, 'All is well.');

			collection.push({ property: 1 });
			collection.push({ property: 2 });

			window.requestAnimationFrame(function() {
				ok(ul.querySelectorAll('li').length === 2, 'All is well.');
				QUnit.start();
			});
		});
	});
}, function() {/*

<ul data-fn="test-ctrl">
	<li class="li-{{property}}" data-scope="{{collection}}" data-fn="each">{{property}}</li>
</ul>

*/});

module('Sparky:collections', function(fixture) {
	asyncTest("Detach collection items", function(assert) {
		expect(5);

		var collection = Collection([{ property: 1 }, { property: 2 }]);

		Sparky.fn['test-ctrl'] = function(node, model, sparky) {
			return { collection: collection };
		};

		var ul = fixture.querySelector('[data-fn="test-ctrl"]');
		var sparky = Sparky(ul);

		window.requestAnimationFrame(function() {
			assert.ok(ul.querySelectorAll('li').length === 2, 'All is well.');

			var li = ul.querySelector('.li-2');

			assert.ok(!!li, 'li.li-2 exists.');

			var item1 = collection[0];
			var item2 = collection[1];

			collection.length = 0;

			window.requestAnimationFrame(function() {
				// Sparky for the li should be detached by this
				// point. This should do precisely nothing.
				item2.property = 0;

				assert.ok(ul.querySelectorAll('li').length === 0, 'There is nothing in the list.');
				assert.ok(li && li.innerHTML === '2', 'li content is still 2');

				window.requestAnimationFrame(function() {
					assert.ok(li && li.innerHTML === '2', 'li content is still 2');
					QUnit.start();
				});
			});
		});
	});
}, function() {/*

<ul data-fn="test-ctrl">
	<li class="li-{{property}}" data-scope="{{collection}}" data-fn="each">{{property}}</li>
</ul>

*/});



module('Sparky.fn.each scope replacement', function(fixture) {
	asyncTest("", function(assert) {
		//expect(5);

		var collection1 = Collection([{ property: 1 }, { property: 2 }]);
		var collection2 = Collection([{ property: 3 }, { property: 4 }, { property: 5 }]);
		var scope = { collection: collection1 };

		Sparky.fn['test-ctrl'] = function(node, model, sparky) {
			return scope;
		};

		var ul = fixture.querySelector('[data-fn="test-ctrl"]');
		var sparky = Sparky(ul);

		window.requestAnimationFrame(function() {
			var lis = ul.querySelectorAll('li');
			assert.ok(lis.length === 2, 'List should have 2 li.');
			assert.ok(lis[0].innerHTML === '1', '');
			assert.ok(lis[1].innerHTML === '2', '');
			scope.collection = collection2;

			window.requestAnimationFrame(function() {
				var lis = ul.querySelectorAll('li');
				assert.ok(lis.length === 3, 'List should have 3 li.');
				assert.ok(lis[0].innerHTML === '3', '');
				assert.ok(lis[1].innerHTML === '4', '');
				assert.ok(lis[2].innerHTML === '5', '');
				QUnit.start();
			});
		});
	});
}, function() {/*

<ul data-fn="test-ctrl">
	<li data-scope="{{collection}}" data-fn="each" class="li-{{property}}">{{property}}</li>
</ul>

*/});
