// @ts-check

const fs = require('fs');
const path = require('path');
const splitLines = require('split-lines');
const { RuleHelper } = require('textlint-rule-helper');
const { upperFirst } = require('lodash');

const DEFAULT_OPTIONS = {
	words: [],
	exclude: [], // TODO
	defaultWords: true,
	skip: ['BlockQuote'],
};

function reporter(context, options = {}) {
	const opts = Object.assign({}, DEFAULT_OPTIONS, options);
	const rules = getDict(opts.defaultWords, opts.words);

	const helper = new RuleHelper(context);
	const { Syntax, RuleError, report, fixer, getSource } = context;
	return {
		[Syntax.Str](node) {
			if (helper.isChildNode(node, opts.skip.map(rule => Syntax[rule]))) {
				return false;
			}

			return new Promise(resolve => {
				const text = getSource(node);

				for (const [word, alternative] of rules) {
					const regExp = getRegExp(word);

					let match;
					// eslint-disable-next-line no-cond-assign
					while ((match = regExp.exec(text))) {
						const index = match.index;
						const [matched, matchedWord] = match;

						if (alternative) {
							const replacement = matched.replace(matchedWord, cloneCase(alternative, matchedWord));
							const range = [index, index + matched.length];
							const fix = fixer.replaceTextRange(range, replacement);
							const message = `Avoid using “${word}”, use “${alternative}” instead`;
							report(node, new RuleError(message, { index, fix }));
						} else {
							const message = `Avoid using “${matched.trim()}”`;
							report(node, new RuleError(message, { index }));
						}
					}
				}

				resolve();
			});
		},
	};
}

/**
 * @param {boolean} defaultWords
 * @param {string|array} extraWords
 * @return {array}
 */
function getDict(defaultWords, extraWords) {
	const defaults = defaultWords ? loadDict(path.join(__dirname, 'dict.txt')) : [];
	const extras = typeof extraWords === 'string' ? loadDict(extraWords) : extraWords;
	return defaults.concat(extras);
}

/**
 * @param {string} filepath
 * @return {array}
 */
function loadDict(filepath) {
	const lines = fs.readFileSync(filepath, 'utf8');
	return splitLines(lines)
		.map(s => s.trim())
		.filter(Boolean)
		.map(s => s.split(/\s*>\s*/));
}

/**
 * RegExp to match exact word.
 * @param {string} word
 * @return {RegExp}
 */
function getRegExp(word) {
	const wordPattern = word.replace(/'/g, "['’‘]");
	return new RegExp(`(?:^|[^-\\w])(${wordPattern}(?= |\\. |\\.$|$))`, 'ig');
}

/**
 * Capitalize the first letter of *clone* if the first letter of *original* is capital.
 * @param {string} clone
 * @param {string} original
 * @return {string}
 */
function cloneCase(clone, original) {
	return upperFirst(original) === original ? upperFirst(clone) : clone;
}

module.exports = {
	linter: reporter,
	fixer: reporter,
	test: {
		getRegExp,
	},
};
