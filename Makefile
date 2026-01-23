.PHONY: obfuscate clean deploy deploy-all deploy-event-registration deploy-survey-response deploy-lib deploy-proposal-manager upload-templates login login-drive help

SRC_DIR := src
DIST_DIR := dist
CLASP := npx clasp

login: ## Login to Google Apps Script via clasp
	$(CLASP) login

login-drive: ## Login to gcloud with Drive API access for upload-templates
	@echo "Logging in to gcloud with Drive API access..."
	@gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/drive
	@gcloud auth application-default set-quota-project amazing-chalice-299819
	@echo "Drive authentication complete!"

upload-templates: ## Upload template files to Google Drive using gcloud + curl
	@echo "Uploading template files to Google Drive..."
	@if ! command -v gcloud &> /dev/null; then \
		echo "Error: gcloud CLI not found. Install with: brew install --cask google-cloud-sdk"; \
		exit 1; \
	fi
	@ACCESS_TOKEN=$$(gcloud auth application-default print-access-token 2>/dev/null); \
	if [ -z "$$ACCESS_TOKEN" ]; then \
		echo "Error: Not logged in to gcloud. Run: gcloud auth login"; \
		exit 1; \
	fi; \
	python3 -c "import sys, json; data = json.load(open('src/proposal-manager/templates/.template-config.json')); [print(f'{k}|{v}') for k, v in data['files'].items()]" | \
	while IFS='|' read -r filename file_id; do \
		filepath="src/proposal-manager/templates/$$filename"; \
		if [ ! -f "$$filepath" ]; then \
			echo "Warning: $$filepath not found, skipping..."; \
			continue; \
		fi; \
		echo "Uploading $$filename (ID: $$file_id)..."; \
		RESPONSE=$$(curl -s -X PATCH \
			"https://www.googleapis.com/upload/drive/v3/files/$$file_id?uploadType=media&supportsAllDrives=true" \
			-H "Authorization: Bearer $$ACCESS_TOKEN" \
			-H "Content-Type: text/plain" \
			-H "x-goog-user-project: amazing-chalice-299819" \
			--data-binary "@$$filepath"); \
		if echo "$$RESPONSE" | grep -q '"id"'; then \
			echo "✓ $$filename uploaded successfully"; \
		else \
			echo "✗ Failed to upload $$filename"; \
			echo "  Response: $$RESPONSE"; \
		fi; \
	done
	@echo "Template upload complete!"

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
	@find $(SRC_DIR) -type f ! -name "*.gs" ! -path "*/templates/*" | while read file; do \
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
	@cd $(DIST_DIR)/event-survey-reminder/event-registration && $(CLASP) push --force
	@echo "event-registration-handler deployment complete!"

deploy-survey-response: obfuscate ## Deploy survey-response to Google Apps Script
	@echo "Deploying survey-response..."
	@cp $(SRC_DIR)/event-survey-reminder/survey-response/.clasp.json $(DIST_DIR)/event-survey-reminder/survey-response/
	@cd $(DIST_DIR)/event-survey-reminder/survey-response && $(CLASP) push --force
	@echo "survey-response deployment complete!"

deploy-lib: obfuscate ## Deploy lib to Google Apps Script
	@echo "Deploying lib..."
	@cp $(SRC_DIR)/lib/.clasp.json $(DIST_DIR)/lib/
	@cd $(DIST_DIR)/lib && $(CLASP) push --force
	@echo "lib deployment complete!"

deploy-proposal-manager: obfuscate ## Deploy proposal-manager to Google Apps Script
	@echo "Deploying proposal-manager..."
	@cp $(SRC_DIR)/proposal-manager/.clasp.json $(DIST_DIR)/proposal-manager/
	@cd $(DIST_DIR)/proposal-manager && $(CLASP) push --force
	@echo "proposal-manager deployment complete!"

deploy-all: ## Deploy all projects to Google Apps Script
	@$(MAKE) deploy-event-registration
	@$(MAKE) deploy-survey-response
	@$(MAKE) deploy-lib
	@$(MAKE) deploy-proposal-manager
	@echo "All deployments complete!"
