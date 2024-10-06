#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Minimum required Node.js version
MIN_NODE_VERSION="14.0.0"

# Function to print colored output
print_color() {
    printf "${2}${1}${NC}\n"
}

# Function to compare versions
version_compare() {
    if [[ $1 == $2 ]]
    then
        return 0
    fi
    local IFS=.
    local i ver1=($1) ver2=($2)
    for ((i=${#ver1[@]}; i<${#ver2[@]}; i++))
    do
        ver1[i]=0
    done
    for ((i=0; i<${#ver1[@]}; i++))
    do
        if [[ -z ${ver2[i]} ]]
        then
            ver2[i]=0
        fi
        if ((10#${ver1[i]} > 10#${ver2[i]}))
        then
            return 1
        fi
        if ((10#${ver1[i]} < 10#${ver2[i]}))
        then
            return 2
        fi
    done
    return 0
}

# Function to check Node.js version
check_node_version() {
    if ! command -v node >/dev/null 2>&1; then
        print_color "Node.js is not installed." "$RED"
        return 1
    fi

    local current_version=$(node -v | cut -d 'v' -f 2)
    version_compare $current_version $MIN_NODE_VERSION
    case $? in
        0) print_color "Node.js version $current_version is compatible." "$GREEN" ;;
        1) print_color "Node.js version $current_version is compatible." "$GREEN" ;;
        2) print_color "Node.js version $current_version is not compatible. Minimum required version is $MIN_NODE_VERSION." "$RED"
           return 1 ;;
    esac
}

# Function to install Node.js using the system package manager
install_nodejs_system() {
    print_color "Installing Node.js using system package manager..." "$YELLOW"
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update && sudo apt-get install -y nodejs npm
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y nodejs npm
    elif command -v brew >/dev/null 2>&1; then
        brew install node
    else
        print_color "Unable to detect a supported package manager. Please install Node.js manually." "$RED"
        exit 1
    fi
}

# Function to start the application
start_application() {
    print_color "Starting the application..." "$GREEN"
    serve -s build -l 3001 &
    SERVER_PID=$!

    # Wait for the server to start
    sleep 5

    # Open the application in the default browser
    print_color "Opening Nmap Viewer in your default browser..." "$GREEN"
    xdg-open http://localhost:3001 || open http://localhost:3001 || start http://localhost:3001

    print_color "Nmap Viewer is now running on http://localhost:3001" "$GREEN"
    print_color "To stop the application, press CTRL+C." "$GREEN"

    # Wait for the server process to finish
    wait $SERVER_PID
}

# Function to clean up and exit
cleanup_and_exit() {
    print_color "Stopping the application..." "$GREEN"
    pkill -f "serve -s build -l 3001"
    exit 0
}

# Function to install the application
install_application() {
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
        print_color "asdf is not installed. We recommend using asdf for managing Node.js versions." "$YELLOW"
        print_color "asdf allows you to easily switch between Node.js versions and ensures consistency across different systems." "$YELLOW"
        print_color "Visit https://asdf-vm.com for installation instructions." "$YELLOW"
        
        read -p "Do you want to proceed with system package manager installation instead? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_nodejs_system
        else
            print_color "Installation aborted. Please install asdf or Node.js manually and run this script again." "$RED"
            exit 1
        fi
    fi

    # Check Node.js version
    if ! check_node_version; then
        print_color "Please update Node.js to version $MIN_NODE_VERSION or higher and run this script again." "$RED"
        exit 1
    fi

    # Create a new directory for the project
    mkdir -p nmap-viewer
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

    print_color "Nmap Viewer has been successfully installed." "$GREEN"
    
    # Start the application after installation
    start_application
}

# Main execution
main() {
    case "$1" in
        start)
            if [ -d "nmap-viewer" ]; then
                cd nmap-viewer || exit
                start_application
            else
                print_color "Nmap Viewer is not installed. Please run './nmap-viewer.sh install' to install it first." "$RED"
                exit 1
            fi
            ;;
        install)
            install_application
            ;;
        *)
            print_color "Usage: ./nmap-viewer.sh [install|start]" "$YELLOW"
            print_color "  install: Install Nmap Viewer and start it" "$YELLOW"
            print_color "  start: Start Nmap Viewer (must be installed first)" "$YELLOW"
            exit 1
            ;;
    esac
}

# Capture SIGINT signal (CTRL+C)
trap cleanup_and_exit SIGINT

# Run the main function
main "$@"