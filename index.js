// @ts-check

/** @typedef {string[]} Rule */

const fs = require('fs');
const path = require('path');
const splitLines = require('split-lines');
const { RuleHelper } = require('textlint-rule-helper');
const { differenceWith, isEqual, upperFirst } = require('lodash');

const DEFAULT_OPTIONS = {
	words: [],
	exclude: [],
	defaultWords: true,
	skip: ['BlockQuote'],
};

function reporter(context, options = {}) {
	const opts = Object.assign({}, DEFAULT_OPTIONS, options);
	const rules = getDict(opts.defaultWords, opts.words, opts.exclude);

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
 * @param {string|Rule[]} extraWords
 * @param {Array<string|Rule>} excludedWords
 * @return {Rule[]}
 */
function getDict(defaultWords, extraWords, excludedWords) {
	const defaults = defaultWords ? loadDict(path.join(__dirname, 'dict.txt')) : [];
	const extras = typeof extraWords === 'string' ? loadDict(extraWords) : extraWords;
	return filterDict(defaults.concat(extras), excludedWords);
}

/**
 * @param {string} filepath
 * @return {Rule[]}
 */
function loadDict(filepath) {
	return parseDict(fs.readFileSync(filepath, 'utf8'));
}

/**
 * @param {string} contents
 * @return {Rule[]}
 */
function parseDict(contents) {
	return splitLines(contents)
		.map(s => s.trim())
		.filter(Boolean)
		.map(s => s.split(/\s*>\s*/));
}

/**
 * @param {Rule[]} rules
 * @param {Array<string|Rule>} excludedWords
 * @return {Rule[]}
 */
function filterDict(rules, excludedWords) {
	const normalizedExcudedWords = excludedWords.map(x => Array.from(x));
	return differenceWith(rules, normalizedExcudedWords, isEqual);
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
		parseDict,
		filterDict,
	},
};
