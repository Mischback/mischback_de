# The intermediate build dir is the directory, where stylesheets, scripts,
# images and other static assets are collected (in their production-ready
# state) to be used by the final build step.
#
# This directory should be excluded from version control.
BUILD_DIR = build

# subdirectory for stylesheets
BUILD_DIR_CSS = $(BUILD_DIR)/css
BUILD_CSS_FILES = style.css

# subdirectory for scripts
BUILD_DIR_JS = $(BUILD_DIR)/js
BUILD_JS_FILES = bundle.js

# The source dir contains the source for stylesheets, scripts, images and any
# other static asset.
SOURCE_DIR = _src

# subdirectory for stylesheets (primarily sass/scss files, but may include
# other files aswell).
SOURCE_DIR_SASS = $(SOURCE_DIR)/sass
SOURCE_SASS = $(shell find $(SOURCE_DIR_SASS) -type f)

# subdirectory for script files (provided in TypeScript)
SOURCE_DIR_TS = $(SOURCE_DIR)/ts
SOURCE_TS = $(shell find $(SOURCE_DIR_TS) -path $(SOURCE_DIR_TS)/_internal_util -prune -false -o -type f)

# the actual manifest file for cache busting of static assets
ASSET_MANIFEST_FILE = $(BUILD_DIR)/asset_manifest.json


# INTERNALS

# "make"-specific configuration
.DELETE_ON_ERROR:  # deletes failed build files
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

# This flag is used to differentiate the build-modes "production" and
# "development".
# All recipes will create production ready assets, if called on its own. If the
# $(DEVELOPMENT_FLAG) is passed as $(BUILD_MODE) environment variable, the
# development-specific recipes will be executed, basically skipping
# optimization steps.
DEVELOPMENT_FLAG = dev

# utility function to create required directories on the fly
create_dir = @mkdir -p $(@D)

# Actually install the required NodeJS modules as required by package.json
# This rule may be used as positional prerequisite.
node_modules : package.json
	npm install
	touch $@

# Compile the internal utility scripts
_util/bin/ : $(shell find $(SOURCE_DIR_TS)/_internal_util -type f)
	echo "[UTIL] building project utilities..."
	npx tsc --project tsconfig.internal_util.json


# Build all required assets, including stylesheets (css/*.css), javascripts
# (js/*.js), images/graphics (images/*.{png,jpg,webp} and fonts (fonts/*.*).
$(BUILD_DIR): $(BUILD_DIR_CSS) $(BUILD_DIR_JS)

# Build the CSS directory by building required CSS files.
# It is generally advised to keep all styles in one single CSS file for
# production environments.
# However, this Makefile supports splitting the styles aswell, see the variable
# BUILD_CSS_FILES
$(BUILD_DIR_CSS): $(addprefix $(BUILD_DIR_CSS)/, $(BUILD_CSS_FILES))

# Actually compiles SCSS to CSS
# The recipe is using SASS (dart-sass) to compile *.scss files, which may be
# located in $(SOURCE_SASS_DIR), to *.css file(s), which will be written to
# $(BUILD_DIR_CSS).
# In production mode, these CSS files will then be post-processed by PostCSS.
#
# The recipe does respect the $(BUILD_MODE) and will create and store the
# corresponding source maps, if run with $(DEVELOPMENT_FLAG). In development
# mode no post-processing will be be performed.
$(BUILD_DIR_CSS)/%.css : $(SOURCE_DIR_SASS)/%.scss $(SOURCE_SASS) | node_modules
	$(create_dir)
ifeq ($(BUILD_MODE),$(DEVELOPMENT_FLAG))
	echo "[DEVELOPMENT] building stylesheet: $@ from $<"
	# 1) compile SCSS to CSS, creating a source map
	npx sass $<:$@ --style=expanded --source-map --stop-on-error
else
	echo "[PRODUCTION] building stylesheet: $@ from $<"
	# 1) compile SCSS to CSS, without creating a source map
	#    (the style is still "expanded" because optimization is performed by
	#    PostCSS)
	# 2) actually run PostCSS (see ./postcss.config.js for details on the actual
	#    plugins in use)
	npx sass $< --style=expanded --no-source-map --stop-on-error | \
	npx postcss -o $@
endif


# Build the JS directory by building required JS files.
# It is generally advised to keep all scripts in one single JS file for
# production environments.
# However, this Makefile supports splitting the scripts aswell, see the variable
# BUILD_JS_FILES.
# PLEASE NOTE that you will have to create a dedicated rule for every target,
# possibly with a dedicated tsconfig aswell.
$(BUILD_DIR_JS): $(addprefix $(BUILD_DIR_JS)/, $(BUILD_JS_FILES))

# Bundle all script files into one single asset.
# Following the best practice to only serve one script file, this bundles all
# script files into one.
# If you want to provide seperate script files, you will have to provide
# dedicated rules.
$(BUILD_DIR_JS)/bundle.js: $(BUILD_DIR_JS)/index.js | node_modules
	$(create_dir)
ifeq ($(BUILD_MODE),$(DEVELOPMENT_FLAG))
	echo "[DEVELOPMENT] bundling script files."
	npx browserify $(BUILD_DIR_JS)/*.js -o $@ --debug
else
	echo "[PRODUCTION] bundling script files."
	npx browserify $(BUILD_DIR_JS)/*.js | \
	npx uglifyjs --compress --mangle --output $@
endif

# Create the script's main file.
# Again, following the best practice to serve only one script file, it is
# sufficient to compile TypeScript to JavaScript with one single project
# definition (provided in "tsconfig.production.json").
# If you have other requirements, you will have to provide dedicated rules,
# probably with dedicated project definitions.
$(BUILD_DIR_JS)/index.js : $(SOURCE_TS) | node_modules
	$(create_dir)
ifeq ($(BUILD_MODE),$(DEVELOPMENT_FLAG))
	echo "[DEVELOPMENT] compiling script files."
	npx tsc --project tsconfig.development.json
else
	echo "[PRODUCTION] compiling script files."
	npx tsc --project tsconfig.production.json
endif

# Create the manifest file for cache busting
# This uses an internal NodeJS script
$(ASSET_MANIFEST_FILE): $(BUILD_DIR) | _util/bin/
	node _util/bin/busted_manifest --rootDirectory $(BUILD_DIR) --outFile $@ -m rename

# Build the website in production mode.
# "Production mode" means:
#   - stylesheets are generated WITHOUT source maps
#   - stylesheets are purged, prefixed with vendor-specific stuff, minimized
prod: $(ASSET_MANIFEST_FILE)

# Build the website in development mode.
# "Development mode" means:
#   - stylesheets are generated with a source map
#   - stylesheets will not be optimized / minimized
dev:
	BUILD_MODE=$(DEVELOPMENT_FLAG) \
	GNUMAKEFLAGS=--no-print-directory \
	$(MAKE) $(BUILD_DIR)

# Use NodeJS to watch for file changes and triggers rebuilding
# "npm-watch" is actually a wrapper around "nodemon" and simplifies
# configuration.
# "npm-watch" is configured in "./package.json" and basically triggers
# "make dev", rebuilding whatever is required.
dev/watch: | node_modules
	npm run watch build

# The following recipes run the linters against the code base, including
# "prettier" as code formatter, using the default configurations as provided in
# the corresponding configuration files.
# PLEASE NOTE, that this will not actually modify the files!
lint : lint/prettier lint/eslint lint/stylelint

lint/eslint : lint/prettier
	echo "[LINT] running eslint..."
	npx eslint "**/*.{js,ts}"

lint/stylelint : lint/prettier
	echo "[LINT] running stylelint..."
	npx stylelint .

lint/prettier :
	npx prettier -c .

# Run "tree" with prepared options, matching this repositories structure.
tree:
	tree -a -I "node_modules|.git|.sass-cache|.husky|.vscode" --dirsfirst -C

# Shortcut to build the project's utility scripts
util : _util/bin/

clean :
	rm -f $(ASSET_MANIFEST_FILE)
	rm -rf $(BUILD_DIR)

clean/full : clean
	rm -rf _util

# do not print commands to stdout
.SILENT:

# these targets don't produce actual output
.PHONY: clean clean/full dev dev/watch lint lint/eslint lint/prettier \
        lint/stylelint prod tree util
