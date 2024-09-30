import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { XMLParser } from 'fast-xml-parser';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { FaClipboard, FaFileUpload } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';

const NmapOutputViewer = () => {
  // State variables
  // const [xmlData, setXmlData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'ip', direction: 'ascending' });
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterMode, setFilterMode] = useState('OR');
  const [textFilter, setTextFilter] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default width
  const [allServices, setAllServices] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [legendHeight, setLegendHeight] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isHoveringAllCommands, setIsHoveringAllCommands] = useState(false);
  const [showHostScripts, setShowHostScripts] = useState({});
  const [hoveredCommand, setHoveredCommand] = useState(null);
  const [allExpanded, setAllExpanded] = useState(false);
  const [expandedPorts, setExpandedPorts] = useState({});
  const [isInitialFileLoaded, setIsInitialFileLoaded] = useState(false);
  const multipleFileInputRef = useRef(null);
  const [expandedHosts, setExpandedHosts] = useState({});

  // Refs
  const sidebarRef = useRef(null);
  const legendRef = useRef(null);

  const processHost = useCallback((host) => {
    const address = host.address;
    const ip = Array.isArray(address) ? address.find(addr => addr['@_addrtype'] === 'ipv4')['@_addr'] : address['@_addr'];
    const hostname = host.hostnames && host.hostnames.hostname ? host.hostnames.hostname['@_name'] : ip;
    const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
    
    const openPorts = ports.filter(port => port.state['@_state'] === 'open');
    
    return {
      host: hostname,
      ip: ip,
      ports: openPorts.map(port => port['@_portid']),
      portCount: openPorts.length,
      portDetails: openPorts.map(port => ({
        port: port['@_portid'],
        state: port.state['@_state'],
        service: port.service ? port.service['@_name'] : 'unknown',
        product: port.service && port.service['@_product'] ? port.service['@_product'] : '',
        version: port.service && port.service['@_version'] ? port.service['@_version'] : '',
        extraInfo: port.service && port.service['@_extrainfo'] ? port.service['@_extrainfo'] : '',
        ostype: port.service && port.service['@_ostype'] ? port.service['@_ostype'] : '',
        scripts: port.script ? (Array.isArray(port.script) ? port.script : [port.script]) : []
      })),
      hostScripts: host.hostscript ? 
        (Array.isArray(host.hostscript.script) ? host.hostscript.script : [host.hostscript.script]).map(script => ({
          id: script['@_id'],
          output: script['@_output']
        })) : 
        []
    };
  }, []);

  const updateDataWithNewScans = useCallback((newScansData) => {
    setProcessedData(prevData => {
      const updatedData = [...prevData];
      const newHosts = [];

      newScansData.forEach(newScanData => {
        if (!newScanData || !newScanData.nmaprun || !newScanData.nmaprun.host) return;

        const hosts = Array.isArray(newScanData.nmaprun.host) ? newScanData.nmaprun.host : [newScanData.nmaprun.host];
        hosts.forEach(host => {
          const processedHost = processHost(host);
          const existingHostIndex = updatedData.findIndex(h => h.ip === processedHost.ip);

          if (existingHostIndex !== -1) {
            // Update existing host
            const existingHost = updatedData[existingHostIndex];
            existingHost.ports = [...new Set([...existingHost.ports, ...processedHost.ports])];
            existingHost.portCount = existingHost.ports.length;
            
            processedHost.portDetails.forEach(newPort => {
              const existingPortIndex = existingHost.portDetails.findIndex(p => p.port === newPort.port);
              if (existingPortIndex !== -1) {
                existingHost.portDetails[existingPortIndex] = {
                  ...existingHost.portDetails[existingPortIndex],
                  ...newPort
                };
              } else {
                existingHost.portDetails.push(newPort);
              }
            });

            existingHost.hostScripts = [...existingHost.hostScripts, ...processedHost.hostScripts];
          } else {
            // Add new host
            newHosts.push(processedHost);
          }
        });
      });

      return [...updatedData, ...newHosts];
    });
  }, [processHost]);

  const onDrop = useCallback((acceptedFiles) => {
    const processFile = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target.result;
            const parser = new XMLParser({ ignoreAttributes: false });
            const result = parser.parse(content);
            resolve(result);
          } catch (err) {
            console.error("Error parsing XML file:", err);
            reject(err);
          }
        };
        reader.readAsText(file);
      });
    };

    Promise.all(acceptedFiles.map(processFile))
      .then(results => {
        updateDataWithNewScans(results);
      })
      .catch(error => {
        console.error("Error processing dropped files:", error);
        // Optionally show an error message to the user
      });
  }, [updateDataWithNewScans]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: '.xml',
    noClick: true, // Prevent click to open file dialog
  });

  // Function to handle XML file upload
  const handleXmlFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parser = new XMLParser({ ignoreAttributes: false });
        const result = parser.parse(content);
        const initialProcessedData = processXmlData(result);
        setProcessedData(initialProcessedData);
        setError(null);
        setIsInitialFileLoaded(true);
      } catch (err) {
        setError("Error parsing XML file. Please ensure the file is in valid XML format.");
        setProcessedData(null);
        setIsInitialFileLoaded(false);
      }
    };

    reader.readAsText(file);
  };

  const handleAdditionalFilesUpload = (event) => {
    const files = Array.from(event.target.files);
    processMultipleFiles(files);
  };

  const processMultipleFiles = (files) => {
    const processFile = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target.result;
            const parser = new XMLParser({ ignoreAttributes: false });
            const result = parser.parse(content);
            resolve(result);
          } catch (err) {
            console.error(`Error parsing XML file ${file.name}:`, err);
            reject(err);
          }
        };
        reader.readAsText(file);
      });
    };

    Promise.all(files.map(processFile))
      .then(results => {
        console.log(`Successfully processed ${results.length} additional file(s)`);
        updateDataWithNewScans(results);
      })
      .catch(error => {
        console.error("Error processing additional files:", error);
        setError("Error processing additional files. Please ensure all files are valid XML format.");
      });
  };

  const processXmlData = (data) => {
    if (!data || !data.nmaprun || !data.nmaprun.host) return null;

    const hosts = Array.isArray(data.nmaprun.host) ? data.nmaprun.host : [data.nmaprun.host];
    
    return hosts.map(host => {
      const address = host.address;
      const ip = Array.isArray(address) ? address.find(addr => addr['@_addrtype'] === 'ipv4')['@_addr'] : address['@_addr'];
      const hostname = host.hostnames && host.hostnames.hostname ? host.hostnames.hostname['@_name'] : ip;
      const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
      
      const openPorts = ports.filter(port => port.state['@_state'] === 'open');
      
      // Process hostscript
      const hostScripts = host.hostscript ? 
        (Array.isArray(host.hostscript.script) ? host.hostscript.script : [host.hostscript.script]) : 
        [];

      return {
        host: hostname,
        ip: ip,
        ports: openPorts.map(port => port['@_portid']),
        portCount: openPorts.length,
        portDetails: openPorts.map(port => ({
          port: port['@_portid'],
          state: port.state['@_state'],
          service: port.service ? port.service['@_name'] : 'unknown',
          product: port.service && port.service['@_product'] ? port.service['@_product'] : '',
          version: port.service && port.service['@_version'] ? port.service['@_version'] : '',
          extraInfo: port.service && port.service['@_extrainfo'] ? port.service['@_extrainfo'] : '',
          ostype: port.service && port.service['@_ostype'] ? port.service['@_ostype'] : '',
          scripts: port.script ? (Array.isArray(port.script) ? port.script : [port.script]) : []
        })),
        hostScripts: hostScripts.map(script => ({
          id: script['@_id'],
          output: script['@_output']
        }))
      };
    });
  };

  // Function to compare IP addresses
  const compareIP = (ip1, ip2) => {
    const parts1 = ip1.split('.').map(Number);
    const parts2 = ip2.split('.').map(Number);
    for (let i = 0; i < 4; i++) {
      if (parts1[i] !== parts2[i]) {
        return parts1[i] - parts2[i];
      }
    }
    return 0;
  };

  // Function to request sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Service detection functions
  const isHttpService = (service) => {
    const httpKeywords = ['http', 'https', 'nginx', 'apache', 'tomcat', 'iis', 'webserver', 'web'];
    return httpKeywords.some(keyword => service.toLowerCase().includes(keyword));
  };

  const isSmbService = (service) => {
    return service.toLowerCase().includes('microsoft-ds') || service.toLowerCase().includes('netbios-ssn');
  };

  const isLdapService = (service) => {
    return service.toLowerCase().includes('ldap');
  };

  const isOpenSSHService = (service) => {
    return service.toLowerCase().includes('ssh');
  };

  const isKerberosService = (service) => {
    return service.toLowerCase().includes('kerberos');
  };

  const isMySQLService = (service) => {
    return service.toLowerCase().includes('mysql');
  };

  const isNagiosService = (service) => {
    return service.toLowerCase().includes('nagios');
  };

  const isRDPService = (service) => {
    return service.toLowerCase().includes('rdp') || service.toLowerCase().includes('remote desktop');
  };

  const isFtpService = (service) => service.toLowerCase().includes('ftp');
  const isMailService = (service) => ['smtp', 'pop3', 'imap'].some(protocol => service.toLowerCase().includes(protocol));
  const isDnsService = (service) => service.toLowerCase().includes('dns');
  const isSnmpService = (service) => service.toLowerCase().includes('snmp');
  const isNfsService = (service) => service.toLowerCase().includes('nfs');
  const isMssqlService = (service) => service.toLowerCase().includes('ms-sql') || service.toLowerCase().includes('mssql');
  const isOracleService = (service) => service.toLowerCase().includes('oracle');
  const isVncService = (service) => service.toLowerCase().includes('vnc');
  const isTelnetService = (service) => service.toLowerCase().includes('telnet');
  const isTftpService = (service) => service.toLowerCase().includes('tftp');
  const isVpnService = (service) => ['pptp', 'l2tp'].some(protocol => service.toLowerCase().includes(protocol));
  const isMongodbService = (service) => service.toLowerCase().includes('mongodb');
  const isRedisService = (service) => service.toLowerCase().includes('redis');
  const isJenkinsService = (service) => service.toLowerCase().includes('jenkins');
  const isElasticsearchService = (service) => service.toLowerCase().includes('elasticsearch');

  // Function to get port style based on service
  const getPortStyle = (port, service) => {
    const standardHttpPorts = ['80', '443', '8080'];
    if (isSmbService(service)) {
      return 'bg-red-100';
    } else if (standardHttpPorts.includes(port) && isHttpService(service)) {
      return 'bg-green-100';
    } else if (isHttpService(service)) {
      return 'bg-yellow-100';
    } else if (isLdapService(service)) {
      return 'bg-blue-100';
    } else if (isOpenSSHService(service)) {
      return 'bg-orange-100';
    } else if (isKerberosService(service)) {
      return 'bg-purple-100';
    } else if (isMySQLService(service)) {
      return 'bg-pink-100';
    } else if (isNagiosService(service)) {
      return 'bg-indigo-100';
    } else if (isRDPService(service)) {
      return 'bg-teal-100';
    }
    return '';
  };

  // Function to generate web links
  const getWebLink = (ip, hostname, port, service) => {
    if (isSmbService(service)) {
      return (
        <div>
          <a
            href={`smb://${ip}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 mr-2"
          >
            SMB (IP)
          </a>
          {hostname !== ip && (
            <a
              href={`smb://${hostname}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 mr-2"
            >
              SMB (Hostname)
            </a>
          )}
        </div>
      );
    }

    const httpsCommonPorts = ['443', '8443', '4443', '8843'];
    const isHttps = httpsCommonPorts.some(httpsPort => port.includes(httpsPort)) || 
                    service.toLowerCase() === 'https' ||
                    service.toLowerCase().includes('ssl');

    const protocols = isHttps ? ['https'] : ['http', 'https'];

    return (
      <div>
        {protocols.map(protocol => (
          <div key={protocol}>
            <a
              href={`${protocol}://${ip}:${port}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 mr-2"
            >
              {protocol} (IP)
            </a>
            {hostname !== ip && (
              <a
                href={`${protocol}://${hostname}:${port}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 mr-2"
              >
                {protocol} (Hostname)
              </a>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Function to export data to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Nmap Scan Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Total number of hosts: ${sortedData.length}`, 14, 30);

    sortedData.forEach((item, index) => {
      doc.addPage();
      doc.setFontSize(14);
      doc.text(`Host: ${item.host}`, 14, 20);
      doc.setFontSize(11);
      doc.text(`IP: ${item.ip}`, 14, 30);
      doc.text(`Number of open ports: ${item.portCount}`, 14, 40);

      doc.autoTable({
        startY: 50,
        head: [['Port', 'Service', 'Product', 'Version']],
        body: item.portDetails.map(detail => [
          detail.port,
          detail.service,
          detail.product,
          detail.version
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 135, 245] },
      });
    });

    doc.save('nmap_scan_report.pdf');
  };

  // Function to toggle filters
  const toggleFilter = (filter) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  // Function to reset filters
  const resetFilters = () => {
    setActiveFilters([]);
    setTextFilter('');
  };

  // Function to toggle filter mode
  const toggleFilterMode = () => {
    setFilterMode(prev => prev === 'OR' ? 'AND' : 'OR');
  };

  // Filter and process the data
  const filteredData = useMemo(() => {
    if (!processedData) return null;
    
    const serviceChecks = {
      http: (detail) => isHttpService(detail.service),
      smb: (detail) => isSmbService(detail.service),
      standard: (detail) => ['80', '443', '8080'].includes(detail.port) && isHttpService(detail.service),
      ldap: (detail) => isLdapService(detail.service),
      openssh: (detail) => isOpenSSHService(detail.service),
      kerberos: (detail) => isKerberosService(detail.service),
      mysql: (detail) => isMySQLService(detail.service),
      nagios: (detail) => isNagiosService(detail.service),
      rdp: (detail) => isRDPService(detail.service),
      ftp: (detail) => isFtpService(detail.service),
      mail: (detail) => isMailService(detail.service),
      dns: (detail) => isDnsService(detail.service),
      snmp: (detail) => isSnmpService(detail.service),
      nfs: (detail) => isNfsService(detail.service),
      mssql: (detail) => isMssqlService(detail.service),
      oracle: (detail) => isOracleService(detail.service),
      vnc: (detail) => isVncService(detail.service),
      telnet: (detail) => isTelnetService(detail.service),
      tftp: (detail) => isTftpService(detail.service),
      vpn: (detail) => isVpnService(detail.service),
      mongodb: (detail) => isMongodbService(detail.service),
      redis: (detail) => isRedisService(detail.service),
      jenkins: (detail) => isJenkinsService(detail.service),
      elasticsearch: (detail) => isElasticsearchService(detail.service),
    };

    const foundServices = new Set();

    // Detect all services present in the data
    processedData.forEach(item => {
      item.portDetails.forEach(detail => {
        Object.keys(serviceChecks).forEach(service => {
          if (serviceChecks[service](detail)) {
            foundServices.add(service);
          }
        });
      });
    });

    setAllServices(Array.from(foundServices));

    const filteredResults = processedData.filter(item => {
      // Check if the item matches the text filter
      const matchesTextFilter = !textFilter || 
        item.host.toLowerCase().includes(textFilter.toLowerCase()) ||
        item.ip.toLowerCase().includes(textFilter.toLowerCase()) ||
        item.portDetails.some(detail => 
          detail.service.toLowerCase().includes(textFilter.toLowerCase()) ||
          detail.port.toString().includes(textFilter)
        );

      // Check if the item matches the service filters
      const matchesServiceFilters = activeFilters.length === 0 || 
        (filterMode === 'OR' 
          ? item.portDetails.some(detail => 
              activeFilters.some(filter => serviceChecks[filter](detail))
            )
          : activeFilters.every(filter => 
              item.portDetails.some(detail => serviceChecks[filter](detail))
            )
        );

      return matchesTextFilter && matchesServiceFilters;
    }).map(item => ({
      ...item,
      portDetails: item.portDetails.filter(detail => 
        activeFilters.length === 0 || 
        activeFilters.some(filter => serviceChecks[filter](detail))
      )
    }));

    // Add a unique id to each item
    return filteredResults.map((item, index) => ({
      ...item,
      id: `${item.ip}-${index}` // Create a unique id based on IP and index
    }));
  }, [processedData, activeFilters, filterMode, textFilter]);

  // Sort the filtered data
  const sortedData = useMemo(() => {
    if (!filteredData) return null;
    let sortableItems = [...filteredData];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'portCount') {
          return (b.portDetails.length - a.portDetails.length) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        if (sortConfig.key === 'ip') {
          return compareIP(a.ip, b.ip) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  // Function to handle text filter change
  const handleTextFilterChange = (event) => {
    setTextFilter(event.target.value);
  };

  // Function to get port count color
  const getPortCountColor = (count) => {
    if (count === 0) return 'bg-red-500';
    if (count <= 10) return 'bg-yellow-500';
    if (count <= 20) return 'bg-yellow-300';
    if (count <= 30) return 'bg-green-300';
    return 'bg-green-500';
  };

  // Effect to adjust sidebar width
  useEffect(() => {
    if (filteredData && sidebarRef.current) {
      const maxHostLength = Math.min(
        40,
        Math.max(...filteredData.map(item => Math.max(item.host.length, item.ip.length)))
      );
      const newWidth = Math.max(256, maxHostLength * 10); // Approximate width based on character count
      setSidebarWidth(newWidth);
    }
  }, [filteredData]);

  // Service colors for legend
  const serviceColors = {
    http: 'bg-yellow-100',
    smb: 'bg-red-100',
    standard: 'bg-green-100',
    ldap: 'bg-blue-100',
    openssh: 'bg-orange-100',
    kerberos: 'bg-purple-100',
    mysql: 'bg-pink-100',
    nagios: 'bg-indigo-100',
    rdp: 'bg-teal-100',
    ftp: 'bg-lime-100',
    mail: 'bg-cyan-100',
    dns: 'bg-amber-100',
    snmp: 'bg-emerald-100',
    nfs: 'bg-violet-100',
    mssql: 'bg-rose-100',
    oracle: 'bg-fuchsia-100',
    vnc: 'bg-sky-100',
    telnet: 'bg-orange-200',
    tftp: 'bg-yellow-200',
    vpn: 'bg-green-200',
    mongodb: 'bg-blue-200',
    redis: 'bg-red-200',
    jenkins: 'bg-purple-200',
    elasticsearch: 'bg-pink-200',
  };

  // Function to handle server click
  const handleServerClick = (id) => {
    setSelectedServerId(id);
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        const yOffset = -legendHeight - 20; // 20px additional margin
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({top: y, behavior: 'smooth'});
      }
    }, 100);
  };

  // Effect to scroll to selected server
  useEffect(() => {
    if (selectedServerId) {
      const element = document.getElementById(selectedServerId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [selectedServerId]);

  // Effect to set legend height
  useEffect(() => {
    if (legendRef.current) {
      setLegendHeight(legendRef.current.offsetHeight);
    }
  }, []);

  // Function to generate hosts file content
  const generateHostsFileContent = () => {
    if (!filteredData) return '';
    
    return filteredData
      .sort((a, b) => compareIP(a.ip, b.ip))
      .map(item => {
        // If the hostname is an IP, don't include it in the hosts file
        if (item.host === item.ip) {
          return `${item.ip}`;
        }
        return `${item.ip}\t${item.host}`;
      })
      .join('\n');
  };

  // Function to export hosts file
  const exportHostsFile = () => {
    const content = generateHostsFileContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nmap_hosts.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Effect to handle scroll to top button visibility
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // Function to scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const generateNmapCommand = (host, ports) => {
    const portList = ports.map(p => p.port).join(',');
    return `nmap -sV -sC -p${portList} -oA scan_${host.replace(/[^a-zA-Z0-9]/g, '_')} ${host}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Nmap command copied to clipboard!');
    });
  };

  const generateAllNmapCommands = (data) => {
    return data.map(item => generateNmapCommand(item.ip, item.portDetails)).join('\n');
  };

  const formatText = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/&#xa;/g, '\n');
  };

  const formatScriptOutput = (output) => {
    if (typeof output === 'string') {
      return formatText(output);
    }
    if (typeof output === 'object') {
      return JSON.stringify(output, (key, value) => {
        if (typeof value === 'string') {
          return formatText(value);
        }
        return value;
      }, 2);
    }
    return '';
  };

  const toggleAllHosts = () => {
    setAllExpanded(!allExpanded);
    setShowHostScripts(prevState => {
      const newState = {};
      sortedData.forEach(item => {
        newState[item.id] = !allExpanded;
      });
      return newState;
    });
    setExpandedPorts(prevState => {
      const newState = {};
      sortedData.forEach(item => {
        item.portDetails.forEach(port => {
          newState[`${item.id}-${port.port}`] = !allExpanded;
        });
      });
      return newState;
    });
  };

  const togglePort = (hostId, port) => {
    setExpandedPorts(prevState => ({
      ...prevState,
      [`${hostId}-${port}`]: !prevState[`${hostId}-${port}`]
    }));
  };

  useEffect(() => {
    if (processedData) {
      const initialExpandedPorts = {};
      processedData.forEach(item => {
        item.portDetails.forEach(port => {
          initialExpandedPorts[`${item.id}-${port.port}`] = false;
        });
      });
      setExpandedPorts(initialExpandedPorts);
    }
  }, [processedData]);

  const toggleHostExpansion = (hostId) => {
    setExpandedHosts(prev => {
      const newState = { ...prev };
      newState[hostId] = !prev[hostId];
      return newState;
    });

    setExpandedPorts(prev => {
      const newState = { ...prev };
      sortedData.find(item => item.id === hostId)?.portDetails.forEach(port => {
        newState[`${hostId}-${port.port}`] = !expandedHosts[hostId];
      });
      return newState;
    });
  };

  return (
    <div {...getRootProps()} className="flex">
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-50 z-50 flex items-center justify-center">
          <p className="text-white text-2xl font-bold">Drop XML files here to update scan results</p>
        </div>
      )}
      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className="fixed left-0 top-0 h-full bg-gray-100 overflow-y-auto" 
        style={{ width: `${sidebarWidth}px` }}
      >
        <h2 className="text-xl font-bold mb-4">Hosts</h2>
        <div className="mb-4">
          <span className="mr-2">Sort by:</span>
          <div className="flex space-x-2">
            <button onClick={() => requestSort('host')} className="px-2 py-1 bg-blue-500 text-white rounded text-sm">
              Hostname
            </button>
            <button onClick={() => requestSort('ip')} className="px-2 py-1 bg-blue-500 text-white rounded text-sm">
              IP
            </button>
            <button onClick={() => requestSort('portCount')} className="px-2 py-1 bg-blue-500 text-white rounded text-sm">
              Ports
            </button>
          </div>
        </div>
        {sortedData && sortedData.map((item) => (
          <div 
            key={item.id}
            onClick={() => handleServerClick(item.id)}
            className={`cursor-pointer hover:bg-gray-200 p-2 ${selectedServerId === item.id ? 'bg-blue-200' : ''}`}
          >
            <p className="font-semibold break-words" title={item.host}>{item.host}</p>
            <p className="text-sm break-words" title={item.ip}>IP: {item.ip}</p>
            <div className="flex items-center mt-1">
              <span className="text-sm mr-2">Open ports:</span>
              <span className={`text-sm font-bold text-white px-2 py-1 rounded-full ${getPortCountColor(item.portDetails.length)}`}>
                {item.portDetails.length}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ marginLeft: `${sidebarWidth}px` }} className="flex-grow">
        <div className="container mx-auto bg-gray-100">
          {/* Legend, filtering field and buttons */}
          <div 
            ref={legendRef}
            className="fixed top-0 left-0 right-0 bg-white shadow-md z-20 p-4"
            style={{ marginLeft: `${sidebarWidth}px` }}
          >
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">Legend</h1>
              <div className="flex-grow mx-4">
                <input
                  type="text"
                  placeholder="Filter results..."
                  value={textFilter}
                  onChange={handleTextFilterChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={toggleFilterMode}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                >
                  Mode: {filterMode}
                </button>
                <button 
                  onClick={resetFilters}
                  className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                >
                  Reset
                </button>
                <button 
                  onClick={exportToPDF}
                  className="px-2 py-1 bg-green-500 text-white rounded text-sm"
                >
                  Export PDF
                </button>
                <button 
                  onClick={exportHostsFile}
                  className="px-2 py-1 bg-purple-500 text-white rounded text-sm"
                >
                  Export Hosts
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4 flex-wrap">
              {allServices.map(service => (
                <button 
                  key={service}
                  onClick={() => toggleFilter(service)} 
                  className={`flex items-center p-2 rounded ${activeFilters.includes(service) ? 'bg-blue-200' : ''}`}
                >
                  <div className={`w-4 h-4 ${serviceColors[service]} mr-2`}></div>
                  <span>{service.charAt(0).toUpperCase() + service.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content with dynamic padding */}
          <div style={{ paddingTop: `${legendHeight + 60}px` }} className="p-4">
            <input type="file" onChange={handleXmlFileUpload} accept=".xml" className="mb-4 p-2 border rounded" />
            {error && <p className="text-red-500 mb-4">{error}</p>}
            {isInitialFileLoaded && (
              <div className="mb-4 mt-4">
                <p className="text-sm text-gray-600 mb-2">
                  You can update the scan results by uploading additional XML files.
                </p>
                <button
                  onClick={() => multipleFileInputRef.current.click()}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center"
                >
                  <FaFileUpload className="mr-2" />
                  Update with Additional XML Files
                </button>
                <input
                  type="file"
                  ref={multipleFileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleAdditionalFilesUpload}
                  multiple
                  accept=".xml"
                />
              </div>
            )}
            {sortedData && (
              <div className="space-y-12">
                <div className="flex justify-between items-center mt-8 mb-4">
                  <p className="text-xl font-bold">Total number of hosts: {sortedData.length}</p>
                  <div className="flex items-center">
                    <div className="relative mr-4">
                      <FaClipboard 
                        className="text-2xl cursor-pointer hover:text-blue-500"
                        onMouseEnter={() => setIsHoveringAllCommands(true)}
                        onMouseLeave={() => setIsHoveringAllCommands(false)}
                        onClick={() => copyToClipboard(generateAllNmapCommands(sortedData))}
                      />
                      {isHoveringAllCommands && (
                        <div className="absolute right-0 mt-2 p-2 bg-white text-black rounded shadow-lg z-10 w-64">
                          <p className="text-xs">Copy all Nmap commands</p>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={toggleAllHosts}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                      {allExpanded ? 'Collapse All' : 'Expand All'}
                    </button>
                  </div>
                </div>
                {sortedData.map((item) => (
                  <div 
                    key={item.id} 
                    id={item.id}
                    className={`bg-white rounded-lg shadow-md overflow-hidden mt-4 mb-4 ${selectedServerId === item.id ? 'border-2 border-blue-500' : ''}`}
                  >
                    <div className="bg-blue-600 text-white p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-2xl font-bold">{item.host}</h2>
                          <p className="text-lg">IP: {item.ip}</p>
                          <div className="flex items-center mt-1">
                            <span className="text-sm mr-2">Number of open ports:</span>
                            <span className={`text-sm font-bold text-white px-2 py-1 rounded-full ${getPortCountColor(item.portDetails.length)}`}>
                              {item.portDetails.length}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="relative mr-4">
                            <FaClipboard 
                              className="text-2xl cursor-pointer hover:text-blue-300"
                              onMouseEnter={() => setHoveredCommand(item.id)}
                              onMouseLeave={() => setHoveredCommand(null)}
                              onClick={() => copyToClipboard(generateNmapCommand(item.ip, item.portDetails))}
                            />
                            {hoveredCommand === item.id && (
                              <div className="absolute right-0 mt-2 p-2 bg-white text-black rounded shadow-lg z-10 w-96">
                                <code className="text-xs break-all">
                                  {generateNmapCommand(item.ip, item.portDetails)}
                                </code>
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => toggleHostExpansion(item.id)}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
                          >
                            {expandedHosts[item.id] ? 'Collapse' : 'Expand'} Host
                          </button>
                          {item.hostScripts && item.hostScripts.length > 0 && (
                            <button 
                              onClick={() => setShowHostScripts(prev => ({...prev, [item.id]: !prev[item.id]}))}
                              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                              {showHostScripts[item.id] ? 'Hide Host Scripts' : 'Show Host Scripts'}
                            </button>
                          )}
                        </div>
                      </div>
                      {(showHostScripts[item.id] || allExpanded) && (
                        <div className="mt-4 bg-blue-700 p-4 rounded">
                          {item.hostScripts.map((script, index) => (
                            <div key={index} className="mb-4">
                              <h3 className="font-bold">{script.id}</h3>
                              <pre className="whitespace-pre-wrap text-sm">
                                {formatText(script.output)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="p-2 text-left">Port</th>
                            <th className="p-2 text-left">Service</th>
                            <th className="p-2 text-left">Product</th>
                            <th className="p-2 text-left">Version</th>
                            <th className="p-2 text-left">Links</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.portDetails.map((detail, detailIndex) => (
                            <React.Fragment key={detailIndex}>
                              <tr 
                                className={`${getPortStyle(detail.port, detail.service)} cursor-pointer`}
                                onClick={() => togglePort(item.id, detail.port)}
                              >
                                <td className="p-2 border-b">{detail.port}</td>
                                <td className="p-2 border-b font-semibold">{detail.service}</td>
                                <td className="p-2 border-b">{detail.product}</td>
                                <td className="p-2 border-b">{detail.version}</td>
                                <td className="p-2 border-b">
                                  {(isHttpService(detail.service) || isSmbService(detail.service)) && 
                                    getWebLink(item.ip, item.host, detail.port, detail.service)}
                                </td>
                              </tr>
                              {(expandedPorts[`${item.id}-${detail.port}`] || expandedHosts[item.id] || allExpanded) && (
                                <tr>
                                  <td colSpan="5" className="p-2 bg-gray-100">
                                    <div className="text-sm">
                                      <p><strong>Extra Info:</strong> {formatText(detail.extraInfo)}</p>
                                      <p><strong>OS Type:</strong> {formatText(detail.ostype)}</p>
                                      {detail.scripts && detail.scripts.map((script, scriptIndex) => (
                                        <div key={scriptIndex} className="mt-2">
                                          <p><strong>Script ID:</strong> {script['@_id']}</p>
                                          <pre className="whitespace-pre-wrap bg-gray-200 p-2 rounded">
                                            {formatScriptOutput(script['@_output'])}
                                          </pre>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-5 right-5 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors duration-300"
          aria-label="Scroll to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default NmapOutputViewer;