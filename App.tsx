import React, { useState, useEffect, useRef } from 'react';
import { generateDummyPersonnel, LOCATIONS, TIME_SLOTS, LATE_START_LOCATIONS, LATE_START_SLOT_INDEX } from './constants';
import { Person, ShiftAssignment, PersonnelHistory, LocationId } from './types';
import { formatDateForInput, formatDisplayDate, isPersonAvailable, sortPersonnelByPriority, checkAssignmentValidity } from './utils';
import { PersonnelManager } from './components/PersonnelManager';
import { ScheduleGrid } from './components/ScheduleGrid';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  // State
  const [currentDate, setCurrentDate] = useState<string>(formatDateForInput(new Date()));
  const [personnel, setPersonnel] = useState<Person[]>([]);
  const [schedule, setSchedule] = useState<Record<string, ShiftAssignment[]>>({}); // Key: Date
  const [history, setHistory] = useState<PersonnelHistory>({});
  const [showManager, setShowManager] = useState(false);
  
  // Drag State
  const [draggingPersonId, setDraggingPersonId] = useState<string | null>(null);

  // Initialize Data
  useEffect(() => {
    // Try to load from local storage
    const savedPersonnel = localStorage.getItem('guard_personnel');
    const savedHistory = localStorage.getItem('guard_history');
    const savedSchedule = localStorage.getItem('guard_schedule');

    if (savedPersonnel) {
      setPersonnel(JSON.parse(savedPersonnel));
    } else {
      setPersonnel(generateDummyPersonnel());
    }

    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedSchedule) setSchedule(JSON.parse(savedSchedule));
  }, []);

  // Persist Data
  useEffect(() => {
    if (personnel.length > 0) localStorage.setItem('guard_personnel', JSON.stringify(personnel));
  }, [personnel]);

  useEffect(() => {
    if (Object.keys(history).length > 0) localStorage.setItem('guard_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
     if (Object.keys(schedule).length > 0) localStorage.setItem('guard_schedule', JSON.stringify(schedule));
  }, [schedule]);


  const getCurrentAssignments = () => schedule[currentDate] || [];

  const handleUpdateAssignment = (newAssignments: ShiftAssignment[]) => {
    setSchedule(prev => ({
      ...prev,
      [currentDate]: newAssignments
    }));
  };

  const handleDrop = (personId: string, loc: LocationId, slotId: number) => {
    const current = getCurrentAssignments();
    
    // Remove if person is already assigned elsewhere in THIS day
    const cleanCurrent = current.filter(a => a.personId !== personId);
    
    // Remove anyone already in the target slot
    const finalAssignments = cleanCurrent.filter(a => !(a.locationId === loc && a.slotId === slotId));
    
    finalAssignments.push({
      personId,
      locationId: loc,
      slotId
    });
    
    handleUpdateAssignment(finalAssignments);
    setDraggingPersonId(null);
  };

  const handleRemoveAssignment = (loc: LocationId, slotId: number) => {
    const current = getCurrentAssignments();
    handleUpdateAssignment(current.filter(a => !(a.locationId === loc && a.slotId === slotId)));
  };
  
  const refreshHistory = () => {
    // Rebuild history from all past schedule entries
    const newHistory: PersonnelHistory = {};
    const dates = Object.keys(schedule).sort(); // Sort chronological
    
    dates.forEach(date => {
        schedule[date].forEach(assign => {
            if (assign.personId) {
                if (!newHistory[assign.personId]) newHistory[assign.personId] = [];
                // Add to history (unshift to keep newest first)
                newHistory[assign.personId].unshift({
                    date: date,
                    locationId: assign.locationId,
                    slotId: assign.slotId
                });
            }
        });
    });
    setHistory(newHistory);
  };

  // Trigger history refresh whenever schedule changes
  useEffect(() => {
      refreshHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule]);


  // Available personnel logic (With Priority Sorting)
  const availablePersonnel = personnel.filter(p => isPersonAvailable(p, currentDate));
  
  // Sort available personnel based on history (Rotation logic)
  const sortedAvailablePersonnel = sortPersonnelByPriority(availablePersonnel, history);

  const assignedPersonIds = new Set(getCurrentAssignments().map(a => a.personId));
  const unassignedPersonnel = sortedAvailablePersonnel.filter(p => !assignedPersonIds.has(p.id));

  // Auto Schedule Logic
  const handleAutoSchedule = () => {
    const currentAssignments = [...getCurrentAssignments()];
    const assignedIds = new Set(currentAssignments.map(a => a.personId));
    
    // Get mutable copy of sorted available personnel excluding those already assigned today
    let pool = sortedAvailablePersonnel.filter(p => !assignedIds.has(p.id));
    
    const newAssignments: ShiftAssignment[] = [];
    let updated = false;

    // Iterate through all slots
    for (const slot of TIME_SLOTS) {
        for (const loc of LOCATIONS) {
             // Check if slot exists (enabled)
            const isDisabled = LATE_START_LOCATIONS.includes(loc) && slot.id < LATE_START_SLOT_INDEX;
            if (isDisabled) continue;

            // Check if already filled
            const isFilled = currentAssignments.some(a => a.locationId === loc && a.slotId === slot.id);
            if (isFilled) continue;

            // Find first valid person from pool (Greedy approach with sorted priority)
            const candidateIndex = pool.findIndex(p => {
                const { valid } = checkAssignmentValidity(history[p.id], loc, slot.id);
                return valid;
            });

            if (candidateIndex !== -1) {
                const candidate = pool[candidateIndex];
                
                // Assign
                newAssignments.push({
                    locationId: loc,
                    slotId: slot.id,
                    personId: candidate.id
                });

                // Remove from pool so they don't get assigned again today
                pool.splice(candidateIndex, 1);
                updated = true;
            }
        }
    }

    if (updated) {
        handleUpdateAssignment([...currentAssignments, ...newAssignments]);
    } else {
        alert("Không thể xếp thêm lịch. Có thể do hết người hoặc không ai thỏa mãn điều kiện lịch sử.");
    }
  };


  // Export Logic
  const exportRef = useRef<HTMLDivElement>(null);
  const handleExport = async () => {
    if (exportRef.current) {
      try {
        const canvas = await html2canvas(exportRef.current, {
            scale: 2, // High resolution
            useCORS: true,
            backgroundColor: '#ffffff'
        });
        const link = document.createElement('a');
        link.download = `Lich-Gac-${currentDate}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error("Export failed", err);
        alert("Có lỗi khi xuất ảnh. Vui lòng thử lại.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">Phân Công Ca Gác</h1>
            <p className="text-xs text-gray-500 mt-1">Hệ thống quản lý tự động</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
          <button 
             onClick={() => {
                 const d = new Date(currentDate);
                 d.setDate(d.getDate() - 1);
                 setCurrentDate(formatDateForInput(d));
             }}
             className="p-1 hover:bg-white rounded shadow-sm text-gray-600 transition"
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <input 
            type="date" 
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm font-semibold text-gray-700 outline-none"
          />
           <button 
             onClick={() => {
                 const d = new Date(currentDate);
                 d.setDate(d.getDate() + 1);
                 setCurrentDate(formatDateForInput(d));
             }}
             className="p-1 hover:bg-white rounded shadow-sm text-gray-600 transition"
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleAutoSchedule}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors shadow-sm flex items-center gap-2"
            title="Tự động điền vào các ô trống dựa trên quy tắc"
          >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             Tự động xếp
          </button>
          <button 
            onClick={() => setShowManager(true)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors flex items-center gap-2"
          >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
             Quản lý Quân số
          </button>
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Xuất File Ảnh
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Schedule Board */}
        <div className="flex-1 p-6 overflow-auto bg-gray-100/50">
            <div ref={exportRef} className="bg-white p-8 rounded-xl shadow-lg max-w-5xl mx-auto">
                <div className="mb-6 text-center border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">Lịch Phân Công Ca Gác</h2>
                    <p className="text-gray-500 mt-1">{formatDisplayDate(currentDate)}</p>
                </div>
                <ScheduleGrid 
                    assignments={getCurrentAssignments()}
                    personnel={personnel}
                    history={history}
                    draggingPersonId={draggingPersonId}
                    onDrop={handleDrop}
                    onRemove={handleRemoveAssignment}
                />
                <div className="mt-4 text-xs text-gray-400 italic text-right">
                    Được xuất từ Hệ thống Phân công Ca gác
                </div>
            </div>
        </div>

        {/* Right: Sidebar */}
        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Danh sách chờ ({unassignedPersonnel.length})
                <span className="ml-auto text-xs text-gray-400 font-normal" title="Ưu tiên người chưa gác > người gác lâu nhất">
                   (Ưu tiên)
                </span>
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {unassignedPersonnel.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                    Đã phân công hết nhân sự khả dụng.
                </div>
            ) : (
                unassignedPersonnel.map(p => {
                    const lastDate = history[p.id]?.[0]?.date;
                    return (
                        <div
                            key={p.id}
                            draggable
                            onDragStart={(e) => {
                                setDraggingPersonId(p.id);
                                e.dataTransfer.setData('text/personId', p.id);
                                e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => setDraggingPersonId(null)}
                            className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-400 cursor-grab active:cursor-grabbing transition-all flex items-center gap-3 group"
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${lastDate ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-600'}`}>
                                {p.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 text-sm group-hover:text-blue-700 truncate">{p.name}</p>
                                <p className="text-[10px] text-gray-400">
                                    {lastDate ? `Gác lần cuối: ${lastDate}` : 'Chưa gác bao giờ'}
                                </p>
                            </div>
                        </div>
                    );
                })
            )}
          </div>
        </aside>
      </main>

      {/* Modals */}
      {showManager && (
        <PersonnelManager 
          personnel={personnel}
          updatePerson={(updated) => {
            setPersonnel(prev => prev.map(p => p.id === updated.id ? updated : p));
          }}
          onReplaceList={(newList) => {
            // When list is replaced, we should clear current assignments that reference old IDs to avoid errors
            // And potentially clear history or map it? For now, clean slate for safety.
            setPersonnel(newList);
            setSchedule({}); // Clear all schedules as IDs are invalidated
            setHistory({}); // Clear history as IDs are invalidated
            alert("Đã cập nhật danh sách! Lịch gác và lịch sử cũ đã được xóa do thay đổi nhân sự.");
          }}
          onClose={() => setShowManager(false)}
        />
      )}
    </div>
  );
};

export default App;