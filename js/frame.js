
(function(window) {

	var DEBUG = false;

	var dom = window.dom;
	var now = dom.now;

	// Render queue

	const queue = new Set();
	let frame;

	function run(time) {
		if (DEBUG) { console.groupCollapsed('frame', (time / 1000).toFixed(3) + ' start ' + now().toFixed(3)); }

		frame = true;
		const t = now();
		let fn;
		// Immutable copy of queue (the frame fns may add to the queue for
		// reference, but they run those fns syncrounously themselves)
		const fns = Array.from(queue.values());
		let n = 0;

		while (fn = fns[n++]) {
			fn(time);
		}

		queue.clear();
		frame = undefined;

		if (DEBUG) {
			console.log('Render duration ' + (now() - t).toFixed(3) + 's');
			console.groupEnd();
		}
	}

	function cue(fn) {
		if (queue.has(fn)) {
			if (DEBUG) { console.warn('frame: Trying to add an existing fn. Dropped', fn); }
			return;
		}

		queue.add(fn);

		if (frame === true) {
			fn();
			return;
		}

		if (frame === undefined) {
			if (DEBUG) { console.log('(request master frame)'); }
			frame = requestAnimationFrame(run);
		}
	}

	function uncue(fn) {
		// During frame, queue is keeping a record of what has been run. It
		// will get cleared at the end of the frame anyway.
		if (frame === true) { return; }

		queue.delete(fn);

		if (frame !== undefined && queue.size === 0) {
			if (DEBUG) { console.log('(cancel master frame)'); }
			cancelAnimationFrame(frame);
			frame = undefined;
		}
	}

	window.frame = {
		cue: cue,
		uncue: uncue
	};
})(window);

export default window.frame;
