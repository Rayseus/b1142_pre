import { nameByRace } from 'fantasy-name-generator';

// Define races that require a gender parameter
const racesRequiringGender = new Set([
  'angel',
  'cavePerson',
  'darkelf',
  'dragon',
  'drow',
  'dwarf',
  'elf',
  'fairy',
  'gnome',
  'halfdemon',
  'halfling',
  'highelf',
  'highfairy'
]);

// Define races that allow multiple names (if you want to generate multiple parts)
const racesAllowMultipleNames = new Set([
  'human'
]);

const allRaces = [
  'angel', 'cavePerson', 'darkelf', 'demon', 'dragon', 'drow', 'dwarf', 'elf',
  'fairy', 'gnome', 'goblin', 'halfdemon', 'halfling', 'highelf', 'highfairy',
  'human', 'ogre', 'orc'
];

const getRandomRace = () => {
  return allRaces[Math.floor(Math.random() * allRaces.length)];
};

const getRandomGender = () => (Math.random() < 0.5 ? 'male' : 'female');

export const generateName = (type = '') => {
  const race = getRandomRace();
  const needsGender = racesRequiringGender.has(race);
  const allowMultiple = racesAllowMultipleNames.has(race);

  const options = {};
  if (needsGender) {
    options.gender = getRandomGender();
  }
  if (allowMultiple) {
    options.allowMultipleNames = true;
  }

  let baseName = nameByRace(race, options);

  // If allowMultipleNames is true, nameByRace may return an array of names, so join them:
  if (Array.isArray(baseName)) {
    baseName = baseName.join(' ');
  }

  switch (type) {
    case 'lake':
      return `${baseName} Lake`;
    case 'river':
      return `${baseName} River`;
    case 'mountain_range':
      return `${baseName} Mountains`;
    case 'sea':
      return `${baseName} Sea`;
    default:
      return baseName;
  }
};
