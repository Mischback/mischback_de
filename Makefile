# ##### CONFIGURATION

BUILD_DIR := _site
BUILD_ASSETS := $(BUILD_DIR)/assets
SRC_ASSETS := _src
SRC_CONTENT := content
ASSETS_MANIFEST_FILE := _site/assets.json
JEKYLL_CONFIG := _config.yml
PROJECT_UTILITY_SCRIPTS := _util/bin/
STAMP_DIR := .make-stamps


# ##### INTERNAL
DEVELOPMENT_FLAG := dev

STAMP_ASSETS_DEV := $(STAMP_DIR)/assets-dev
STAMP_BUILD_COMPLETED := $(STAMP_DIR)/build-completed
STAMP_CSS_READY := $(STAMP_DIR)/css-ready
STAMP_JEKYLL_INSTALL := $(STAMP_DIR)/jekyll-install
STAMP_JS_COMPILED := $(STAMP_DIR)/js-compiled
STAMP_JS_READY := $(STAMP_DIR)/js-ready
STAMP_NODE_INSTALL := $(STAMP_DIR)/node-install

ifeq ($(BUILD_MODE), $(DEVELOPMENT_FLAG))
STAMP_ASSETS_READY := $(STAMP_ASSETS_DEV)
$(STAMP_JS_COMPILED) : tsconfig.development.json
else
STAMP_ASSETS_READY := $(ASSETS_MANIFEST_FILE)
$(STAMP_ASSETS_READY) : | $(PROJECT_UTILITY_SCRIPTS)
$(STAMP_JS_COMPILED) : tsconfig.production.json
endif

SRC_CONTENT_FILES = $(shell find $(SRC_CONTENT) -type f)
SRC_FILES_SASS = $(shell find $(SRC_ASSETS)/sass -type f)
SRC_FILES_TS = $(shell find $(SRC_ASSETS)/ts -path $(SRC_ASSETS)/ts/_internal_util -prune -false -o -type f)

# utility function to create required directories on the fly
create_dir = @mkdir -p $(@D)


# ##### MAKE INTERNAL

# do not print commands to stdout
.SILENT:

# "make"-specific configuration
.DELETE_ON_ERROR:  # deletes failed build files
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules


# ##### RECIPES

build/production : $(STAMP_BUILD_COMPLETED)
.PHONY : build/production

build : build/production
.PHONY : build

build/development :
	BUILD_MODE=$(DEVELOPMENT_FLAG) \
	GNUMAKEFLAGS=--no-print-directory \
	$(MAKE) $(STAMP_BUILD_COMPLETED)
.PHONY : build/development

dev : build/development
.PHONY : dev

$(STAMP_BUILD_COMPLETED) : $(SRC_CONTENT_FILES) $(STAMP_ASSETS_READY) $(JEKYLL_CONFIG) | $(STAMP_JEKYLL_INSTALL)
	$(create_dir)
	bundle exec jekyll build
	touch $@

$(STAMP_ASSETS_READY) : $(STAMP_CSS_READY) $(STAMP_JS_READY)
	$(create_dir)
ifeq ($(BUILD_MODE), $(DEVELOPMENT_FLAG))
	touch $@
else
	echo "[production] hashing asset files..."
	mkdir -p $(BUILD_ASSETS)
	node $(PROJECT_UTILITY_SCRIPTS)/busted_manifest --rootDirectory $(BUILD_ASSETS) --outFile $@ -m rename
endif

$(STAMP_CSS_READY) : $(BUILD_ASSETS)/css/style.css
	$(create_dir)
	touch $@

$(BUILD_ASSETS)/css/%.css : $(SRC_ASSETS)/sass/%.scss $(SRC_FILES_SASS) | $(STAMP_NODE_INSTALL)
ifeq ($(BUILD_MODE), $(DEVELOPMENT_FLAG))
	echo "[development] compiling $@..."
	npx sass $<:$@ --style=expanded --source-map --stop-on-error
else
	echo "[production] compiling and post-processing $@..."
	npx sass $< --style=expanded --no-source-map --stop-on-error | \
	npx postcss -o $@
endif

$(STAMP_JS_READY) : $(BUILD_ASSETS)/js/bundle.js
	$(create_dir)
	touch $@

$(BUILD_ASSETS)/js/bundle.js : $(STAMP_JS_COMPILED) | $(STAMP_NODE_INSTALL)
ifeq ($(BUILD_MODE), $(DEVELOPMENT_FLAG))
	echo "[development] bundling script files..."
	npx browserify $(BUILD_ASSETS)/js/*.js -o $@ --debug
else
	echo "[production] bundling and post-processing script files..."
	npx browserify $(BUILD_ASSETS)/js/*.js | \
	npx uglifyjs --compress --mangle --output $@
endif

$(STAMP_JS_COMPILED) : $(SRC_FILES_TS) | $(STAMP_NODE_INSTALL)
ifeq ($(BUILD_MODE), $(DEVELOPMENT_FLAG))
	echo "[development] compiling script files..."
	npx tsc --project tsconfig.development.json
else
	echo "[production] compiling script files..."
	npx tsc --project tsconfig.production.json
endif
	touch $@

$(STAMP_JEKYLL_INSTALL) : Gemfile
	$(create_dir)
	bundle install
	touch $@

$(STAMP_NODE_INSTALL) : package.json
	$(create_dir)
	npm install
	touch $@

# Compile the internal utility scripts
$(PROJECT_UTILITY_SCRIPTS) : $(shell find $(SRC_ASSETS)/ts/_internal_util -type f) tsconfig.internal_util.json | $(STAMP_NODE_INSTALL)
	echo "[UTIL] building project utilities..."
	npx tsc --project tsconfig.internal_util.json

setup : $(PROJECT_UTILITY_SCRIPTS) $(STAMP_NODE_INSTALL) $(STAMP_JEKYLL_INSTALL)
.PHONY : setup

# The following recipes run the linters against the code base, including
# "prettier" as code formatter, using the default configurations as provided in
# the corresponding configuration files.
# PLEASE NOTE, that this will not actually modify the files!
lint : lint/prettier lint/eslint lint/stylelint
.PHONY : lint

lint/eslint : lint/prettier
	echo "[LINT] running eslint..."
	npx eslint "**/*.{js,ts}"
.PHONY : lint/eslint

lint/stylelint : lint/prettier
	echo "[LINT] running stylelint..."
	npx stylelint .
.PHONY : lint/stylelint

lint/prettier :
	npx prettier -c .
.PHONY : lint/prettier

# Run "tree" with prepared options, matching this repositories structure.
tree :
	tree -a -I ".bundle|.git|.husky|.jekyll-cache|.make-stamps|node_modules|.sass-cache|vendor|.vscode" --dirsfirst -C
.PHONY : tree

clean :
	rm -rf $(BUILD_DIR)
	rm -rf $(STAMP_DIR)
.PHONY : clean

clean/full : clean
	rm -rf $(PROJECT_UTILITY_SCRIPTS)
.PHONY : clean/full
