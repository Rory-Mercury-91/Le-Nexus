#!/bin/bash
VERSION="$1"
VERSION_CLEAN=$(echo "$VERSION" | sed 's/^v//')

if [ ! -f CHANGELOG.md ]; then
  echo "Contenu disponible dans les prochaines releases." > changelog_extract.txt
else
  awk -v ver="$VERSION_CLEAN" '
    BEGIN { started=0 }
    /^## [0-9]{4}-[0-9]{2}-[0-9]{2}/ {
      if (match($0, /v?([0-9]+\.[0-9]+\.[0-9]+)/, arr)) {
        if (arr[1] == ver) {
          started = 1
          next
        } else if (started) {
          exit
        }
      }
    }
    started { print }
  ' CHANGELOG.md > changelog_extract.txt
fi

if [ ! -s changelog_extract.txt ]; then
  echo "Contenu disponible dans les prochaines releases." > changelog_extract.txt
fi

head -c 1000 changelog_extract.txt > changelog_short.txt

