import React, { useState, useMemo } from 'react';
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
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
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
  };

  const toggleFilterMode = () => {
    setFilterMode(prev => prev === 'OR' ? 'AND' : 'OR');
  };

  const filteredData = useMemo(() => {
    if (!sortedData) return null;
    
    let filtered = sortedData;

    // Apply service type filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(item => 
        item.portDetails.some(detail => {
          const conditions = [
            activeFilters.includes('http') && isHttpService(detail.service),
            activeFilters.includes('smb') && isSmbService(detail.service),
            activeFilters.includes('standard') && 
              ['80', '443', '8080'].includes(detail.port) && 
              isHttpService(detail.service),
            activeFilters.includes('ldap') && isLdapService(detail.service)
          ];

          if (filterMode === 'OR') {
            return conditions.some(condition => condition);
          } else { // 'AND' mode
            return activeFilters.every((filter, index) => conditions[index]);
          }
        })
      );
    }

    // Apply text filter
    if (textFilter) {
      const lowercasedFilter = textFilter.toLowerCase();
      filtered = filtered.map(item => ({
        ...item,
        portDetails: item.portDetails.filter(detail => 
          Object.values(detail).some(value => 
            value.toString().toLowerCase().includes(lowercasedFilter)
          )
        )
      })).filter(item => item.portDetails.length > 0);
    }

    return filtered;
  }, [sortedData, activeFilters, filterMode, textFilter]);

  const handleTextFilterChange = (event) => {
    setTextFilter(event.target.value);
  };

  return (
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
          <button 
            onClick={() => toggleFilter('standard')} 
            className={`flex items-center p-2 rounded ${activeFilters.includes('standard') ? 'bg-blue-200' : ''}`}
          >
            <div className="w-4 h-4 bg-green-100 mr-2"></div>
            <span>HTTP services on standard ports</span>
          </button>
          <button 
            onClick={() => toggleFilter('http')} 
            className={`flex items-center p-2 rounded ${activeFilters.includes('http') ? 'bg-blue-200' : ''}`}
          >
            <div className="w-4 h-4 bg-yellow-100 mr-2"></div>
            <span>HTTP services on non-standard ports</span>
          </button>
          <button 
            onClick={() => toggleFilter('smb')} 
            className={`flex items-center p-2 rounded ${activeFilters.includes('smb') ? 'bg-blue-200' : ''}`}
          >
            <div className="w-4 h-4 bg-red-100 mr-2"></div>
            <span>SMB services</span>
          </button>
          <button 
            onClick={() => toggleFilter('ldap')} 
            className={`flex items-center p-2 rounded ${activeFilters.includes('ldap') ? 'bg-blue-200' : ''}`}
          >
            <div className="w-4 h-4 bg-blue-100 mr-2"></div>
            <span>LDAP services</span>
          </button>
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
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-blue-600 text-white p-4">
                <h2 className="text-2xl font-bold">{item.host}</h2>
                <p className="text-lg">IP: {item.ip}</p>
                <p className="text-sm">Number of open ports: {item.portDetails.length}</p>
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
  );
};

export default NmapOutputViewer;