# ##### CONFIGURATION

SRC_ASSETS = _src
PROJECT_UTILITY_SCRIPTS = _util/bin/
STAMP_DIR = .make-stamps


# ##### INTERNAL
STAMP_NODE_INSTALL := $(STAMP_DIR)/node-install

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

$(STAMP_NODE_INSTALL) : package.json
	$(create_dir)
	npm install
	touch $@

# Compile the internal utility scripts
$(PROJECT_UTILITY_SCRIPTS) : $(shell find $(SRC_ASSETS)/ts/_internal_util -type f) tsconfig.internal_util.json | $(STAMP_NODE_INSTALL)
	echo "[UTIL] building project utilities..."
	npx tsc --project tsconfig.internal_util.json

setup : $(PROJECT_UTILITY_SCRIPTS) $(STAMP_NODE_INSTALL)
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
	tree -a -I ".bundle|.git|.husky|.jekyll-cache|node_modules|.sass-cache|vendor|.vscode" --dirsfirst -C
.PHONY : tree

clean :
	rm -rf $(STAMP_DIR)
.PHONY : clean

clean/full : clean
	rm -rf $(PROJECT_UTILITY_SCRIPTS)
.PHONY : clean/full
