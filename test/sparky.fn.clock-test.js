group('[sparky-fn="clock"]', function(test, log, fixture) {
	var node   = fixture.children[0];
	var sparky = Sparky(node);
}, function() {/*

	<div class="clock-block block" sparky-fn="clock">
		<div class="hour-hand hand" style="transform: translate(0, 50%) rotate({[time|formatdate:'hh'|multiply:30|mod:360]}deg) translate(0, -50%);"></div>
		<div class="min-hand hand" style="transform: translate(0, 50%) rotate({[time|formatdate:'mm'|multiply:6|mod:360]}deg) translate(0, -50%);"></div>
		<div class="sec-hand hand" style="transform: translate(0, 50%) rotate({[time|formatdate:'ss'|multiply:6|mod:360]}deg) translate(0, -50%);"></div>
	</div>

*/});
