import path from 'path';
import chalk from 'chalk';
import rollupTypescript from 'rollup-plugin-typescript2';
import rollupReplace from '@rollup/plugin-replace';
import rollupJson from '@rollup/plugin-json';

if (!process.env.TARGET) {
    throw new Error('TARGET package must be specified via --environment flag.')
}

const version = require('./package').version;
const packagesDir = path.resolve(__dirname, 'packages');
const targetDir = path.resolve(packagesDir, process.env.TARGET);
const resolve = file => path.resolve(targetDir, file);
const pkgName = path.basename(targetDir);
const pkgJson = require(resolve('package.json'));
const buildOptions = pkgJson.buildOptions || {};
const outputConfig = {
    amd: {
        name: pkgJson.name,
        file: resolve(`dist/${pkgName}.umd.js`),
        format: 'amd',
    },
    cjs: {
        file: resolve(`dist/${pkgName}.cjs.js`),
        format: 'cjs',
    },
    esm: {
        file: resolve(`dist/${pkgName}.esm.js`),
        format: 'esm',
    },
    iife: {
        file: resolve(`dist/${pkgName}.iife.js`),
        format: 'iife',
    },
    umd: {
        name: 'index',
        file: resolve(`dist/${pkgName}.umd.js`),
        format: 'umd',
    },
    global: {
        file: resolve(`dist/${pkgName}.global.js`),
        format: 'iife',
    },
};

// ensure TS checks only once for each build
let hasTSChecked = false;

const inlineFormats = process.env.FORMATS && process.env.FORMATS.split(',');
const packageFormats = inlineFormats || buildOptions.formats || [ 'esm' ];
const rollupConfig = process.env.PROD_ONLY ? [] : packageFormats.map(format => createConfig(format, outputConfig[format]));

if (process.env.NODE_ENV === 'production') {
    packageFormats.forEach(format => {
        if (buildOptions.prod === false) return;
        if (format === 'cjs') {
            rollupConfig.push(createProductionConfig(format))
        }
        rollupConfig.push(createMinifiedConfig(format))
    })
}

function createConfig(format, output, plugins = []) {
    if (!output) {
        console.log(chalk.yellow(`invalid format: "${format}"`));
        process.exit(1)
    }

    output.sourcemap = !!process.env.SOURCE_MAP;
    output.externalLiveBindings = false;

    const isNodeBuild = format === 'cjs';

    const shouldEmitDeclarations = process.env.TYPES != null && !hasTSChecked;
    const tsPlugin = rollupTypescript({
        check: process.env.NODE_ENV === 'production' && !hasTSChecked,
        tsconfig: path.resolve(__dirname, 'tsconfig.json'),
        cacheRoot: path.resolve(__dirname, 'node_modules/.rts2_cache'),
        tsconfigOverride: {
            compilerOptions: {
                sourceMap: output.sourcemap,
                declaration: shouldEmitDeclarations,
                declarationMap: shouldEmitDeclarations,
            },
            exclude: [ '**/__tests__', 'test-dts' ],
        },
    });
    hasTSChecked = true;

    const external = [ 'path', 'url' ];
    const nodePlugins = format !== 'cjs'
        ? []
        : [];

    return {
        input: resolve('src/index.ts'),
        output: Object.assign(output, buildOptions.output || {}),
        external,
        plugins: [
            rollupJson({ namedExports: false }),
            tsPlugin,
            createReplacePlugin({ isNodeBuild }),
            ...nodePlugins,
            ...plugins,
        ],
        treeshake: {
            moduleSideEffects: false,
        },
    };
}

function createReplacePlugin({ isNodeBuild }) {
    const replacements = {
        __VERSION__: `"${version}"`,
        __NODE_JS__: isNodeBuild,
    };
    Object.keys(replacements).forEach(key => {
        if (key in process.env) {
            replacements[key] = process.env[key]
        }
    });
    return rollupReplace(replacements)
}

function createProductionConfig(format) {
    return createConfig(format, {
        file: resolve(`dist/${pkgName}.${format}.prod.js`),
        format: outputConfig[format].format,
    })
}

function createMinifiedConfig(format) {
    const { terser } = require('rollup-plugin-terser');
    return createConfig(
        format,
        {
            name: outputConfig[format].name,
            file: outputConfig[format].file.replace(/\.js$/, '.prod.js'),
            format: outputConfig[format].format,
        },
        [
            terser({
                module: /^esm/.test(format),
                compress: {
                    ecma: 2015,
                    pure_getters: true,
                },
            }),
        ],
    )
}

export default rollupConfig;
