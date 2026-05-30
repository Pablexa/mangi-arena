export const DAILY_MISSIONS = [
  { id: 1, title: 'Sobrevive 3 Rondas de Lluvia de Meteoritos', required: 3, reward: 50 },
  { id: 2, title: 'Destruye 5 jugadores', required: 5, reward: 100 },
  { id: 3, title: 'Gana 1 Partida', required: 1, reward: 200 },
  { id: 4, title: 'Usa el turbo por 60 segundos', required: 60, reward: 50 },
  { id: 5, title: 'Consigue 10 Kills con Escopeta', required: 10, reward: 150 },
  { id: 6, title: 'Juega 5 partidas de Team Deathmatch', required: 5, reward: 100 },
  { id: 7, title: 'Recoge 10 Paquetes de Salud', required: 10, reward: 50 },
  { id: 8, title: 'Consigue 3 Kills con Sniper desde lejos', required: 3, reward: 100 },
  { id: 9, title: 'Mantente en el aire por 10 segundos', required: 10, reward: 75 },
  { id: 10, title: 'Choca contra 20 paredes sin morir', required: 20, reward: 25 },
  { id: 11, title: 'Asiste a un compañero 5 veces', required: 5, reward: 100 },
  { id: 12, title: 'Logra 2 First Bloods', required: 2, reward: 150 },
  { id: 13, title: 'Haz 5000 de daño total', required: 5000, reward: 300 },
  { id: 14, title: 'Usa el chat 5 veces', required: 5, reward: 10 },
  { id: 15, title: 'Cae a la lava y sobrevive', required: 1, reward: 50 },
  { id: 16, title: 'Recoge 5 Nitros', required: 5, reward: 50 },
  { id: 17, title: 'Equipa 3 Trails distintos', required: 3, reward: 50 },
  { id: 18, title: 'Destruye un auto estando a 10% de HP', required: 1, reward: 200 },
  { id: 19, title: 'Consigue un MVP', required: 1, reward: 500 },
  { id: 20, title: 'Juega por 1 hora ininterrumpida', required: 60, reward: 300 },
  // ... Adding more logic to generate up to 100
];

// Generate the rest dynamically for now to fulfill the 100 missions request
for (let i = 21; i <= 100; i++) {
  const types = ['Destruye', 'Juega', 'Recoge', 'Usa', 'Gana'];
  const type = types[Math.floor(Math.random() * types.length)];
  let title = '';
  let required = 0;
  let reward = 0;

  if (type === 'Destruye') {
    required = Math.floor(Math.random() * 50) + 10;
    title = `Destruye ${required} jugadores`;
    reward = required * 10;
  } else if (type === 'Juega') {
    required = Math.floor(Math.random() * 20) + 5;
    title = `Juega ${required} partidas`;
    reward = required * 20;
  } else if (type === 'Recoge') {
    required = Math.floor(Math.random() * 100) + 20;
    title = `Recoge ${required} objetos del mapa`;
    reward = required * 5;
  } else if (type === 'Usa') {
    required = Math.floor(Math.random() * 500) + 100;
    title = `Usa munición ${required} veces`;
    reward = required * 2;
  } else {
    required = Math.floor(Math.random() * 5) + 1;
    title = `Gana ${required} partidas consecutivas`;
    reward = required * 200;
  }

  DAILY_MISSIONS.push({ id: i, title, required, reward });
}

export function getDailyMissions() {
  const today = new Date().toDateString();
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = today.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Get 5 random but deterministic missions for today
  const missions = [];
  for (let i = 0; i < 5; i++) {
    const index = Math.abs((hash + i * 13) % DAILY_MISSIONS.length);
    missions.push(DAILY_MISSIONS[index]);
  }
  return missions;
}
