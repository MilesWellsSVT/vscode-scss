'use strict';

import type { Position } from 'vscode-languageserver-textdocument';
import type { INode } from './nodes';

export interface IVariable {
	position?: Position;
	mixin?: string;
    name: string;
    value: string | null;
    offset: number;
}

export interface IMixin {
	position?: Position;
	name: string;
    parameters: IVariable[];
    offset: number;
}

export type IFunction = IMixin;

export interface IImport {
	reference?: boolean;
	filepath: string;
    dynamic: boolean;
    css: boolean;
	prefix?: string;
}

export interface IDocumentSymbols extends ISymbols {
	/**
	 * The imported path in the document.
	 */
	document?: string;
	/**
	 * The real path to the file on the file system.
	 */
	filepath?: string;
	/**
	 * Indicates whether the symbols in this document were forwarded with a prefix
	 * @link https://sass-lang.com/documentation/at-rules/forward#adding-a-prefix
	 */
	prefix?: string;
}

export interface ISymbols {
	variables: IVariable[];
	mixins: IMixin[];
	functions: IFunction[];
	imports: IImport[];
}

export interface IDocument {
	node: INode | null;
	symbols: IDocumentSymbols;
}
