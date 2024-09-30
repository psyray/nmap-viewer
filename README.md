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

## Installation

To install and run the Nmap Viewer application, follow these simple steps:

1. Download the installation script:

   ```bash
   curl -O https://raw.githubusercontent.com/psyray/nmap-viewer/main/nmap-viewer-install.sh
   ```

2. Make the script executable:

   ```bash
   chmod +x nmap-viewer-install.sh
   ```

3. Run the installation script:

   ```bash
   ./nmap-viewer-install.sh
   ```

   This script will:
   - Clone the project repository
   - Install Node.js (if not already installed)
   - Create a new React application
   - Install necessary dependencies
   - Configure Tailwind CSS
   - Start the application on port 3001

4. Once the installation is complete, the application will automatically start and be accessible at `http://localhost:3001`.

## Requirements

- Bash shell
- Internet connection
- Modern web browser

## Usage

1. Open your web browser and navigate to `http://localhost:3001`.
2. Use the file upload feature to load your Nmap XML output file.
3. Explore the scan results using the interactive interface.
4. Use the filtering and sorting options to analyze specific aspects of the scan data.
5. Export the results to PDF if needed.

## Requirements

- Git
- Node.js (installed automatically by the script if not present)
- Modern web browser

## Contributing

Contributions to the Nmap Viewer project are welcome. Please feel free to submit pull requests or create issues for bugs and feature requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.