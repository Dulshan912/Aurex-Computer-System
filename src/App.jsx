import React, { useState} from 'react';

function App() {
  const [pcs, setPcs] = useState(
    Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      name: `PC - ${String(i + 1).padStart(2, '0')}`, 
      status: 'available',
      studentName: '',
      duration: '1',
    }))
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPc, setSelectedPc] = useState(null);
  const [studentNameInput, setStudentNameInput] = useState('');
  const [durationInput, setDurationInput] = useState('1');

  const availableCount = pcs.filter(pc => pc.status === 'available').length;
  const occupiedCount = pcs.filter(pc => pc.status === 'occupied').length;

  const handlePcClick = (pc) => {
    if (pc.status === 'occupied') {
      alert('${pc.name} is currently in use by ${pc.studentName}.');
      return;
    }
    setSelectedPc(pc);
    setIsModalOpen(true);
  };

  const handleConfirmBooking = () => {
    if (studentNameInput.trim() === '') {
      alert('Please enter a student name!');
      return;
    }

    setPcs(pcs.map(pc =>
      pc.id === selectedPc.id
        ? { ...pc, status: 'occupied', studentName: studentNameInput, duration: durationInput }
        : pc
    ));

    setIsModalOpen(false);
    setStudentNameInput('');
    setDurationInput('1');
  };

return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', backgroundColor: '#f4f6f9', minHeight: '100vh', textAlign: 'center' }}>
      <h1>Aurex Computer Lab Dashboard</h1>
      <p>Real-time Lab Seating Arrangement</p>

      <div style={{ marginBottom: '30px' }}>
        <span style={{ backgroundColor: '#2ecc71', color: 'white', padding: '10px 20px', marginRight: '10px', borderRadius: '5px', fontWeight: 'bold' }}>
          Available: {availableCount}
        </span>
        <span style={{ backgroundColor: '#e74c3c', color: 'white', padding: '10px 20px', borderRadius: '5px', fontWeight: 'bold' }}>
          In Use: {occupiedCount}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        {pcs.map(pc => (
          <div 
            key={pc.id} 
            onClick={() => handlePcClick(pc)}
            style={{
              backgroundColor: 'white',
              border: '2px solid #ddd',
              borderTop: `8px solid ${pc.status === 'available' ? '#2ecc71' : '#e74c3c'}`,
              borderRadius: '8px',
              padding: '20px',
              cursor: 'pointer',
              transition: '0.2s'
            }}
          >
            <div style={{ fontSize: '24px' }}>💻</div>
            <div style={{ fontWeight: 'bold', margin: '5px 0' }}>{pc.name}</div>
            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
              {pc.status === 'available' ? 'Available' : 'In Use'}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '320px', textAlign: 'left' }}>
            <h3 style={{ marginTop: 0 }}>Book {selectedPc?.name}</h3>
            
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Student Name:</label>
            <input 
              type="text" 
              value={studentNameInput}
              onChange={(e) => setStudentNameInput(e.target.value)}
              placeholder="Enter student name" 
              style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
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

            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ background: '#bdc3c7', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', marginRight: '10px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirmBooking} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
