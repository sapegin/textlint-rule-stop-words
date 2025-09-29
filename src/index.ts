import fs from 'node:fs';
import splitLines from 'split-lines';
import { createRequire } from 'node:module';
import { RuleHelper } from 'textlint-rule-helper';
import differenceWith from 'lodash/differenceWith.js';
import escapeRegExp from 'lodash/escapeRegExp.js';
import upperFirst from 'lodash/upperFirst.js';
import type { TxtNode, TxtNodeType } from '@textlint/ast-node-types';
import type {
	TextlintFixableRuleModule,
	TextlintRuleContext,
} from '@textlint/types';

type Rule = string[];

export interface Options {
	/** List of additional words: filename, npm module or an array of words */
	words: string | Rule[];
	exclude: string[];
	defaultWords: boolean;
	skip: TxtNodeType[];
}

const DEFAULT_OPTIONS: Options = {
	words: [],
	exclude: [],
	defaultWords: true,
	skip: ['BlockQuote'],
};

function reporter(
	context: TextlintRuleContext,
	userOptions: Partial<Options> = {},
) {
	const options = Object.assign({}, DEFAULT_OPTIONS, userOptions);
	const rules = getDict(options.defaultWords, options.words, options.exclude);

	const helper = new RuleHelper(context);
	const { Syntax, RuleError, report, fixer, getSource } = context;
	return {
		[Syntax.Str](node: TxtNode) {
			return new Promise<void>((resolve) => {
				if (
					helper.isChildNode(
						node,
						options.skip.map((rule) => Syntax[rule]),
					)
				) {
					return resolve();
				}

				const text = getSource(node);

				for (const [word, alternative] of rules) {
					const regExp = getRegExp(word);

					let match;

					while ((match = regExp.exec(text))) {
						const index = match.index;
						const [matched, matchedWord] = match;

						if (alternative) {
							if (alternative !== matchedWord) {
								const replacement = matched.replace(
									matchedWord,
									cloneCase(alternative, matchedWord),
								);
								const fix = fixer.replaceTextRange(
									[index, index + matched.length],
									replacement,
								);
								const message = `Avoid using “${matchedWord}”, use “${alternative}” instead`;
								report(node, new RuleError(message, { index, fix }));
							}
						} else {
							const message = `Avoid using “${matched.trim()}”`;
							report(node, new RuleError(message, { index }));
						}
					}
				}

				return resolve();
			});
		},
	};
}

function getDict(
	defaultWords: boolean,
	extraWords: string | Rule[],
	excludedWords: (string | Rule)[],
) {
	const defaults = defaultWords ? loadDict('../dict.txt') : [];
	const extras =
		typeof extraWords === 'string' ? loadDict(extraWords) : extraWords;
	return filterDict([...defaults, ...extras], excludedWords);
}

function loadDict(filepath: string) {
	const require = createRequire(import.meta.url);
	const absolutePath = require.resolve(filepath);
	return parseDict(fs.readFileSync(absolutePath, 'utf8'));
}

export function parseDict(contents: string) {
	return splitLines(contents)
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => s.split(/\s*>\s*/));
}

export function filterDict(rules: Rule[], excludedWords: (string | Rule)[]) {
	return differenceWith(rules, excludedWords, (rule, word) => {
		if (Array.isArray(word)) {
			word = word[0];
		}
		return rule[0] === word;
	});
}

/** RegExp to match exact word */
export function getRegExp(word: string) {
	const wordPattern = escapeRegExp(word).replaceAll("'", "['’‘]");
	const punctuations = [
		String.raw`\.`,
		',',
		':',
		';',
		String.raw`\?`,
		'!',
		'…',
	];
	const punctuationsRegExp = punctuations.map(
		(punctuation) => `${punctuation} |${punctuation}$`,
	);
	return new RegExp(
		`(?:^|[^-\\w])(${wordPattern}(?= |$|${punctuationsRegExp.join('|')}))`,
		'ig',
	);
}

function cloneCase(clone: string, original: string) {
	return upperFirst(original) === original ? upperFirst(clone) : clone;
}

const rule: TextlintFixableRuleModule<Partial<Options>> = {
	linter: reporter,
	fixer: reporter,
};

export default rule;
