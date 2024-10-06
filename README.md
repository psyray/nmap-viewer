# Nmap Viewer

Nmap Viewer is a web-based application designed to visualize and analyze the output of Nmap scans. It provides an intuitive interface for exploring network scan results, making it easier to understand and interpret the data collected by Nmap.

<img src=".github/images/nmap-viewer.png">

## Features

- Parse and display Nmap XML output
- Interactive visualization of scan results
- Filter hosts by open ports and services
- Sort hosts by hostname, IP address, or number of open ports
- Export results to PDF
- Responsive design for various screen sizes
- Update scan results with additional XML files
- Expand/collapse all hosts and ports simultaneously
- Expand/collapse individual hosts and their ports
- Copy Nmap commands for individual hosts or all hosts
- View detailed port information and scripts output
- Toggle between OR and AND filter modes
- Reset all applied filters with a single click
- Drag and drop functionality for XML file upload
- Sidebar with quick access to all detected services
- Automatic scrolling to selected service

## Installation and Usage

To install and run the Nmap Viewer application, follow these simple steps:

1. Download the installation script:

   ```bash
   curl -O https://raw.githubusercontent.com/psyray/nmap-viewer/refs/heads/master/nmap-viewer.sh
   ```

2. Make the script executable:

   ```bash
   chmod +x nmap-viewer.sh
   ```

3. Install and start the application:

   ```bash
   ./nmap-viewer.sh install
   ```

   This script will:
   - Install Node.js (if not already installed)
   - Clone the project repository
   - Install dependencies
   - Build the application
   - Start the application on port 3001
   - Open the application in your default web browser

4. Once the installation is complete, the application will automatically start and be accessible at `http://localhost:3001`.

5. After the initial installation, for all subsequent uses, you can start the application with:

   ```bash
   ./nmap-viewer.sh start
   ```

## Using the Application

1. Open your web browser and navigate to `http://localhost:3001`.
2. Use the file upload feature to load your initial Nmap XML output file.
3. Explore the scan results using the interactive interface.
4. Use the filtering and sorting options to analyze specific aspects of the scan data.
5. Update the scan results by uploading additional XML files if needed.
6. Expand or collapse hosts and ports to view detailed information.
7. Copy Nmap commands for specific hosts or all hosts.
8. Export the results to PDF if needed.

## Requirements

- Bash shell
- Internet connection
- Modern web browser
- Git
- Node.js (version 14.0.0 or higher, installed automatically by the script if not present)

## Contributing

Contributions to the Nmap Viewer project are welcome. Please feel free to submit pull requests or create issues for bugs and feature requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.