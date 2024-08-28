import { describe, test, expect } from 'vitest';
import TextLintTester from 'textlint-tester';
import rule, { getRegExp, parseDict, filterDict } from './index';

const tester = new TextLintTester();

describe('getRegExp', () => {
	const word = 'java';
	test('match a pattern as a full word', () => {
		const result = getRegExp(word).exec('My java is good');
		expect(result).toContain('java');
	});

	test('not match a pattern in the middle of a word', () => {
		const result = getRegExp(word).exec('Foo superjavay bar');
		expect(result).toBeFalsy();
	});

	test('match a pattern at the beginning of a string', () => {
		const result = getRegExp(word).exec('java bar');
		expect(result).toContain('java');
	});

	test('match a pattern at the end of a string', () => {
		const result = getRegExp(word).exec('foo java');
		expect(result).toContain('java');
	});

	test('not match a pattern at the beginning of a word with a hyphen', () => {
		const result = getRegExp(word).exec('Foo java-ish bar');
		expect(result).toBeFalsy();
	});

	test('not match a pattern in at the end of a word with a hyphen', () => {
		const result = getRegExp(word).exec('Foo uber-java bar');
		expect(result).toBeFalsy();
	});

	test('match a pattern at the end of a sentence', () => {
		const result = getRegExp(word).exec('My java.');
		expect(result).toContain('java');
	});

	test('match a pattern at the end of a sentence in the middle of a string', () => {
		const result = getRegExp(word).exec('My java. My webpack.');
		expect(result).toContain('java');
	});

	test('match a pattern followed by a punctuation mark', () => {
		const regexp = getRegExp(word);
		const result1 = 'java! Awesome!'.match(regexp);
		expect(result1).toContain('java');
		const result2 = 'java? never heard of'.match(regexp);
		expect(result2).toContain('java');
		const result3 = 'java, a programming language'.match(regexp);
		expect(result3).toContain('java');
		const result4 = 'java; Python'.match(regexp);
		expect(result4).toContain('java');
		const result5 = 'java: free'.match(regexp);
		expect(result5).toContain('java');
	});

	test('match a pattern ending with a punctuation mark', () => {
		const regexp = getRegExp(word);
		const result1 = 'java!'.match(regexp);
		expect(result1).toContain('java');
		const result2 = 'java?'.match(regexp);
		expect(result2).toContain('java');
		const result3 = 'java,'.match(regexp);
		expect(result3).toContain('java');
		const result4 = 'java;'.match(regexp);
		expect(result4).toContain('java');
		const result5 = 'java:'.match(regexp);
		expect(result5).toContain('java');
	});

	test('not match a pattern in as a part of a file name', () => {
		const result = getRegExp(word).exec('java.md');
		expect(result).toBeFalsy();
	});

	test('match a pattern regardless of its case', () => {
		const result = getRegExp(word).exec('Java is good');
		expect(result).toContain('Java');
	});

	test('match a pattern with any kind of apostrophe', () => {
		const result = "foo a'b a’b a‘b bar".match(getRegExp("a'b"));
		expect(result).toEqual([" a'b", ' a’b', ' a‘b']);
	});

	test('not treat words as regexp', () => {
		const result = getRegExp('i.e.').exec('I have an idea');
		expect(result).toBeFalsy();
	});

	test('match several word', () => {
		const regexp = getRegExp(word);
		const text = 'My Java is better than your java';
		const result1 = regexp.exec(text);
		expect(result1).toContain('Java');
		const result2 = regexp.exec(text);
		expect(result2).toContain('java');
	});
});

describe('parseDict', () => {
	test('return an empty array for empty string', () => {
		const result = parseDict('');
		expect(result).toEqual([]);
	});

	test('split text intro array of arrays', () => {
		const result = parseDict('a\nb');
		expect(result).toEqual([['a'], ['b']]);
	});

	test('trim whitespace', () => {
		const result = parseDict('   a	\nb');
		expect(result).toEqual([['a'], ['b']]);
	});

	test('ignore or whitespace-only lines', () => {
		const result = parseDict('a\n \n\nb');
		expect(result).toEqual([['a'], ['b']]);
	});

	test('split a word and a fix', () => {
		const result = parseDict('a>b');
		expect(result).toEqual([['a', 'b']]);
	});

	test('ignore whitespace around >', () => {
		const result = parseDict('a > b');
		expect(result).toEqual([['a', 'b']]);
	});
});

describe('filterDict', () => {
	test('filter array of rules', () => {
		const result = filterDict([['foo'], ['bar']], [['foo']]);
		expect(result).toEqual([['bar']]);
	});

	test('accept strings for filter instead of arrays', () => {
		const result = filterDict([['foo'], ['bar']], ['foo']);
		expect(result).toEqual([['bar']]);
	});
});

tester.run(
	'textlint-rule-stop-words',
	{
		rules: [
			{
				ruleId: 'stop-words',
				rule,
				options: {
					words: [['Asciidoctor', 'Asciidoctor']],
				},
			},
		],
	},
	{
		valid: [
			{
				text: 'Asciidoctor is great',
			},
		],
		invalid: [
			{
				// The capitalization is incorrect
				text: 'AsciiDoctor is a fast text processor',
				output: 'Asciidoctor is a fast text processor',
				errors: [
					{
						message: 'Avoid using “AsciiDoctor”, use “Asciidoctor” instead',
					},
				],
			},
		],
	},
);

tester.run('textlint-rule-stop-words', rule, {
	valid: [
		{
			// Should skip code examples
			text: 'Do not `utilize` this',
		},
		{
			// Should skip URLs
			text: 'My [code](http://example.com/utilize) is good',
		},
		// Should not warn when incorrect term is used as a part of another word
		{
			text: 'Bar utilizen foo',
		},
		{
			text: 'Utilizen',
		},
		{
			text: 'Bar uberutilize foo',
		},
		{
			text: 'uberutilize',
		},
		// Should not warn when incorrect term is used as a part of a hyphenates word
		{
			text: 'Install utilize-some-plugin here',
		},
		{
			text: 'utilize-some-plugin',
		},
		{
			text: 'Install some-plugin-utilize here',
		},
		{
			text: 'some-plugin-utilize',
		},
		{
			// Should not warn about file names
			text: 'utilize.md',
		},
		{
			// Should not treat words as regexp
			text: 'I have an idea',
		},
	],
	invalid: [
		{
			// One word
			text: 'You should hyperlocal Elm',
			output: 'You should hyperlocal Elm',
			errors: [
				{
					message: 'Avoid using “hyperlocal”',
				},
			],
		},
		{
			// One word, after a comma
			text: 'You should, hyperlocal Elm',
			output: 'You should, hyperlocal Elm',
			errors: [
				{
					message: 'Avoid using “hyperlocal”',
				},
			],
		},
		{
			// One word, after a colon
			text: 'You should: hyperlocal Elm',
			output: 'You should: hyperlocal Elm',
			errors: [
				{
					message: 'Avoid using “hyperlocal”',
				},
			],
		},
		{
			// One word, after a semicolon
			text: 'You should; hyperlocal Elm',
			output: 'You should; hyperlocal Elm',
			errors: [
				{
					message: 'Avoid using “hyperlocal”',
				},
			],
		},
		{
			// One word, before comma
			text: 'You should hyperlocal,',
			output: 'You should hyperlocal,',
			errors: [
				{
					message: 'Avoid using “hyperlocal”',
				},
			],
		},
		{
			// One word, before point
			text: 'You should hyperlocal.',
			output: 'You should hyperlocal.',
			errors: [
				{
					message: 'Avoid using “hyperlocal”',
				},
			],
		},
		{
			// One word, before ellipsis
			text: 'You should hyperlocal…',
			output: 'You should hyperlocal…',
			errors: [
				{
					message: 'Avoid using “hyperlocal”',
				},
			],
		},
		{
			// One word + fix
			text: 'You should utilize Elm',
			output: 'You should use Elm',
			errors: [
				{
					message: 'Avoid using “utilize”, use “use” instead',
				},
			],
		},
		{
			// Several words, keep suffix
			text: 'You should utilize Elm and hyperlocal JavaScript',
			output: 'You should use Elm and hyperlocal JavaScript',
			errors: [
				{
					message: 'Avoid using “utilize”, use “use” instead',
				},
				{
					message: 'Avoid using “hyperlocal”',
				},
			],
		},
		{
			// Keep formatting
			text: 'You should **hyperlocal** Elm',
			output: 'You should **hyperlocal** Elm',
			errors: [
				{
					message: 'Avoid using “hyperlocal”',
				},
			],
		},
		{
			// Keep capital first letter
			text: 'Utilize Elm',
			output: 'Use Elm',
			errors: [
				{
					message: 'Avoid using “Utilize”, use “use” instead',
				},
			],
		},
	],
});
