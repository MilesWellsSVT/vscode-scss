export type Prefix = {
	link: string;
	prefix: string;
}

const forwardWithPrefixRegex = /@forward ["|'](.+)["|'] as (\w+-)\*/gi;

export function findForwardsWithPrefix(text: string): Prefix[] {
	const result: Prefix[] = [];
	const matches = text.matchAll(forwardWithPrefixRegex);

	for (const match of matches) {
		const [_, link, prefix] = match as [string, string, string];
		result.push({
			link,
			prefix
		});
	}

	return result;
}
