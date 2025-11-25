#!/bin/bash
if [ -f changelog_extract.txt ]; then
  awk '/^### / { if (count++ < 3) print "• " $0 }' changelog_extract.txt | sed 's/### //'
else
  echo "• Nouvelle version disponible"
fi

