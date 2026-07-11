import React, { useState } from 'react';

function App() {
  const [pcs, setPcs] = useState(
    Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      name: `PC - ${String(i + 1).padStart(2, '0')}`,
      status: 'available', // available, occupied, maintenance
      studentName: '',
      studentId: '', // අලුතින් එකතු කල Student ID එක
      duration: '1'
    }))
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPc, setSelectedPc] = useState(null);
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentIdInput, setStudentIdInput] = useState(''); // ID Input State
  const [durationInput, setDurationInput] = useState('1');
  const [statusInput, setStatusInput] = useState('available');

  const availableCount = pcs.filter(pc => pc.status === 'available').length;
  const occupiedCount = pcs.filter(pc => pc.status === 'occupied').length;
  const maintenanceCount = pcs.filter(pc => pc.status === 'maintenance').length;

  const handlePcClick = (pc) => {
    setSelectedPc(pc);
    setStudentNameInput(pc.studentName || '');
    setStudentIdInput(pc.studentId || '');
    setDurationInput(pc.duration || '1');
    setStatusInput(pc.status);
    setIsModalOpen(true);
  };

  const handleConfirmBooking = () => {
    if (statusInput === 'occupied') {
      if (studentNameInput.trim() === '') {
        alert('Please enter student name!');
        return;
      }
      if (studentIdInput.trim() === '') {
        alert('Please enter or scan Student ID/Barcode!');
        return;
      }
    }

    setPcs(pcs.map(pc => 
      pc.id === selectedPc.id 
        ? { 
            ...pc, 
            status: statusInput, 
            studentName: statusInput === 'occupied' ? studentNameInput : '', 
            studentId: statusInput === 'occupied' ? studentIdInput : '', 
            duration: statusInput === 'occupied' ? durationInput : '1' 
          }
        : pc
    ));

    setIsModalOpen(false);
  };

  // Barcode එකක් ස්කෑන් කරලා හෝ ID එක ගහලා Enter ඔබපු ගමන්ම Save වෙන්න හදපු Function එක
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleConfirmBooking();
    }
  };

  const getStatusColor = (status) => {
    if (status === 'available') return '#2ecc71';
    if (status === 'occupied') return '#e74c3c';
    return '#f39c12';
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', backgroundColor: '#f4f6f9', minHeight: '100vh', textAlign: 'center' }}>
      <h1>Aurex Computer Lab Dashboard</h1>
      <p>Real-time Lab Seating, Student ID & Maintenance Management</p>

      {/* Counters */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ backgroundColor: '#2ecc71', color: 'white', padding: '10px 20px', borderRadius: '5px', fontWeight: 'bold' }}>
          Available: {availableCount}
        </span>
        <span style={{ backgroundColor: '#e74c3c', color: 'white', padding: '10px 20px', borderRadius: '5px', fontWeight: 'bold' }}>
          In Use: {occupiedCount}
        </span>
        <span style={{ backgroundColor: '#f39c12', color: 'white', padding: '10px 20px', borderRadius: '5px', fontWeight: 'bold' }}>
          Broken/Maintenance: {maintenanceCount}
        </span>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        {pcs.map(pc => (
          <div 
            key={pc.id} 
            onClick={() => handlePcClick(pc)}
            style={{
              backgroundColor: 'white',
              border: '2px solid #ddd',
              borderTop: `8px solid ${getStatusColor(pc.status)}`,
              borderRadius: '8px',
              padding: '20px',
              cursor: 'pointer',
              transition: '0.2s'
            }}
          >
            <div style={{ fontSize: '24px' }}>
              {pc.status === 'maintenance' ? '🛠️' : '💻'}
            </div>
            <div style={{ fontWeight: 'bold', margin: '5px 0' }}>{pc.name}</div>
            <div style={{ fontSize: '12px', color: '#7f8c8d', textTransform: 'capitalize' }}>
              {pc.status === 'maintenance' 
                ? 'Broken' 
                : pc.status === 'occupied' 
                  ? `${pc.studentName} (${pc.studentId})` // මෙතන දැන් ID එකත් පේනවා
                  : 'Available'}
            </div>
          </div>
        ))}
      </div>

      {/* Modal / Popup Box */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '320px', textAlign: 'left' }}>
            <h3 style={{ marginTop: 0 }}>Manage {selectedPc?.name}</h3>
            
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>PC Status:</label>
            <select 
              value={statusInput} 
              onChange={(e) => setStatusInput(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc' }}
            >
              <option value="available">Available (Good Condition)</option>
              <option value="occupied">In Use (Assign to Student)</option>
              <option value="maintenance">Broken / Under Maintenance</option>
            </select>

            {statusInput === 'occupied' && (
              <>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Student Name:</label>
                <input 
                  type="text" 
                  value={studentNameInput}
                  onChange={(e) => setStudentNameInput(e.target.value)}
                  placeholder="Enter student name" 
                  style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  onKeyDown={handleKeyDown}
                />

                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Student ID / Barcode:</label>
                <input 
                  type="text" 
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  placeholder="Scan Barcode or Enter ID" 
                  style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  onKeyDown={handleKeyDown} // Enter ඔබපු ගමන්ම සේව් වෙන්න
                  autoFocus // බොක්ස් එක ඕපන් වුන ගමන් බාර්කෝඩ් එක ස්කෑන් කරන්න ලේසි වෙන්න
                />

                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Duration:</label>
                <select 
                  value={durationInput} 
                  onChange={(e) => setDurationInput(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginBottom: '20px', borderRadius: '5px', border: '1px solid #ccc' }}
                >
                  <option value="1">1 Hour</option>
                  <option value="2">2 Hours</option>
                  <option value="3">3 Hours</option>
                </select>
              </>
            )}

            <div style={{ textAlign: 'right', marginTop: '10px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ background: '#bdc3c7', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', marginRight: '10px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirmBooking} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;