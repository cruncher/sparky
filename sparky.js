
if (window.console && window.console.log) {
    console.log('Sparky      - https://github.com/cruncher/sparky');
}

const DEBUG = true;

import * as fn  from '../fn/fn.js';
import * as dom from '../dom/dom.js';

if (DEBUG) {
    window.fn = fn;
    window.dom = dom;
}

import Sparky from './js/sparky.js';
export default Sparky;
import './js/sparky.fn.each.js';
import './js/sparky.fn.template.js';
import './js/sparky.fn.import.js';
import './js/sparky.fn.request.js';

if (DEBUG) {
    window.Sparky = Sparky;
}
