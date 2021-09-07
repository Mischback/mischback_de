_site : index.html
	bundle exec jekyll build

jekyll/build : _site

build : jekyll/build

.PHONY : build jekyll/build