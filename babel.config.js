module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      '@babel/preset-react',
      '@babel/preset-typescript',
    ],
    plugins: [
      ['@babel/plugin-transform-runtime'],
      ['babel-plugin-styled-components', { ssr: true, displayName: true }],
    ],
    // Exclure les fichiers qui utilisent next/font
    ignore: [
      'src/app/layout.tsx',
      // Ajouter d'autres fichiers utilisant next/font si nécessaire
    ],
  };
};
