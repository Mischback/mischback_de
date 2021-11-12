# ##### CONFIGURATION

# Target directory for the build process
# Must be synchronized with Jekyll's config ("destination", default: _site)
BUILD_DIR := _site

# Target directory for frontend assets
# If this is placed inside of BUILD_DIR, make sure to include this directory in
# Jekyll's config ("keep_files").
# The frontend assets are built without Jekyll's own toolchain. Without
# including this directory in "keep_files", Jekyll will remove the already
# freshly built assets before Jekyll's own compilation run.
BUILD_ASSETS := $(BUILD_DIR)/assets

# Directory containing the sources for frontend assets
SRC_ASSETS := _src

# Directory containing the actual content
# Must be synchronized with Jekyll's config ("source")
SRC_CONTENT := content

# Path/filename of the asset manifest file
# During "production" mode, the frontend asset files are hashed and the hash
# is appended to the filename.
# This manifest provides the mapping from the original to the new filenames.
# This file (and only the file) should be included in .gitignore
ASSETS_MANIFEST_FILE := _data/assets.json

# Jekyll's config file (default: _config.yml)
JEKYLL_CONFIG := _config.yml

# Make's internal stamp directory
# Stamps are used to keep track of certain build steps.
# Should be included in .gitignore
STAMP_DIR := .make-stamps


# ##### INTERNAL

# The actual value of the flag controlling the development mode
# This should not need any modification
DEVELOPMENT_FLAG := dev

# Define file names for stamp files
STAMP_ASSETS_DEV := $(STAMP_DIR)/assets-dev
STAMP_BUILD_COMPLETED := $(STAMP_DIR)/build-completed
STAMP_CSS_READY := $(STAMP_DIR)/css-ready
STAMP_IMAGES_READY := $(STAMP_DIR)/images-ready
STAMP_JEKYLL_INSTALL := $(STAMP_DIR)/jekyll-install
STAMP_JS_COMPILED := $(STAMP_DIR)/js-compiled
STAMP_JS_READY := $(STAMP_DIR)/js-ready
STAMP_NODE_INSTALL := $(STAMP_DIR)/node-install

# Handle the slight differences between the build modes
# 1) To keep track of the readiness of the frontend assets, an artificial stamp
#    is used during "development", while "production" relies on the actual
#    ASSETS_MANIFEST_FILE, containing the mapping of original file names to
#    hashed file names.
# 2) Because the "production" mode relies on asset hashing, which is provided
#    as an project-specific utility, this utilities have to be build and the
#    corresponding target is added as an order-only prerequisite.
# 3) While compiling the JS script files, different config files are used for
#    the TS compiler, which are added as prerequisites.
ifeq ($(BUILD_MODE), $(DEVELOPMENT_FLAG))
STAMP_ASSETS_READY := $(STAMP_ASSETS_DEV)
$(STAMP_JS_COMPILED) : tsconfig.development.json
else
STAMP_ASSETS_READY := $(ASSETS_MANIFEST_FILE)
$(STAMP_JS_COMPILED) : tsconfig.production.json
endif

# Manage prerequisites to actually include all dependencies
# Please note: This is rather generic and may trigger (re-) builds that are not
# strictly necessary, i.e. if the project has more than one stylesheet which
# rely on a different set of source files.
SRC_CONTENT_FILES = index.html $(shell find $(SRC_CONTENT) -type f)
SRC_FILES_IMAGES = $(shell find $(SRC_ASSETS)/images -type f ! -name .gitignore)
SRC_FILES_SASS = $(shell find $(SRC_ASSETS)/sass -type f)
SRC_FILES_TS = $(shell find $(SRC_ASSETS)/ts -false -o -type f)
JEKYLL_LAYOUTS := $(shell find _layouts -type f)
JEKYLL_INCLUDES := $(shell find _includes -type f)

# First step: adjust the paths from source to build directory
# Second step: replace all file extensions with PNG (assuming, that png is the
# project's default image format and is applied in image-processor.json)
TARGET_FILES_IMAGES_PATH = $(patsubst $(SRC_ASSETS)/images/%, $(BUILD_ASSETS)/images/%, $(SRC_FILES_IMAGES))
TARGET_FILES_IMAGES = $(addsuffix .png, $(basename $(TARGET_FILES_IMAGES_PATH)))

# utility function to create required directories on the fly
create_dir = @mkdir -p $(@D)


# ##### MAKE INTERNAL

.SILENT:                                # do not print commands to stdout
.DELETE_ON_ERROR:                       # delete failed build files
MAKEFLAGS += --warn-undefined-variables # Insult me!
MAKEFLAGS += --no-builtin-rules         # disable Make magic!


# ##### RECIPES

# Shortcut to build with production settings
build/production : $(STAMP_BUILD_COMPLETED)
.PHONY : build/production

# Shortcut to build with production settings
build : build/production
.PHONY : build

# Shortcut to build with development settings
build/development :
	BUILD_MODE=$(DEVELOPMENT_FLAG) \
	GNUMAKEFLAGS=--no-print-directory \
	$(MAKE) $(STAMP_BUILD_COMPLETED)
.PHONY : build/development


# Build the whole project
# This recipy by itsself actually executes Jekyll's build command. The recipe's
# prerequisites ensure that the frontend assets are built aswell.
# Additionally, the actual content source files and Jekyll's configuration file
# is considered.
# The recipe relies on an artificial stamp file to ensure maximal flexibility
# without assuming any file to be present.
# Please note that Jekyll's build command will in fact create multiple files,
# depending on your content.
# TODO: Add Jekyll-specific prerequisites, e.g. "_includes", "_layouts", ...
$(STAMP_BUILD_COMPLETED) : $(SRC_CONTENT_FILES) $(STAMP_ASSETS_READY) $(JEKYLL_LAYOUTS) $(JEKYLL_INCLUDES) $(JEKYLL_CONFIG) | $(STAMP_JEKYLL_INSTALL)
	echo "[any] running Jekyll build process..."
	$(create_dir)
	bundle exec jekyll build
	touch $@

# Build the frontend assets
# This recipe will perform different tasks, depending on the build mode.
# During "development" it will use an artificial stamp file to track completion,
# while it will actually perform the hashing of frontend assets during
# "production" builds.
$(STAMP_ASSETS_READY) : $(STAMP_CSS_READY) $(STAMP_JS_READY) $(STAMP_IMAGES_READY)
	$(create_dir)
ifeq ($(BUILD_MODE), $(DEVELOPMENT_FLAG))
	touch $@
else
	echo "[production] hashing asset files..."
	mkdir -p $(BUILD_ASSETS)
	npx buster -i $(BUILD_ASSETS) -o $@ -m rename
endif

# Artificial build step for CSS assets
# This target actually determines, which CSS files need to be built.
# TODO: Define the files to be built in the Makefile's head section and expand
#       the list here!
$(STAMP_CSS_READY) : $(BUILD_ASSETS)/css/style.css
	$(create_dir)
	touch $@

# Compile (and optimize) CSS files
# During "development" builds, the stylesheets are build with source maps, while
# in "production" mode, source maps are skipped and an additional
# post-processing step (using PostCSS) is performed (see postcss.config.js).
$(BUILD_ASSETS)/css/%.css : $(SRC_ASSETS)/sass/%.scss $(SRC_FILES_SASS) | $(STAMP_NODE_INSTALL)
ifeq ($(BUILD_MODE), $(DEVELOPMENT_FLAG))
	echo "[development] compiling $@..."
	npx sass $<:$@ --style=expanded --source-map --stop-on-error
else
	echo "[production] compiling and post-processing $@..."
	npx sass $< --style=expanded --no-source-map --stop-on-error | \
	npx postcss -o $@
endif

# Artificial build step for JS assets
# This target actually determines, which JS files need to be built.
# TODO: Define the files to be built in the Makefile's head section and expand
#       the list here!
#       Only if this does make sense! Compilation of JS-files is done in one run
#       of the TS-compiler (see below), but in fact we do only want one script
#       file for production by bundling the different files together.
#       Probably only the filename of the bundle should be controllable.
$(STAMP_JS_READY) : $(BUILD_ASSETS)/js/bundle.js
	$(create_dir)
	touch $@

# Bundle all JS scripts into one single file
# In "production" mode, the resulting bundle is also compressed using "uglifyjs".
$(BUILD_ASSETS)/js/bundle.js : $(STAMP_JS_COMPILED) | $(STAMP_NODE_INSTALL)
ifeq ($(BUILD_MODE), $(DEVELOPMENT_FLAG))
	echo "[development] bundling script files..."
	npx browserify $(BUILD_ASSETS)/js/*.js -o $@ --debug
else
	echo "[production] bundling and post-processing script files..."
	npx browserify $(BUILD_ASSETS)/js/*.js | \
	npx uglifyjs --compress --mangle --output $@
endif

# Compile TS sources to JS
# All source files are compiled in one run of the TS compiler (tsc), with
# different settings for "production" and "development".
$(STAMP_JS_COMPILED) : $(SRC_FILES_TS) | $(STAMP_NODE_INSTALL)
ifeq ($(BUILD_MODE), $(DEVELOPMENT_FLAG))
	echo "[development] compiling script files..."
	npx tsc --project tsconfig.development.json
else
	echo "[production] compiling script files..."
	npx tsc --project tsconfig.production.json
endif
	touch $@

$(STAMP_IMAGES_READY) : $(TARGET_FILES_IMAGES)
	$(create_dir)
	touch $@

$(BUILD_ASSETS)/images/%.png : $(SRC_ASSETS)/images/%.*
	$(create_dir)
	npx imp --inputFile $< --outputDir $(BUILD_ASSETS)/images


# Install all required Ruby gems as specified in Gemfile
# This is applied as order-only prerequisite to all recipes that use
# Ruby-related commands, e.g. Jekyll's build command.
# TODO: This assumes that "bundle" is used, which might not be the case for
#       every project
$(STAMP_JEKYLL_INSTALL) : Gemfile
	$(create_dir)
	bundle install
	touch $@

# Install all required NodeJS packages as specified in package.json
# This is applied as order-only prerequisite to all recipes that use
# NodeJS-based commands, basically for the whole build chain of frontend assets.
$(STAMP_NODE_INSTALL) : package.json
	$(create_dir)
	npm install
	touch $@

dev :
	BUILD_MODE=$(DEVELOPMENT_FLAG) \
	npx srv4dev --webRoot $(BUILD_DIR) --address "0.0.0.0" --port "4000"
.PHONY : dev


# Shortcut to install Ruby gems, NodeJS packages and build the project's utility
# scripts.
setup : $(STAMP_NODE_INSTALL) $(STAMP_JEKYLL_INSTALL)
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
	echo "[LINT] running prettier..."
	npx prettier -c .
.PHONY : lint/prettier

# Run "tree" with prepared options, matching this repositories structure.
tree/project :
	tree -a -I ".bundle|.git|.husky|.jekyll-cache|.make-stamps|node_modules|.sass-cache|vendor|.vscode" --dirsfirst -C
.PHONY : tree/project

tree/content :
	tree -a -I ".editorconfig|.eslintrc.json|.gitignore|.lintstagedrc.json|.nvmrc|.prettierignore|.prettierrc.json|.stylelintignore|.stylelintrc.json|Gemfile|Gemfile.lock|image-processor.json|nodemon.json|package-lock.json|package.json|postcss.config.js|tsconfig.development.json|tsconfig.json|tsconfig.production.json|.bundle|.git|.husky|.jekyll-cache|.make-stamps|node_modules|.sass-cache|vendor|.vscode" --dirsfirst -c
.PHONY : tree/content

tree : tree/content
.PHONY : tree

# Removes the build directory to enable a clean build
# Additionally removes Make's stamp directory to actually force rebuilding
clean :
	rm -rf $(BUILD_DIR)
	rm -rf $(STAMP_DIR)
	rm -f $(ASSETS_MANIFEST_FILE)
.PHONY : clean
