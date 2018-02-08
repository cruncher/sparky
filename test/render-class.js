
//group('[class]', function(test, log, fixture) {
//	test("[class]", function(equals, done) {
//		var node = fixture.querySelector('div');
//		var model = Observable({ property: 'peas' });
//
//		Sparky(node, model);
//		equals(true, !!node.classList.contains('peas'),  'Classes expected to contain "peas", actual: ' + node.getAttribute('class'));
//
//		node.classList.add('hello');
//
//		window.requestAnimationFrame(function() {
//			equals(true, !!node.classList.contains('peas'),  'Classes expected to contain "peas", actual: ' + node.getAttribute('class'));
//			equals(true, !!node.classList.contains('hello'), 'Classes expected to contain "hello", actual: ' + node.getAttribute('class'));
//
//			model.property = 'ice';
//
//			window.requestAnimationFrame(function() {
//				equals(true, !node.classList.contains('peas'), 'Classes expected to not contain "peas", actual: "' + node.getAttribute('class') + '"');
//				equals(true, !!node.classList.contains('hello'), 'Classes expected to contain "hello", actual: "' + node.getAttribute('class') + '"');
//				done(5);
//			});
//		});
//	});
//}, function() {/*
//
//<div class="class-1 class-2 {[property]}">{[property]}</div>
//
//*/});

//group('Test tags in class attributes...', function(test, log, fixture) {
//	test("Tags is class attributes", function(equals, done) {
//		var node = fixture.querySelector('div');
//		var model = { property: 'peas' };
//
//		Sparky.data.model = model;
//		Sparky(node, model);
//		node.classList.remove('class-2');
//
//		window.requestAnimationFrame(function() {
//			equals(true, !!node.classList.contains('peas'), 'Classes expected to contain "peas", actual: "' + node.getAttribute('class') + '"');
//			equals(true, !node.classList.contains('class-2'), 'Classes not expected to contain "class-2", actual: "' + node.getAttribute('class') + '"');
//
//			model.property = undefined;
//
//			window.requestAnimationFrame(function() {
//				equals(true, !node.classList.contains('peas'), 'Classes not expected to contain "peas", actual: "' + node.getAttribute('class') + '"');
//				done(3);
//			});
//		});
//	});
//}, function() {/*
//
//<div sparky-scope="model" class="class-1 class-2 {[ property ]}">{[property]}</div>
//
//*/});
