const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const execa = require('execa');

/**
 * 解析命令行参数
 */
const args = require('minimist')(process.argv.slice(2));
const targets = args._;
const formats = args.formats || args.f;
const devOnly = args.devOnly || args.d;
const prodOnly = !devOnly && (args.prodOnly || args.p);
const sourceMap = args.sourcemap || args.s;
const isRelease = args.release;
const buildTypes = args.t || args.types || isRelease;
const buildAllMatching = args.all || args.a;

// console.log('targets', targets);
// console.log('formats', formats);
// console.log('buildTypes', buildTypes);
// console.log('buildAllMatching', buildAllMatching);
// console.log(args);

/**
 * todo
 */
const { allPackages, fuzzyMatchPackages } = require('./common');


async function build(target) {
    const pkgDir = path.resolve(`packages/${target}`);
    const pkgJson = require(`${pkgDir}/package.json`);

    // only build published packages for release
    if (isRelease && pkgJson.private) {
        return
    }

    if (!formats) {
        await fs.remove(`${pkgDir}/dist`);
    }

    const env =
        (pkgJson.buildOptions && pkgJson.buildOptions.env) ||
        (devOnly ? 'development' : 'production');
    await execa(
        'rollup',
        [
            '-c',
            '--environment',
            [
                `NODE_ENV:${env}`,
                `TARGET:${target}`,
                formats ? `FORMATS:${formats}` : '',
                buildTypes ? `TYPES:true` : '',
                prodOnly ? `PROD_ONLY:true` : '',
                sourceMap ? `SOURCE_MAP:true` : '',
            ]
                .filter(Boolean)
                .join(','),
        ],
        { stdio: 'inherit' },
    );

    if (buildTypes && pkgJson.types) {
        console.log();
        // build types
        const { Extractor, ExtractorConfig } = require('@microsoft/api-extractor');
        const extractorConfigPath = path.resolve(pkgDir, 'api-extractor.json');
        const extractorConfig = ExtractorConfig.loadFileAndPrepare(extractorConfigPath);
        const extractorResult = Extractor.invoke(extractorConfig, {
            localBuild: true,
            showVerboseMessages: true,
        });

        if (extractorResult.succeeded) {
            // concat additional d.ts to rolled-up dts
            const typesDir = path.resolve(pkgDir, 'types');
            if (await fs.exists(typesDir)) {
                const dtsPath = path.resolve(pkgDir, pkgJson.types);
                const existing = await fs.readFile(dtsPath, 'utf-8');
                const typeFiles = await fs.readdir(typesDir);
                const toAdd = await Promise.all(
                    typeFiles.map(file => {
                        return fs.readFile(path.resolve(typesDir, file), 'utf-8')
                    }),
                );
                await fs.writeFile(dtsPath, existing + '\n' + toAdd.join('\n'))
            }
            console.log(
                chalk.bold(chalk.green(`API Extractor completed successfully.`)),
            )
        } else {
            console.error(
                `API Extractor completed with ${extractorResult.errorCount} errors` +
                ` and ${extractorResult.warningCount} warnings`,
            );
            process.exitCode = 1
        }
    }

    await fs.remove(`${pkgDir}/dist/packages`);
}

async function buildAll(allPackages) {
    for (const name of allPackages) {
        await build(name)
    }
}

(async function () {
    if (!targets.length) {
        await buildAll(allPackages)
    } else {
        await buildAll(fuzzyMatchPackages(targets, buildAllMatching))
    }
})();
