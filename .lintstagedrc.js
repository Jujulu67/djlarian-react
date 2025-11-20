module.exports = {
  // Exécuter prettier seulement (ESLint désactivé pour ne pas bloquer les commits)
  '*.{js,jsx,ts,tsx}': ['prettier --write'],
  '*.{json,md}': ['prettier --write'],
};
