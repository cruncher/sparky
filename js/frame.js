
(function(window) {

	var dom = window.dom;
	var now = dom.now;

	// Render queue

	const queue = new Set();
	let frame;

	function run(time) {
		console.group('frame', (time / 1000).toFixed(4) + ' start ' + now().toFixed(4));

		let fn;

		for (fn of queue) {
			fn(time);
		}

		queue.clear();
		frame = undefined;

		console.log('stop  ' + now().toFixed(4));
		console.groupEnd();
	}

	function cue(fn) {
		queue.add(fn);

		if (frame === undefined) {
console.log('(request master frame)')
			frame = requestAnimationFrame(run);
		}
	}

	function uncue(fn) {
		queue.delete(fn);

		if (frame !== undefined && queue.size === 0) {
console.log('(cancel master frame)')
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
