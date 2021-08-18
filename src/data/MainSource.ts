import semver from 'semver';

import DocsSource from './DocsSource';

const branchBlacklist = new Set(['docs', 'website', 'gh-pages']);
export default new DocsSource({
	id: 'main',
	name: 'Main library',
	global: 'Discord',
	repo: 'MrGriefs/discord.js-cluster',
	defaultTag: 'main',
	branchFilter: (branch: string) => !branchBlacklist.has(branch) && !branch.startsWith('dependabot/'),
	tagFilter: (tag: string) => semver.gte(tag, '9.0.0'),
});
