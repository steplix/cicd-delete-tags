const { getInput } = require('@actions/core');
const { getExecOutput } = require('@actions/exec');
const { getOctokit, context } = require('@actions/github');

const githubToken = getInput('GITHUB_TOKEN');

const fetchTags = async () => {
    const fetch = await getExecOutput('git', ['fetch', '--tags', '--quiet'], { cwd: '.' });

    if (fetch.exitCode !== 0) {
        console.log(fetch.stderr);
        process.exit(fetch.exitCode);
    }
};

exports.getRepoTags = async () => {
    const octokit = getOctokit(githubToken);

    const { data: tags } = await octokit.rest.git.listMatchingRefs({
        ...context.repo,
        ref: 'tags/'
    });

    const tagsWithDate = [];

    for (const tag of tags) {
        const response = await octokit.rest.git.getTag({
            ...context.repo,
            tag_sha: tag.object.sha
        });

        tagsWithDate.push({
            name: response.data.tag,
            date: new Date(response.data.tagger.date)
        });
    }

    const sorted = tagsWithDate.sort((a, b) => b.date - a.date);
    return sorted.map(t => t.name);
};

exports.getBranchTags = async () => {
    await fetchTags();

    const tags = await getExecOutput('git', ['tag', '--sort', '-creatordate', '--no-column', '--merged'], { cwd: '.' });
    if (tags.exitCode !== 0) {
        console.log(tags.stderr);
        process.exit(tags.exitCode);
    }

    return tags.stdout.split('\n');
};

exports.getLastPullRequest = async (base) => {
    const octokit = getOctokit(githubToken);

    const { data: prs } = await octokit.rest.pulls.list({
        ...context.repo,
        state: 'closed',
        base,
        direction: 'desc',
        per_page: 1,
        sort: 'created'
    });

    return prs[0] || {};
};

exports.deleteTags = async (tags) => {
    const octokit = getOctokit(githubToken);

    for (const tag of tags) {
        console.log(`Deleting tag ${tag}`);

        const ref = `tags/${tag}`;
        await octokit.rest.git.deleteRef({
            ...context.repo,
            ref
        });
    }
};
