import React, { useState, useEffect, useRef } from 'react';

function App() {
  // ⚙️ Instructor PIN & Hourly Rate
  const [instructorPin, setInstructorPin] = useState(() => {
    return localStorage.getItem('aurex_instructor_pin') || "1234";
  });
  const [hourlyRate, setHourlyRate] = useState(() => {
    return parseInt(localStorage.getItem('aurex_hourly_rate')) || 100;
  });

  // 💻 PC States
  const [pcs, setPcs] = useState(() => {
    const savedPcs = localStorage.getItem('aurex_lab_pcs');
    if (savedPcs) {
      const parsed = JSON.parse(savedPcs);
      return parsed.map(pc => {
        if (pc.status === 'occupied' && pc.endTime) {
          const timeLeft = Math.max(0, Math.floor((pc.endTime - Date.now()) / 1000));
          if (timeLeft === 0) {
            return { id: pc.id, name: pc.name, status: 'available', studentName: '', studentId: '', hours: '1', minutes: '0', endTime: null, sessionCost: 0, paymentStatus: 'Unpaid' };
          }
        }
        return pc;
      });
    }
    return Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      name: `PC - ${String(i + 1).padStart(2, '0')}`,
      status: 'available',
      studentName: '',
      studentId: '',
      hours: '1',
      minutes: '0',
      endTime: null,
      sessionCost: 0,
      paymentStatus: 'Unpaid'
    }));
  });

  // 📜 History Log State
  const [history, setHistory] = useState(() => {
    const savedHistory = localStorage.getItem('aurex_lab_history');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  // 🎨 Dark Mode & Secret Income View State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('aurex_dark_mode') === 'true';
  });
  const [showIncome, setShowIncome] = useState(false);

  // 🔍 Search, Scan & UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPc, setSelectedPc] = useState(null);
  
  // 🖨️ Barcode / QR Scanner States
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanNotification, setScanNotification] = useState(null);
  const barcodeInputRef = useRef(null);
  
  // Form Inputs
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [hoursInput, setHoursInput] = useState('1');
  const [minutesInput, setMinutesInput] = useState('0');
  const [statusInput, setStatusInput] = useState('available');
  const [paymentInput, setPaymentInput] = useState('Unpaid');
  
  // PIN Verification States
  const [isVerified, setIsVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [rateInput, setRateInput] = useState(String(hourlyRate));

  const [, setTick] = useState(0);

  // 💾 LocalStorage Syncs
  useEffect(() => {
    localStorage.setItem('aurex_lab_pcs', JSON.stringify(pcs));
  }, [pcs]);

  useEffect(() => {
    localStorage.setItem('aurex_lab_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('aurex_dark_mode', darkMode);
  }, [darkMode]);

  // 🖨️ Auto-Focus Scanner Input
  useEffect(() => {
    const keepFocus = () => {
      if (barcodeInputRef.current && !isModalOpen && !isSettingsOpen) {
        barcodeInputRef.current.focus();
      }
    };
    keepFocus();
    const interval = setInterval(keepFocus, 2000);
    return () => clearInterval(interval);
  }, [isModalOpen, isSettingsOpen]);

  // ⏱️ Live Countdown & Auto-Release
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      
      pcs.forEach(pc => {
        if (pc.status === 'occupied' && pc.endTime) {
          const timeLeft = Math.floor((pc.endTime - Date.now()) / 1000);
          
          if (timeLeft === 0) {
            playBeepSound();
            alert(`⚠️ Time Expired! ${pc.name} used by ${pc.studentName} is now released.`);
            
            const logTime = new Date().toLocaleTimeString();
            const logDate = new Date().toLocaleDateString();
            setHistory(prev => [{
              pcName: pc.name,
              studentName: pc.studentName,
              studentId: pc.studentId,
              action: 'Auto-Released',
              cost: pc.sessionCost || 0,
              paymentStatus: pc.paymentStatus,
              time: `${logDate} ${logTime}`
            }, ...prev]);

            setPcs(currentPcs => 
              currentPcs.map(p => p.id === pc.id ? { ...p, status: 'available', studentName: '', studentId: '', hours: '1', minutes: '0', endTime: null, sessionCost: 0, paymentStatus: 'Unpaid' } : p)
            );
          }
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pcs]);

  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.log(e);
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const scannedId = barcodeInput.trim();
    if (!scannedId) return;

    const nextAvailablePc = pcs.find(pc => pc.status === 'available');

    if (!nextAvailablePc) {
      setScanNotification({ type: 'error', message: `❌ Scan Failed: No available PCs!` });
      setBarcodeInput('');
      setTimeout(() => setScanNotification(null), 4000);
      return;
    }

    const defaultDurationMs = 1 * 60 * 60 * 1000; 
    const endTime = Date.now() + defaultDurationMs;
    const calculatedCost = hourlyRate; 

    const logTime = new Date().toLocaleTimeString();
    const logDate = new Date().toLocaleDateString();

    setHistory(prev => [{
      pcName: nextAvailablePc.name,
      studentName: `Student (${scannedId})`,
      studentId: scannedId,
      action: 'QR Auto-Assign',
      cost: calculatedCost,
      paymentStatus: 'Unpaid',
      time: `${logDate} ${logTime}`
    }, ...prev]);

    setPcs(pcs.map(pc => 
      pc.id === nextAvailablePc.id 
        ? { ...pc, status: 'occupied', studentName: `Student (${scannedId})`, studentId: scannedId, hours: '1', minutes: '0', endTime: endTime, sessionCost: calculatedCost, paymentStatus: 'Unpaid' }
        : pc
    ));

    setScanNotification({ type: 'success', message: `✅ ${nextAvailablePc.name} assigned to ID: ${scannedId} (Unpaid)` });
    setBarcodeInput('');
    setTimeout(() => setScanNotification(null), 4000);
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,PC Name,Student Name,Student ID,Activity,Amount (LKR),Payment Status\n";
    
    history.forEach(log => {
      csvContent += `"${log.time}","${log.pcName}","${log.studentName}","${log.studentId}","${log.action}","${log.cost}","${log.paymentStatus || 'Paid'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Aurex_Lab_Report_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerPrint = () => {
    window.print();
  };

  const calculateInputCost = () => {
    const hrs = parseFloat(hoursInput) || 0;
    const mins = parseFloat(minutesInput) || 0;
    return Math.round((hrs + (mins / 60)) * hourlyRate);
  };

  // Filter PCs based on Search Query
  const filteredPcs = pcs.filter(pc => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      pc.name.toLowerCase().includes(query) ||
      pc.studentName.toLowerCase().includes(query) ||
      pc.studentId.toLowerCase().includes(query)
    );
  });

  const availableCount = pcs.filter(pc => pc.status === 'available').length;
  const occupiedCount = pcs.filter(pc => pc.status === 'occupied').length;
  const maintenanceCount = pcs.filter(pc => pc.status === 'maintenance').length;

  const totalIncome = history
    .filter(item => item.paymentStatus === 'Paid' || !item.paymentStatus)
    .reduce((sum, item) => sum + (item.cost || 0), 0);

  const handlePcClick = (pc) => {
    setSelectedPc(pc);
    setStudentNameInput(pc.studentName || '');
    setStudentIdInput(pc.studentId || '');
    setPaymentInput(pc.paymentStatus || 'Unpaid');
    
    if (pc.status === 'occupied' && pc.endTime) {
      const totalSecs = Math.max(0, Math.floor((pc.endTime - Date.now()) / 1000));
      setHoursInput(String(Math.floor(totalSecs / 3600)));
      setMinutesInput(String(Math.floor((totalSecs % 3600) / 60)));
    } else {
      setHoursInput(pc.hours || '1');
      setMinutesInput(pc.minutes || '0');
    }
    
    setStatusInput(pc.status);
    setPinInput('');
    setIsVerified(false); 
    setIsModalOpen(true);
  };

  const handleVerifyPin = () => {
    if (pinInput === instructorPin) setIsVerified(true);
    else alert('Incorrect PIN!');
  };

  const handleConfirmBooking = () => {
    if (statusInput === 'occupied' && (!studentNameInput.trim() || !studentIdInput.trim())) {
      alert('Please fill all details!');
      return;
    }

    const hrs = parseInt(hoursInput) || 0;
    const mins = parseInt(minutesInput) || 0;
    const durationInMs = ((hrs * 60) + mins) * 60 * 1000;
    const endTime = statusInput === 'occupied' ? Date.now() + durationInMs : null;
    const calculatedCost = statusInput === 'occupied' ? calculateInputCost() : 0;

    const logTime = new Date().toLocaleTimeString();
    const logDate = new Date().toLocaleDateString();

    setHistory(prev => [{
      pcName: selectedPc.name,
      studentName: statusInput === 'occupied' ? studentNameInput : '-',
      studentId: statusInput === 'occupied' ? studentIdInput : '-',
      action: selectedPc.status === 'occupied' ? 'Updated / Extended' : 'Assigned',
      cost: calculatedCost,
      paymentStatus: statusInput === 'occupied' ? paymentInput : 'Paid',
      time: `${logDate} ${logTime}`
    }, ...prev]);

    setPcs(pcs.map(pc => 
      pc.id === selectedPc.id 
        ? { ...pc, status: statusInput, studentName: statusInput === 'occupied' ? studentNameInput : '', studentId: statusInput === 'occupied' ? studentIdInput : '', hours: String(hrs), minutes: String(mins), endTime: endTime, sessionCost: calculatedCost, paymentStatus: paymentInput }
        : pc
    ));

    setIsModalOpen(false);
  };

  const toggleHistoryPayment = (index) => {
    setHistory(history.map((item, idx) => 
      idx === index ? { ...item, paymentStatus: item.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid' } : item
    ));
  };

  const handleChangeSettings = () => {
    if (currentPinInput === instructorPin) {
      if (newPinInput.trim().length >= 4) {
        setInstructorPin(newPinInput);
        localStorage.setItem('aurex_instructor_pin', newPinInput);
      }
      setHourlyRate(parseInt(rateInput) || 100);
      localStorage.setItem('aurex_hourly_rate', rateInput);
      setIsSettingsOpen(false);
      setCurrentPinInput('');
      setNewPinInput('');
      alert('Settings Updated!');
    } else {
      alert('Incorrect PIN!');
    }
  };

  const renderTimeLeft = (endTime) => {
    if (!endTime) return null;
    const totalSeconds = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    const hrs = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return (
      <span style={{ fontSize: '11px', color: totalSeconds <= 10 ? '#e74c3c' : '#7f8c8d', marginTop: '3px', fontWeight: 'bold' }}>
        ⏳ {hrs > 0 ? `${hrs}:` : ''}{String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}
      </span>
    );
  };

  const themeBg = darkMode ? '#1e272e' : '#f4f6f9';
  const themeCardBg = darkMode ? '#2d3748' : 'white';
  const themeText = darkMode ? '#f5f6fa' : '#333';
  const themeBorder = darkMode ? '#4a5568' : '#ddd';

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', backgroundColor: themeBg, color: themeText, minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* CSS Styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; max-width: 100% !important; box-shadow: none !important; border: none !important; }
          .split-container { display: block !important; }
        }
        .split-container { display: flex; gap: 20px; max-width: 1400px; margin: 0 auto; align-items: flex-start; }
        .left-panel { flex: 7; }
        .right-panel { flex: 4; position: sticky; top: 20px; }
        .pc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 15px; }
        .pc-card { background-color: ${themeCardBg}; border: 1px solid ${themeBorder}; border-radius: 8px; padding: 12px 8px; cursor: pointer; transition: 0.2s; text-align: center; }
        .pc-card:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.15); }
        th, td { border-bottom: 1px solid ${themeBorder}; padding: 8px; text-align: left; }
      `}</style>

      {/* Invisible Barcode Reader */}
      <form onSubmit={handleBarcodeSubmit} style={{ position: 'absolute', opacity: 0, top: -100 }} className="no-print">
        <input ref={barcodeInputRef} type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} />
      </form>

      {scanNotification && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: scanNotification.type === 'success' ? '#2ecc71' : '#e74c3c', color: 'white', padding: '12px 30px', borderRadius: '30px', fontWeight: 'bold', zIndex: 9999 }}>
          {scanNotification.message}
        </div>
      )}

      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto 20px auto', borderBottom: `1px solid ${themeBorder}`, paddingBottom: '15px' }} className="no-print">
        <div>
          <h2 style={{ margin: 0 }}>Aurex Lab Master Dashboard</h2>
          <span style={{ fontSize: '13px', opacity: 0.7 }}>Split Layout Premium System</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '12px', color: '#2ecc71', fontWeight: 'bold', backgroundColor: darkMode ? '#1a202c' : '#e8f5e9', padding: '6px 12px', borderRadius: '15px' }}>
            📸 Barcode Scanner Live
          </div>
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setIsSettingsOpen(true)} style={{ padding: '8px 15px', background: '#7f8c8d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Main Split Layout Container */}
      <div className="split-container print-full-width">
        
        {/* LEFT PANEL: 💻 PC Grid & Status Counter */}
        <div className="left-panel print-full-width">
          {/* Status Counter */}
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', fontSize: '13px', backgroundColor: themeCardBg, padding: '12px', borderRadius: '8px', border: `1px solid ${themeBorder}` }} className="no-print">
            <span>🟢 <b>Available:</b> {availableCount}</span>
            <span>🔴 <b>In Use:</b> {occupiedCount}</span>
            <span>🟠 <b>Broken:</b> {maintenanceCount}</span>
          </div>

          {/* 🔍 Search Bar */}
          <div style={{ marginBottom: '15px' }} className="no-print">
            <input type="text" placeholder="🔍 Search PC, Student Name or Student ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 15px', fontSize: '15px', borderRadius: '6px', border: `1px solid ${themeBorder}`, backgroundColor: themeCardBg, color: themeText, boxSizing: 'border-box' }} />
          </div>

          {/* Grid View */}
          <div className="pc-grid no-print">
            {filteredPcs.map(pc => (
              <div key={pc.id} onClick={() => handlePcClick(pc)} className="pc-card" style={{ borderTop: `6px solid ${pc.status === 'available' ? '#2ecc71' : pc.status === 'occupied' ? '#e74c3c' : '#f39c12'}` }}>
                <div style={{ fontSize: '20px' }}>{pc.status === 'maintenance' ? '🛠️' : '💻'}</div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', margin: '3px 0' }}>{pc.name}</div>
                <div style={{ fontSize: '11px', minHeight: '34px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {pc.status === 'occupied' && (
                    <>
                      <span style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pc.studentName}</span>
                      {renderTimeLeft(pc.endTime)}
                      <span style={{ fontSize: '9px', color: pc.paymentStatus === 'Paid' ? '#2ecc71' : '#e74c3c', fontWeight: 'bold', marginTop: '2px' }}>
                        {pc.paymentStatus === 'Paid' ? '● Paid' : '● Unpaid'}
                      </span>
                    </>
                  )}
                  {pc.status === 'available' && <span style={{ opacity: 0.6 }}>Available</span>}
                  {pc.status === 'maintenance' && <span style={{ color: '#f39c12' }}>Broken</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL: 📊 Reports, Income & Audit Logs (Sidebar) */}
        <div className="right-panel print-full-width">
          
          {/* Finance Analytics Component */}
          <div style={{ backgroundColor: themeCardBg, padding: '18px', borderRadius: '10px', border: `1px solid ${themeBorder}`, marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', borderBottom: `1px solid ${themeBorder}`, paddingBottom: '8px' }}>📊 Financial & Action Center</h4>
            
            <div style={{ fontSize: '15px', fontWeight: 'bold', padding: '10px', backgroundColor: darkMode ? '#1a202c' : '#e1f5fe', borderRadius: '6px', color: '#2ec4b6', marginBottom: '15px', textAlign: 'center' }}>
              💰 Total Income: {showIncome || window.matchMedia('print').matches ? `Rs. ${totalIncome}/=` : '••••••'}
            </div>

            <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <button onClick={exportToCSV} style={{ padding: '8px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>📥 Excel File</button>
              <button onClick={triggerPrint} style={{ padding: '8px', background: '#2980b9', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>🖨️ Print Sheet</button>
            </div>
            
            <button className="no-print" onClick={() => setShowIncome(!showIncome)} style={{ width: '100%', padding: '6px', background: '#34495e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>
              {showIncome ? '👁️ Hide Income Statement' : '👁️ Show Secret Income Statement'}
            </button>
          </div>

          {/* Audit History Log */}
          <div style={{ backgroundColor: themeCardBg, padding: '18px', borderRadius: '10px', border: `1px solid ${themeBorder}`, maxHeight: '420px', overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 12px 0', borderBottom: `1px solid ${themeBorder}`, paddingBottom: '8px' }}>📜 Operation & Payment History</h4>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: darkMode ? '#4a5568' : '#eaeaea', opacity: 0.8 }}>
                    <th style={{ padding: '6px' }}>PC/Time</th>
                    <th style={{ padding: '6px' }}>Student</th>
                    <th style={{ padding: '6px' }}>Fee</th>
                    <th style={{ padding: '6px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '15px', textAlign: 'center', opacity: 0.5 }}>No logs saved yet.</td></tr>
                  ) : (
                    history.map((log, index) => (
                      <tr key={index}>
                        <td style={{ padding: '6px' }}>
                          <b>{log.pcName}</b><br/>
                          <span style={{ fontSize: '10px', opacity: 0.6 }}>{log.time.split(' ')[1] || log.time}</span>
                        </td>
                        <td style={{ padding: '6px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.studentName}</td>
                        <td style={{ padding: '6px', fontWeight: 'bold' }}>Rs.{log.cost}</td>
                        <td style={{ padding: '6px' }}>
                          <button 
                            className="no-print"
                            onClick={() => toggleHistoryPayment(index)}
                            style={{
                              backgroundColor: log.paymentStatus === 'Paid' ? '#2ecc71' : '#e74c3c',
                              color: 'white', border: 'none', padding: '2px 5px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold'
                            }}
                          >
                            {log.paymentStatus || 'Paid'}
                          </button>
                          <span className="print-only" style={{ display: 'none', fontWeight: 'bold', color: log.paymentStatus === 'Paid' ? 'green' : 'red' }}>
                            {log.paymentStatus || 'Paid'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* 🔒 Pop-up Management Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: themeCardBg, padding: '25px', borderRadius: '10px', width: '320px', textAlign: 'left', border: `1px solid ${themeBorder}` }}>
            {!isVerified ? (
              <div>
                <h4 style={{ marginTop: 0, color: '#e74c3c' }}>🔒 Instructor PIN Required</h4>
                <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="Enter PIN" style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', textAlign: 'center', fontSize: '18px', border: `1px solid ${themeBorder}` }} onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()} />
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => setIsModalOpen(false)} style={{ background: '#bdc3c7', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', marginRight: '10px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleVerifyPin} style={{ background: '#3498db', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Verify</button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ marginTop: 0 }}>Manage {selectedPc?.name}</h3>
                <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '13px' }}>Status:</label>
                <select value={statusInput} onChange={(e) => setStatusInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '5px' }}>
                  <option value="available">Available</option>
                  <option value="occupied">In Use</option>
                  <option value="maintenance">Maintenance</option>
                </select>

                {statusInput === 'occupied' && (
                  <>
                    <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '13px' }}>Student Name:</label>
                    <input type="text" value={studentNameInput} onChange={(e) => setStudentNameInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '5px' }} />
                    
                    <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '13px' }}>Student ID:</label>
                    <input type="text" value={studentIdInput} onChange={(e) => setStudentIdInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '5px' }} />

                    <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '13px' }}>Payment Status:</label>
                    <select value={paymentInput} onChange={(e) => setPaymentInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '5px', fontWeight: 'bold', color: paymentInput === 'Paid' ? '#2ecc71' : '#e74c3c' }}>
                      <option value="Unpaid">❌ Unpaid (Pay Later)</option>
                      <option value="Paid">✅ Paid (Cash Collected)</option>
                    </select>

                    <div style={{ backgroundColor: '#e8f5e9', padding: '8px', borderRadius: '5px', fontWeight: 'bold', color: '#2ecc71', textAlign: 'center', marginBottom: '15px', fontSize: '14px' }}>
                      💵 Bill: Rs. {calculateInputCost()}/=
                    </div>
                  </>
                )}

                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => setIsModalOpen(false)} style={{ background: '#bdc3c7', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', marginRight: '10px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleConfirmBooking} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Save</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: themeCardBg, padding: '30px', borderRadius: '10px', width: '320px', textAlign: 'left', border: `1px solid ${themeBorder}` }}>
            <h3>⚙️ Settings</h3>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Hourly Rate (LKR):</label>
            <input type="number" value={rateInput} onChange={(e) => setRateInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '5px' }} />
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Current PIN:</label>
            <input type="password" value={currentPinInput} onChange={(e) => setCurrentPinInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '5px' }} />
            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setIsSettingsOpen(false)} style={{ background: '#bdc3c7', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', marginRight: '10px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleChangeSettings} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;