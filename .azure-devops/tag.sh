#!/bin/bash

echo "Tagging on git..."
VERSION="$GITVERSION_SEMVER"
git config user.email "edit.devops@imec.be"
git config user.name "AzureDevops"
git push --delete origin $VERSION
git tag -d $VERSION
git tag -a $VERSION -m "Release $VERSION"
git push origin $VERSION
