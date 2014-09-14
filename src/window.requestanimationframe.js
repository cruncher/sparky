// Polyfill for requestAnimationFrame
//
// Stephen Band
// 
// The frameDuration is set to 33ms by default for a framerate of 30fps, the
// thinking being that browsers without requestAnimationFrame are generally a
// little slower and less optimised for higher rates.

(function() {
    var frameDuration = 40;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    var n = vendors.length;

    while (n-- && !window.requestAnimationFrame) {
        window.requestAnimationFrame = window[vendors[n]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[n]+'CancelAnimationFrame'] || window[vendors[n]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var lastTime = frameDuration * (currTime % frameDuration);
            var id = window.setTimeout(function() { callback(lastTime + frameDuration); }, lastTime + frameDuration - currTime);
            return id;
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());