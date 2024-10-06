#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${2}${1}${NC}\n"
}

# Check if asdf is installed
if command -v asdf >/dev/null 2>&1; then
    print_color "asdf detected. Using asdf for Node.js installation..." "$GREEN"
    
    # Add the Node.js plugin if not already done
    if ! asdf plugin list | grep -q nodejs; then
        asdf plugin add nodejs
    fi
    
    # Install the latest LTS version of Node.js
    NODEJS_VERSION=$(asdf latest nodejs)
    asdf install nodejs $NODEJS_VERSION
    asdf global nodejs $NODEJS_VERSION
    
    print_color "Node.js $NODEJS_VERSION installed with asdf." "$GREEN"
else
    print_color "asdf is not installed. We recommend using asdf for managing Node.js versions." "$RED"
    print_color "Please install asdf and run this script again. Visit https://asdf-vm.com for installation instructions." "$RED"
    exit 1
fi

# Create a new directory for the project
mkdir nmap-viewer
cd nmap-viewer

# Clone the repository
print_color "Cloning the Nmap Viewer repository..." "$GREEN"
git clone https://github.com/psyray/nmap-viewer.git .

# Install dependencies
print_color "Installing dependencies..." "$GREEN"
npm install

# Build the project
print_color "Building the project..." "$GREEN"
npm run build

# Install serve globally
print_color "Installing serve..." "$GREEN"
npm install -g serve

# Start the application
print_color "Starting the application..." "$GREEN"
serve -s build -l 3001 &

# Wait for the server to start
sleep 5

# Open the application in the default browser
print_color "Opening Nmap Viewer in your default browser..." "$GREEN"
xdg-open http://localhost:3001 || open http://localhost:3001 || start http://localhost:3001

print_color "Installation complete! Nmap Viewer is now running on http://localhost:3001" "$GREEN"
print_color "To stop the application, use 'pkill node' or close this terminal window." "$GREEN"