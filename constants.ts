import { LocationId, TimeSlot } from './types';

export const TIME_SLOTS: TimeSlot[] = [
  { id: 1, label: 'Ca 1', startTime: '18:30', endTime: '20:00' },
  { id: 2, label: 'Ca 2', startTime: '20:00', endTime: '21:30' },
  { id: 3, label: 'Ca 3', startTime: '21:30', endTime: '23:00' },
  { id: 4, label: 'Ca 4', startTime: '23:00', endTime: '00:00' },
  { id: 5, label: 'Ca 5', startTime: '00:00', endTime: '01:00' },
  { id: 6, label: 'Ca 6', startTime: '01:00', endTime: '02:00' },
  { id: 7, label: 'Ca 7', startTime: '02:00', endTime: '03:00' },
  { id: 8, label: 'Ca 8', startTime: '03:00', endTime: '04:00' },
  { id: 9, label: 'Ca 9', startTime: '04:00', endTime: '05:30' },
];

export const LOCATIONS = [
  LocationId.V61,
  LocationId.V62,
  LocationId.DN1,
  LocationId.DN3,
];

// Locations that start late (from Ca 3/22:00 roughly, mapping to Slot 3 based on logic)
// Requirement: "DN1 & DN3 start from 22h00". 
// Slot 2 ends at 21:30. Slot 3 starts 21:30. 
// We will disable Slot 1 and Slot 2 for these locations.
export const LATE_START_LOCATIONS = [LocationId.DN1, LocationId.DN3];
export const LATE_START_SLOT_INDEX = 3; // 1-based index (Ca 3)

// Generate 123 dummy Vietnamese names
const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const MIDDLE_NAMES = ['Văn', 'Thị', 'Hữu', 'Đức', 'Thành', 'Công', 'Minh', 'Ngọc', 'Xuân', 'Thu', 'Đình', 'Bảo'];
const FIRST_NAMES = ['Anh', 'Bình', 'Châu', 'Dũng', 'Em', 'Giang', 'Hà', 'Hải', 'Hiếu', 'Hòa', 'Huy', 'Khánh', 'Lan', 'Long', 'Minh', 'Nam', 'Nghĩa', 'Phong', 'Phúc', 'Quân', 'Quang', 'Sơn', 'Thái', 'Thắng', 'Thanh', 'Thảo', 'Thịnh', 'Trung', 'Tuấn', 'Tùng', 'Việt', 'Vinh', 'Uyên', 'Yến'];

export const generateDummyPersonnel = () => {
  const people = [];
  for (let i = 1; i <= 123; i++) {
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const mid = MIDDLE_NAMES[Math.floor(Math.random() * MIDDLE_NAMES.length)];
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    people.push({
      id: `p-${i}`,
      name: `${last} ${mid} ${first} (${i})`,
      isExempt: false,
      exemptUntil: null,
    });
  }
  return people;
};