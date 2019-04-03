import { test as group } from '../../fn/module.js';
import Sparky from '../sparky.js';

group('[sparky-fn="template:url"]', function(test, log, fixture) {
	var node   = fixture.children[0];
	var sparky = Sparky(node);

	test('[sparky-fn="template:url"]', function(equals, done) {
		equals('Default content.', node.innerHTML);

		sparky.push({});

		setTimeout(function() {
			equals('Hello', node.innerHTML);
			done();
		}, 2000);
	}, 2);
}, function() {/*

	<p class="{[property]}" sparky-fn="template:'test/fn-template-url.html#hello-template'">Default content.</p>

*/});
