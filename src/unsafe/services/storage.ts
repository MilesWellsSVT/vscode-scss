import type { IDocumentSymbols } from '../types/symbols';

export type Storage = Map<StorageItemKey, StorageItemValue>;
export type StorageItemEntry = [StorageItemKey, StorageItemValue];
export type StorageItemKey = string;
export type StorageItemValue = IDocumentSymbols;

export default class StorageService {
	private readonly _storage: Storage = new Map();

	public get(key: StorageItemKey): StorageItemValue | undefined {
		return this._storage.get(key);
	}

	public merge(key: StorageItemKey, value: StorageItemValue): void {
		const existing = this.get(key);
		if (!existing) {
			this._storage.set(key, value);
		} else {
			const newValue: StorageItemValue = value;
			newValue.functions = newValue.functions.concat(existing.functions);
			newValue.imports = newValue.imports.concat(existing.imports);
			newValue.mixins = newValue.mixins.concat(existing.mixins);
			newValue.variables = newValue.variables.concat(existing.variables);
			this._storage.set(key, newValue);
		}
	}

	public set(key: StorageItemKey, value: StorageItemValue): void {
		this._storage.set(key, value);
	}

	public delete(key: string): void {
		this._storage.delete(key);
	}

	public clear(): void {
		this._storage.clear();
	}

	public keys(): StorageItemKey[] {
		return [...this._storage.keys()];
	}

	public values(): StorageItemValue[] {
		return [...this._storage.values()];
	}

	public entries(): StorageItemEntry[] {
		return [...this._storage.entries()];
	}
}
