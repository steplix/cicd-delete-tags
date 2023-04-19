# cicd-delete-tags

This action delete all tags until specific tags. This can specify sending or get from the last closed PR.

## Configuration

### Input Parameters (`with`)

#### `GITHUB_TOKEN` (required)

Token to use to push to the repo. Pass in using `secrets.GITHUB_TOKEN`:

``` yaml
env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### `TAG_REGEX` (required)

Regex to validate tags:

``` yaml
with:
    TAG_REGEX: test-\d*
```

#### `UNTIL`

Tag to considerate to delete all until this tag (this not included):

``` yaml
with:
    UNTIL: test-1
```

#### `PR_BASE_BRANCH`

With this parameter check the last PR to this branch, and get the head branch if is a valid tag remove all valid tags until this (this not included), if not a valid tag remove all valid tags:

``` yaml
with:
    PR_BASE_BRANCH: staging
```

### Important

PR_BASE_BRANCH or UNTIL is needed, if both setted UNTIL parameter is more important.

### Example

``` yaml
jobs:
  tag:
    runs-on: ubuntu-latest
    steps:
      - name: Tagging
        uses: steplix/cicd-delete-tags@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAG_REGEX: test-\d*
```
