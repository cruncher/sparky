
import { register } from './fn.js';

const DEBUG = window.DEBUG;

register('debug', function(node) {
    return DEBUG ? this.tap((scope) => {
        console.log('Sparky fn="debug" node:', node,'scope:', scope);
        debugger;
    }) :
    this ;
});
