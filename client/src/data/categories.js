/**
 * Shared Category & Subcategory Registry (Client ESM)
 * Resource Sharing Platform — Part 18
 */

export const CATEGORY_REGISTRY = {
  'Student Essentials': {
    label: 'Student Essentials',
    description: 'Everyday campus essentials, carrying gear, stationery, and utility tools for students.',
    icon: 'Backpack',
    hasAcademicFields: false,
    subcategories: [
      'Watches',
      'Water Bottles',
      'Bags & Backpacks',
      'Umbrellas and Raincoats',
      'Calculators',
      'Stationery',
      'Lunch Boxes',
      'Notebooks and Registers',
      'Folders and Files',
      'Pens, Pencils & Stationery',
      'Other Essentials',
    ],
  },
  'Books & Study Materials': {
    label: 'Books & Study Materials',
    description: 'Textbooks, reference books, semester notes, lab manuals, and previous-year papers.',
    icon: 'BookOpen',
    hasAcademicFields: true,
    subcategories: [
      'Engineering Textbooks',
      'School Books',
      'Competitive Exam Books',
      'Reference Books',
      'Previous Semester Books',
      'Old and Second-Hand Books',
      'Lab Manuals',
      'Subject-Wise Handwritten Notes',
      'Printed Notes and Assignments',
      'Previous-Year Question Papers',
      'Practical Files',
      'Drawing Sheets and Project Files',
      'Subject-Specific Books',
      'Other Books & Notes',
    ],
  },
  'Design, Drawing & Architecture': {
    label: 'Design, Drawing & Architecture',
    description: 'Engineering drafters, drawing instruments, sketchbooks, boards, and modeling supplies.',
    icon: 'Compass',
    hasAcademicFields: true,
    subcategories: [
      'Drafters and Drafting Tools',
      'Engineering Drawing Instruments',
      'Geometry Boxes',
      'Rulers and Set Squares',
      'Technical Drawing Boards',
      'Sketchbooks',
      'Drawing Pencils and Markers',
      'Color Sets',
      'Graphic Design Accessories',
      'Drawing Tablets',
      'Other Design Supplies',
    ],
  },
  'Gadgets & Accessories': {
    label: 'Gadgets & Accessories',
    description: 'Peripherals, audio devices, chargers, adapters, and digital connectivity accessories.',
    icon: 'Headphones',
    hasAcademicFields: false,
    subcategories: [
      'Headphones',
      'Computer Mice and Keyboards',
      'Chargers and Adapters',
      'USB Drives',
      'Keyboards & Mice',
      'Headphones & Earphones',
      'Computer and Device Accessories',
      'Other Gadgets',
    ],
  },
  Laboratories: {
    label: 'Laboratories',
    description: 'Specialized lab apparatus, spectrophotometers, analytical equipment, and cleanroom cores.',
    icon: 'FlaskConical',
    hasAcademicFields: false,
    subcategories: ['Analytical Equipment', 'Biomedical Instruments', 'Chemical Synthesis', 'Optical Labs', 'Other Lab Equipment'],
  },
  Computers: {
    label: 'Computers',
    description: 'Workstations, GPU computing rigs, development laptops, and specialized server clusters.',
    icon: 'Cpu',
    hasAcademicFields: false,
    subcategories: ['GPU Compute Rigs', 'Laptops & Workstations', 'Servers & Networking', 'Microcontrollers', 'Other Computers'],
  },
  'Workshop Tools': {
    label: 'Workshop Tools',
    description: 'Fabrication machines, 3D printers, CNC mills, laser cutters, and rapid prototyping tools.',
    icon: 'Wrench',
    hasAcademicFields: false,
    subcategories: ['3D Printers', 'CNC & Milling', 'Laser Cutters', 'Hand & Power Tools', 'Other Tools'],
  },
  Cameras: {
    label: 'Cameras',
    description: 'Professional cinema cameras, DSLRs, prime lenses, audio recorders, and gimbals.',
    icon: 'Camera',
    hasAcademicFields: false,
    subcategories: ['DSLR & Mirrorless', 'Cinema & Video', 'Lenses', 'Audio & Microphones', 'Tripods & Rigs', 'Other Camera Gear'],
  },
  'Meeting Rooms': {
    label: 'Meeting Rooms',
    description: 'Presentation suites, seminar halls, team huddle spaces, and video conference facilities.',
    icon: 'Users',
    hasAcademicFields: false,
    subcategories: ['Conference Rooms', 'Huddle Rooms', 'Seminar Halls', 'Presentation Rooms'],
  },
  'Testing Equipment': {
    label: 'Testing Equipment',
    description: 'Oscilloscopes, spectrum analyzers, multimeters, environmental test chambers, and sensors.',
    icon: 'Gauge',
    hasAcademicFields: false,
    subcategories: ['Oscilloscopes', 'Spectrum Analyzers', 'Multimeters', 'Material Testing', 'Other Testing Gear'],
  },
  Electronics: {
    label: 'Electronics',
    description: 'Circuit development, soldering stations, embedded boards, FPGA kits, and test benches.',
    icon: 'Zap',
    hasAcademicFields: false,
    subcategories: ['Arduino & ESP Kits', 'Raspberry Pi & SBCs', 'Soldering Stations', 'Components & Breadboards', 'Other Electronics'],
  },
  'Lab Equipment': {
    label: 'Lab Equipment',
    description: 'Benchtop instruments, centrifuges, stirrers, pipettes, and general lab hardware.',
    icon: 'Microscope',
    hasAcademicFields: false,
    subcategories: ['Centrifuges', 'Microscopes', 'Thermal Cyclers', 'General Labware', 'Other Lab Equipment'],
  },
  'Study Spaces': {
    label: 'Study Spaces',
    description: 'Individual study carrels, silent reading cubicles, and group discussion hubs.',
    icon: 'Library',
    hasAcademicFields: false,
    subcategories: ['Quiet Study Desks', 'Group Study Booths', 'Library Carrels'],
  },
  Tools: {
    label: 'Tools',
    description: 'Hand tools, precision screwdrivers, diagnostic toolkits, and maintenance apparatus.',
    icon: 'Hammer',
    hasAcademicFields: false,
    subcategories: ['Hand Toolkits', 'Precision Tools', 'Diagnostic Tools', 'Other Tools'],
  },
  Other: {
    label: 'Other',
    description: 'Miscellaneous academic and institutional resources.',
    icon: 'Box',
    hasAcademicFields: true,
    subcategories: ['General Resource', 'Other'],
  },
};

export const ACADEMIC_BRANCHES = [
  'All Branches',
  'Computer Science & Engineering (CSE)',
  'Information Technology (IT)',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical & Electronics Engineering (EEE)',
  'Electronics & Communication Engineering (ECE)',
  'Chemical Engineering',
  'Biotechnology & Life Sciences',
  'Architecture & Planning',
  'Basic Sciences (Physics / Chemistry / Maths)',
  'Management & Humanities',
  'General / Cross-Disciplinary',
];

export const ACADEMIC_SEMESTERS = [
  'All Semesters',
  '1st Semester (Year 1)',
  '2nd Semester (Year 1)',
  '3rd Semester (Year 2)',
  '4th Semester (Year 2)',
  '5th Semester (Year 3)',
  '6th Semester (Year 3)',
  '7th Semester (Year 4)',
  '8th Semester (Year 4)',
  'Postgraduate / Research',
];

export const ALL_CATEGORIES = [
  'All Categories',
  'Student Essentials',
  'Books & Study Materials',
  'Design, Drawing & Architecture',
  'Gadgets & Accessories',
  'Laboratories',
  'Computers',
  'Workshop Tools',
  'Cameras',
  'Meeting Rooms',
  'Testing Equipment',
  'Electronics',
  'Lab Equipment',
  'Study Spaces',
  'Tools',
  'Other',
];

export const CATEGORIES = ALL_CATEGORIES;

export const CATEGORY_ALIASES = {
  'Engineering Drawing & Design': 'Design, Drawing & Architecture',
  'Design & Drawing': 'Design, Drawing & Architecture',
  'Books & Materials': 'Books & Study Materials',
  'Study Materials': 'Books & Study Materials',
};

export function normalizeCategory(category) {
  if (!category || typeof category !== 'string') return category;
  const trimmed = category.trim();
  return CATEGORY_ALIASES[trimmed] || trimmed;
}

export const LOCATIONS = [
  'All Campuses',
  'Main Academic Campus',
  'North Research Campus',
  'Technology Innovation Hub',
  'Innovation Arts Campus',
];

export function getSubcategoriesForCategory(category) {
  const canonical = normalizeCategory(category);
  const cat = CATEGORY_REGISTRY[canonical];
  return cat ? cat.subcategories : ['General Resource', 'Other'];
}

export function categorySupportsAcademicFields(category) {
  const canonical = normalizeCategory(category);
  const cat = CATEGORY_REGISTRY[canonical];
  return Boolean(cat?.hasAcademicFields);
}

