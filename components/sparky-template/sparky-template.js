

/*
<midi-graph>

The `<midi-graph>` element plots incoming messages on a graph. The current
version displays notes, control change and pitch bend messages.

```html
<script type="module" src="//stephen.band/midi/components/midi-graph/midi-graph.js"></script>
<midi-graph>
```

<midi-graph/>

This module has external dependencies.
*/

import { noop, overload, toInt } from '../../../fn/fn.js';
import { append, define, query, trigger, empty, now } from '../../../dom/dom.js';
import { print } from '../../modules/print.js';

// define(name, setup, attributes, shadow)
define('sparky', function setup(node) {
	// Todo: get options from attributes?
	var options = {};

	function render() {
		Sparky(node.content);
		node.before(node.content);
	}

	render();

	print('<midi-graph> initialised', node);
}, {}, `
<!-- We have to use absolute paths for CSS inside the shadow DOM because we do
not know where the root document is. -->
<link rel="stylesheet" href="//stephen.band/midi/components/midi-graph/midi-graph.css"/>
<canvas class="midi-graph-canvas" width="1920" height="320"></canvas>
<ul class="midi-graph-ul">${lis}</ul>
`);
