#!/bin/bash

# Check if the git directory already exists
if [ ! -d "nmap-viewer" ]; then
    echo "Cloning the project from GitHub..."
    git clone https://github.com/psyray/nmap-viewer.git
else
    echo "The nmap-viewer directory already exists. Updating..."
    cd nmap-viewer
    git pull
    cd ..
fi

# Create the folder for the React application and ignore it in Git
mkdir -p nmap-viewer/app

# Go to the project folder
cd nmap-viewer/app

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if asdf is installed
if command_exists asdf; then
    echo "asdf detected. Using asdf for Node.js installation..."
    
    # Add the Node.js plugin if not already done
    if ! asdf plugin list | grep -q nodejs; then
        asdf plugin add nodejs
    fi
    
    # Install the latest LTS version of Node.js
    NODEJS_VERSION=$(asdf latest nodejs)
    asdf install nodejs $NODEJS_VERSION
    asdf global nodejs $NODEJS_VERSION
    
    echo "Node.js $NODEJS_VERSION installed with asdf."
else
    # Check if Node.js is installed
    if ! command_exists node; then
        echo "Node.js is not installed. Installing Node.js..."
        if command_exists apt-get; then
            sudo apt-get update
            sudo apt-get install -y nodejs npm
        elif command_exists brew; then
            brew install node
        else
            echo "Unable to install Node.js automatically. Please install it manually."
            exit 1
        fi
    fi
fi

# Check if create-react-app is installed
if ! command_exists create-react-app; then
    echo "Installing create-react-app..."
    npm install -g create-react-app
fi

# Create a new React application
echo "Creating a new React application..."
create-react-app .

# Install necessary dependencies
echo "Installing dependencies..."
npm install fast-xml-parser jspdf jspdf-autotable

# Copy the NmapOutputViewer component from the cloned repo
echo "Copying the NmapOutputViewer component..."
mkdir -p src/components
cp ../src/components/NmapOutputViewer.js src/components/

# Update App.js to use the NmapOutputViewer component
echo "Updating App.js..."
cat > src/App.js << EOL
import React from 'react';
import NmapOutputViewer from './components/NmapOutputViewer';
import './App.css';

function App() {
  return (
    <div className="App">
      <NmapOutputViewer />
    </div>
  );
}

export default App;
EOL

# Add Tailwind CSS styles
echo "Adding Tailwind CSS styles..."
npm install -D tailwindcss@latest postcss@latest autoprefixer@latest
npx tailwindcss init -p

# Configure Tailwind CSS
cat > tailwind.config.js << EOL
module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false,
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
EOL

# Update index.css to include Tailwind
cat > src/index.css << EOL
@tailwind base;
@tailwind components;
@tailwind utilities;
EOL

echo "Installation completed!"
echo "Starting the application on port 3001..."
PORT=3001 npm start