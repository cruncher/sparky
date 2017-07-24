
group('select > option|each', function(test, log, fixture) {
	var node = fixture.children[0];

	var array = Observable([
		{ key: '0', value: 0 },
		{ key: '1', value: 1 },
		{ key: '2', value: 2 }
	]);

	Sparky.fn['array-scope'] = function(node, stream) {	
		return Fn.of(array);
	};

	var sparky = Sparky(node);

	test("Array scope", function(equals, done) {
		requestAnimationFrame(function functionName() {
			equals(4, node.children.length, 'Wrong number of child <option>s.');
			equals('Infinity', node.children[node.children.length - 1].getAttribute('value'), 'Order of child <option>s is wrong.');
			done();
		});
	}, 2);

	test("Array scope mutation", function(equals, done) {
		node.value = '2';
	
		array.length = 0;
		array.push(
			{ key: '2', value: 2 },
			{ key: '3', value: 3 },
			{ key: '4', value: 4 }
		);
	
		requestAnimationFrame(function() {
			equals('2', node.value, 'Select should keep its value when items in scope replaced with items containing same value');
			equals('Infinity', node.children[node.children.length - 1].getAttribute('value'), 'Order of child <option>s is wrong.');
			done();
		});
	}, 2);
}, function() {/*

	<select data-fn="array-scope" class="{[length|add:1|prepend:'length-']}" id="test-select" name="name">
		<option data-fn="each" value="{[key]}">{[value]}</option>
		<option value="Infinity">Infinity</option>
	</select>

*/});