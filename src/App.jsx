import React, { useState, useEffect, useRef } from 'react';

function App() {
  // ⚙️ Instructor PIN & Hourly Rate (Default 100 LKR)
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
            return { id: pc.id, name: pc.name, status: 'available', studentName: '', studentId: '', hours: '1', minutes: '0', endTime: null, sessionCost: 0 };
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
      sessionCost: 0
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

  // 🖨️ Auto-Focus Scanner Input continuously
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
              time: `${logDate} ${logTime}`
            }, ...prev]);

            setPcs(currentPcs => 
              currentPcs.map(p => p.id === pc.id ? { ...p, status: 'available', studentName: '', studentId: '', hours: '1', minutes: '0', endTime: null, sessionCost: 0 } : p)
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
      console.log("Audio alert error: ", e);
    }
  };

  // 🖨️ Handle Scanner Event (When Student Scans QR/Barcode)
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const scannedId = barcodeInput.trim();
    if (!scannedId) return;

    // ලැබ් එකේ දැනට හිස්ව තියෙන පළමු PC එක සොයයි
    const nextAvailablePc = pcs.find(pc => pc.status === 'available');

    if (!nextAvailablePc) {
      setScanNotification({ type: 'error', message: `❌ Scan Failed: No available PCs in the lab!` });
      setBarcodeInput('');
      setTimeout(() => setScanNotification(null), 4000);
      return;
    }

    // Default පැය 1ක බිල ගණනය කරයි
    const defaultDurationMs = 1 * 60 * 60 * 1000; 
    const endTime = Date.now() + defaultDurationMs;
    const calculatedCost = hourlyRate; 

    const logTime = new Date().toLocaleTimeString();
    const logDate = new Date().toLocaleDateString();

    // සෙෂන් එක ඔටෝ ලොග් වේ
    setHistory(prev => [{
      pcName: nextAvailablePc.name,
      studentName: `Student (${scannedId})`,
      studentId: scannedId,
      action: 'QR / Barcode Auto-Assign',
      cost: calculatedCost,
      time: `${logDate} ${logTime}`
    }, ...prev]);

    // PC එක Occupied තත්ත්වයට පත් කරයි
    setPcs(pcs.map(pc => 
      pc.id === nextAvailablePc.id 
        ? { ...pc, status: 'occupied', studentName: `Student (${scannedId})`, studentId: scannedId, hours: '1', minutes: '0', endTime: endTime, sessionCost: calculatedCost }
        : pc
    ));

    setScanNotification({ type: 'success', message: `✅ ${nextAvailablePc.name} successfully assigned to Student ID: ${scannedId} (1 Hour)` });
    setBarcodeInput('');
    setTimeout(() => setScanNotification(null), 4000);
  };

  // 💵 Calculate current live cost for form input
  const calculateInputCost = () => {
    const hrs = parseFloat(hoursInput) || 0;
    const mins = parseFloat(minutesInput) || 0;
    const totalHours = hrs + (mins / 60);
    return Math.round(totalHours * hourlyRate);
  };

  // 📊 Analytics Calculations
  const availableCount = pcs.filter(pc => pc.status === 'available').length;
  const occupiedCount = pcs.filter(pc => pc.status === 'occupied').length;
  const maintenanceCount = pcs.filter(pc => pc.status === 'maintenance').length;
  const totalPcs = pcs.length;

  const totalIncome = history.reduce((sum, item) => sum + (item.cost || 0), 0);

  const availPercent = (availableCount / totalPcs) * 100;
  const occupPercent = (occupiedCount / totalPcs) * 100;
  const maintPercent = (maintenanceCount / totalPcs) * 100;

  const handlePcClick = (pc) => {
    setSelectedPc(pc);
    setStudentNameInput(pc.studentName || '');
    setStudentIdInput(pc.studentId || '');
    
    if (pc.status === 'occupied' && pc.endTime) {
      const totalSecs = Math.max(0, Math.floor((pc.endTime - Date.now()) / 1000));
      const currentHrs = Math.floor(totalSecs / 3600);
      const currentMins = Math.floor((totalSecs % 3600) / 60);
      setHoursInput(String(currentHrs));
      setMinutesInput(String(currentMins));
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
    if (pinInput === instructorPin) {
      setIsVerified(true);
    } else {
      alert('Incorrect Instructor PIN! Access Denied.');
    }
  };

  const handleConfirmBooking = () => {
    if (statusInput === 'occupied') {
      if (studentNameInput.trim() === '') {
        alert('Please enter student name!');
        return;
      }
      if (studentIdInput.trim() === '') {
        alert('Please enter Student ID!');
        return;
      }
    }

    const hrs = parseInt(hoursInput) || 0;
    const mins = parseInt(minutesInput) || 0;
    
    if (statusInput === 'occupied' && hrs === 0 && mins === 0) {
      alert('Please enter a valid duration!');
      return;
    }

    const durationInMs = ((hrs * 60) + mins) * 60 * 1000;
    const endTime = statusInput === 'occupied' ? Date.now() + durationInMs : null;
    const calculatedCost = statusInput === 'occupied' ? calculateInputCost() : 0;

    const logTime = new Date().toLocaleTimeString();
    const logDate = new Date().toLocaleDateString();
    let actionText = '';
    if (statusInput === 'occupied') {
      actionText = selectedPc.status === 'occupied' ? 'Time Extended' : 'Assigned / Booked';
    } else if (statusInput === 'available') {
      actionText = 'Manually Released';
    } else {
      actionText = 'Marked Broken';
    }

    setHistory(prev => [{
      pcName: selectedPc.name,
      studentName: statusInput === 'occupied' ? studentNameInput : '-',
      studentId: statusInput === 'occupied' ? studentIdInput : '-',
      action: actionText,
      cost: calculatedCost,
      time: `${logDate} ${logTime}`
    }, ...prev]);

    setPcs(pcs.map(pc => 
      pc.id === selectedPc.id 
        ? { ...pc, status: statusInput, studentName: statusInput === 'occupied' ? studentNameInput : '', studentId: statusInput === 'occupied' ? studentIdInput : '', hours: String(hrs), minutes: String(mins), endTime: endTime, sessionCost: calculatedCost }
        : pc
    ));

    setIsModalOpen(false);
  };

  const handleChangeSettings = () => {
    if (currentPinInput === instructorPin) {
      if (newPinInput.trim().length >= 4) {
        setInstructorPin(newPinInput);
        localStorage.setItem('aurex_instructor_pin', newPinInput);
      }
      const finalRate = parseInt(rateInput) || 100;
      setHourlyRate(finalRate);
      localStorage.setItem('aurex_hourly_rate', String(finalRate));

      alert('Instructor Settings successfully updated!');
      setIsSettingsOpen(false);
      setCurrentPinInput('');
      setNewPinInput('');
    } else {
      alert('Current PIN is incorrect!');
    }
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear all history logs and reset total income?")) {
      setHistory([]);
    }
  };

  const renderTimeLeft = (endTime) => {
    if (!endTime) return null;
    const totalSeconds = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    const hrs = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const isUrgent = totalSeconds <= 10;

    return (
      <span style={{ 
        fontSize: '11px', 
        color: isUrgent ? '#e74c3c' : darkMode ? '#95a5a6' : '#7f8c8d', 
        marginTop: '3px', 
        fontWeight: 'bold',
        animation: isUrgent ? 'blinker 1s linear infinite' : 'none'
      }}>
        ⏳ {hrs > 0 ? `${hrs}:` : ''}{String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}
      </span>
    );
  };

  const isPcMatched = (pc) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.trim().toLowerCase();
    return pc.studentName.toLowerCase().includes(q) || pc.studentId.toLowerCase().includes(q);
  };

  // Theme Styles
  const themeBg = darkMode ? '#1e272e' : '#f4f6f9';
  const themeCardBg = darkMode ? '#2d3748' : 'white';
  const themeText = darkMode ? '#f5f6fa' : '#333';
  const themeSubText = darkMode ? '#cbd5e0' : '#666';
  const themeBorder = darkMode ? '#4a5568' : '#ddd';

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', backgroundColor: themeBg, color: themeText, minHeight: '100vh', textAlign: 'center', transition: '0.3s' }}>
      
      {/* 🖨️ Invisible Barcode Reader Listener */}
      <form onSubmit={handleBarcodeSubmit} style={{ position: 'absolute', opacity: 0, top: -100 }}>
        <input 
          ref={barcodeInputRef}
          type="text" 
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          placeholder="Scanner Listener Active"
        />
      </form>

      {/* 🔔 Scanner Toast Notification popup */}
      {scanNotification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: scanNotification.type === 'success' ? '#2ecc71' : '#e74c3c',
          color: 'white',
          padding: '12px 30px',
          borderRadius: '30px',
          fontWeight: 'bold',
          zIndex: 9999,
          boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
          fontSize: '15px'
        }}>
          {scanNotification.message}
        </div>
      )}

      <style>{`
        @keyframes blinker { 50% { opacity: 0; } }
        .pc-card {
          background-color: ${themeCardBg};
          border: 2px solid ${themeBorder};
          border-radius: 8px;
          padding: 15px 10px;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .pc-card:hover {
          transform: translateY(-5px) scale(1.05);
          box-shadow: ${darkMode ? '0 8px 25px rgba(0,0,0,0.5)' : '0 8px 20px rgba(0,0,0,0.15)'};
          border-color: ${darkMode ? '#718096' : '#999'};
        }
      `}</style>

      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1000px', margin: '0 auto 10px auto' }}>
        <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
        <div style={{ fontSize: '12px', color: '#2ecc71', fontWeight: 'bold', backgroundColor: darkMode ? '#1a202c' : '#e8f5e9', padding: '6px 12px', borderRadius: '15px', border: '1px solid #2ecc71' }}>
          📸 Barcode Scanner Mode Active (Ready to Scan Card)
        </div>
        <button onClick={() => setIsSettingsOpen(true)} style={{ padding: '8px 15px', background: '#7f8c8d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          ⚙️ Settings
        </button>
      </div>

      <h1>Aurex Computer Lab Dashboard</h1>
      <p style={{ color: themeSubText }}>Authorized Management & Income Tracking System</p>

      {/* 🔍 Live Search Bar */}
      <div style={{ maxWidth: '1000px', margin: '0 auto 20px auto' }}>
        <input 
          type="text" 
          placeholder="🔍 Enter exact Student Name or Student ID to find their PC..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '12px 20px', fontSize: '16px', borderRadius: '8px', border: `1px solid ${themeBorder}`, backgroundColor: themeCardBg, color: themeText, boxSizing: 'border-box' }}
        />
      </div>

      {/* 📊 Analytics Dashboard with Income Tracker */}
      <div style={{ backgroundColor: themeCardBg, padding: '20px', borderRadius: '10px', maxWidth: '1000px', margin: '0 auto 30px auto', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', textAlign: 'left', border: `1px solid ${themeBorder}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h4 style={{ margin: 0 }}>📊 Lab Resource & Financial Analytics</h4>
          <button 
            onClick={() => setShowIncome(!showIncome)} 
            style={{ padding: '4px 10px', fontSize: '12px', background: '#34495e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {showIncome ? '👁️ Hide Income' : '👁️ Show Income'}
          </button>
        </div>
        
        <div style={{ display: 'flex', height: '24px', borderRadius: '5px', overflow: 'hidden', backgroundColor: '#eee', marginBottom: '15px' }}>
          <div style={{ width: `${availPercent}%`, backgroundColor: '#2ecc71', transition: '0.5s' }}></div>
          <div style={{ width: `${occupPercent}%`, backgroundColor: '#e74c3c', transition: '0.5s' }}></div>
          <div style={{ width: `${maintPercent}%`, backgroundColor: '#f39c12', transition: '0.5s' }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div>🟢 <b>Available:</b> {availableCount} Pcs</div>
            <div>🔴 <b>In Use:</b> {occupiedCount} Pcs</div>
            <div>🟠 <b>Broken:</b> {maintenanceCount} Pcs</div>
          </div>
          {/* 💵 Secret Income Counter */}
          <div style={{ fontSize: '16px', fontWeight: 'bold', padding: '5px 12px', backgroundColor: darkMode ? '#1a202c' : '#e1f5fe', borderRadius: '5px', color: '#2ec4b6' }}>
            💰 Total Income: {showIncome ? `Rs. ${totalIncome.toLocaleString()}/=` : '••••'}
          </div>
        </div>
      </div>

      {/* 💻 PC Grid Items */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        {pcs.map(pc => {
          const matched = isPcMatched(pc);
          return (
            <div 
              key={pc.id} 
              onClick={() => handlePcClick(pc)}
              className="pc-card"
              style={{
                borderTop: `8px solid ${pc.status === 'available' ? '#2ecc71' : pc.status === 'occupied' ? '#e74c3c' : '#f39c12'}`,
                ...(matched ? {
                  borderColor: '#3498db',
                  transform: 'scale(1.06)',
                  boxShadow: '0 4px 15px rgba(52, 152, 219, 0.7)',
                  zIndex: 10
                } : {})
              }}
            >
              <div style={{ fontSize: '24px' }}>{pc.status === 'maintenance' ? '🛠️' : '💻'}</div>
              <div style={{ fontWeight: 'bold', margin: '5px 0' }}>{pc.name}</div>
              
              <div style={{ fontSize: '12px', color: themeSubText, minHeight: '34px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                {pc.status === 'maintenance' && 'Broken'}
                {pc.status === 'available' && 'Available'}
                {pc.status === 'occupied' && (
                  <>
                    <span style={{ fontWeight: '500', color: themeText, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pc.studentName}</span>
                    {renderTimeLeft(pc.endTime)}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 📜 Advanced History Log Section */}
      <div style={{ backgroundColor: themeCardBg, padding: '20px', borderRadius: '10px', maxWidth: '1000px', margin: '40px auto 0 auto', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', textAlign: 'left', border: `1px solid ${themeBorder}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>📜 Lab Activity & Financial Log</h3>
          {history.length > 0 && (
            <button onClick={clearHistory} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Clear Logs</button>
          )}
        </div>
        <div style={{ maxHeight: '250px', overflowY: 'auto', border: `1px solid ${themeBorder}`, borderRadius: '5px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: darkMode ? '#232b38' : '#fafafa' }}>
            <thead>
              <tr style={{ backgroundColor: darkMode ? '#4a5568' : '#eaeaea', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Timestamp</th>
                <th style={{ padding: '10px' }}>PC</th>
                <th style={{ padding: '10px' }}>Student (ID)</th>
                <th style={{ padding: '10px' }}>Activity Status</th>
                <th style={{ padding: '10px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: themeSubText }}>No activity logs recorded yet.</td>
                </tr>
              ) : (
                history.map((log, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${themeBorder}` }}>
                    <td style={{ padding: '10px', color: themeSubText }}>{log.time}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{log.pcName}</td>
                    <td style={{ padding: '10px' }}>{log.studentName} {log.studentId !== '-' ? `(${log.studentId})` : ''}</td>
                    <td style={{ padding: '10px', color: log.action.includes('Expired') || log.action.includes('Released') ? '#e67e22' : log.action.includes('Broken') ? '#e74c3c' : '#2ecc71', fontWeight: '500' }}>{log.action}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: log.cost > 0 ? '#2ecc71' : themeSubText }}>{log.cost > 0 ? `Rs. ${log.cost}/=` : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔒 Pop-up Form Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: themeCardBg, padding: '30px', borderRadius: '10px', width: '340px', textAlign: 'left', border: `1px solid ${themeBorder}`, color: themeText }}>
            {!isVerified ? (
              <div>
                <h3 style={{ marginTop: 0, color: '#e74c3c' }}>🔒 Instructor Required</h3>
                <p style={{ fontSize: '14px', color: themeSubText }}>Only a Lab Instructor can edit resources. Please enter PIN.</p>
                <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="Enter Instructor PIN" style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', textAlign: 'center', fontSize: '18px' }} onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()} />
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => setIsModalOpen(false)} style={{ background: '#bdc3c7', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', marginRight: '10px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleVerifyPin} style={{ background: '#3498db', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Verify PIN</button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ marginTop: 0 }}>Manage {selectedPc?.name}</h3>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>PC Status:</label>
                <select value={statusInput} onChange={(e) => setStatusInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: themeBg, color: themeText }}>
                  <option value="available">Available (Release)</option>
                  <option value="occupied">In Use (Assign/Edit)</option>
                  <option value="maintenance">Broken / Maintenance</option>
                </select>

                {statusInput === 'occupied' && (
                  <>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Student Name:</label>
                    <input type="text" value={studentNameInput} onChange={(e) => setStudentNameInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: themeBg, color: themeText }} />

                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Student ID:</label>
                    <input type="text" value={studentIdInput} onChange={(e) => setStudentIdInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: themeBg, color: themeText }} />

                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Set Duration & Live Cost:</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '12px', color: themeSubText }}>Hours</span>
                        <input type="number" min="0" max="24" value={hoursInput} onChange={(e) => setHoursInput(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', textAlign: 'center', backgroundColor: themeBg, color: themeText }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '12px', color: themeSubText }}>Minutes</span>
                        <input type="number" min="0" max="59" value={minutesInput} onChange={(e) => setMinutesInput(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', textAlign: 'center', backgroundColor: themeBg, color: themeText }} />
                      </div>
                    </div>

                    <div style={{ backgroundColor: darkMode ? '#1a202c' : '#e8f5e9', padding: '10px', borderRadius: '5px', fontWeight: 'bold', color: '#2ecc71', textAlign: 'center', marginBottom: '20px', border: '1px solid #2ecc71' }}>
                      💵 Est. Total Bill: Rs. {calculateInputCost()}/=
                    </div>
                  </>
                )}

                <div style={{ textAlign: 'right', marginTop: '10px' }}>
                  <button onClick={() => setIsModalOpen(false)} style={{ background: '#bdc3c7', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', marginRight: '10px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleConfirmBooking} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Save Changes</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⚙️ Instructor Settings Modal */}
      {isSettingsOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: themeCardBg, padding: '30px', borderRadius: '10px', width: '320px', textAlign: 'left', border: `1px solid ${themeBorder}`, color: themeText }}>
            <h3 style={{ marginTop: 0 }}>⚙️ Instructor Settings</h3>
            <p style={{ fontSize: '13px', color: themeSubText, marginBottom: '15px' }}>Configure security and billing structures.</p>
            
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Hourly Rate (LKR):</label>
            <input type="number" value={rateInput} onChange={(e) => setRateInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: themeBg, color: themeText, fontSize: '16px', fontWeight: 'bold' }} />

            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Current PIN (To Save):</label>
            <input type="password" value={currentPinInput} onChange={(e) => setCurrentPinInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: themeBg, color: themeText }} />

            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>New Security PIN (Optional):</label>
            <input type="password" value={newPinInput} onChange={(e) => setNewPinInput(e.target.value)} placeholder="Keep blank to stay same" style={{ width: '100%', padding: '8px', marginBottom: '20px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: themeBg, color: themeText }} />

            <div style={{ textAlign: 'right' }}>
              <button onClick={() => { setIsSettingsOpen(false); setCurrentPinInput(''); setNewPinInput(''); setRateInput(String(hourlyRate)); }} style={{ background: '#bdc3c7', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', marginRight: '10px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleChangeSettings} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Update Settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;