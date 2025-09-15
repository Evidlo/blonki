#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Switch to the publish branch, creating it if it doesn't exist
git checkout publish

# Remove everything from the root of the branch except the .git directory.
# We use `git rm -r --ignore-unmatch '*'`. This will clear the working directory
# and the Git index of all tracked files.
git rm -r --ignore-unmatch '*' -f

# Move the contents of the build folder to the root of the branch
mv dist/* .

# Add all files to the staging area and commit
git add .
git commit -m "chore: publish new build"

# Push the changes to the remote repository, overwriting history.
# The `--force` flag is used to overwrite the remote branch.
git push --force origin publish

git checkout master