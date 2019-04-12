/*
        import { Observer } from '../fn/module.js';
        import { parseText } from './modules/parse.js';

        console.log(
            'PARSE',
            parseText([], 'Parseable text {[ property ]}')
        );

        console.log(
            'PARSE',
            parseText([], 'Parseable text {[ property | type ]}')
        );

        console.log(
            'PARSE',
            parseText([], 'Parseable text {[ property | add:2 ]}')
        );

        console.log(
            'PARSE',
            parseText([], 'Parseable text {[ property | add:2 | type ]}')
        );


        console.log(
            'PARSE',
            parseText([], 'Parseable text {[ property ]}').join('')
        );

        console.log(
            'PARSE',
            parseText([], 'Parseable text {[ property | type ]}').join('')
        );

        console.log(
            'PARSE',
            parseText([], 'Parseable text {[ property | add:2 ]} trailing text').join('')
        );

        console.log(
            'PARSE',
            parseText([], 'Parseable text {[ property | add:2 | type ]} trailing text').join('')
        );



        import { StringRenderer } from './modules/renderer.js';

        const results = [
            'Leading text, number 12, prepad "" to "", trailing text.',
            'Leading text, number 14, prepad "" to "", trailing text.',
            'Leading text, number 16, prepad "text" to "--text", trailing text.'
        ];

        const stringRenderer = new StringRenderer('Leading text, {[number|type]} {[ number | add:2 ]}, prepad "{[ string ]}" to "{[ string | prepad:"-",6 ]}", trailing text.', (string) => {
            console.log(results.shift() === string);
        });

        console.log(stringRenderer);


        const scope = {
            number: 10
        };

        stringRenderer.push(scope);

        setTimeout(function() {
            Observer(scope).number = 12;

            setTimeout(function() {
                Observer(scope).number = 14;
                Observer(scope).string = 'text';
            }, 500);
        }, 500);

        //Observer(scope).property = 12;
*/
