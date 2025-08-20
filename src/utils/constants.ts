export interface TalentType {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export interface TalentTypeGroup {
  group: string;
  types: TalentType[];
}

export const INSTRUMENT_TYPE_GROUPS: TalentTypeGroup[] = [
  {
    group: 'Strings',
    types: [
      { id: 'guitar', name: 'Guitar', icon: '🎸', description: 'Acoustic, electric, and world guitars' },
      { id: 'violin', name: 'Violin', icon: '🎻', description: 'Classical and folk violin' },
      { id: 'cello', name: 'Cello', icon: '🎻', description: 'Classical cello' },
      { id: 'double_bass', name: 'Double Bass', icon: '🎻', description: 'Orchestral and jazz bass' },
      { id: 'sitar', name: 'Sitar', icon: '🎼', description: 'Indian sitar' },
      { id: 'oud', name: 'Oud', icon: '🪕', description: 'Middle Eastern oud' },
      { id: 'koto', name: 'Koto', icon: '🎼', description: 'Japanese koto' },
      { id: 'erhu', name: 'Erhu', icon: '🎼', description: 'Chinese erhu' },
      { id: 'banjo', name: 'Banjo', icon: '🪕', description: 'Bluegrass banjo' },
      { id: 'shamisen', name: 'Shamisen', icon: '🎼', description: 'Japanese shamisen' },
      { id: 'harp', name: 'Harp', icon: '🎼', description: 'Orchestral and folk harp' },
      { id: 'balalaika', name: 'Balalaika', icon: '🎼', description: 'Russian balalaika' },
      { id: 'gayageum', name: 'Gayageum', icon: '🎼', description: 'Korean gayageum' },
      { id: 'other_string', name: 'Other String', icon: '🎼', description: 'Other string instrument' },
    ],
  },
  {
    group: 'Percussion',
    types: [
      { id: 'drums', name: 'Drums', icon: '🥁', description: 'Drum kit and world drums' },
      { id: 'djembe', name: 'Djembe', icon: '🥁', description: 'African djembe' },
      { id: 'tabla', name: 'Tabla', icon: '🥁', description: 'Indian tabla' },
      { id: 'cajon', name: 'Cajón', icon: '🥁', description: 'Latin cajón' },
      { id: 'bongos', name: 'Bongos', icon: '🥁', description: 'Latin bongos' },
      { id: 'congas', name: 'Congas', icon: '🥁', description: 'Latin congas' },
      { id: 'taiko', name: 'Taiko', icon: '🥁', description: 'Japanese taiko' },
      { id: 'marimba', name: 'Marimba', icon: '🎼', description: 'Orchestral marimba' },
      { id: 'steelpan', name: 'Steelpan', icon: '🎼', description: 'Caribbean steelpan' },
      { id: 'other_percussion', name: 'Other Percussion', icon: '🥁', description: 'Other percussion instrument' },
    ],
  },
  {
    group: 'Wind',
    types: [
      { id: 'flute', name: 'Flute', icon: '🎶', description: 'Classical and folk flute' },
      { id: 'saxophone', name: 'Saxophone', icon: '🎷', description: 'Jazz and pop saxophone' },
      { id: 'clarinet', name: 'Clarinet', icon: '🎶', description: 'Classical and jazz clarinet' },
      { id: 'oboe', name: 'Oboe', icon: '🎶', description: 'Orchestral oboe' },
      { id: 'didgeridoo', name: 'Didgeridoo', icon: '🎼', description: 'Australian didgeridoo' },
      { id: 'pan_flute', name: 'Pan Flute', icon: '🎼', description: 'Andean pan flute' },
      { id: 'shakuhachi', name: 'Shakuhachi', icon: '🎼', description: 'Japanese shakuhachi' },
      { id: 'bagpipes', name: 'Bagpipes', icon: '🎼', description: 'Scottish bagpipes' },
      { id: 'recorder', name: 'Recorder', icon: '🎶', description: 'Classical recorder' },
      { id: 'other_wind', name: 'Other Wind', icon: '🎶', description: 'Other wind instrument' },
    ],
  },
  {
    group: 'Brass',
    types: [
      { id: 'trumpet', name: 'Trumpet', icon: '🎺', description: 'Orchestral and jazz trumpet' },
      { id: 'trombone', name: 'Trombone', icon: '🎺', description: 'Orchestral and jazz trombone' },
      { id: 'french_horn', name: 'French Horn', icon: '🎺', description: 'Orchestral French horn' },
      { id: 'tuba', name: 'Tuba', icon: '🎺', description: 'Orchestral tuba' },
      { id: 'euphonium', name: 'Euphonium', icon: '🎺', description: 'Brass band euphonium' },
      { id: 'other_brass', name: 'Other Brass', icon: '🎺', description: 'Other brass instrument' },
    ],
  },
  {
    group: 'Electronic',
    types: [
      { id: 'synthesizer', name: 'Synthesizer', icon: '🎹', description: 'Electronic synthesizer' },
      { id: 'dj', name: 'DJ Equipment', icon: '🎛️', description: 'Turntables and controllers' },
      { id: 'sampler', name: 'Sampler', icon: '🎛️', description: 'Digital audio sampler' },
      { id: 'theremin', name: 'Theremin', icon: '🎼', description: 'Electronic theremin' },
      { id: 'drum_machine', name: 'Drum Machine', icon: '🎼', description: 'Electronic drum machine' },
      { id: 'other_electronic', name: 'Other Electronic', icon: '🎛️', description: 'Other electronic instrument' },
    ],
  },
  {
    group: 'Keyboard',
    types: [
      { id: 'piano', name: 'Piano', icon: '🎹', description: 'Classical and contemporary piano' },
      { id: 'organ', name: 'Organ', icon: '🎹', description: 'Pipe and electric organ' },
      { id: 'accordion', name: 'Accordion', icon: '🎹', description: 'Folk and classical accordion' },
      { id: 'celesta', name: 'Celesta', icon: '🎼', description: 'Orchestral celesta' },
      { id: 'harpsichord', name: 'Harpsichord', icon: '🎼', description: 'Baroque harpsichord' },
      { id: 'other_keyboard', name: 'Other Keyboard', icon: '🎹', description: 'Other keyboard instrument' },
    ],
  },
  {
    group: 'Traditional & Other',
    types: [
      { id: 'kalimba', name: 'Kalimba', icon: '🎼', description: 'African kalimba' },
      { id: 'santoor', name: 'Santoor', icon: '🎼', description: 'Indian santoor' },
      { id: 'baglama', name: 'Baglama', icon: '🎼', description: 'Turkish baglama' },
      { id: 'charango', name: 'Charango', icon: '🎼', description: 'Andean charango' },
      { id: 'guqin', name: 'Guqin', icon: '🎼', description: 'Chinese guqin' },
      { id: 'sarangi', name: 'Sarangi', icon: '🎼', description: 'Indian sarangi' },
      { id: 'other_traditional', name: 'Other Traditional', icon: '🎼', description: 'Other traditional instrument' },
    ],
  },
  {
    group: 'Other',
    types: [
      { id: 'other', name: 'Other (Type your instrument)', icon: '➕', description: 'Custom instrument' },
    ],
  },
];

export const SINGING_TYPE_GROUPS: TalentTypeGroup[] = [
  {
    group: 'Classical',
    types: [
      { id: 'opera', name: 'Opera', icon: '🎭', description: 'Classical operatic singing' },
      { id: 'classical_soprano', name: 'Classical Soprano', icon: '🎭', description: 'High classical voice' },
      { id: 'classical_alto', name: 'Classical Alto', icon: '🎭', description: 'Low classical voice' },
      { id: 'classical_tenor', name: 'Classical Tenor', icon: '🎭', description: 'High male classical voice' },
      { id: 'classical_bass', name: 'Classical Bass', icon: '🎭', description: 'Low male classical voice' },
      { id: 'chanting', name: 'Chanting', icon: '🎶', description: 'Choral and religious chanting' },
      { id: 'other_classical', name: 'Other Classical', icon: '🎭', description: 'Other classical style' },
    ],
  },
  {
    group: 'Contemporary',
    types: [
      { id: 'pop', name: 'Pop', icon: '🎤', description: 'Contemporary pop style' },
      { id: 'rock', name: 'Rock', icon: '🎸', description: 'Rock vocal style' },
      { id: 'jazz', name: 'Jazz', icon: '🎷', description: 'Jazz vocal style' },
      { id: 'blues', name: 'Blues', icon: '🎸', description: 'Blues vocal style' },
      { id: 'soul', name: 'Soul', icon: '🎤', description: 'Soul and R&B style' },
      { id: 'folk', name: 'Folk', icon: '🎸', description: 'Folk and world folk' },
      { id: 'rap', name: 'Rap', icon: '🎤', description: 'Rap and hip-hop' },
      { id: 'gospel', name: 'Gospel', icon: '🎶', description: 'Gospel and spiritual' },
      { id: 'rnb', name: 'R&B', icon: '🎤', description: 'Rhythm and blues' },
      { id: 'country', name: 'Country', icon: '🎸', description: 'Country vocal style' },
      { id: 'reggae', name: 'Reggae', icon: '🎶', description: 'Reggae vocal style' },
      { id: 'metal', name: 'Metal', icon: '🎸', description: 'Metal vocal style' },
      { id: 'other_contemporary', name: 'Other Contemporary', icon: '🎤', description: 'Other contemporary style' },
    ],
  },
  {
    group: 'World & Traditional',
    types: [
      { id: 'throat_singing', name: 'Throat Singing', icon: '🎶', description: 'Tuvan and Mongolian throat singing' },
      { id: 'carnatic', name: 'Carnatic', icon: '🎶', description: 'South Indian classical' },
      { id: 'hindustani', name: 'Hindustani', icon: '🎶', description: 'North Indian classical' },
      { id: 'other_world', name: 'Other World/Traditional', icon: '🎶', description: 'Other world or traditional style' },
    ],
  },
  {
    group: 'Other',
    types: [
      { id: 'other', name: 'Other (Type your style)', icon: '➕', description: 'Custom singing style' },
    ],
  },
]; 