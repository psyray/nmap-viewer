import React, { useState, useMemo, useRef, useEffect } from 'react';
import { XMLParser } from 'fast-xml-parser';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const NmapOutputViewer = () => {
  const [xmlData, setXmlData] = useState(null);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterMode, setFilterMode] = useState('OR');
  const [textFilter, setTextFilter] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default width
  const [sidebarSortConfig, setSidebarSortConfig] = useState({ key: 'ip', direction: 'ascending' });
  const [allServices, setAllServices] = useState([]);
  
  const hostRefs = useRef({});
  const sidebarRef = useRef(null);

  const handleXmlFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parser = new XMLParser({ ignoreAttributes: false });
        const result = parser.parse(content);
        setXmlData(result);
        setError(null);
      } catch (err) {
        setError("Error parsing XML file. Please ensure the file is in valid XML format.");
        setXmlData(null);
      }
    };

    reader.readAsText(file);
  };

  const processedData = useMemo(() => {
    if (!xmlData || !xmlData.nmaprun || !xmlData.nmaprun.host) return null;

    const hosts = Array.isArray(xmlData.nmaprun.host) ? xmlData.nmaprun.host : [xmlData.nmaprun.host];
    
    return hosts.map(host => {
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
        })),
      };
    });
  }, [xmlData]);

  const sortedData = useMemo(() => {
    if (!processedData) return null;
    let sortableItems = [...processedData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
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
  }, [processedData, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sidebarSortConfig.key === key && sidebarSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSidebarSortConfig({ key, direction });
  };

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

    const protocols = service.toLowerCase() === 'https' ? ['https'] : ['http', 'https'];
    return (
      <div>
        {protocols.map(protocol => (
          <React.Fragment key={protocol}>
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
          </React.Fragment>
        ))}
      </div>
    );
  };

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

  const toggleFilter = (filter) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const resetFilters = () => {
    setActiveFilters([]);
    setTextFilter('');
  };

  const toggleFilterMode = () => {
    setFilterMode(prev => prev === 'OR' ? 'AND' : 'OR');
  };

  const filteredData = useMemo(() => {
    if (!sortedData) return null;
    
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
    sortedData.forEach(item => {
      item.portDetails.forEach(detail => {
        Object.keys(serviceChecks).forEach(service => {
          if (serviceChecks[service](detail)) {
            foundServices.add(service);
          }
        });
      });
    });

    setAllServices(Array.from(foundServices));

    const filteredHosts = sortedData.filter(item => {
      if (activeFilters.length === 0) return true;

      if (filterMode === 'OR') {
        return item.portDetails.some(detail => 
          activeFilters.some(filter => serviceChecks[filter](detail))
        );
      } else { // 'AND' mode
        return activeFilters.every(filter => 
          item.portDetails.some(detail => serviceChecks[filter](detail))
        );
      }
    }).map(item => ({
      ...item,
      portDetails: item.portDetails.filter(detail => 
        activeFilters.length === 0 || activeFilters.some(filter => serviceChecks[filter](detail))
      )
    }));

    return filteredHosts;
  }, [sortedData, activeFilters, filterMode]);

  const handleTextFilterChange = (event) => {
    setTextFilter(event.target.value);
  };

  const scrollToHost = (hostId) => {
    hostRefs.current[hostId]?.scrollIntoView({ behavior: 'smooth' });
  };

  const truncateText = (text, maxLength) => {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  };

  const getPortCountColor = (count) => {
    if (count === 0) return 'bg-red-500';
    if (count <= 10) return 'bg-yellow-500';
    if (count <= 20) return 'bg-yellow-300';
    if (count <= 30) return 'bg-green-300';
    return 'bg-green-500';
  };

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

  const sortedSidebarData = useMemo(() => {
    if (!filteredData) return null;
    let sortableItems = [...filteredData];
    if (sidebarSortConfig.key) {
      sortableItems.sort((a, b) => {
        if (sidebarSortConfig.key === 'portCount') {
          return b.portDetails.length - a.portDetails.length;
        }
        if (sidebarSortConfig.key === 'ip') {
          return compareIP(a.ip, b.ip) * (sidebarSortConfig.direction === 'ascending' ? 1 : -1);
        }
        if (a[sidebarSortConfig.key] < b[sidebarSortConfig.key]) {
          return sidebarSortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sidebarSortConfig.key] > b[sidebarSortConfig.key]) {
          return sidebarSortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sidebarSortConfig]);

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

  const handlePrint = () => {
    if (!filteredData) return;

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;

    // Add title
    doc.setFontSize(18);
    doc.text('Nmap Scan Results', 14, 20);

    // Add filters information
    doc.setFontSize(12);
    doc.text(`Active Filters: ${activeFilters.join(', ') || 'None'}`, 14, 30);
    doc.text(`Filter Mode: ${filterMode}`, 14, 38);

    // Add index
    let yPosition = 50;
    doc.setFontSize(16);
    doc.text('Index', 14, yPosition);
    yPosition += 10;

    filteredData.forEach((item, index) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(12);
      doc.text(`${index + 1}. ${item.host} (${item.ip})`, 14, yPosition);
      yPosition += 8;
    });

    // Add page break after index
    doc.addPage();

    // Add scan results
    filteredData.forEach((item, index) => {
      doc.setFontSize(16);
      doc.text(`${index + 1}. Host: ${item.host}`, 14, 20);
      doc.setFontSize(14);
      doc.text(`IP: ${item.ip}`, 14, 30);
      doc.text(`Open Ports: ${item.portDetails.length}`, 14, 40);

      const tableData = item.portDetails
        .filter(detail => {
          if (activeFilters.length === 0) return true;
          return activeFilters.some(filter => {
            switch (filter) {
              case 'http':
                return isHttpService(detail.service);
              case 'smb':
                return isSmbService(detail.service);
              case 'standard':
                return ['80', '443', '8080'].includes(detail.port) && isHttpService(detail.service);
              case 'ldap':
                return isLdapService(detail.service);
              case 'openssh':
                return isOpenSSHService(detail.service);
              case 'kerberos':
                return isKerberosService(detail.service);
              case 'mysql':
                return isMySQLService(detail.service);
              case 'nagios':
                return isNagiosService(detail.service);
              case 'rdp':
                return isRDPService(detail.service);
              // Ajoutez ici les autres services que vous avez définis
              default:
                return false;
            }
          });
        })
        .map(detail => [
          detail.port,
          detail.protocol,
          detail.state,
          detail.service,
          detail.version
        ]);

      doc.autoTable({
        startY: 50,
        head: [['Port', 'Protocol', 'State', 'Service', 'Version']],
        body: tableData,
      });

      if (index < filteredData.length - 1) {
        doc.addPage();
      }
    });

    doc.save('nmap_scan_results.pdf');
  };

  return (
    <div className="flex">
      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px` }}
        className="h-screen overflow-y-auto fixed left-0 top-0 bg-gray-100 p-4 border-r"
      >
        <h2 className="text-xl font-bold mb-4">Hosts</h2>
        <div className="mb-4 flex space-x-2">
          <button onClick={() => requestSort('host')} className="px-2 py-1 bg-blue-500 text-white rounded text-sm">
            Sort by Hostname
          </button>
          <button onClick={() => requestSort('ip')} className="px-2 py-1 bg-blue-500 text-white rounded text-sm">
            Sort by IP
          </button>
          <button onClick={() => requestSort('portCount')} className="px-2 py-1 bg-blue-500 text-white rounded text-sm">
            Sort by Ports
          </button>
        </div>
        {sortedSidebarData && sortedSidebarData.map((item, index) => (
          <div 
            key={index} 
            className="mb-2 p-2 bg-white rounded shadow cursor-pointer hover:bg-gray-200"
            onClick={() => scrollToHost(index)}
          >
            <p className="font-semibold truncate" title={item.host}>{truncateText(item.host, 40)}</p>
            <p className="text-sm truncate" title={item.ip}>IP: {truncateText(item.ip, 40)}</p>
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
        <div className="container mx-auto p-4 bg-gray-100">
          <div className="sticky top-0 bg-white p-4 shadow-md mb-4 z-20">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">Legend</h1>
              <div>
                <button
                  onClick={toggleFilterMode}
                  className={`mr-2 px-4 py-2 rounded ${
                    filterMode === 'OR' ? 'bg-blue-500 text-white' : 'bg-gray-300'
                  }`}
                >
                  OR
                </button>
                <button
                  onClick={toggleFilterMode}
                  className={`mr-2 px-4 py-2 rounded ${
                    filterMode === 'AND' ? 'bg-blue-500 text-white' : 'bg-gray-300'
                  }`}
                >
                  AND
                </button>
                <button
                  onClick={resetFilters}
                  className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded"
                >
                  Reset Filters
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
            <div className="mt-4">
              <input
                type="text"
                placeholder="Filter results..."
                value={textFilter}
                onChange={handleTextFilterChange}
                className="w-full p-2 border rounded"
              />
            </div>
            {sortedData && (
              <button
                onClick={exportToPDF}
                className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Export to PDF
              </button>
            )}
          </div>

          <input type="file" onChange={handleXmlFileUpload} accept=".xml" className="mb-4 p-2 border rounded" />
          {error && <p className="text-red-500 mb-4">{error}</p>}
          {filteredData && (
            <div className="space-y-8">
              <p className="mb-4 text-xl font-bold">Total number of hosts: {filteredData.length}</p>
              {filteredData.map((item, index) => (
                <div 
                  key={index} 
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                  ref={el => hostRefs.current[index] = el}
                >
                  <div className="bg-blue-600 text-white p-4">
                    <h2 className="text-2xl font-bold">{item.host}</h2>
                    <p className="text-lg">IP: {item.ip}</p>
                    <div className="flex items-center mt-1">
                      <span className="text-sm mr-2">Number of open ports:</span>
                      <span className={`text-sm font-bold text-white px-2 py-1 rounded-full ${getPortCountColor(item.portDetails.length)}`}>
                        {item.portDetails.length}
                      </span>
                    </div>
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
                          <tr key={detailIndex} className={getPortStyle(detail.port, detail.service)}>
                            <td className="p-2 border-b">{detail.port}</td>
                            <td className="p-2 border-b font-semibold">{detail.service}</td>
                            <td className="p-2 border-b">{detail.product}</td>
                            <td className="p-2 border-b">{detail.version}</td>
                            <td className="p-2 border-b">
                              {(isHttpService(detail.service) || isSmbService(detail.service)) && 
                                getWebLink(item.ip, item.host, detail.port, detail.service)}
                            </td>
                          </tr>
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
  );
};

export default NmapOutputViewer;