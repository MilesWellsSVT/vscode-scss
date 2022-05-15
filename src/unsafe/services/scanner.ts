import path from 'path';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

import type { ISettings } from '../types/settings';
import { readFile, fileExists } from '../utils/fs';
import { parseDocument } from './parser';
import type StorageService from './storage';

export default class ScannerService {
	constructor(private readonly _storage: StorageService, private readonly _settings: ISettings) {}

	public async scan(files: string[], recursive = true): Promise<void> {
		const uniqueFiles = [...new Set(files)];
		await Promise.all(
			uniqueFiles.map((path) => {
				return this.parse(path, recursive);
			})
		);
	}

	protected async parse(filepath: string, recursive: boolean, prefix?: string): Promise<void> {
		// Cast to the system file path style
		filepath = path.normalize(filepath);
		const uri = URI.file(filepath).toString();

		const isExistFile = await this._fileExists(filepath);
		if (!isExistFile) {
			this._storage.delete(uri);
			return;
		}

		const alreadyParsed = this._storage.get(uri);
		if (alreadyParsed) {
			return;
		}

		const content = await this._readFile(filepath);
		const document = TextDocument.create(uri, 'scss', 1, content);
		const { symbols } = await parseDocument(document, null);

		console.log("Parsed " + filepath);

		// Add prefixed versions to the list of symbols. Keep originals for when working in the same file.
		if (prefix) {
			console.log("Found prefix " + prefix + " in file " + filepath);
			const functions = [...symbols.functions];
			const mixins = [...symbols.mixins];
			const variables = [...symbols.variables];
			for (const func of functions) {
				symbols.functions.push({
					...func,
					name: `${prefix}${func.name}`,
				});
			}
			for (const mixin of mixins) {
				symbols.mixins.push({
					...mixin,
					name: `${prefix}${mixin.name}`,
				});
			}
			for (const variable of variables) {
				symbols.variables.push({
					...variable,
					name: `${prefix}${variable.name}`,
				});
			}
		}

		this._storage.set(uri, { ...symbols, filepath });

		if (!recursive || !this._settings.scanImportedFiles) {
			return;
		}

		for (const symbol of symbols.imports) {
			if (symbol.dynamic || symbol.css) {
				continue;
			}

			await this.parse(symbol.filepath, recursive, symbol.prefix);
		}
	}

	protected _readFile(filepath: string): Promise<string> {
		return readFile(filepath);
	}

	protected _fileExists(filepath: string): Promise<boolean> {
		return fileExists(filepath);
	}
}
