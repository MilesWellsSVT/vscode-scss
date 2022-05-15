'use strict';

import assert from 'assert';

import { findForwardsWithPrefix, Prefix } from '../../utils/imports';

describe('Utils/Imports', () => {
	it('findForwardsWithPrefix', () => {
		const documentText = `@forward "breakpoints";
@forward "colors" as color-* hide varslingsfarge;
@forward "shadow";
@forward "shadows" as shadow-*;
@forward "spacing" hide $spacing;
@forward "typography" as typography-*;
@forward "z-index";
`;
		const expected: Prefix[] = [
			{
				link: "colors",
				prefix: "color-",
			},
			{
				link: "shadows",
				prefix: "shadow-",
			},
			{
				link: "typography",
				prefix: "typography-",
			},
		];
		const actual = findForwardsWithPrefix(documentText);
		assert.deepStrictEqual(actual, expected);
	});
});
