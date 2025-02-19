'use strict';

import assert from 'assert';

import { Hover, MarkupKind, SymbolKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { ScssDocument } from '../../document';
import StorageService from '../../services/storage';
import { doHover } from '../../providers/hover';
import * as helpers from '../helpers';

const storage = new StorageService();

storage.set('file.scss', new ScssDocument(
	TextDocument.create("./file.scss", 'scss', 1, ""),
	{
		variables: new Map(
			[["$variable", { name: '$variable', kind: SymbolKind.Variable, value: '2', offset: 0, position: { line: 1, character: 1 } }]]
		),
		mixins: new Map(
			[["mixin", { name: 'mixin',kind: SymbolKind.Method, parameters: [], offset: 0, position: { line: 1, character: 1 } } ]]
		),
		functions: new Map(
			[["func", { name: 'func', kind: SymbolKind.Function, parameters: [], offset: 0, position: { line: 1, character: 1 } } ]]
		),
		imports: new Map(),
		uses: new Map(),
		forwards: new Map(),
	}
));

async function getHover(lines: string[]): Promise<Hover | null> {
	let text = lines.join('\n');
	const offset = text.indexOf('|');
	text = text.replace('|', '');

	const document = await helpers.makeDocument(storage, text);

	return doHover(document, offset, storage);
}

describe('Providers/Hover', () => {
	it('should suggest local symbols', async () => {
		const actual = await getHover([
			'$one: 1;',
			'.a { content: $one|; }'
		]);

		assert.deepStrictEqual(actual?.contents, {
			kind: MarkupKind.Markdown,
			value: [
				'```scss',
				'$one: 1;',
				'```',
				'____',
				`Variable declared in index.scss`,
			].join('\n')
		});
	});

	it('should suggest global variables', async () => {
		const actual = await getHover([
			'.a { content: $variable|; }'
		]);

		assert.deepStrictEqual(actual?.contents, {
			kind: MarkupKind.Markdown,
			value: [
				'```scss',
				'$variable: 2;',
				'```',
				'____',
				`Variable declared in file.scss`,
			].join('\n')
		});
	});

	it('should suggest global mixins', async () => {
		const actual = await getHover([
			'.a { @include mixin| }'
		]);

		assert.deepStrictEqual(actual?.contents, {
			kind: MarkupKind.Markdown,
			value: [
				'```scss',
				'@mixin mixin()',
				'```',
				'____',
				`Mixin declared in file.scss`,
			].join('\n')
		});
	});

	it('should suggest global functions', async () => {
		const actual = await getHover([
			'.a {',
			'	width: func|();',
			'}'
		]);

		assert.deepStrictEqual(actual?.contents, {
			kind: MarkupKind.Markdown,
			value: [
				'```scss',
				'@function func()',
				'```',
				'____',
				`Function declared in file.scss`,
			].join('\n')
		});
	});
});
