


# INTERNALS

# "make"-specific configuration
.DELETE_ON_ERROR:  # deletes failed build files
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules


# utility function to create required directories on the fly
create_dir = @mkdir -p $(@D)


# Compile the internal utility scripts
_util/bin/ : $(shell find $(SOURCE_DIR_TS)/_internal_util -type f)
	echo "[UTIL] building project utilities..."
	npx tsc --project tsconfig.internal_util.json


# Use NodeJS to watch for file changes and triggers rebuilding
# "npm-watch" is actually a wrapper around "nodemon" and simplifies
# configuration.
# "npm-watch" is configured in "./package.json" and basically triggers
# "make assets/dev", rebuilding whatever is required.
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
tree :
	tree -a -I ".bundle|.git|.husky|.jekyll-cache|node_modules|.sass-cache|vendor|.vscode" --dirsfirst -C

clean :
	rm -f $(ASSET_MANIFEST_FILE)
	rm -rf $(FRONTEND_BUILD_DIR)

clean/full : clean
	rm -rf _util

# do not print commands to stdout
.SILENT:

# these targets don't produce actual output
.PHONY: clean clean/full dev/watch lint lint/eslint lint/prettier \
        lint/stylelint tree
