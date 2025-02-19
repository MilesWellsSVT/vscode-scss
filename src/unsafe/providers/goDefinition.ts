'use strict';

import { Location, SymbolKind } from 'vscode-languageserver';
import type { TextDocument, Position } from 'vscode-languageserver-textdocument';

import { NodeType } from '../types/nodes';
import type StorageService from '../services/storage';

import type { IScssDocument, ScssForward, ScssImport, ScssSymbol } from '../types/symbols';
import { asDollarlessVariable } from '../utils/string';

interface Identifier {
	kind: SymbolKind;
	position: Position;
	name: string;
}

function samePosition(a: Position | undefined, b: Position): boolean {
	if (a === undefined) {
		return false;
	}

	return a.line === b.line && a.character === b.character;
}

export async function goDefinition(document: TextDocument, offset: number, storage: StorageService): Promise<Location | null> {
	const currentScssDocument = storage.get(document.uri);
	if (!currentScssDocument) {
		return null;
	}

	const hoverNode = currentScssDocument.getNodeAt(offset);
	if (!hoverNode || !hoverNode.type) {
		return null;
	}

	let identifier: Identifier | null = null;
	if (hoverNode.type === NodeType.VariableName) {
		const parent = hoverNode.getParent();
		if (parent.type !== NodeType.FunctionParameter && parent.type !== NodeType.VariableDeclaration) {
			identifier = {
				name: hoverNode.getName(),
				position: document.positionAt(hoverNode.offset),
				kind: SymbolKind.Variable,
			};
		}
	} else if (hoverNode.type === NodeType.Identifier) {
		let i = 0;
		let node = hoverNode;
		while (node.type !== NodeType.MixinReference && node.type !== NodeType.Function && i !== 2) {
			node = node.getParent();
			i++;
		}

		if (node && (node.type === NodeType.MixinReference || node.type === NodeType.Function)) {
			let kind: SymbolKind = SymbolKind.Method;
			if (node.type === NodeType.Function) {
				kind = SymbolKind.Function;
			}

			identifier = {
				name: node.getName(),
				position: document.positionAt(node.offset),
				kind
			};
		}
	}

	if (!identifier) {
		return null;
	}

	const [definition, sourceDocument] = doSymbolHunting(document, storage, identifier);

	if (!definition || !sourceDocument) {
		return null;
	}

	const symbol = Location.create(sourceDocument.uri, {
		start: definition.position,
		end: {
			line: definition.position.line,
			character: definition.position.character + definition.name.length
		}
	});

	return symbol;
}

function doSymbolHunting(document: TextDocument, storage: StorageService, identifier: Identifier): ([ScssSymbol, IScssDocument] | [null, null]) {
	const scssDocument = storage.get(document.uri);
	if (!scssDocument) {
		return [null, null];
	}

	// Don't follow forwards from the current document, since the current doc doesn't have access to its symbols
	for (const { link } of scssDocument.getLinks({ forwards: false })) {
		const scssDocument = storage.get(link.target as string);
		if (!scssDocument) {
			continue;
		}

		const [symbol, sourceDocument] = traverseTree(scssDocument, identifier, storage);
		if (symbol) {
			return [symbol, sourceDocument];
		}
	}

	// Fall back to the old way of doing things if we can't find the symbol via `@use`
	for (const scssDocument of storage.values()) {
		let symbols: IterableIterator<ScssSymbol>;

		if (identifier.kind === SymbolKind.Variable) {
			symbols = scssDocument.variables.values();
		} else if (identifier.kind === SymbolKind.Function) {
			symbols = scssDocument.functions.values();
		} else {
			symbols = scssDocument.mixins.values();
		}

		for (const symbol of symbols) {
			if (symbol.name === identifier.name && !samePosition(symbol.position, identifier.position)) {
				return [symbol, scssDocument];
			}
		}
	}

	return [null, null]
}

function traverseTree(document: IScssDocument, identifier: Identifier, storage: StorageService, accumulatedPrefix = ""): ([ScssSymbol, IScssDocument] | [null, null]) {
	const scssDocument = storage.get(document.uri);
	if (!scssDocument) {
		return [null, null];
	}

	for (const symbol of scssDocument.getSymbols()) {
		const symbolName = `${accumulatedPrefix}${asDollarlessVariable(symbol.name)}`;
		const identifierName = asDollarlessVariable(identifier.name);
		if (symbolName === identifierName && symbol.kind === identifier.kind) {
			return [symbol, scssDocument];
		}
	}

	// Check to see if we have to go deeper
	for (const child of scssDocument.getLinks()) {
		if (!child.link.target || (child as ScssImport).dynamic || (child as ScssImport).css) {
			continue;
		}

		const childDocument = storage.get(child.link.target);
		if (!childDocument) {
			continue;
		}

		let prefix = accumulatedPrefix;
		if ((child as ScssForward).prefix) {
			prefix += (child as ScssForward).prefix;
		}

		const [symbol, document] =  traverseTree(childDocument, identifier, storage, prefix);
		if (symbol) {
			return [symbol, document];
		}
	}

	return [null, null];
}
