const fs = require('fs');
const chalk = require('chalk');

const allPackages = fs.readdirSync('packages').filter(file => {
  if (!fs.statSync(`packages/${file}`).isDirectory()) {
    return false
  }
  const pkg = require(`../packages/${file}/package.json`);
  return !(pkg.private && !pkg.buildOptions);
});

/**
 * 模糊匹配
 * @param partialTargets
 * @param includeAllMatching
 * @returns {[]}
 */
exports.fuzzyMatchPackages = (partialTargets, includeAllMatching) => {
  const matched = [];
  partialTargets.forEach(partialTarget => {
    for (const target of allPackages) {
      if (target.match(partialTarget)) {
        matched.push(target);
        if (!includeAllMatching) {
          break
        }
      }
    }
  });
  if (matched.length) {
    return matched
  }

  console.log();
  console.error(
    `  ${chalk.bgRed.white(' ERROR ')} ${chalk.red(
      `Target ${chalk.underline(partialTargets)} not found!`
    )}`
  );
  console.log();

  process.exit(1);
};

exports.allPackages = allPackages;
