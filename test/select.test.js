
import { Fn, test as group, Observer } from '../../fn/fn.js';
import Sparky from '../sparky.js';

group('select > option|each', function(test, log, fixture) {
	var node = fixture.children[0];

	var array = Observer([
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

	<select sparky-fn="array-scope" class="{[length|add:1|prepend:'length-']}" id="test-select" name="name">
		<option sparky-fn="each" value="{[key]}">{[value]}</option>
		<option value="Infinity">Infinity</option>
	</select>

*/});




group('select > option|each', function(test, log, fixture) {
	var node = fixture.children[0];

	var scope = Observer({
		value: '1',
		options: [
			{ key: '0', value: 0 },
			{ key: '1', value: 1 },
			{ key: '2', value: 2 }
		]
	});

	Sparky.fn['array-scope-2'] = function(node, stream) {
		return Fn.of(scope);
	};

	Sparky(node);

	test("Array scope", function(equals, done) {
		requestAnimationFrame(function functionName() {
			equals(4, node.children.length);
			equals('1', node.value);
			equals('1', scope.value);
			equals('Infinity', node.children[node.children.length - 1].getAttribute('value'), 'Order of child <option>s is wrong.');
			done();
		});
	}, 4);
}, function() {/*

	<select sparky-fn="array-scope-2" sparky-value="{[value]}" id="test-select-2" name="name">
		<option sparky-fn="get:options each" value="{[key]}">{[value]}</option>
		<option value="Infinity">Infinity</option>
	</select>

*/});


group('select > option|each', function(test, log, fixture) {
	Sparky(fixture);

	test("Array scope", function(equals, done) {
		requestAnimationFrame(function functionName() {
			var select = fixture.querySelector('select');
			equals(true, !!select);

			equals(4,   select.children.length);
			equals('1', select.value);
			equals('1', scope.value);
			equals('Infinity', select.children[select.children.length - 1].getAttribute('value'), 'Order of child <option>s is wrong.');
			done();
		});
	}, 4);
}, function() {/*
	<form fn="template:#address-editor"></form>

	<template id="address-editor">
	TEMPL
	    <label class="country-select-button select-button button">
	        <select value="{[country]}" name="country">
	            <option fn="import:countries.json each" value="{[key]}">{[value]}</option>
	        </select>
	    </label>
	</template>
*/});
