// database.js — "base de données" DÉMO, en mémoire uniquement.
//
// ⚠️ IMPORTANT : ceci n'est PAS un vrai système sécurisé.
// - Les données sont stockées dans une variable JS, visibles par quiconque
//   ouvre les outils de développement du navigateur.
// - Rien n'est chiffré, rien n'est persistant (tout disparaît au rechargement).
// - Pour un vrai site en production, il faudrait un vrai backend
//   (Node/Express, Supabase, Firebase...) qui stocke les codes patients
//   de façon chiffrée (hash) et vérifie les identifiants côté serveur.
//
// Ce fichier sert uniquement à démontrer l'INTERFACE (ajout de patient,
// connexion par code, affichage de la progression).

const ORTHOART_DB = [
  { pin: '100000', name: 'Dr. Saloua Ben Rejeb Jdir', role: 'admin' },
  {
    pin: '482913', name: 'Léa Martin', role: 'patient',
    progress: { step: 4, totalSteps: 12, startDate: '2 avr. 2026', nextAppointment: '14 sept. 2026' }
  },
  {
    pin: '719284', name: 'Karim Haddad', role: 'patient',
    progress: { step: 9, totalSteps: 14, startDate: '10 jan. 2026', nextAppointment: '3 sept. 2026' }
  }
];

// Cherche un compte par code à 6 chiffres
function dbFindByPin(pin){
  return ORTHOART_DB.find(acc => acc.pin === pin) || null;
}

// Génère un code à 6 chiffres qui n'existe pas déjà
function dbGeneratePin(){
  let pin;
  do {
    pin = String(Math.floor(100000 + Math.random() * 900000));
  } while (dbFindByPin(pin));
  return pin;
}

// Ajoute un nouveau patient (utilisé par le panneau admin)
function dbAddPatient(name){
  const pin = dbGeneratePin();
  const account = {
    pin, name, role: 'patient',
    progress: { step: 0, totalSteps: 12, startDate: 'Aujourd\'hui', nextAppointment: 'À planifier' }
  };
  ORTHOART_DB.push(account);
  return account;
}

// Retourne tous les patients (pas les admins) — pour la liste admin
function dbGetPatients(){
  return ORTHOART_DB.filter(acc => acc.role === 'patient');
}
