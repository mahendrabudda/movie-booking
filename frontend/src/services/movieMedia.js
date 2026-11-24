// Curated widescreen cinema backdrops & YouTube trailer links keyed by movie title keywords
// so the atmospheric top header changes dynamically according to the selected movie.

export const formatDurationHrsMins = (minutes) => {
  if (!minutes || Number.isNaN(Number(minutes))) return '2h 00min';
  const hrs = Math.floor(Number(minutes) / 60);
  const mins = Number(minutes) % 60;
  return `${hrs}h ${mins}min`;
};

export const getMovieMediaAssets = (movie) => {
  const title = (movie?.title || '').toLowerCase();

  if (title.includes('kalki')) {
    return {
      backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1800&q=80',
      posterFallback: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
      tagline: 'ENTER THE FUTURE OF KASI',
      trailerUrl: 'https://www.youtube.com/watch?v=kQDd1AhGIHk',
    };
  }
  if (title.includes('dune')) {
    return {
      backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1800&q=80',
      posterFallback: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=800&q=80',
      tagline: 'LONG LIVE THE FIGHTERS',
      trailerUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
    };
  }
  if (title.includes('salaar')) {
    return {
      backdropUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1800&q=80',
      posterFallback: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=800&q=80',
      tagline: 'THE MOST VIOLENT MEN CALLED ONE MAN THE MOST VIOLENT',
      trailerUrl: 'https://www.youtube.com/watch?v=4GPvYMKtrtI',
    };
  }
  if (title.includes('oppenheimer')) {
    return {
      backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1800&q=80',
      posterFallback: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=800&q=80',
      tagline: 'THE WORLD FOREVER CHANGES',
      trailerUrl: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
    };
  }
  if (title.includes('stree')) {
    return {
      backdropUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=1800&q=80',
      posterFallback: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=800&q=80',
      tagline: 'O STREE RAKSHA KARNA',
      trailerUrl: 'https://www.youtube.com/watch?v=KVnheXywIbY',
    };
  }

  return {
    backdropUrl: movie?.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1800&q=80',
    posterFallback: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
    tagline: 'EXPERIENCE CINEMA IN DOLBY ATMOS',
    trailerUrl: 'https://www.youtube.com/results?search_query=' + encodeURIComponent((movie?.title || 'Movie') + ' trailer'),
  };
};
