// ...existing code...
#!/usr/bin/env bash
set -euo pipefail

home_dir="${HOME:-}"
if [ -z "$home_dir" ]; then
  echo "Unable to determine HOME directory."
  exit 1
fi

# Do not run as root / via sudo
if [ "${EUID:-0}" -eq 0 ]; then
  echo "Do not run this installer as root. Run as your normal user (no sudo)."
  exit 1
fi

# Ensure required tools are available
for cmd in curl mktemp; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command '$cmd' is not installed. Install it and re-run the script."
    exit 1
  fi
done

# jq is optional but preferred for robust JSON parsing
use_jq=true
if ! command -v jq >/dev/null 2>&1; then
  use_jq=false
  echo "Warning: 'jq' not found. Falling back to basic parsing."
fi

# Determine shell rc file (use $SHELL when possible, fallback to .profile)
shell_rc=".profile"
shell_name="$(basename "${SHELL:-}")"
case "$shell_name" in
  bash) shell_rc=".bashrc" ;;
  zsh) shell_rc=".zshrc" ;;
  *) shell_rc=".profile" ;;
esac

api_url="https://api.github.com/repos/unmold-cloud/unmold-cli/releases/latest"
response="$(curl -fsSL "$api_url")" || {
  echo "Failed to fetch release info from GitHub."
  exit 1
}

if $use_jq; then
  latest_release="$(printf '%s' "$response" | jq -r '.tag_name // .name // empty')"
else
  # crude fallback: try to extract "tag_name" or "name" value
  latest_release="$(printf '%s' "$response" | sed -nE 's/.*"tag_name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p; t; s/.*"name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p')"
fi

if [ -z "$latest_release" ]; then
  echo "Repository or latest release not found."
  exit 1
fi

os="$(uname -s)"
case "$os" in
  Darwin)
    install_dir="$home_dir/bin"
    download_url="https://github.com/unmold-cloud/unmold-cli/releases/download/$latest_release/unmold-cli-macos"
    ;;
  Linux)
    install_dir="$home_dir/.local/bin"
    download_url="https://github.com/unmold-cloud/unmold-cli/releases/download/$latest_release/unmold-cli-linux"
    ;;
  *)
    echo "Unsupported operating system: $os"
    exit 1
    ;;
esac

mkdir -p "$install_dir"

tmpfile="$(mktemp)" || { echo "Failed to create temp file"; exit 1; }
trap 'rm -f "$tmpfile"' EXIT

echo "Downloading Unmold CLI release: $latest_release"
if ! curl -fSL -o "$tmpfile" "$download_url"; then
  echo "Download failed: $download_url"
  exit 1
fi

mv "$tmpfile" "$install_dir/unmold"
chmod +x "$install_dir/unmold"

echo
echo "Unmold CLI installed to $install_dir/unmold"
echo 'Run "unmold --help" to verify.'

# Add install_dir to PATH if not present (match whole path elements)
if printf '%s' "$PATH" | grep -qE "(^|:)$install_dir(:|$)"; then
  echo "Path '$install_dir' is already in PATH."
else
  printf '\n# Added by unmold CLI installer\nexport PATH="%s:$PATH"\n' "$install_dir" >> "$home_dir/$shell_rc"
  echo "Added '$install_dir' to PATH in ~/$shell_rc."

  # Try to apply changes to current shell if interactive and safe
  if [ -n "${PS1-}" ] && [ -r "$home_dir/$shell_rc" ] && [ -z "${SUDO_USER-}" ]; then
    # shellcheck source=/dev/null
    # If the installer was executed (not sourced), sourcing will affect the current shell only when the script
    # is run from an interactive shell that honors sourcing here. Attempt to source and report result.
    if . "$home_dir/$shell_rc" 2>/dev/null; then
      echo "Applied changes to current shell session; 'unmold' should be available now."
    else
      echo "Could not source ~/$shell_rc automatically. Run:"
      echo "  source \"$home_dir/$shell_rc\""
    fi
  else
    echo "To use 'unmold' in your current session, run:"
    echo "  source \"$home_dir/$shell_rc\""
  fi
fi
// ...existing code...