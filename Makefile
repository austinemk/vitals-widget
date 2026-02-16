# --- Configuration ---
UUID = $(shell grep -Po '(?<="uuid": ")[^"]*' metadata.json)
DEST = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

# --- Default Target ---
all: install

# --- Stop Nested Shell ---
# Using pkill -o (oldest) to avoid killing the process we just started
stop-nested:
	@echo "🛑 Cleaning up old nested sessions..."
	@pkill -o -f "gnome-shell --devkit" > /dev/null 2>&1 || true
	@sleep 1

nested: install
	@echo "🪟 Launching Nested GNOME Shell..."
	@dbus-run-session env MUTTER_DEBUG=force-online gnome-shell --devkit --wayland & \
	SHELL_PID=$$!; \
	sleep 4; \
	wait $$SHELL_PID

# gnome-extensions enable $(UUID); \

# --- Test Target ---
test:
	@echo "📂 Checking for tests directory..."
	@mkdir -p tests
	@if [ ! -f tests/env_check.js ]; then \
		echo "import GLib from 'gi://GLib';" > tests/env_check.js; \
		echo "console.log('✅ GJS Environment: ' + GLib.get_user_name());" >> tests/env_check.js; \
		echo "🔍 Created default test: tests/env_check.js"; \
	fi
	@echo "📦 Ensuring code is compiled..."
	npm run compile
	@echo "🧪 Running tests with GJS..."
	@if [ "$(FILE)" ]; then \
		gjs -m $(FILE) || exit 1; \
	else \
		for f in tests/*.js; do gjs -m $$f || exit 1; done; \
	fi

# --- Install Target ---
install:
	@echo "🚀 Starting build for: $(UUID)"
	npm run build
	@rm -rf $(DEST)
	@mkdir -p $(DEST)
	@cp -r dist/*.js dist/sensors $(DEST)/ 2>/dev/null || cp -r dist/* $(DEST)/
	@cp metadata.json stylesheet.css $(DEST)/
	@if [ -d "svg" ]; then cp -r svg $(DEST)/; fi
	@if [ -d "schemas" ]; then \
		cp -r schemas $(DEST)/; \
		glib-compile-schemas $(DEST)/schemas/; \
	fi
	@echo "✅ Installation complete!"

remove:
	@rm -rf $(DEST)
	@echo "✅ Uninstalled."

logs:
	@journalctl -f -o cat /usr/bin/gnome-shell --since "10 minutes ago" | grep --line-buffered -i "$(UUID)"

clean:
	rm -rf dist

dev: remove clean nested