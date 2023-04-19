const { getInput, setFailed } = require('@actions/core');
const { deleteTags, getRepoTags, getLastPullRequestMerged, getTagInfo } = require('./helpers/git.helper');

const validTag = getInput('TAG_REGEX');
const tag = getInput('UNTIL');
const prBaseBranch = getInput('PR_BASE_BRANCH');

const tagRegex = new RegExp(validTag, 'g');

const run = async () => {
    try {
        if (!tag && !prBaseBranch) return setFailed('Please set UNTIL or PR_BASE_BRANCH parameters');

        const tags = await getTags();
        if (tags.length <= 0) return console.info('No tag found');

        let until;

        if (isValidTag(tag)) until = await getTagInfo(tag);
        else {
            const lastPr = await getLastPullRequestMerged(prBaseBranch);
            if (!lastPr) return console.info('No PR found');

            const tag = isValidTag(lastPr.head.ref) ? await getTagInfo(lastPr.head.ref) : '';
            until = {
                name: tag ? tag.name : '',
                date: tag ? tag.date : new Date(lastPr.created_at)
            };
        }

        if (until.name !== '' && !until) return console.info('Not until tag found');

        if (until.name === '') console.info('Delete all valid tags');
        else console.info('Delete all valid tags until tag', until);

        const toDelete = getTagsToDelete(tags, until);
        console.info('Tags deleted:\n', toDelete.join('\n\t'));

        await deleteTags(toDelete);
    }
    catch (error) {
        setFailed(error.message);
    }
};

const isValidTag = (tag) => {
    if (!tag) return false;
    if (typeof tag !== 'string') return false;
    const match = tag.match(tagRegex);
    if (!match) return false;
    if (match.length !== 1) return false;
    return match[0] === tag;
};

const getTags = async () => {
    console.info('Getting list of tags from repository');

    const tags = await getRepoTags();
    const filtered = tags.filter(tag => isValidTag(tag.name));

    console.log(`Filter invalid tags, and getting ${filtered.length} tags`);

    return filtered;
};

const getTagsToDelete = (tags, until) => {
    const toDelete = [];
    const sorted = tags.sort((a, b) => b - a);

    for (const tag of sorted) {
        if (!isValidTag(tag.name)) continue;

        // if pr is merged to branch and not to a tag, delete all tags until this merged date
        if (until.name === '' && tag.date < until.date) {
            toDelete.push(tag);
            continue;
        }

        if (tag.name === until.name) break;
        toDelete.push(tag);
    };

    // Don't delete the last tag when merge to branch and not to tag
    if (until.name === '') toDelete.shift();

    return toDelete;
};

run();
