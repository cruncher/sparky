export default [{
    input: 'module.js',

    output: [{
        file: 'build/module.js',
        format: 'esm',
        name: 'Sparky'
    }, {
        file: 'build/script.js',
        format: 'iife',
        name: 'Sparky'
    }]
}];
