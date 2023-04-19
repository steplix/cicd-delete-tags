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

    return tagsWithDate.sort((a, b) => b.date - a.date);
};

exports.getTagInfo = async (tag) => {
    await fetchTags();

    const tagSha = await getExecOutput('git', ['rev-list', '-1', tag], { cwd: '.' });
    if (tagSha.exitCode !== 0) {
        console.log(tagSha.stderr);
        process.exit(tagSha.exitCode);
    }

    const octokit = getOctokit(githubToken);
    const response = await octokit.rest.git.getTag({
        ...context.repo,
        tag_sha: tagSha.stdout
    });

    return {
        name: response.data.tag,
        date: new Date(response.data.tagger.date)
    };
};

exports.getLastPullRequestMerged = async (base) => {
    const octokit = getOctokit(githubToken);

    const getPrs = (page) => {
        return octokit.rest.pulls.list({
            ...context.repo,
            state: 'closed',
            base,
            direction: 'desc',
            page,
            sort: 'created'
        });
    };

    let prMerged;
    let page = 1;
    let more = true;

    while (more) {
        const response = await getPrs(++page);

        // Are more pages
        more = response.status === 200 && response.data.length > 0;

        for (const pr of response.data) {
            if (pr.merged_at) {
                prMerged = pr;
                more = false;
                break;
            }
        }
    }

    return prMerged;
};

exports.deleteTags = async (tags) => {
    const octokit = getOctokit(githubToken);

    for (const tag of tags) {
        const ref = `tags/${tag}`;
        await octokit.rest.git.deleteRef({
            ...context.repo,
            ref
        });
    }
};
