_site : index.html
	bundle exec jekyll build

jekyll/build : _site

build : jekyll/build

serve :
	bundle exec jekyll serve

tree :
	tree -a -I ".bundle|.git|.husky|.jekyll-cache|vendor|.vscode"

.PHONY : build jekyll/build serve tree