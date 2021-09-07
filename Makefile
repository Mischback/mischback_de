_site : index.html
	bundle exec jekyll build

jekyll/build : _site

build : jekyll/build

tree :
	tree -a -I ".bundle|.git|.husky|.jekyll-cache|vendor|.vscode"

.PHONY : build jekyll/build tree