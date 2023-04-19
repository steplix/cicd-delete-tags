const { getInput, setFailed } = require('@actions/core');
const { deleteTags, getRepoTags, getBranchTags, getLastPullRequest } = require('./helpers/git.helper');

const validTag = getInput('TAG_REGEX');
const tagUntil = getInput('UNTIL');
const prBaseBranch = getInput('PR_BASE_BRANCH');
const perBranch = getInput('PER_BRANCH');

const tagRegex = new RegExp(validTag, 'g');

const run = async () => {
    try {
        if (!tagUntil && !prBaseBranch) return setFailed('Please set UNTIL or PR_BASE_BRANCH parameters');

        const tags = await getTags();
        let until;

        if (isValidTag(tagUntil)) until = tagUntil;
        else {
            const lastPr = await getLastPullRequest(prBaseBranch);
            const tag = isValidTag(lastPr.head) ? lastPr.head : '';
            until = tag;
        }

        console.log('Delete all tags until tag', until);
        const toDelete = getTagsToDelete(tags, until);
        console.log('tags to delete:\n', toDelete.join('\n'));

        await deleteTags(toDelete);
    }
    catch (error) {
        setFailed(error.message);
    }
};

const isValidTag = (tag) => {
    return tagRegex.test(tag);
};

const getTags = async () => {
    console.log(`Getting list of tags from ${perBranch === 'true' ? 'branch' : 'repository'}`);

    const tags = perBranch === 'true' ? await getBranchTags() : await getRepoTags();
    return tags
        .filter(tag => isValidTag(tag));
};

const getTagsToDelete = (tags, until) => {
    const toDelete = [];
    for (const tag of tags) {
        if (until !== '' && tag === until) break;
        if (!isValidTag(tag)) continue;
        toDelete.push(tag);
    };

    return toDelete;
};

run();
