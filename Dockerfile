# Base install from node
FROM node:latest

WORKDIR /app

# apt update to install xdg-utils to avoid error during install
RUN apt update && apt install -y xdg-utils

# Download the install script
RUN curl -O https://raw.githubusercontent.com/psyray/nmap-viewer/refs/heads/master/nmap-viewer.sh && \
    chmod +x nmap-viewer.sh

# Comment the start_application to avoid loop during image creation
RUN sed -i '/# Start the application after installation/{n;s/^/# /}' nmap-viewer.sh


# Install the app
RUN echo "y" | ./nmap-viewer.sh install

# Docker expose 3001
EXPOSE 3001

# start the app after the container creation
CMD ["/bin/bash", "nmap-viewer.sh", "start"]
