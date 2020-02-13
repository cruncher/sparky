/* config.

```js
import { config } from './sparky/module.js'

config.attributeFn = 'data-fn';
config.attributeSrc = 'data-src';
```
*/

export default {
    attributeFn: 'fn',
    attributeSrc: 'src',
    attributePrefix: ':',
    parse: {
        default: { attributes: ['id', 'title', 'style'], booleans: ['hidden'] },
        a: { attributes: ['href'] },
        button: { attributes: ['name', 'value'], booleans: ['disabled'] },
        circle: { attributes: ['cx', 'cy', 'r', 'transform'] },
        ellipse: { attributes: ['cx', 'cy', 'rx', 'ry', 'r', 'transform'] },
        form: { attributes: ['method', 'action'] },
        fieldset: { booleans: ['disabled'] },
        g: { attributes: ['transform'] },
        img: { attributes: ['alt', 'src'] },
        input: {
            booleans: ['disabled', 'required'],
            attributes: ['name'],
            types: {
                button: { attributes: ['value'] },
                checkbox: { attributes: [], booleans: ['checked'] },
                date: { attributes: ['min', 'max', 'step'] },
                hidden: { attributes: ['value'] },
                image: { attributes: ['src'] },
                number: { attributes: ['min', 'max', 'step'] },
                radio: { attributes: [], booleans: ['checked'] },
                range: { attributes: ['min', 'max', 'step'] },
                reset: { attributes: ['value'] },
                submit: { attributes: ['value'] },
                time: { attributes: ['min', 'max', 'step'] }
            }
        },
        label: { attributes: ['for'] },
        line: { attributes: ['x1', 'x2', 'y1', 'y2', 'transform'] },
        link: { attributes: ['href'] },
        meta: { attributes: ['content'] },
        meter: { attributes: ['min', 'max', 'low', 'high', 'value'] },
        option: { attributes: ['value'], booleans: ['disabled'] },
        output: { attributes: ['for'] },
        path: { attributes: ['d', 'transform'] },
        polygon: { attributes: ['points', 'transform'] },
        polyline: { attributes: ['points', 'transform'] },
        progress: { attributes: ['max', 'value'] },
        rect: { attributes: ['x', 'y', 'width', 'height', 'rx', 'ry', 'transform'] },
        select: { attributes: ['name'], booleans: ['disabled', 'required'] },
        svg: { attributes: ['viewbox'] },
        text: { attributes: ['x', 'y', 'dx', 'dy', 'text-anchor', 'transform'] },
        textarea: { attributes: ['name'], booleans: ['disabled', 'required'] },
        time: { attributes: ['datetime'] },
        use: { attributes: ['href', 'transform', 'x', 'y'] }
    }
}

export const translations = {};