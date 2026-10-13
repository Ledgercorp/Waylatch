/** Fictional labeled examples, authored before running the model. Not emergency field data. */
export const BENCHMARK_PAIRS = [
  {
    id: 'water-paraphrase',
    duplicate: true,
    left: 'Twenty cases of bottled drinking water for the flood shelter',
    right: '20 cartons of bottled water for people staying at the flood evacuation shelter',
  },
  {
    id: 'battery-paraphrase',
    duplicate: true,
    left: 'AA batteries for responder headlamps during shelter night shifts',
    right: 'Double A replacement batteries for emergency team head torches at night',
  },
  {
    id: 'medical-paraphrase',
    duplicate: true,
    left: 'First aid kits with bandages and antiseptic for evacuees',
    right:
      'Emergency medical supply packs containing dressings and disinfectant for displaced families',
  },
  {
    id: 'fuel-paraphrase',
    duplicate: true,
    left: 'Diesel fuel to refill the shelter backup generator',
    right: 'Purchase diesel for refueling the emergency accommodation power generator',
  },
  {
    id: 'beds-paraphrase',
    duplicate: true,
    left: 'Thirty folding cots for overnight shelter accommodation',
    right: '30 portable folding camp beds for evacuees sleeping at the shelter',
  },
  {
    id: 'blankets-paraphrase',
    duplicate: true,
    left: 'Warm blankets for flood evacuees at the temporary shelter',
    right: 'Thermal bedding blankets for displaced residents in emergency accommodation',
  },
  {
    id: 'water-vs-bus',
    duplicate: false,
    left: 'Bottled drinking water for the flood shelter',
    right: 'Bus rental to transport evacuees from the flood zone',
  },
  {
    id: 'battery-vs-food',
    duplicate: false,
    left: 'AA batteries for responder headlamps',
    right: 'Rice and canned beans for shelter meals',
  },
  {
    id: 'medical-vs-fuel',
    duplicate: false,
    left: 'First aid kits with bandages and antiseptic',
    right: 'Diesel fuel for the backup generator',
  },
  {
    id: 'beds-vs-radio',
    duplicate: false,
    left: 'Folding cots for overnight accommodation',
    right: 'Two-way radios for coordinating volunteer teams',
  },
  {
    id: 'blankets-vs-pump',
    duplicate: false,
    left: 'Warm bedding blankets for flood evacuees',
    right: 'Submersible pumps to remove flood water from buildings',
  },
  {
    id: 'near-domain-distinct',
    duplicate: false,
    left: 'Bottled drinking water for shelter residents',
    right: 'Waterproof storage containers for keeping medical supplies dry',
  },
] as const;
