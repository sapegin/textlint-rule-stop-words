/** @type {import("prettier").Config} */
module.exports = {
	singleQuote: true,
	overrides: [
		{
			files: '*.md',
			options: {
				arrowParens: 'avoid',
				printWidth: 70,
				proseWrap: 'never',
				trailingComma: 'none',
			},
		},
	],
};
