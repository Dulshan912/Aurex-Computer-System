import React, { useState, useEffect, useRef } from 'react';

function App() {
  const INSTRUCTOR_PIN = "1234";

  const [pcs, setPcs] = useState(() => {
    const savedPcs = localStorage.getItem('aurex_lab_pcs');
    if (savedPcs) {
      const parsed = JSON.parse(savedPcs);
      return parsed.map(pc => {
        if (pc.status === 'occupied' && pc.endTime) {
          const timeLeft = Math.max(0, Math.floor((pc.endTime - Date.now()) / 1000));
          if (timeLeft === 0) {
            return { id: pc.id, name: pc.name, status: 'available', studentName: '', studentId: '', duration: '1', endTime: null };
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
      duration: '1',
      endTime: null
    }));
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPc, setSelectedPc] = useState(null);
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [durationInput, setDurationInput] = useState('1');
  const [statusInput, setStatusInput] = useState('available');
  
  const [isVerified, setIsVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [, setTick] = useState(0);

  // 💾 LocalStorage Save
  useEffect(() => {
    localStorage.setItem('aurex_lab_pcs', JSON.stringify(pcs));
  }, [pcs]);

  // ⏱️ Live Countdown, Sound Alerts & Auto-Release
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      
      pcs.forEach(pc => {
        if (pc.status === 'occupied' && pc.endTime) {
          const timeLeft = Math.floor((pc.endTime - Date.now()) / 1000);
          
          // වෙලාව හරියටම ඉවර වුණු සැනින් Beep හඬක් සහ Notification එකක් ලබාදීම
          if (timeLeft === 0) {
            playBeepSound();
            alert(`⚠️ Time Expired! ${pc.name} used by ${pc.studentName} (${pc.studentId}) is now released.`);
            
            setPcs(currentPcs => 
              currentPcs.map(p => p.id === pc.id ? { ...p, status: 'available', studentName: '', studentId: '', duration: '1', endTime: null } : p)
            );
          }
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pcs]);

  // 🎵 Beep Alert එකක් ප්ලේ කරන්න බ්‍රවුසර් එකේම සවුන්ඩ් සිස්ටම් එක පාවිච්චි කරන ශ්‍රිතය
  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // Sound Frequency
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4); // තත්පර 0.4ක් ප්ලේ වෙයි
    } catch (e) {
      console.log("Audio alert error: ", e);
    }
  };

  const availableCount = pcs.filter(pc => pc.status === 'available').length;
  const occupiedCount = pcs.filter(pc => pc.status === 'occupied').length;
  const maintenanceCount = pcs.filter(pc => pc.status === 'maintenance').length;
  const totalPcs = pcs.length;

  // 📊 Analytics Bars සඳහා ප්‍රතිශත (Percentages) හැදීම
  const availPercent = (availableCount / totalPcs) * 100;
  const occupPercent = (occupiedCount / totalPcs) * 100;
  const maintPercent = (maintenanceCount / totalPcs) * 100;

  const handlePcClick = (pc) => {
    setSelectedPc(pc);
    setStudentNameInput(pc.studentName || '');
    setStudentIdInput(pc.studentId || '');
    setDurationInput(pc.duration || '1');
    setStatusInput(pc.status);
    setPinInput('');
    setIsVerified(pc.status === 'available');
    setIsModalOpen(true);
  };

  const handleVerifyPin = () => {
    if (pinInput === INSTRUCTOR_PIN) {
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
        alert('Please enter or scan Student ID!');
        return;
      }
    }

    const durationInMs = parseFloat(durationInput) * 60 * 60 * 1000;
    const endTime = statusInput === 'occupied' ? Date.now() + durationInMs : null;

    setPcs(pcs.map(pc => 
      pc.id === selectedPc.id 
        ? { ...pc, status: statusInput, studentName: statusInput === 'occupied' ? studentNameInput : '', studentId: statusInput === 'occupied' ? studentIdInput : '', duration: durationInput, endTime: endTime }
        : pc
    ));

    setIsModalOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirmBooking();
  };

  // ⏱️ ඉතිරි වෙලාව බලාගන්න සහ Alert එක ළඟදී Blink කරන්න හදපු ශ්‍රිතය
  const renderTimeLeft = (endTime) => {
    if (!endTime) return null;
    const totalSeconds = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // වෙලාව ඉවර වෙන්න තත්පර 10ක් හෝ ඊට අඩු නම් රතු පාටින් බ්ලින්ක් වෙනවා
    const isUrgent = totalSeconds <= 10;

    return (
      <span style={{ 
        fontSize: '11px', 
        color: isUrgent ? '#e74c3c' : '#7f8c8d', 
        marginTop: '3px', 
        fontWeight: 'bold',
        animation: isUrgent ? 'blinker 1s linear infinite' : 'none'
      }}>
        ⏳ {String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}
      </span>
    );
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', backgroundColor: '#f4f6f9', minHeight: '100vh', textAlign: 'center' }}>
      
      {/* CSS Animation for Blinking Alert */}
      <style>{`
        @keyframes blinker {
          50% { opacity: 0; }
        }
      `}</style>

      <h1>Aurex Computer Lab Dashboard</h1>
      <p>Advanced Management, Real-time Analytics & Audio Alerts</p>

      {/* 📊 Section 1: Lab Analytics Dashboard */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', maxWidth: '1000px', margin: '0 auto 30px auto', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', textAlign: 'left' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📊 Lab Resource Utilization Analytics</h4>
        
        {/* Progress Bar Component */}
        <div style={{ display: 'flex', height: '24px', borderRadius: '5px', overflow: 'hidden', backgroundColor: '#eee', marginBottom: '15px' }}>
          <div style={{ width: `${availPercent}%`, backgroundColor: '#2ecc71', transition: '0.5s' }}></div>
          <div style={{ width: `${occupPercent}%`, backgroundColor: '#e74c3c', transition: '0.5s' }}></div>
          <div style={{ width: `${maintPercent}%`, backgroundColor: '#f39c12', transition: '0.5s' }}></div>
        </div>

        {/* Counters & Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>🟢 <span style={{ fontWeight: 'bold' }}>Available:</span> {availableCount} Pcs ({availPercent.toFixed(0)}%)</div>
          <div>🔴 <span style={{ fontWeight: 'bold' }}>In Use:</span> {occupiedCount} Pcs ({occupPercent.toFixed(0)}%)</div>
          <div>🟠 <span style={{ fontWeight: 'bold' }}>Broken/Maintenance:</span> {maintenanceCount} Pcs ({maintPercent.toFixed(0)}%)</div>
        </div>
      </div>

      {/* 💻 Section 2: PC Grid Items */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        {pcs.map(pc => (
          <div 
            key={pc.id} 
            onClick={() => handlePcClick(pc)}
            style={{
              backgroundColor: 'white',
              border: '2px solid #ddd',
              borderTop: `8px solid ${pc.status === 'available' ? '#2ecc71' : pc.status === 'occupied' ? '#e74c3c' : '#f39c12'}`,
              borderRadius: '8px',
              padding: '15px 10px',
              cursor: 'pointer',
              transition: '0.2s'
            }}
          >
            <div style={{ fontSize: '24px' }}>{pc.status === 'maintenance' ? '🛠️' : '💻'}</div>
            <div style={{ fontWeight: 'bold', margin: '5px 0' }}>{pc.name}</div>
            
            <div style={{ fontSize: '12px', color: '#7f8c8d', minHeight: '34px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              {pc.status === 'maintenance' && 'Broken'}
              {pc.status === 'available' && 'Available'}
              {pc.status === 'occupied' && (
                <>
                  <span style={{ fontWeight: '500', color: '#333', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pc.studentName}</span>
                  {renderTimeLeft(pc.endTime)}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 🔒 Section 3: Pop-up Settings (Modal Box) */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '320px', textAlign: 'left' }}>
            
            {!isVerified ? (
              <div>
                <h3 style={{ marginTop: 0, color: '#e74c3c' }}>🔒 Instructor Verification</h3>
                <p style={{ fontSize: '14px', color: '#666' }}>Please enter Instructor PIN to unlock and edit details.</p>
                <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="Enter PIN (Default: 1234)" style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', textAlign: 'center', fontSize: '18px' }} onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()} />
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => setIsModalOpen(false)} style={{ background: '#bdc3c7', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', marginRight: '10px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleVerifyPin} style={{ background: '#3498db', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Unlock</button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ marginTop: 0 }}>Manage {selectedPc?.name}</h3>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>PC Status:</label>
                <select value={statusInput} onChange={(e) => setStatusInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc' }}>
                  <option value="available">Available (Release)</option>
                  <option value="occupied">In Use (Assign/Edit)</option>
                  <option value="maintenance">Broken / Maintenance</option>
                </select>

                {statusInput === 'occupied' && (
                  <>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Student Name:</label>
                    <input type="text" value={studentNameInput} onChange={(e) => setStudentNameInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} onKeyDown={handleKeyDown} />

                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Student ID / Barcode:</label>
                    <input type="text" value={studentIdInput} onChange={(e) => setStudentIdInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} onKeyDown={handleKeyDown} autoFocus />

                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Duration:</label>
                    <select value={durationInput} onChange={(e) => setDurationInput(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '20px', borderRadius: '5px', border: '1px solid #ccc' }}>
                      <option value="0.00416">15 Seconds (Quick Test)</option>
                      <option value="0.0166">1 Minute (Test)</option>
                      <option value="1">1 Hour</option>
                      <option value="2">2 Hours</option>
                    </select>
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
    </div>
  );
}

export default App;