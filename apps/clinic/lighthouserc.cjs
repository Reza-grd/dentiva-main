module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview -- --port 4173 --host 127.0.0.1',
      startServerReadyPattern: 'Local:',
      url: [
        'http://127.0.0.1:4173/login',
        'http://127.0.0.1:4173/daftar',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
    },
  },
};
