.PHONY: obfuscate clean deploy deploy-all deploy-event-registration deploy-survey-response deploy-lib deploy-proposal-manager login help

SRC_DIR := src
DIST_DIR := dist

login: ## Login to Google Apps Script via clasp
	clasp login

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

clean: ## Clean dist directory
	@echo "Cleaning dist directory..."
	@rm -rf $(DIST_DIR)
	@mkdir -p $(DIST_DIR)

obfuscate: clean ## Obfuscate .gs files from src to dist
	@echo "Obfuscating .gs files..."
	@find $(SRC_DIR) -type f -name "*.gs" | while read file; do \
		rel_path=$${file#$(SRC_DIR)/}; \
		dist_file=$(DIST_DIR)/$$rel_path; \
		dist_dir=$$(dirname $$dist_file); \
		mkdir -p $$dist_dir; \
		echo "Obfuscating: $$file -> $$dist_file"; \
		temp_js=$$(mktemp).js; \
		temp_out=$$(mktemp).js; \
		cp $$file $$temp_js; \
		npx javascript-obfuscator $$temp_js \
			--output $$temp_out \
			--compact true \
			--control-flow-flattening true \
			--control-flow-flattening-threshold 0.75 \
			--dead-code-injection true \
			--dead-code-injection-threshold 0.4 \
			--identifier-names-generator hexadecimal \
			--numbers-to-expressions true \
			--self-defending true \
			--simplify true \
			--split-strings true \
			--split-strings-chunk-length 10 \
			--string-array true \
			--string-array-calls-transform true \
			--string-array-calls-transform-threshold 0.75 \
			--string-array-encoding base64 \
			--string-array-index-shift true \
			--string-array-rotate true \
			--string-array-shuffle true \
			--string-array-wrappers-count 2 \
			--string-array-wrappers-chained-calls true \
			--string-array-threshold 0.75 \
			--transform-object-keys true && \
		cp $$temp_out $$dist_file && \
		rm -f $$temp_js $$temp_out; \
	done
	@find $(SRC_DIR) -type f ! -name "*.gs" | while read file; do \
		rel_path=$${file#$(SRC_DIR)/}; \
		dist_file=$(DIST_DIR)/$$rel_path; \
		dist_dir=$$(dirname $$dist_file); \
		mkdir -p $$dist_dir; \
		echo "Copying: $$file -> $$dist_file"; \
		cp $$file $$dist_file; \
	done
	@echo "Obfuscation complete!"

deploy-event-registration: obfuscate ## Deploy event-registration-handler to Google Apps Script
	@echo "Deploying event-registration-handler..."
	@cp $(SRC_DIR)/event-survey-reminder/event-registration/.clasp.json $(DIST_DIR)/event-survey-reminder/event-registration/
	@cd $(DIST_DIR)/event-survey-reminder/event-registration && clasp push --force
	@echo "event-registration-handler deployment complete!"

deploy-survey-response: obfuscate ## Deploy survey-response to Google Apps Script
	@echo "Deploying survey-response..."
	@cp $(SRC_DIR)/event-survey-reminder/survey-response/.clasp.json $(DIST_DIR)/event-survey-reminder/survey-response/
	@cd $(DIST_DIR)/event-survey-reminder/survey-response && clasp push --force
	@echo "survey-response deployment complete!"

deploy-lib: obfuscate ## Deploy lib to Google Apps Script
	@echo "Deploying lib..."
	@cp $(SRC_DIR)/lib/.clasp.json $(DIST_DIR)/lib/
	@cd $(DIST_DIR)/lib && clasp push --force
	@echo "lib deployment complete!"

deploy-proposal-manager: obfuscate ## Deploy proposal-manager to Google Apps Script
	@echo "Deploying proposal-manager..."
	@cp $(SRC_DIR)/proposal-manager/.clasp.json $(DIST_DIR)/proposal-manager/
	@cd $(DIST_DIR)/proposal-manager && clasp push --force
	@echo "proposal-manager deployment complete!"

deploy-all: ## Deploy all projects to Google Apps Script
	@$(MAKE) deploy-event-registration
	@$(MAKE) deploy-survey-response
	@$(MAKE) deploy-lib
	@$(MAKE) deploy-proposal-manager
	@echo "All deployments complete!"
